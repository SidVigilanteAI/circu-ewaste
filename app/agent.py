import os
import json
from typing import Dict, List, Any
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.schemas import (
    DeviceCandidate,
    DiagnosticQuestion,
    QuestionsResponse,
    CircularEvaluationResult,
    ResourceLinkEstimate
)
from app.search_service import gather_circular_market_intelligence

load_dotenv()

import base64

MODELS_PRIORITY = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.6-flash"]

def get_llm(model_name: str = "gemini-3.5-flash"):
    api_key = os.getenv("GEMINI_API_KEY")
    return ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key
    )

def _call_with_fallback(invoke_fn):
    """Executes an LLM function with multi-model failover if quota or rate limit occurs."""
    last_err = None
    for model_name in MODELS_PRIORITY:
        try:
            return invoke_fn(model_name)
        except Exception as e:
            last_err = e
            err_msg = str(e)
            if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "404" in err_msg or "NOT_FOUND" in err_msg:
                continue
            raise e
    if last_err:
        raise last_err
    raise RuntimeError("All Gemini model candidates failed.")

# --- 1. DEVICE EXTRACTION ---
DEVICE_EXTRACTION_PROMPT = """You are an expert electronics hardware analyst.
Analyze the following text extracted from a product label, invoice, manual, sticker, or user description.
Extract:
1. Brand (e.g. Apple, Dell, Sony, Lenovo, OnePlus)
2. Exact Model name or series (e.g. iPhone 12, ThinkPad T480, WH-1000XM4)
3. Category (Smartphone, Laptop, Tablet, Audio, Smartwatch, Gaming Console, Monitor, Peripheral)
4. Release Year (or 'Unknown' if uncertain)
5. Serial Number, IMEI, or hardware spec details (e.g. 8GB RAM / 256GB SSD, Serial: C02X...)
If the text is sparse or incomplete, infer the most likely electronic device and fill in best estimates.
"""

VISUAL_DEVICE_EXTRACTION_PROMPT = """You are an expert consumer electronics visual recognition engineer.
Examine this image of an electronic device, hardware component, or gadget.
Analyze both the visual design cues AND any text detected via RapidOCR.

Identify:
1. Brand: Detect brand logos (Apple, Samsung, Dell, Sony, HP, Lenovo, ASUS, Xiaomi, OnePlus, Nintendo, etc.) or distinct design language.
2. Exact Model: Identify the exact model or series by inspecting:
   - Rear/front camera module layout, lens count, flash position, camera island shape
   - Screen notch, punch-hole camera, Dynamic Island, or bezel thickness
   - Port arrangements (USB-C, Lightning, 3.5mm headphone jack, HDMI, MagSafe)
   - Speaker grilles, antenna bands, hinge mechanisms, buttons
   - Chassis materials and finish (matte glass, brushed aluminum, polycarbonate, carbon fiber)
3. Category: Smartphone, Laptop, Tablet, Audio, Smartwatch, Gaming Console, Monitor, Peripheral, Motherboard, etc.
4. Estimated Release Year.
5. Specs or Serial: Any visible serial number, regulatory model code (e.g. A2403, SM-S928B), or storage markings.

If the device is unlabelled or text is worn off, use visual hardware design cues to provide the most accurate model identification.
"""

def extract_device_from_text(raw_text: str, confidence: float = 1.0) -> DeviceCandidate:
    """Uses Gemini to parse unstructured OCR/PDF/manual text into a structured DeviceCandidate."""
    def _run(model_name: str):
        llm = get_llm(model_name)
        structured_llm = llm.with_structured_output(DeviceCandidate)
        result: DeviceCandidate = structured_llm.invoke([
            SystemMessage(content=DEVICE_EXTRACTION_PROMPT),
            HumanMessage(content=f"Extracted Text:\n{raw_text[:3000]}")
        ])
        result.confidence_score = confidence
        result.raw_extracted_text = raw_text[:500]
        return result

    return _call_with_fallback(_run)

