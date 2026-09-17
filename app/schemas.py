from typing import List, Optional, Dict, Literal
from pydantic import BaseModel, Field

class DeviceCandidate(BaseModel):
    brand: str = Field(default="Unknown", description="Manufacturer or brand name")
    model: str = Field(default="Unknown", description="Specific model name, number, or series")
    category: str = Field(default="Electronic Device", description="Device category, e.g. Smartphone, Laptop, Tablet, Audio, Monitor")
    release_year: Optional[str] = Field(default=None, description="Estimated release year")
    serial_or_specs: Optional[str] = Field(default=None, description="Identified serial number, IMEI, processor, or storage specs")
    confidence_score: Optional[float] = Field(default=1.0, description="OCR / Detection confidence score")
    raw_extracted_text: str = Field(default="", description="Original raw text extracted from image/PDF/user input")

class DiagnosticQuestion(BaseModel):
    id: str = Field(description="Unique question identifier, e.g., 'power_status', 'screen_condition'")
    question: str = Field(description="User-friendly diagnostic question to determine device viability")
    options: List[str] = Field(description="2-4 multiple-choice options for quick selection")
    description: Optional[str] = Field(default=None, description="Help text explaining why this question matters")

class QuestionsResponse(BaseModel):
    device: DeviceCandidate
    questions: List[DiagnosticQuestion]

class EvaluateRequest(BaseModel):
    device: DeviceCandidate
    answers: Dict[str, str] = Field(description="Map of question_id to selected answer")
    location_or_city: Optional[str] = Field(default="India", description="User's city or PIN code for local drop-offs")

class ArbitrageQuote(BaseModel):
    platform: str = Field(description="Platform name, e.g., Cashify, CeX India, Amazon Renewed, Olx")
    quote_inr: str = Field(description="Estimated quote in INR, e.g., '₹14,500 - ₹16,000'")
    payout_type: str = Field(description="Payout mechanism: Instant Cash/UPI, Store Voucher, or Direct P2P Buyer")
    convenience_level: str = Field(description="Doorstep Pickup, Walk-in Store, or Self-managed Listing")

class RepairPartEstimate(BaseModel):
    part_name: str = Field(description="Name of part: Battery, Display assembly, Charging port, Keyboard, etc.")
    cost_range_inr: str = Field(description="Estimated cost in INR, e.g., '₹1,800 - ₹2,500'")
    diy_difficulty: str = Field(description="Difficulty rating: Beginner, Moderate, or Advanced/Soldering")

class LocalDropoffCenter(BaseModel):
    name: str = Field(description="Center or shop name, e.g. Karo Sambhav Hub, QuickFix Electronics, Reliance ResQ, Croma E-Care")
    center_type: str = Field(description="Type: 'Certified E-Waste Recycler', 'Local Repair Shop', 'Authorized Brand Service', 'NGO Donation Hub'")
    category: Literal["RECYCLE", "REPAIR", "DONATE"] = Field(default="RECYCLE", description="Category: RECYCLE, REPAIR, or DONATE")
    address_or_channel: str = Field(description="Physical address or landmark near the user's PIN code")
    contact_or_link: str = Field(description="Google Maps search URL, official site, or portal link")
    phone: Optional[str] = Field(default=None, description="Contact phone number or customer care")
    pincode: Optional[str] = Field(default=None, description="6-digit PIN code of the center")
    distance_km: Optional[str] = Field(default="2.5 km", description="Estimated distance from user's location or PIN code")
    latitude: Optional[float] = Field(default=None, description="Latitude coordinate for map visualization")
    longitude: Optional[float] = Field(default=None, description="Longitude coordinate for map visualization")
    timing: Optional[str] = Field(default="10:00 AM - 8:00 PM", description="Operating hours")
    rating: Optional[str] = Field(default="4.6 ★", description="User or Google review rating")

class ResourceLinkEstimate(BaseModel):
    title: str = Field(description="Title of resource or platform")
    url: str = Field(description="Direct URL to marketplace, guide, recycling hub, or NGO")
    category: str = Field(description="Category: Marketplace, Repair Guide, Recycling Program, Donation NGO, Official Specs")
    summary: str = Field(description="Concise description of what this specific link offers")
    estimated_value: str = Field(description="Financial or trade estimation, e.g., 'Trade-in: ₹12,000', 'Repair: ~₹2,500', 'Scrap: ₹350'")

class CircularEvaluationResult(BaseModel):
    recommendation: Literal["REUSE", "REPAIR", "DONATE", "RECYCLE"] = Field(
        description="The primary circular economy recommendation: REUSE, REPAIR, DONATE, or RECYCLE"
    )
    recommendation_title: str = Field(description="Catchy recommendation headline, e.g., 'Repair & Extend Life: High Value Salvageable'")
    recommendation_reasoning: str = Field(description="Detailed rationale based on user answers, hardware viability, and circular hierarchy")
    eco_impact_ewaste_kg: float = Field(description="Estimated e-waste diverted from landfill in kilograms")
    eco_impact_co2_kg: float = Field(description="Estimated carbon footprint avoided in kg CO2e")
    hazardous_materials_saved: List[str] = Field(description="Hazardous elements prevented from polluting soil/water (e.g. Lead, Mercury, Cadmium, Lithium)")
    resale_value_inr: str = Field(description="Estimated secondary market / refurbished value in INR")
    repair_cost_inr: str = Field(description="Estimated cost of typical repairs needed in INR (or '₹0' if fully functional)")
    scrap_value_inr: str = Field(description="Estimated metal/PCB scrap value if recycled in INR")
    repairability_score: int = Field(ge=1, le=10, description="Ease of repair on a 1-10 scale (10 being easiest to open and repair)")
    repair_difficulty_label: str = Field(default="Moderate", description="Overall DIY repair difficulty: Easy, Moderate, or Advanced")
    product_overview: str = Field(description="Technical summary of the device")
    key_specs: List[str] = Field(description="Key technical hardware specifications")
    resource_links: List[ResourceLinkEstimate] = Field(description="Curated web links with purpose description and value estimates")
    arbitrage_table: List[ArbitrageQuote] = Field(default_factory=list, description="Side-by-side resale arbitrage quotes")
    diy_repair_parts: List[RepairPartEstimate] = Field(default_factory=list, description="Breakdown of key spare parts and repair cost")
    data_sanitization_guide: List[str] = Field(default_factory=list, description="Model-specific steps to securely wipe and unlink device")
    local_dropoff_options: List[LocalDropoffCenter] = Field(default_factory=list, description="Verified recycling and donation centers near user")
    next_action_steps: List[str] = Field(description="Actionable next steps (e.g., data erasure tips, packaging, authorized center drop-off)")