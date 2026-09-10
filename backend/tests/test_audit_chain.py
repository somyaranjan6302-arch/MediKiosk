import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.models import AuditLog
from app.core.audit import log_audit_event, verify_audit_chain

# In-memory test DB
test_engine = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=test_engine)

def test_audit_chain_validity(db_session):
    # Log several events
    log_audit_event(db_session, "pat-1", "patient_kiosk", "CONSENT_GRANT", "consent", "c-1", "Granted voice recording")
    log_audit_event(db_session, "pat-1", "patient_kiosk", "WRITE_PHI_CC", "interview_cc", "cc-1", "Fever and cough")
    log_audit_event(db_session, "dr_arun", "doctor", "DOCTOR_CONFIRM_CLINICAL_RECORD", "case_report", "rep-1", "Confirmed case")

    result = verify_audit_chain(db_session)
    assert result["valid"] is True
    assert result["total_records"] == 3

def test_audit_chain_tamper_detection(db_session):
    # Log events
    log_audit_event(db_session, "pat-1", "patient_kiosk", "CONSENT_GRANT", "consent", "c-1", "Original consent")
    entry2 = log_audit_event(db_session, "pat-1", "patient_kiosk", "WRITE_PHI_CC", "interview_cc", "cc-1", "Original CC")
    log_audit_event(db_session, "dr_arun", "doctor", "DOCTOR_CONFIRM_CLINICAL_RECORD", "case_report", "rep-1", "Confirmed")

    # Simulate malicious modification of entry2 payload or hash
    entry2.payload_summary = "MALICIOUSLY ALTERED PHI DATA"
    db_session.commit()

    result = verify_audit_chain(db_session)
    assert result["valid"] is False
    assert result["corrupted_id"] == entry2.id
    assert "Tampering detected" in result["message"]