def identify_device_from_image(image_bytes: bytes, ocr_text: str = "", mime_type: str = "image/jpeg", confidence: float = 0.9) -> DeviceCandidate:
    """Uses multimodal vision AI combined with RapidOCR text to identify both labelled and unlabelled gadgets."""
    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    
    def _run(model_name: str):
        llm = get_llm(model_name)
        structured_llm = llm.with_structured_output(DeviceCandidate)
        
        has_readable_text = bool(ocr_text and ocr_text.strip() and ocr_text != "Electronic device with indistinct markings or photo.")
        
        if has_readable_text:
            text_context = f"\n\nText detected via RapidOCR on image:\n{ocr_text[:1500]}"
        else:
            text_context = "\n\nNotice: This device appears unlabelled or has worn-out text. Visually inspect physical geometry, camera bump arrangement, logo, buttons, and ports to deduce the exact model."
            
        msg = HumanMessage(content=[
            {
                "type": "text",
                "text": f"{VISUAL_DEVICE_EXTRACTION_PROMPT}{text_context}"
            },
            {
                "type": "image_url",
                "image_url": {"url": f"data:{mime_type};base64,{b64_image}"}
            }
        ])
        
        result: DeviceCandidate = structured_llm.invoke([msg])
        result.confidence_score = confidence
        result.raw_extracted_text = (ocr_text[:400] if has_readable_text else "Identified via Multimodal Vision AI")
        return result
        
    return _call_with_fallback(_run)

# --- 2. DYNAMIC DIAGNOSTIC QUESTION GENERATION ---
QUESTIONS_PROMPT = """You are a circular economy and e-waste reduction specialist.
Given the target electronic device, generate 3 to 4 targeted diagnostic verification questions to assess its physical and functional health.
The questions must help determine the 4R pathway:
- REUSE (Functional, high resale value)
- REPAIR (Cost-effective to fix e.g. broken screen or dead battery)
- DONATE (Working/usable for learning/NGOs, low resale value)
- RECYCLE (Beyond economic repair, burnt board, obsolete, hazardous)

For each question provide:
- id: short identifier (e.g. 'power_state', 'screen_display', 'battery_health', 'locks_status')
- question: clear, concise question
- options: 3 to 4 distinct multiple-choice answers covering working, partially damaged, or broken states
- description: brief note on why this matters
"""

class QuestionListWrapper(DeviceCandidate):
    pass

from pydantic import BaseModel

class DiagnosticQuestionsWrapper(BaseModel):
    questions: List[DiagnosticQuestion]

def generate_diagnostic_questions(device: DeviceCandidate) -> List[DiagnosticQuestion]:
    """Generates 3-4 tailored condition assessment questions for the identified gadget."""
    def _run(model_name: str):
        llm = get_llm(model_name)
        structured_llm = llm.with_structured_output(DiagnosticQuestionsWrapper)
        
        prompt = f"""Device to diagnose:
Brand: {device.brand}
Model: {device.model}
Category: {device.category}
Release Year: {device.release_year or 'Unknown'}
Specs/Serial: {device.serial_or_specs or 'N/A'}
"""
        result: DiagnosticQuestionsWrapper = structured_llm.invoke([
            SystemMessage(content=QUESTIONS_PROMPT),
            HumanMessage(content=prompt)
        ])
        return result.questions

    return _call_with_fallback(_run)

