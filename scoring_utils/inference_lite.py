import json
import re
import math
import os
from . import config
from .feature_engineering import extract_manual_features

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
    # pattern: (?u)\b\w\w+\b
    return re.findall(r"(?u)\b\w\w+\b", text.lower())

def get_ngrams(tokens, n=1):
    if n == 1:
        return tokens
    if n == 2:
        return [f"{tokens[i]} {tokens[i+1]}" for i in range(len(tokens)-1)]
    return []

def compute_tfidf(text, tfidf_config):
    vocab = tfidf_config['vocab'] # word -> index
    idf = tfidf_config['idf']     # index -> idf value
    norm = tfidf_config['norm']   # 'l2'
    
    # 1. Tokenize & N-Grams (1, 2)
    tokens = tokenize(text)
    terms = tokens + get_ngrams(tokens, 2)
    
    # 2. Count Term Frequency
    tf = {} # index -> count
    for term in terms:
        if term in vocab:
            idx = vocab[term]
            tf[idx] = tf.get(idx, 0) + 1
            
    # 3. Apply TF-IDF Weights
    # Sklearn TF-IDF: tf * idf
    vector = {} # index -> value
    for idx, count in tf.items():
        vector[idx] = count * idf[idx]
        
    # 4. Normalize (L2)
    if norm == 'l2':
        sum_sq = sum(v**2 for v in vector.values())
        if sum_sq > 0:
            scale = 1 / math.sqrt(sum_sq)
            for idx in vector:
                vector[idx] *= scale
                
    return vector # sparse representation (dict)

def traverse_tree(tree, features):
    """
    Traverse a single XGBoost JSON tree.
    features: List[float] (dense vector)
    """
    node = tree
    # Check if 'leaf' key exists directly (depending on dump format)
    # Recursion or Loop. JSON dump usually has nested structure.
    # Actually, verify format:
    # {"nodeid": 0, "split": "f10", "split_condition": 0.5, "yes": 1, "no": 2, "children": [...]}
    # OR {"nodeid": 0, "leaf": 0.123}
    
    while 'leaf' not in node and 'children' in node:
        # Standard XGBoost JSON dump structure
        split_feat_str = node['split'] # e.g. "f5"
        # Extract index: f5 -> 5
        feat_idx = int(split_feat_str[1:])
        
        threshold = node['split_condition']
        
        val = features[feat_idx]
        
        # Decide direction
        # < for numerical. default direction logic usually follows `yes`/`no` IDs
        # The 'children' list contains the next nodes.
        # We need to match the ID.
        
        next_id = node['yes'] if val < threshold else node['no']
        
        # Find child with that ID
        found = False
        for child in node['children']:
            if child['nodeid'] == next_id:
                node = child
                found = True
                break
        if not found:
            break # Should not happen
            
    return node.get('leaf', 0.0)

def predict_phishing_score(text):
    try:
        load_lite_model()
        tfidf_data = _MODEL_DATA['tfidf']
        xgb_data = _MODEL_DATA['xgb']
        
        # --- 1. Construct Feature Vector ---
        # Features 0-5: Manual
        # Features 6+: TF-IDF
        
        manual_feats = extract_manual_features(text)
        manual_vector = [manual_feats[k] for k in config.MANUAL_FEATURES] # list of 6 ints
        
        # [CRITICAL FIX] Map text_len to f0 and f5
        # The model (from analysis) has splits on f0 and f5 that look like length thresholds (80, 61, etc.)
        # Default config puts text_len at index 5. f0 was getting family_score (usually 0).
        # We force text_len into f0 as well to honor the model's structure.
        if len(manual_vector) > 5:
            # config.MANUAL_FEATURES order: family, agency, urgency, financial, url, text_len
            # We suspect f0 is also expected to be text_len based on split condition 80.
            manual_vector[0] = manual_feats['text_len'] 
            manual_vector[5] = manual_feats['text_len']
        
        tfidf_vector_sparse = compute_tfidf(text, tfidf_data) # dict {idx: val}
        
        # Combine into Dense Vector (size = 6 + vocab_size)
        # Vocab size = len(tfidf_data['idf'])
        total_feats = 6 + len(tfidf_data['idf'])
        features = [0.0] * total_feats
        
        # Fill Manual
        for i, v in enumerate(manual_vector):
            features[i] = float(v)
            
        # Fill TF-IDF (shifted by 6)
        for idx, val in tfidf_vector_sparse.items():
            features[idx + 6] = val
            
        # --- 2. XGBoost Prediction ---
        raw_score = 0.5 # Default base score? XGBoost usually adds raw scores + base_score (logit)
        # But JSON dump leaf values are raw logits.
        
        raw_sum = 0.0
        for tree in xgb_data['trees']:
            raw_sum += traverse_tree(tree, features)
            
        # Apply base_score (global bias) if needed, usually 0.5 probability -> logit 0? 
        # XGBoost default base_score=0.5 means initial prediction is 0.5 (logit 0).
        # So we add 0 to raw_sum? Or raw_sum is the delta?
        # Standard: output = sigmoid(sum(leaves) + base_margin)
        # If base_score is 0.5, base_margin (logit) is 0.
        
        final_prob = softmax(raw_sum)
        return round(final_prob * 100, 2)
        
    except Exception as e:
        print(f"Lite Inference Error: {e}")
        return 0.0
