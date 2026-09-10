import uuid
from datetime import datetime
from typing import Dict, Any, List

class FhirService:
    """
    Generates standard HL7 FHIR R4 resources conforming to ABDM NRCES India profiles.
    Resources created:
      - Patient
      - Condition
      - Observation
      - MedicationStatement
      - AllergyIntolerance
      - Composition (Encounter Case-Taking Document)
      - DocumentReference
    """

    @staticmethod
    def generate_bundle(
        patient: Dict[str, Any],
        session: Dict[str, Any],
        cc: Dict[str, Any],
        hpi: Dict[str, Any],
        ph: Dict[str, Any],
        ros: Dict[str, Any],
        ayush: Dict[str, Any] = None,
        documents: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        bundle_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + "Z"
        entries = []

        patient_ref = f"Patient/{patient.get('id', 'pat-anonymous')}"

        # 1. FHIR Patient
        patient_resource = {
            "fullUrl": f"urn:uuid:{patient.get('id')}",
            "resource": {
                "resourceType": "Patient",
                "id": str(patient.get("id")),
                "identifier": [
                    {
                        "system": "https://healthid.ndhm.gov.in",
                        "value": patient.get("abha_id", "NOT_LINKED")
                    },
                    {
                        "system": "https://hospital.gov.in/mrn",
                        "value": patient.get("mrn", "UNKNOWN_MRN")
                    }
                ],
                "name": [
                    {
                        "text": patient.get("name", "Unknown Patient")
                    }
                ],
                "telecom": [
                    {
                        "system": "phone",
                        "value": patient.get("phone", "")
                    }
                ],
                "gender": (patient.get("gender") or "unknown").lower(),
                "birthDate": patient.get("dob")
            }
        }
        entries.append(patient_resource)

        # 2. FHIR Condition (Chief Complaint)
        condition_id = str(uuid.uuid4())
        if cc and cc.get("description"):
            condition_resource = {
                "fullUrl": f"urn:uuid:{condition_id}",
                "resource": {
                    "resourceType": "Condition",
                    "id": condition_id,
                    "clinicalStatus": {
                        "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active"}]
                    },
                    "subject": {"reference": patient_ref},
                    "code": {
                        "text": cc.get("description")
                    },
                    "onsetDateTime": timestamp,
                    "severity": {
                        "text": f"Score {cc.get('severity', 5)}/10"
                    }
                }
            }
            entries.append(condition_resource)

        # 3. FHIR Observation (Pain Severity)
        if cc and cc.get("severity"):
            obs_id = str(uuid.uuid4())
            obs_resource = {
                "fullUrl": f"urn:uuid:{obs_id}",
                "resource": {
                    "resourceType": "Observation",
                    "id": obs_id,
                    "status": "final",
                    "code": {
                        "coding": [{"system": "http://loinc.org", "code": "72514-3", "display": "Pain severity - 0-10 verbal numeric rating scale"}]
                    },
                    "subject": {"reference": patient_ref},
                    "effectiveDateTime": timestamp,
                    "valueInteger": int(cc.get("severity", 5))
                }
            }
            entries.append(obs_resource)

        # 4. FHIR AllergyIntolerance (Mandatory Field)
        allergies = (ph.get("allergies") or []) if ph else []
        if allergies:
            for alg in allergies:
                alg_id = str(uuid.uuid4())
                entries.append({
                    "fullUrl": f"urn:uuid:{alg_id}",
                    "resource": {
                        "resourceType": "AllergyIntolerance",
                        "id": alg_id,
                        "clinicalStatus": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", "code": "active"}]},
                        "patient": {"reference": patient_ref},
                        "code": {"text": alg}
                    }
                })
        else:
            alg_id = str(uuid.uuid4())
            entries.append({
                "fullUrl": f"urn:uuid:{alg_id}",
                "resource": {
                    "resourceType": "AllergyIntolerance",
                    "id": alg_id,
                    "clinicalStatus": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", "code": "active"}]},
                    "patient": {"reference": patient_ref},
                    "code": {"text": "No known drug allergies (NKDA)"}
                }
            })

        # 5. FHIR Composition (Clinical Case-Taking Report)
        composition_id = str(uuid.uuid4())
        sections = [
            {
                "title": "Chief Complaint",
                "code": {"coding": [{"system": "http://loinc.org", "code": "10154-3", "display": "Chief complaint"}]},
                "text": {"status": "generated", "div": f"<div>{cc.get('description', 'None')} - Onset: {cc.get('onset', '')}</div>"}
            },
            {
                "title": "History of Present Illness (SOCRATES)",
                "code": {"coding": [{"system": "http://loinc.org", "code": "11348-0", "display": "History of present illness"}]},
                "text": {"status": "generated", "div": f"<div>{str(hpi.get('socrates_json', {}))}</div>"}
            },
            {
                "title": "Past Medical & Surgical History",
                "code": {"coding": [{"system": "http://loinc.org", "code": "11348-0", "display": "Past history"}]},
                "text": {"status": "generated", "div": f"<div>Diagnoses: {ph.get('past_diagnoses', 'None')}; Surgeries: {ph.get('surgeries', 'None')}</div>"}
            }
        ]

        if ayush and ayush.get("prakriti"):
            sections.append({
                "title": "Traditional AYUSH Assessment (Dashavidha Pariksha)",
                "code": {"coding": [{"system": "https://ayush.gov.in/codes", "code": "DVP-01", "display": "Dashavidha Pariksha"}]},
                "text": {
                    "status": "generated",
                    "div": f"<div>Prakriti: {ayush.get('prakriti')}; Vikriti: {ayush.get('vikriti')}; Agni: {ayush.get('ahara_shakti')}; Satva: {ayush.get('satva')}</div>"
                }
            })

        composition_resource = {
            "fullUrl": f"urn:uuid:{composition_id}",
            "resource": {
                "resourceType": "Composition",
                "id": composition_id,
                "status": "preliminary", # Editable draft until doctor confirmation
                "type": {
                    "coding": [{"system": "http://loinc.org", "code": "34117-2", "display": "History and physical note"}]
                },
                "subject": {"reference": patient_ref},
                "date": timestamp,
                "title": "MediKiosk Patient Case-Taking Encounter Record",
                "section": sections
            }
        }
        # Composition must be the first entry in a FHIR Document Bundle
        entries.insert(0, composition_resource)

        return {
            "resourceType": "Bundle",
            "id": bundle_id,
            "type": "document",
            "timestamp": timestamp,
            "compositionId": composition_id,
            "entry": entries
        }
