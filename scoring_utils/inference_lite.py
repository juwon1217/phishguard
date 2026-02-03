import json
import re
import math
import os

# --- CONSTRAINED CONFIGURATION (INLINED) ---
FAMILY_KEYWORDS = ["엄마", "아빠", "딸", "아들", "고장", "수리", "편의점"]
AGENCY_KEYWORDS = ["검찰", "수사관", "서울지검", "금감원", "금융위원회", "계좌", "도용"]
URGENCY_KEYWORDS = ["즉시", "마감", "당장", "긴급", "구속", "영장", "유포"]
FINANCIAL_KEYWORDS = ["상품권", "핀번호", "송금", "이체", "대출", "승인", "선입금","전액"]
URL_KEYWORDS = ["http", "https", ".com", ".kr", "bit.ly",'click.gl', 'url.kr', 'band-us.tv', 'tr.im', 'vo.la',
            'gg.gg', 'iii.im', 'open.kakao.com', 'band-us.io', 'han.gl',
            'pf.kakao.com', 'na.to', 'vvd.bz', 'do.cco.kr', 'tuney.kr']

MANUAL_FEATURES = [
    "family_score",
    "agency_score",
    "urgency_score",
    "financial_score",
    "has_url",
    "text_len"
]

# --- HELPER FUNCTIONS (INLINED) ---
def count_keywords(text, keywords):
    return sum(text.lower().count(k.lower()) for k in keywords)

def has_url_pattern(text):
    return 1 if any(k in str(text) for k in URL_KEYWORDS) else 0

def extract_manual_features(text):
    text = str(text)
    return {
        "family_score": count_keywords(text, FAMILY_KEYWORDS),
        "agency_score": count_keywords(text, AGENCY_KEYWORDS),
        "urgency_score": count_keywords(text, URGENCY_KEYWORDS),
        "financial_score": count_keywords(text, FINANCIAL_KEYWORDS),
        "has_url": has_url_pattern(text),
        "text_len": len(text)
    }

_MODEL_DATA = None

def load_lite_model():
    global _MODEL_DATA
    if _MODEL_DATA is None:
        base_path = os.path.dirname(__file__)
        path = os.path.join(base_path, "model_lite.json")
        with open(path, 'r', encoding='utf-8') as f:
            _MODEL_DATA = json.load(f)

def softmax(x):
    """Compute sigmoid function (logistic)"""
    return 1 / (1 + math.exp(-x))

def tokenize(text):
    """Replicate Sklearn TfidfVectorizer default tokenization"""
    return re.findall(r"(?u)\b\w\w+\b", text.lower())

def get_ngrams(tokens, n=1):
    if n == 1:
        return tokens
    if n == 2:
        return [f"{tokens[i]} {tokens[i+1]}" for i in range(len(tokens)-1)]
    return []

def compute_tfidf(text, tfidf_config):
    vocab = tfidf_config['vocab'] 
    idf = tfidf_config['idf']
    norm = tfidf_config['norm']
    
    tokens = tokenize(text)
    terms = tokens + get_ngrams(tokens, 2)
    
    tf = {} 
    for term in terms:
        if term in vocab:
            idx = vocab[term]
            tf[idx] = tf.get(idx, 0) + 1
            
    vector = {} 
    for idx, count in tf.items():
        vector[idx] = count * idf[idx]
        
    if norm == 'l2':
        sum_sq = sum(v**2 for v in vector.values())
        if sum_sq > 0:
            scale = 1 / math.sqrt(sum_sq)
            for idx in vector:
                vector[idx] *= scale
                
    return vector

def traverse_tree(tree, features):
    node = tree
    while 'leaf' not in node and 'children' in node:
        split_feat_str = node['split'] 
        feat_idx = int(split_feat_str[1:])
        threshold = node['split_condition']
        val = features[feat_idx]
        next_id = node['yes'] if val < threshold else node['no']
        
        found = False
        for child in node['children']:
            if child['nodeid'] == next_id:
                node = child
                found = True
                break
        if not found:
            break
            
    return node.get('leaf', 0.0)



def predict_phishing_score(text):
    try:
        # --- HEURISTIC SCORING (FALLBACK MODE) ---
        # The XGBoost model is currently performing with 99% saturation (Sensitivity too high).
        # To provide a "Real Score" that matches the user's expectation of analyzing specific factors,
        # we will use a Weighted Sum of the extracted features.
        
        manual_feats = extract_manual_features(text)
        
        # Scoring Weights (Total max ~100)
        # Family/Agency/Financial are high risk -> 30 points each occurence
        # Urgency -> 20 points
        # URL -> 30 points
        # Text Length -> Very small factor (0.1 per char?) or ignored for score sum
        
        score = 0
        score += manual_feats.get('family_score', 0) * 35
        score += manual_feats.get('agency_score', 0) * 35
        score += manual_feats.get('financial_score', 0) * 30
        score += manual_feats.get('urgency_score', 0) * 20
        score += manual_feats.get('has_url', 0) * 30
        
        # Cap at 99.99
        final_score = min(99.99, float(score))
        
        # Return Score + Breakdown
        return {
            "score": final_score,
            "details": manual_feats 
        }
        
    except Exception as e:
        print(f"Lite Inference Error: {e}")
        return {"score": 0.0, "details": {}}
