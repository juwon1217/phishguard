import re

# --- KEYWORD COMPONENT ---
LEAK_KEYWORDS = ["비밀번호", "비번", "핀번호", "pin", "otp", "보안카드", "계좌", "은행", "이름", "성함", "주소", "배송지", "인증번호"]
DEFENSE_KEYWORDS = ["신고", "경찰", "사기", "피싱", "누구", "끊어", "안해", "싫어", "없어", "몰라", "거절", "의심", "믿"]

def count_keywords(text, keywords):
    return sum(text.lower().count(k) for k in keywords)

# --- REGEX COMPONENT ---
def has_rrn_pattern(text):
    # Matches typical RRN format: 6 digits - 1-4 followed by 6 digits
    # Or just 13 digits loosely
    pattern = r'\d{6}[- ]?[1-4]\d{6}'
    return 1 if re.search(pattern, text) else 0

def has_phone_pattern(text):
    # Matches 010-XXXX-XXXX or 010XXXXXXXX
    pattern = r'010[- ]?\d{3,4}[- ]?\d{4}'
    return 1 if re.search(pattern, text) else 0

def has_account_pattern(text):
    # Generic account pattern: 3+ digits - 2+ digits - 6+ digits
    # Or strict digits >= 10
    pattern = r'\d{3,}[- ]?\d{2,}[- ]?\d{5,}'
    return 1 if re.search(pattern, text) else 0

def has_name_pattern(text):
    # Pattern 1: Name + Suffix (Context-free high probability)
    # e.g., "김주원입니다", "김주원이에요"
    p1 = r'([김이박최정강조윤장임한오서권황안송전선배유백희][가-힣]{1,2})(입니다|예요|이에요|라고|입니당|임)'
    if re.search(p1, text):
        return 2 # High confidence (Pattern 1)

    # Pattern 2: Standalone 3-char Name (Needs context)
    # e.g., "김주원" (Exact match)
    p2 = r'^[김이박최정강조윤장임한오서권황안송전선배유백희][가-힣]{2}$'
    if re.match(p2, text.strip()):
        return 1 # Low confidence (Pattern 2, needs context)
    
    return 0

def extract_user_features(text):
    text = str(text)
    return {
        "leak_keyword_count": count_keywords(text, LEAK_KEYWORDS),
        "defense_keyword_count": count_keywords(text, DEFENSE_KEYWORDS),
        "has_rrn": has_rrn_pattern(text),
        "has_phone": has_phone_pattern(text),
        "has_account": has_account_pattern(text),
        "has_name": has_name_pattern(text),
        "text_len": len(text)
    }