# --- 3. CIRCULAR EVALUATION & MARKET VALUATION ---
CIRCULAR_EVALUATION_PROMPT = """You are CircuScan's Senior Circular Economy & E-Waste Reduction AI.
Your mission is to divert electronics from landfills by recommending the highest-value circular outcome:
1. REUSE: If the device is operational, has meaningful market/resale value, and can be used as-is or traded in.
2. REPAIR: If the device has a common, cost-effective fix (e.g., replacement battery, swapped screen, thermal paste) where repair cost is far lower than replacement.
3. DONATE: If the device works or needs minimal setup, has modest commercial resale value, but can bridge the digital divide for students or NGOs.
4. RECYCLE: If the device is non-functional, physically shattered, motherboard is dead/water-logged, or software is obsolete/unsupported, route it to certified e-waste recyclers for precious metal recovery (gold, copper, lithium) and toxic material containment.

Carefully evaluate the user's answers to the diagnostic questions and the real-time web research provided.
Provide:
- recommendation: Exactly one of 'REUSE', 'REPAIR', 'DONATE', 'RECYCLE'
- recommendation_title: An empowering headline
- recommendation_reasoning: Thorough 2-3 paragraph explanation of the decision based on hardware state and environmental impact
- eco_impact_ewaste_kg: Estimated weight of electronic waste diverted from landfill (e.g. 0.18 kg for phone, 1.8 kg for laptop, 0.25 kg for headphones)
- eco_impact_co2_kg: Estimated manufacturing carbon emissions saved by extending life or recycling (e.g. 60-80 kg CO2e for smartphones, 250-350 kg CO2e for laptops)
- hazardous_materials_saved: List of toxic elements prevented from leaching into groundwater (Lead, Mercury, Cadmium, Beryllium, Brominated Flame Retardants, Lithium)
- resale_value_inr: Estimated current secondary market value in INR (e.g., '₹14,000 - ₹17,500' or '₹0' if fully destroyed)
- repair_cost_inr: Estimated repair cost in INR (or '₹0' if fully working, or 'N/A' if beyond repair)
- scrap_value_inr: Estimated scrap / material recycling payout in INR (e.g. '₹250 - ₹450')
- repairability_score: Score from 1 to 10 based on modularity and parts availability
- repair_difficulty_label: 'Easy', 'Moderate', or 'Advanced'
- product_overview: Hardware summary of the device
- key_specs: 4-6 primary hardware specifications
- resource_links: 3 to 5 curated web links from real platforms (Cashify, CeX, iFixit, Amazon Renewed, Karo Sambhav, Hulladek, Croma E-Care, Olx, or official support) with purpose and estimated financial value.
- arbitrage_table: 3 to 4 platform comparisons:
    - Cashify (Instant cash doorstep quote)
    - CeX India (Store voucher / cash quote)
    - Amazon Renewed Trade-in (Exchange balance)
    - Direct P2P / Olx (Direct buyer estimated ma- diy_repair_parts: 2 to 3 key spare parts (e.g. Battery replacement, Display, Charging port) with estimated cost in INR and difficulty.
- data_sanitization_guide: 3 to 4 device-specific privacy steps (e.g. unlinking iCloud/Apple ID/Google account, removing FRP lock, cryptographic factory reset, SIM/SD card removal).
- local_dropoff_options: 4 to 6 local facilities near the user's PIN code/city, spanning both certified e-waste recyclers (category: 'RECYCLE') and local/authorized repair shops (category: 'REPAIR'), with realistic addresses, distance_km, phone, and ratings.
- next_action_steps: Step-by-step actionable recommendations.
"""

from app.geocoding_service import get_nearby_facilities

def evaluate_circular_decision(device: DeviceCandidate, answers: Dict[str, str], location_or_city: str = "India") -> CircularEvaluationResult:
    """Gathers real-time web market intelligence and performs full 4R circular evaluation."""
    # 1. Real-time web intelligence
    search_context = gather_circular_market_intelligence(f"{device.brand} {device.model}")
    
    # 2. Synthesize with Gemini
    def _run(model_name: str):
        llm = get_llm(model_name)
        structured_llm = llm.with_structured_output(CircularEvaluationResult)
        
        user_input_payload = f"""DEVICE INFORMATION:
Brand: {device.brand}
Model: {device.model}
Category: {device.category}
Release Year: {device.release_year or 'Unknown'}
Serial/Specs: {device.serial_or_specs or 'N/A'}
USER LOCATION / PIN CODE: {location_or_city}

USER DIAGNOSTIC QUESTION ANSWERS:
{json.dumps(answers, indent=2)}

REAL-TIME WEB MARKET & REPAIR INTELLIGENCE:
{search_context}
"""
        result: CircularEvaluationResult = structured_llm.invoke([
            SystemMessage(content=CIRCULAR_EVALUATION_PROMPT),
            HumanMessage(content=user_input_payload)
        ])
        
        # 3. Guarantee accurate, interactive GPS coordinates for the map visualization
        facilities = get_nearby_facilities(location_or_city, device.brand, device.category)
        if not result.local_dropoff_options or any(opt.latitude is None for opt in result.local_dropoff_options):
            result.local_dropoff_options = facilities

        return result

    return _call_with_fallback(_run)