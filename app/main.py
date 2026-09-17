import sys
import os
from pathlib import Path

# Add project root directory to sys.path so 'app' package is resolvable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any

from app.schemas import (
    DeviceCandidate,
    DiagnosticQuestion,
    QuestionsResponse,
    EvaluateRequest,
    CircularEvaluationResult
)
from app.ocr_service import extract_text_from_image_bytes, extract_text_from_pdf_bytes
from app.agent import (
    extract_device_from_text,
    identify_device_from_image,
    generate_diagnostic_questions,
    evaluate_circular_decision
)

app = FastAPI(
    title="CircuScan: AI E-Waste Reduction & Circular Decision API",
    description="Analyzes gadgets via RapidOCR, PyMuPDF, and Multimodal Vision, asks diagnostic questions, and outputs 4R recommendations with vast web search valuation.",
    version="2.1.0"
)

# Enable CORS for Next.js and all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextIngestRequest(BaseModel):
    text: str

@app.get("/health")
def health():
    return {"status": "ok", "service": "CircuScan API", "version": "2.1.0"}

@app.post("/api/ingest/image", response_model=DeviceCandidate)
async def ingest_image(file: UploadFile = File(...)):
    """Accepts an image of a gadget, sticker, invoice, or unlabelled device, runs RapidOCR + Multimodal Vision AI."""
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded image file is empty.")
        
        # 1. Run RapidOCR
        raw_text, confidence = extract_text_from_image_bytes(contents)
        
        # 2. Run Multimodal Vision AI (supports unlabelled, worn-out, or text-less gadgets)
        mime_type = file.content_type or "image/jpeg"
        candidate = identify_device_from_image(
            image_bytes=contents,
            ocr_text=raw_text,
            mime_type=mime_type,
            confidence=confidence if raw_text.strip() else 0.88
        )
        return candidate
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image OCR & Visual Extraction failed: {str(e)}")

@app.post("/api/ingest/pdf", response_model=DeviceCandidate)
async def ingest_pdf(file: UploadFile = File(...)):
    """Accepts a PDF spec sheet or purchase invoice, extracts text via PyMuPDF, and identifies the gadget."""
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded PDF file is empty.")
            
        raw_text = extract_text_from_pdf_bytes(contents)
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="No readable text found in PDF.")
            
        candidate = extract_device_from_text(raw_text, confidence=0.95)
        return candidate
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")

@app.post("/api/ingest/text", response_model=DeviceCandidate)
def ingest_text(req: TextIngestRequest):
    """Parses raw text description or model name into a structured DeviceCandidate."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Input text cannot be empty.")
    try:
        candidate = extract_device_from_text(req.text, confidence=1.0)
        return candidate
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")

@app.post("/api/questions", response_model=QuestionsResponse)
def get_diagnostic_questions(device: DeviceCandidate):
    """Generates tailored condition and health verification questions based on the candidate device."""
    try:
        questions = generate_diagnostic_questions(device)
        return QuestionsResponse(device=device, questions=questions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")

@app.post("/api/evaluate", response_model=CircularEvaluationResult)
def evaluate_device(req: EvaluateRequest):
    """Performs full 4R circular evaluation, market valuation, and web intelligence."""
    try:
        location = req.location_or_city if req.location_or_city and req.location_or_city.strip() else "India"
        result = evaluate_circular_decision(req.device, req.answers, location_or_city=location)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Circular evaluation failed: {str(e)}")

from app.geocoding_service import get_nearby_facilities

@app.get("/api/nearby-centers")
def get_nearby_centers(
    pincode: str = "560001",
    brand: str = "Multi-Brand",
    category: str = "Electronics"
):
    """Returns geocoded e-waste recyclers and repair shops near the specified Indian PIN code."""
    try:
        centers = get_nearby_facilities(pincode, device_brand=brand, device_category=category)
        return {"pincode": pincode, "total": len(centers), "centers": centers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Nearby centers lookup failed: {str(e)}")

# --- Unified Single-Container Mounting for Static Next.js Export ---
static_dir = Path(__file__).resolve().parent.parent / "frontend" / "out"
if static_dir.exists() and (static_dir / "index.html").exists():
    if (static_dir / "_next").exists():
        app.mount("/_next", StaticFiles(directory=str(static_dir / "_next")), name="next_static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "health":
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = static_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        index_file = static_dir / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Page not found")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)