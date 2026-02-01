from scoring_system.config import (
    FAMILY_KEYWORDS, AGENCY_KEYWORDS, URGENCY_KEYWORDS,
    FINANCIAL_KEYWORDS, URL_KEYWORDS
)

def count_keywords(text, keywords):
    if not text:
        return 0
    text_lower = text.lower()
    return sum(text_lower.count(k.lower()) for k in keywords)

def has_url_pattern(text):
    """
    URL 포함 여부 (Binary: 0 or 1)
    명세서 3.1: http, .com 등 키워드 기반 탐지
    """
    if not text:
        return 0
    text_str = str(text).lower()
    return 1 if any(k in text_str for k in URL_KEYWORDS) else 0

def extract_manual_features(text):
    """
    명세서 3.1 수동 특성(Manual Features) 추출 함수
    Return: Dictionary (XGBoost 입력 호환)
    """
    text_str = str(text) if text is not None else ""
    
    features = {
        # [사칭 탐지] 가족/지인 키워드 빈도
        "family_score": count_keywords(text_str, FAMILY_KEYWORDS),
        
        # [기관 사칭] 검찰/금융기관 키워드 빈도
        "agency_score": count_keywords(text_str, AGENCY_KEYWORDS),
        
        # [심리 압박] 긴급성 유도 키워드 빈도
        "urgency_score": count_keywords(text_str, URGENCY_KEYWORDS),
        
        # [금전 목적] 대출/송금 키워드 빈도
        "financial_score": count_keywords(text_str, FINANCIAL_KEYWORDS),
        
        # [접속 유도] URL 포함 여부 (0 또는 1)
        "has_url": has_url_pattern(text_str),
        
        # [패턴 분석] 문자 메시지 길이
        "text_len": len(text_str)
    }
    
    return features
