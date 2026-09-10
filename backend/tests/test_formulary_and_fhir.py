import pytest
from app.services.formulary_service import FormularyService
from app.services.fhir_service import FhirService

def test_drug_formulary_matching():
    # Test common Indian essential medicines
    name1, conf1 = FormularyService.match_drug_name("Tab. Paracetamol 650mg")
    assert name1 == "Paracetamol (Acetaminophen)"
    assert conf1 > 0.80

    name2, conf2 = FormularyService.match_drug_name("Metformin HCl 500")
    assert name2 == "Metformin Hydrochloride"
    assert conf2 > 0.80

    name3, conf3 = FormularyService.match_drug_name("Telmisartan 40")
    assert name3 == "Telmisartan"
    assert conf3 > 0.80

def test_lab_reference_intervals():
    # Normal glucose
    res_normal = FormularyService.validate_lab_value("Fasting Blood Glucose", "92 mg/dL")
    assert res_normal["flagged"] is False

    # High diabetic glucose
    res_high = FormularyService.validate_lab_value("Fasting Blood Glucose", "165 mg/dL")
    assert res_high["flagged"] is True
    assert "HIGH" in res_high["reason"]

    # Low hemoglobin (Anemia)
    res_anemia = FormularyService.validate_lab_value("Hemoglobin", "9.4 g/dL")
    assert res_anemia["flagged"] is True
    assert "LOW" in res_anemia["reason"]

def test_fhir_r4_bundle_generation():
    patient = {"id": "pat-test-1", "name": "Ram Lal", "gender": "Male", "dob": "1980-01-01", "abha_id": "91-1234-5678-9012"}
    session = {"id": "sess-test-1", "language": "hi"}
    cc = {"description": "Chest pain on exertion", "severity": 7, "onset": "Yesterday"}
    hpi = {"socrates_json": {"site": "Chest", "character": "Pressure"}}
    ph = {"past_diagnoses": "Hypertension", "surgeries": "None", "allergies": ["Aspirin"]}
    ros = {"systems_checklist": {"cardiovascular": {"chest_pain": True}}}
    ayush = {"prakriti": "Pitta-Kapha", "vikriti": "Pitta", "ahara_shakti": "Tikshna Agni", "satva": "Pravara"}

    bundle = FhirService.generate_bundle(patient, session, cc, hpi, ph, ros, ayush)
    assert bundle["resourceType"] == "Bundle"
    assert bundle["type"] == "document"
    
    resource_types = [entry["resource"]["resourceType"] for entry in bundle["entry"]]
    assert "Composition" in resource_types
    assert "Patient" in resource_types
    assert "Condition" in resource_types
    assert "Observation" in resource_types
    assert "AllergyIntolerance" in resource_types

    # Ensure Composition is the first resource
    assert bundle["entry"][0]["resource"]["resourceType"] == "Composition"
