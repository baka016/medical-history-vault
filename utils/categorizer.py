def categorize(text):
    text = text.lower()

    if any(word in text for word in ["cbc", "blood", "rbs", "lab"]):
        return "Lab Results"

    elif any(word in text for word in ["tablet", "mg", "prescription", "rx"]):
        return "Prescription"

    elif any(word in text for word in ["tooth", "dental", "gum"]):
        return "Dental"

    elif any(word in text for word in ["vaccine", "dose", "immunization"]):
        return "Vaccination"

    else:
        return "General Health"