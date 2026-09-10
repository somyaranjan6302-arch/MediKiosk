from typing import Dict, Any, List, Tuple

RULE_ENGINE_VERSION = "1.2.0"

class RedFlagEngine:
    """
    Deterministic, auditable clinical safety rule engine for MediKiosk.
    Evaluates patient interview inputs without relying on opaque LLM hallucinations.
    Tiers:
      - Emergency: Immediate WebSocket alert pushed to front desk/nurse, patient pulled from normal queue.
      - Priority: Flagged for accelerated consultation.
      - Routine: Standard consultation order.
    """

    @staticmethod
    def evaluate(
        cc: Dict[str, Any],
        hpi: Dict[str, Any],
        ros: Dict[str, Any],
        ph: Dict[str, Any] = None
    ) -> Tuple[str, List[Dict[str, str]]]:
        triggered = []

        cc_desc = (cc.get("description") or "").lower()
        cc_sev = cc.get("severity") or 0
        hpi_data = hpi.get("socrates_json") or {}
        ros_data = ros.get("systems_checklist") or {}

        # Extract normalized strings
        site = str(hpi_data.get("site", "")).lower()
        char = str(hpi_data.get("character", "")).lower()
        radiation = str(hpi_data.get("radiation", "")).lower()
        assoc = str(hpi_data.get("associations", "")).lower()
        timing = str(hpi_data.get("timing", "")).lower()
        onset = str(hpi_data.get("onset", "")).lower()

        cardio = ros_data.get("cardiovascular", {})
        resp = ros_data.get("respiratory", {})
        neuro = ros_data.get("neurological", {})
        gi = ros_data.get("gastrointestinal", {})

        # Rule 1: Acute Coronary Syndrome (ACS) / Myocardial Infarction
        is_chest = "chest" in cc_desc or "chest" in site or "heart" in cc_desc or cardio.get("chest_pain", False)
        has_radiation = any(x in radiation for x in ["arm", "jaw", "neck", "shoulder", "back", "left arm"])
        has_cardio_assoc = any(x in assoc or x in cc_desc for x in ["sweat", "diaphoresis", "breathless", "shortness of breath", "dyspnea", "dizziness"])
        
        if is_chest and (has_radiation or has_cardio_assoc or cc_sev >= 8 or "crushing" in char or "pressure" in char):
            triggered.append({
                "rule_id": "RF-CARD-01",
                "description": "Acute Coronary Syndrome suspicion: Chest discomfort with radiation, diaphoresis, dyspnea, or crushing pressure.",
                "tier": "Emergency"
            })

        # Rule 2: Acute Stroke / Intracranial Catastrophe
        is_headache = "headache" in cc_desc or "head" in site or neuro.get("headache", False)
        is_thunderclap = any(x in onset or x in char or x in cc_desc for x in ["sudden", "thunderclap", "worst headache", "explosive"])
        has_neuro_deficit = any(x in assoc or x in cc_desc for x in ["vision", "blur", "double vision", "weakness", "numbness", "speech", "slurred", "paralysis"]) or neuro.get("weakness", False)

        if (is_headache and is_thunderclap) or (is_headache and has_neuro_deficit) or has_neuro_deficit:
            triggered.append({
                "rule_id": "RF-NEUR-02",
                "description": "Acute Cerebrovascular Event / Intracranial Emergency: Thunderclap headache or sudden focal neurological/visual deficit.",
                "tier": "Emergency"
            })

        # Rule 3: Severe Respiratory Distress / Airway Compromise
        is_resp = any(x in cc_desc for x in ["breath", "suffocat", "choking", "stridor", "asthma", "gasping"]) or resp.get("severe_dyspnea", False)
        if is_resp and (cc_sev >= 8 or any(x in assoc for x in ["blue", "cyanosis", "unable to speak", "stridor"])):
            triggered.append({
                "rule_id": "RF-RESP-03",
                "description": "Critical Airway or Respiratory Failure: Acute severe respiratory compromise with high distress.",
                "tier": "Emergency"
            })

        # Rule 4: Meningeal / Severe Sepsis Trigger
        has_fever = any(x in cc_desc or x in assoc for x in ["fever", "chills", "high temperature"])
        has_stiff_neck = any(x in cc_desc or x in assoc for x in ["stiff neck", "neck stiffness", "mening"])
        has_altered_sensorium = any(x in cc_desc or x in assoc for x in ["confusion", "disoriented", "delirium", "unresponsive"])
        if has_fever and (has_stiff_neck or has_altered_sensorium):
            triggered.append({
                "rule_id": "RF-SEPSIS-04",
                "description": "Meningitis / Sepsis Alert: High fever accompanied by neck rigidity or altered mental status.",
                "tier": "Emergency"
            })

        # Rule 5: Massive Active Hemorrhage
        has_bleeding = any(x in cc_desc or x in assoc for x in ["vomiting blood", "hematemesis", "coughing blood", "hemoptysis", "heavy bleeding", "profuse bleeding"])
        if has_bleeding:
            triggered.append({
                "rule_id": "RF-HEM-05",
                "description": "Critical Hemorrhage: Active gastrointestinal or pulmonary hemorrhage reported.",
                "tier": "Emergency"
            })

        # Rule 6: Acute Psychiatric Crisis
        has_crisis = any(x in cc_desc for x in ["suicide", "kill myself", "end my life", "harm myself"])
        if has_crisis:
            triggered.append({
                "rule_id": "RF-PSYCH-06",
                "description": "Urgent Behavioral Crisis: Imminent danger of self-harm detected.",
                "tier": "Emergency"
            })

        # Priority Rules (if no Emergency)
        if not any(t["tier"] == "Emergency" for t in triggered):
            if "fever" in cc_desc and ("days" in cc.get("duration", "").lower() or cc_sev >= 7):
                triggered.append({
                    "rule_id": "RF-PRIO-01",
                    "description": "High Pyrexia / Prolonged Febrile Illness: Requires expedited physician assessment.",
                    "tier": "Priority"
                })

            if any(x in cc_desc for x in ["persistent vomiting", "cannot keep water down", "severe dehydration"]):
                triggered.append({
                    "rule_id": "RF-PRIO-02",
                    "description": "Severe Persistent Vomiting: Risk of rapid electrolyte disturbance and dehydration.",
                    "tier": "Priority"
                })

            if cardio.get("palpitations", False) and cc_sev >= 6:
                triggered.append({
                    "rule_id": "RF-PRIO-03",
                    "description": "Symptomatic Palpitations: Requires prompt rhythm evaluation.",
                    "tier": "Priority"
                })

        # Determine overall tier
        if any(t["tier"] == "Emergency" for t in triggered):
            severity_tier = "Emergency"
        elif any(t["tier"] == "Priority" for t in triggered):
            severity_tier = "Priority"
        else:
            severity_tier = "Routine"

        return severity_tier, triggered
