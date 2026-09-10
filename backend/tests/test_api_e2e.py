import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db

init_db()
client = TestClient(app)

def test_full_clinical_lifecycle_e2e():
    # 1. Health check
    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

    # 2. Patient ABHA Authentication
    res_auth = client.post("/api/auth/patient/verify-abha", json={
        "abha_id": "91-4521-8890-1234",
        "otp": "123456"
    })
    assert res_auth.status_code == 200
    patient = res_auth.json()
    patient_id = patient["id"]
    assert patient["abha_id"] == "91-4521-8890-1234"

    # 3. Create Kiosk Session
    res_sess = client.post("/api/sessions", json={
        "patient_id": patient_id,
        "kiosk_id": "KIOSK-01",
        "language": "hi"
    })
    assert res_sess.status_code == 200
    session_id = res_sess.json()["id"]

    # 4. Layered Consent
    for c_type in ["voice_recording", "document_ocr", "share_with_doctor", "abdm_publish"]:
        res_c = client.post("/api/consent", json={
            "session_id": session_id,
            "consent_type": c_type,
            "granted": True,
            "method": "touch"
        })
        assert res_c.status_code == 200

    res_c_get = client.get(f"/api/consent/{session_id}")
    assert res_c_get.status_code == 200
    assert res_c_get.json()["consents"]["voice_recording"] is True

    # 5. Chief Complaint (CC)
    res_cc = client.post(f"/api/interview/{session_id}/cc", json={
        "description": "Chest discomfort and feeling breathless",
        "onset": "Yesterday evening",
        "duration": "Persistent",
        "severity": 6
    })
    assert res_cc.status_code == 200
    assert "followups" in res_cc.json()

    # 6. HPI (SOCRATES)
    res_hpi = client.post(f"/api/interview/{session_id}/hpi", json={
        "socrates_json": {
            "site": "Mid-chest",
            "onset": "Acute",
            "character": "Heavy tightness",
            "radiation": "None",
            "associations": "Mild breathlessness",
            "timing": "Continuous",
            "exacerbating_relieving": "Worse walking upstairs",
            "severity": 6
        }
    })
    assert res_hpi.status_code == 200

    # 7. Past History & Mandatory Allergies
    res_ph = client.post(f"/api/interview/{session_id}/ph", json={
        "past_diagnoses": "Hypertension for 3 years",
        "surgeries": "None",
        "medications": [{"name": "Amlodipine", "dose": "5mg", "frequency": "Once daily"}],
        "allergies": ["Sulfa drugs"],
        "allergies_confirmed": True
    })
    assert res_ph.status_code == 200

    # 8. Review of Systems (ROS)
    res_ros = client.post(f"/api/interview/{session_id}/ros", json={
        "systems_checklist": {
            "cardiovascular": {"chest_pain": True, "palpitations": False},
            "respiratory": {"shortness_of_breath": True}
        }
    })
    assert res_ros.status_code == 200

    # 9. AYUSH Mode (Dashavidha Pariksha)
    res_ayush = client.post(f"/api/interview/{session_id}/ayush", json={
        "prakriti": "Vata-Kapha",
        "vikriti": "Vata Vriddhi",
        "sara": "Madhyama",
        "samhanana": "Madhyama",
        "pramana": "Anurupa",
        "satmya": "Madhyama",
        "satva": "Pravara",
        "ahara_shakti": "Manda Agni",
        "vyayama_shakti": "Madhyama",
        "vaya": "Madhyama"
    })
    assert res_ayush.status_code == 200

    # 10. Patient Final Answer Confirmation
    res_pt_confirm = client.post(f"/api/interview/{session_id}/confirm", json={"confirmed": True})
    assert res_pt_confirm.status_code == 200

    # 11. Generate Case Report & FHIR R4 Bundle
    res_rep = client.post(f"/api/reports/{session_id}/generate")
    assert res_rep.status_code == 200
    report = res_rep.json()
    report_id = report["id"]
    assert report["status"] == "draft"
    assert report["fhir_bundle_json"]["resourceType"] == "Bundle"

    # 12. Doctor Queue View
    res_queue = client.get("/api/reports/queue")
    assert res_queue.status_code == 200
    assert len(res_queue.json()) >= 1

    # 13. Doctor Inline Edit
    res_edit = client.patch(f"/api/reports/{report_id}/edit-field", json={
        "section": "hpi",
        "field_name": "character",
        "new_value": "Constricting substernal tightness",
        "reason": "Clarified by patient during clinical interview"
    })
    assert res_edit.status_code == 200

    # 14. Doctor Confirmation Sign-Off
    res_doc_confirm = client.patch(f"/api/reports/{report_id}/confirm", json={
        "confirmed": True,
        "doctor_notes": "Clinical case confirmed. Plan: ECG and urgent Cardiology consult."
    })
    assert res_doc_confirm.status_code == 200
    assert res_doc_confirm.json()["status"] == "confirmed"

    # 15. Publish to ABDM Sandbox
    res_pub = client.post(f"/api/fhir/{report_id}/publish?target_system=ABDM_SANDBOX")
    assert res_pub.status_code == 200
    assert res_pub.json()["status"] == "published"

    # 16. DPDP Tamper-Evident Audit Chain Verification
    res_audit_verify = client.get("/api/audit/verify-chain")
    assert res_audit_verify.status_code == 200
    assert res_audit_verify.json()["valid"] is True
    assert res_audit_verify.json()["total_records"] > 5
