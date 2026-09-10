import pytest
from app.services.redflag_engine import RedFlagEngine

def test_acute_coronary_syndrome_trigger():
    # Positive case: Chest pain radiating to left arm with diaphoresis
    cc = {"description": "Severe chest pain and heavy pressure", "severity": 8, "duration": "2 hours"}
    hpi = {
        "socrates_json": {
            "site": "Substernal chest",
            "radiation": "Radiating to left arm and jaw",
            "associations": "Cold diaphoresis and shortness of breath"
        }
    }
    ros = {"systems_checklist": {"cardiovascular": {"chest_pain": True}}}
    
    tier, rules = RedFlagEngine.evaluate(cc, hpi, ros)
    assert tier == "Emergency"
    assert any(r["rule_id"] == "RF-CARD-01" for r in rules)

def test_acute_neurological_stroke_trigger():
    # Positive case: Thunderclap headache with sudden vision loss
    cc = {"description": "Sudden explosive headache, worst pain of my life", "severity": 10, "duration": "30 mins"}
    hpi = {
        "socrates_json": {
            "onset": "Sudden onset like a lightning strike",
            "character": "Thunderclap",
            "associations": "Blurry vision in left eye and numbness"
        }
    }
    ros = {"systems_checklist": {"neurological": {"headache": True, "weakness": True}}}
    
    tier, rules = RedFlagEngine.evaluate(cc, hpi, ros)
    assert tier == "Emergency"
    assert any(r["rule_id"] == "RF-NEUR-02" for r in rules)

def test_meningitis_sepsis_trigger():
    # Positive case: High fever with neck stiffness
    cc = {"description": "High fever with shaking chills", "severity": 7, "duration": "1 day"}
    hpi = {
        "socrates_json": {
            "associations": "Stiff neck and inability to touch chin to chest"
        }
    }
    ros = {"systems_checklist": {}}
    
    tier, rules = RedFlagEngine.evaluate(cc, hpi, ros)
    assert tier == "Emergency"
    assert any(r["rule_id"] == "RF-SEPSIS-04" for r in rules)

def test_priority_tier_trigger():
    # Priority case: Persistent high fever for 5 days without emergency flags
    cc = {"description": "High fever with generalized body ache", "severity": 7, "duration": "5 days"}
    hpi = {"socrates_json": {"site": "Generalized", "radiation": "None", "associations": "Mild cough"}}
    ros = {"systems_checklist": {}}
    
    tier, rules = RedFlagEngine.evaluate(cc, hpi, ros)
    assert tier == "Priority"
    assert any(r["rule_id"] == "RF-PRIO-01" for r in rules)

def test_routine_negative_case():
    # Negative case: Routine mild chronic back pain
    cc = {"description": "Mild lower back ache after lifting groceries", "severity": 3, "duration": "2 days"}
    hpi = {
        "socrates_json": {
            "site": "Lumbar spine",
            "character": "Dull ache",
            "radiation": "None",
            "associations": "None"
        }
    }
    ros = {"systems_checklist": {"musculoskeletal": {"joint_pain": True}}}
    
    tier, rules = RedFlagEngine.evaluate(cc, hpi, ros)
    assert tier == "Routine"
    assert len(rules) == 0
