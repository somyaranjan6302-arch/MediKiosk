from typing import Dict, Any, List

class InterviewEngine:
    """
    Ontology-constrained clinical dialogue orchestrator for patient case-taking.
    Strictly forbids autonomous diagnosing, therapeutic recommendations, or speculative hallucination.
    """

    @staticmethod
    def generate_cc_followups(description: str, language: str = "hi") -> List[Dict[str, Any]]:
        """
        Generates guided follow-up questions tailored to the patient's stated chief complaint.
        """
        desc_lower = description.lower()
        questions = []

        if language == "hi":
            questions.append({
                "id": "q_onset",
                "label": "यह समस्या कब शुरू हुई थी?",
                "field": "onset",
                "options": ["आज ही", "2-3 दिन पहले", "1 सप्ताह पहले", "1 महीने से अधिक"]
            })
            questions.append({
                "id": "q_duration",
                "label": "क्या यह परेशानी लगातार बनी रहती है या बीच-बीच में होती है?",
                "field": "duration",
                "options": ["लगातार", "रुक-रुक कर", "केवल काम करते समय"]
            })
            questions.append({
                "id": "q_severity",
                "label": "1 से 10 के पैमाने पर दर्द या परेशानी कितनी गंभीर है?",
                "field": "severity",
                "type": "slider",
                "min": 1,
                "max": 10
            })
        else:
            questions.append({
                "id": "q_onset",
                "label": "When did this symptom begin?",
                "field": "onset",
                "options": ["Today", "2-3 days ago", "1 week ago", "More than a month"]
            })
            questions.append({
                "id": "q_duration",
                "label": "Is this continuous or does it come and go?",
                "field": "duration",
                "options": ["Continuous", "Intermittent", "Only during exertion"]
            })
            questions.append({
                "id": "q_severity",
                "label": "On a scale of 1 to 10, how severe is your discomfort?",
                "field": "severity",
                "type": "slider",
                "min": 1,
                "max": 10
            })

        return questions

    @staticmethod
    def generate_patient_readback(step_name: str, data: Dict[str, Any], language: str = "hi") -> str:
        """
        Creates an explicit verbal readback summary for the patient to verify with a yes/no confirmation.
        """
        if language == "hi":
            if step_name == "cc":
                desc = data.get("description", "समस्या")
                onset = data.get("onset", "")
                sev = data.get("severity", "")
                return f"आपने बताया कि आपको '{desc}' है, जो '{onset}' शुरू हुआ था और गंभीरता 10 में से {sev} है। क्या यह सही है?"
            elif step_name == "ph":
                allergies = data.get("allergies", [])
                allergy_str = ", ".join(allergies) if allergies else "कोई दवा एलर्जी नहीं"
                return f"आपकी पुरानी बीमारियों और दवाओं को दर्ज किया गया है। एलर्जी की जानकारी: '{allergy_str}'। क्या यह सही है?"
            elif step_name == "hpi":
                site = data.get("socrates_json", {}).get("site", "स्थान")
                return f"आपने दर्द का स्थान '{site}' बताया है। क्या यह विवरण सही है?"
            else:
                return "कृपया अपनी दी गई जानकारी की पुष्टि करें।"
        else:
            if step_name == "cc":
                desc = data.get("description", "symptom")
                onset = data.get("onset", "")
                sev = data.get("severity", "")
                return f"You reported '{desc}', starting '{onset}', with a severity of {sev}/10. Is this correct?"
            elif step_name == "ph":
                allergies = data.get("allergies", [])
                allergy_str = ", ".join(allergies) if allergies else "No known drug allergies"
                return f"Your medical history is recorded. Allergy declaration: '{allergy_str}'. Is this correct?"
            elif step_name == "hpi":
                site = data.get("socrates_json", {}).get("site", "area")
                return f"You noted the discomfort is located at '{site}'. Is this accurate?"
            else:
                return "Please confirm if your recorded answers are accurate."
