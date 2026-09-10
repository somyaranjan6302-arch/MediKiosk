import re
from typing import Optional, Dict, Any, Tuple

# Essential Medicines Formulary (NLEM India / RxNorm curated subset)
FORMULARY_DB = {
    "paracetamol": {"std_name": "Paracetamol (Acetaminophen)", "class": "Analgesic / Antipyretic", "std_doses": ["500mg", "650mg"]},
    "metformin": {"std_name": "Metformin Hydrochloride", "class": "Biguanide / Antidiabetic", "std_doses": ["500mg", "850mg", "1000mg"]},
    "telmisartan": {"std_name": "Telmisartan", "class": "Angiotensin II Receptor Blocker (ARB)", "std_doses": ["20mg", "40mg", "80mg"]},
    "amlodipine": {"std_name": "Amlodipine Besylate", "class": "Calcium Channel Blocker", "std_doses": ["2.5mg", "5mg", "10mg"]},
    "atorvastatin": {"std_name": "Atorvastatin Calcium", "class": "HMG-CoA Reductase Inhibitor (Statin)", "std_doses": ["10mg", "20mg", "40mg"]},
    "pantoprazole": {"std_name": "Pantoprazole Sodium", "class": "Proton Pump Inhibitor (PPI)", "std_doses": ["20mg", "40mg"]},
    "amoxicillin": {"std_name": "Amoxicillin / Clavulanate", "class": "Beta-lactam Antibiotic", "std_doses": ["250mg", "500mg", "625mg"]},
    "azithromycin": {"std_name": "Azithromycin", "class": "Macrolide Antibiotic", "std_doses": ["250mg", "500mg"]},
    "ceftriaxone": {"std_name": "Ceftriaxone Sodium", "class": "Cephalosporin Antibiotic", "std_doses": ["500mg", "1g", "2g"]},
    "salbutamol": {"std_name": "Salbutamol (Albuterol)", "class": "Beta-2 Adrenergic Agonist (Bronchodilator)", "std_doses": ["100mcg inhaler", "2mg", "4mg"]},
    "insulin glargine": {"std_name": "Insulin Glargine", "class": "Long-acting Insulin Analogue", "std_doses": ["100 IU/mL"]},
    "ibuprofen": {"std_name": "Ibuprofen", "class": "NSAID", "std_doses": ["200mg", "400mg"]},
    "diclofenac": {"std_name": "Diclofenac Sodium", "class": "NSAID", "std_doses": ["50mg", "75mg"]},
    "omeprazole": {"std_name": "Omeprazole", "class": "Proton Pump Inhibitor", "std_doses": ["20mg", "40mg"]},
    "losartan": {"std_name": "Losartan Potassium", "class": "ARB / Antihypertensive", "std_doses": ["25mg", "50mg", "100mg"]},
    "levothyroxine": {"std_name": "Levothyroxine Sodium", "class": "Thyroid Hormone", "std_doses": ["25mcg", "50mcg", "100mcg"]},
    "cetirizine": {"std_name": "Cetirizine Hydrochloride", "class": "Antihistamine", "std_doses": ["5mg", "10mg"]}
}

# Standard Clinical Laboratory Reference Intervals
LAB_REFERENCE_RANGES = {
    "hemoglobin": {"min": 12.0, "max": 17.5, "unit": "g/dL", "name": "Hemoglobin"},
    "fasting_glucose": {"min": 70.0, "max": 100.0, "unit": "mg/dL", "name": "Fasting Blood Glucose"},
    "postprandial_glucose": {"min": 80.0, "max": 140.0, "unit": "mg/dL", "name": "Post-Prandial Blood Glucose"},
    "hba1c": {"min": 4.0, "max": 5.7, "unit": "%", "name": "Glycated Hemoglobin (HbA1c)"},
    "creatinine": {"min": 0.6, "max": 1.3, "unit": "mg/dL", "name": "Serum Creatinine"},
    "platelets": {"min": 150000, "max": 450000, "unit": "/mcL", "name": "Platelet Count"},
    "wbc": {"min": 4000, "max": 11000, "unit": "/mcL", "name": "Total Leukocyte Count (WBC)"},
    "total_cholesterol": {"min": 120.0, "max": 200.0, "unit": "mg/dL", "name": "Total Serum Cholesterol"},
    "potassium": {"min": 3.5, "max": 5.1, "unit": "mEq/L", "name": "Serum Potassium"},
    "alt_sgpt": {"min": 7.0, "max": 56.0, "unit": "U/L", "name": "Alanine Aminotransferase (SGPT)"}
}

class FormularyService:
    @staticmethod
    def match_drug_name(raw_name: str) -> Tuple[Optional[str], float]:
        """
        Cross-checks raw OCR/transcript drug text against standard formulary.
        Returns (standardized_name, match_confidence).
        """
        if not raw_name:
            return None, 0.0

        clean = raw_name.strip().lower()

        # Exact check
        for key, details in FORMULARY_DB.items():
            if key == clean or clean in key or key in clean:
                return details["std_name"], 0.95

        # Substring / Token matching
        tokens = re.findall(r'[a-zA-Z]+', clean)
        for t in tokens:
            if len(t) >= 4:
                for key, details in FORMULARY_DB.items():
                    if t in key:
                        return details["std_name"], 0.82

        return None, 0.40

    @staticmethod
    def validate_lab_value(test_name: str, raw_value: str) -> Dict[str, Any]:
        """
        Validates clinical laboratory test values against established reference intervals.
        """
        clean_name = test_name.lower().replace("-", " ")
        tokens = set(clean_name.split())
        
        # Match test key
        matched_key = None
        for k in LAB_REFERENCE_RANGES:
            k_tokens = set(k.replace("_", " ").split())
            if k in clean_name.replace(" ", "_") or clean_name.replace(" ", "_") in k:
                matched_key = k
                break
            # Token intersection match e.g. 'fasting' and 'glucose'
            if k_tokens.issubset(tokens) or (len(k_tokens & tokens) >= 2):
                matched_key = k
                break

        if not matched_key:
            return {
                "matched": False,
                "flagged": False,
                "reason": "Test name not in primary reference dictionary"
            }

        ref = LAB_REFERENCE_RANGES[matched_key]

        # Extract numeric value
        numeric_matches = re.findall(r'[-+]?\d*\.\d+|\d+', str(raw_value).replace(",", ""))
        if not numeric_matches:
            return {
                "matched": True,
                "test_name": ref["name"],
                "flagged": False,
                "reference_range": f"{ref['min']} - {ref['max']} {ref['unit']}"
            }

        val = float(numeric_matches[0])
        flagged = False
        reason = "Normal"

        if val < ref["min"]:
            flagged = True
            reason = f"LOW: {val} {ref['unit']} (Ref: {ref['min']}-{ref['max']} {ref['unit']})"
        elif val > ref["max"]:
            flagged = True
            reason = f"HIGH: {val} {ref['unit']} (Ref: {ref['min']}-{ref['max']} {ref['unit']})"

        return {
            "matched": True,
            "test_name": ref["name"],
            "numeric_value": val,
            "unit": ref["unit"],
            "reference_range": f"{ref['min']} - {ref['max']} {ref['unit']}",
            "flagged": flagged,
            "reason": reason
        }
