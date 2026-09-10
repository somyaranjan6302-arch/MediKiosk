import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.audit import log_audit_event
from app.models.models import Session as KioskSession, Document, OcrExtraction
from app.schemas.schemas import DocumentResponse, OcrExtractionResponse, OcrCorrectionRequest
from app.services.ocr_pipeline import OcrPipeline

router = APIRouter(prefix="/documents", tags=["Document Digitization & OCR Pipeline"])

@router.post("/{session_id}/upload", response_model=DocumentResponse)
async def upload_document(
    session_id: str,
    doc_type: str = Form("prescription"), # prescription, lab_report, discharge_summary
    uploaded_via: str = Form("kiosk_scan"), # kiosk_scan, mobile_qr_upload
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Ingests prescription, lab report, or discharge summary.
    Executes multimodal OCR, formulary cross-checks, and clinical range validation.
    MANDATORY INVARIANT: All extractions are assistive drafts with confirmed=False.
    """
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    content = await file.read()
    file_size = len(content)
    storage_key = f"documents/{session_id}/{uuid.uuid4().hex}_{file.filename}"

    doc = Document(
        id=str(uuid.uuid4()),
        session_id=session_id,
        doc_type=doc_type,
        storage_key=storage_key,
        original_filename=file.filename,
        mime_type=file.content_type,
        file_size=file_size,
        uploaded_via=uploaded_via
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Execute OCR Pipeline
    extractions_data = OcrPipeline.process_document(doc_type, content, file.filename)
    created_extractions = []

    for item in extractions_data:
        ext = OcrExtraction(
            id=str(uuid.uuid4()),
            document_id=doc.id,
            field_name=item.get("field_name"),
            extracted_value=item.get("extracted_value"),
            confidence_score=item.get("confidence_score", 0.8),
            formulary_match=item.get("formulary_match"),
            reference_range=item.get("reference_range"),
            flagged=item.get("flagged", False),
            flag_reason=item.get("flag_reason"),
            confirmed=False
        )
        db.add(ext)
        created_extractions.append(ext)

    db.commit()

    log_audit_event(
        db=db,
        actor_id=session.patient_id or "patient_kiosk",
        actor_role="patient_kiosk",
        action="DOCUMENT_OCR_PROCESSED",
        resource_type="document",
        resource_id=doc.id,
        payload_summary=f"Processed {doc_type} ({file.filename}) - {len(created_extractions)} assistive fields extracted"
    )

    return doc

@router.get("/session/{session_id}", response_model=List[DocumentResponse])
def get_session_documents(session_id: str, db: Session = Depends(get_db)):
    docs = db.query(Document).filter(Document.session_id == session_id).all()
    return docs

@router.get("/{document_id}/ocr-result", response_model=List[OcrExtractionResponse])
def get_ocr_result(document_id: str, db: Session = Depends(get_db)):
    extractions = db.query(OcrExtraction).filter(OcrExtraction.document_id == document_id).all()
    if not extractions:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No extractions found for document")
    return extractions

@router.patch("/{document_id}/ocr-result")
def correct_ocr_field(
    document_id: str,
    payload: OcrCorrectionRequest,
    corrected_by: str = "dr_arun",
    db: Session = Depends(get_db)
):
    """
    Assistive Human Correction endpoint: Allows nurse or doctor to edit an OCR field
    before it is committed to the case report.
    """
    ext = db.query(OcrExtraction).filter(
        OcrExtraction.document_id == document_id,
        OcrExtraction.field_name == payload.field_name
    ).first()

    if not ext:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OCR field not found")

    old_val = ext.extracted_value
    ext.corrected_value = payload.corrected_value
    ext.corrected_by = corrected_by
    ext.corrected_at = datetime.utcnow()
    ext.confirmed = payload.confirmed
    ext.flagged = False # Cleared upon human sign-off
    db.commit()

    log_audit_event(
        db=db,
        actor_id=corrected_by,
        actor_role="doctor",
        action="OCR_HUMAN_CORRECTION",
        resource_type="ocr_extraction",
        resource_id=ext.id,
        payload_summary=f"Corrected '{payload.field_name}' from '{old_val}' to '{payload.corrected_value}'"
    )

    return {
        "status": "success",
        "field_name": payload.field_name,
        "corrected_value": payload.corrected_value,
        "confirmed": ext.confirmed
    }
