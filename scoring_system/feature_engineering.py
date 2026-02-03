from config import (
    FAMILY_KEYWORDS, AGENCY_KEYWORDS, URGENCY_KEYWORDS,
    FINANCIAL_KEYWORDS, URL_KEYWORDS
)

def count_keywords(text, keywords):
    return sum(text.lower().count(k.lower()) for k in keywords)

def has_url_pattern(text):
    return 1 if any(k in str(text) for k in URL_KEYWORDS) else 0

def extract_manual_features(text):
    #return variable as dictionary
    text = str(text)
    return {
        "family_score": count_keywords(text, FAMILY_KEYWORDS),
        "agency_score": count_keywords(text, AGENCY_KEYWORDS),
        "urgency_score": count_keywords(text, URGENCY_KEYWORDS),
        "financial_score": count_keywords(text, FINANCIAL_KEYWORDS),
        "has_url": has_url_pattern(text),
        "text_len": len(text)
    }