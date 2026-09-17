import os
import re
from typing import Tuple, List
import cv2
import numpy as np
import pymupdf
from rapidocr_onnxruntime import RapidOCR

# Initialize RapidOCR engine with parameters optimized for small labels, stickers, and backplates
ocr_engine = RapidOCR(
    det_db_thresh=0.15,
    det_db_box_thresh=0.15,
    det_db_unclip_ratio=2.2
)

def clean_ocr_text(text: str) -> str:
    """Removes non-standard noise while preserving model numbers, serials, and specifications."""
    # Standardize whitespace and remove low-confidence junk characters
    cleaned = re.sub(r"[^\w\s\-\.,/:\(\)\+₹$€£%#@]", " ", text)
    return re.sub(r"\s+", " ", cleaned).strip()

def preprocess_gadget_image(image_bgr: np.ndarray) -> np.ndarray:
    """
    Applies resolution scaling and white-border padding to improve OCR
    detection on small serial labels, stickers, backplates, and invoices.
    """
    h, w = image_bgr.shape[:2]
    # Ensure minimum height of 64px for the DBNet text detector
    scale = max(2.0, 64.0 / max(h, 1))
    if scale > 1.0:
        new_w, new_h = int(w * scale), int(h * scale)
        resized = cv2.resize(image_bgr, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
    else:
        resized = image_bgr

    # Add border padding so text isn't flush against the image edge
    padded = cv2.copyMakeBorder(resized, 25, 25, 25, 25, cv2.BORDER_CONSTANT, value=[255, 255, 255])
    return padded

def extract_text_from_image_bytes(image_bytes: bytes) -> Tuple[str, float]:
    """
    Extracts text from image bytes using RapidOCR with preprocessing,
    top-to-bottom spatial sorting, and direct recognition fallback.
    
    Returns:
        tuple: (extracted_text: str, average_confidence: float)
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return "", 0.0

    h, w = img.shape[:2]

    # Preprocess image (scaling + padding)
    processed = preprocess_gadget_image(img)
    result, _ = ocr_engine(processed)

    # Pass 1: Standard detection pipeline found text
    if result:
        # Sort boxes: Top-to-bottom first (row bucketed by 25px), then left-to-right
        sorted_results = sorted(result, key=lambda x: (x[0][0][1] // 25, x[0][0][0]))
        detected_parts: List[str] = []
        confidences: List[float] = []

        for item in sorted_results:
            box, text, conf = item
            clean_part = clean_ocr_text(str(text))
            if clean_part:
                detected_parts.append(clean_part)
                confidences.append(float(conf))

        full_text = "\n".join(detected_parts)
        avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
        return full_text, avg_conf

    # Pass 2: Fallback for tightly cropped serial/model stickers
    rec_target = cv2.resize(img, (max(180, int(w * 3)), 64), interpolation=cv2.INTER_CUBIC)
    rec_result, _ = ocr_engine(rec_target, use_det=False, use_cls=False)

    if rec_result and isinstance(rec_result, list) and len(rec_result) > 0:
        rec_text = str(rec_result[0][0]).strip()
        rec_conf = float(rec_result[0][1]) if len(rec_result[0]) > 1 else 0.0
        clean_text = clean_ocr_text(rec_text)
        return clean_text, rec_conf

    return "", 0.0

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """
    Extracts text from PDF documents (invoices, spec sheets, user manuals)
    using PyMuPDF.
    """
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    extracted_chunks = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        page_text = page.get_text("text").strip()
        if page_text:
            extracted_chunks.append(f"--- Page {page_num + 1} ---\n{page_text}")
            
    doc.close()
    return "\n\n".join(extracted_chunks)
