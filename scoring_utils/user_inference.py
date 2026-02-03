import json
import math
import re
import os
import sys
from .user_feature_engineering import extract_user_features

_USER_MODEL_DATA = None

def load_user_lite_model():
    global _USER_MODEL_DATA
    if _USER_MODEL_DATA is None:
        try:
            base_dir = os.path.dirname(__file__)
            path = os.path.join(base_dir, "user_model_lite.json")
            with open(path, 'r', encoding='utf-8') as f:
                _USER_MODEL_DATA = json.load(f)
        except Exception as e:
            print(f"Error loading user lite model: {e}")
            return False
    return True

# --- TF-IDF Utils ---
def tokenize(text):
    """Simple tokenizer matching sklearn's default"""
    return re.findall(r"(?u)\b\w\w+\b", str(text).lower())

def get_ngrams(tokens, min_n=1, max_n=3):
    ngrams = []
    for n in range(min_n, max_n + 1):
        for i in range(len(tokens) - n + 1):
            ngrams.append(" ".join(tokens[i:i+n]))
    return ngrams

def compute_tfidf(text, tfidf_config):
    vocab = tfidf_config['vocab'] # Map term -> index
    idf = tfidf_config['idf']     # List of IDF values per index
    norm = tfidf_config['norm']   # 'l2' usually
    
    tokens = tokenize(text)
    terms = get_ngrams(tokens, 1, 3) # ngram_range(1, 3)
    
    # 1. Term Frequency
    tf = {}
    for term in terms:
        if term in vocab:
            idx = vocab[str(term)] # Ensure key is string
            tf[idx] = tf.get(idx, 0) + 1
            
    # 2. Apply IDF
    vector = {}
    for idx, count in tf.items():
        if idx < len(idf):
            vector[idx] = count * idf[idx]
            
    # 3. Normalize (L2)
    if norm == 'l2':
        sum_sq = sum(v**2 for v in vector.values())
        if sum_sq > 0:
            scale = 1.0 / math.sqrt(sum_sq)
            for idx in vector:
                vector[idx] *= scale
                
    return vector

# --- Random Forest Utils ---
def traverse_tree(node, features):
    # features is a DENSE list/array-like
    if "leaf" in node:
        return node["leaf"]
        
    # Check split
    idx = node["split_feature"]
    threshold = node["threshold"]
    
    # Get value
    val = features.get(idx, 0.0) # Sparse dict access
    
    if val <= threshold:
        return traverse_tree(node["left"], features)
    else:
        return traverse_tree(node["right"], features)

def predict_rf_lite(features_sparse, rf_trees):
    # features_sparse is dict {idx: value}
    # Prediction is average of tree probabilities
    total_prob = 0.0
    for tree in rf_trees:
        total_prob += traverse_tree(tree, features_sparse)
        
    return total_prob / len(rf_trees)

def predict_user_leakage(text):
    if not load_user_lite_model():
        return 0.0, {}
        
    try:
        tfidf_config = _USER_MODEL_DATA['tfidf']
        rf_trees = _USER_MODEL_DATA['rf_trees']
        
        # 1. Manual Features
        manual_feats = extract_user_features(text)
        # Order: leak_kw, defense_kw, rrn, phone, account, len
        # Same order as creating DataFrame in train script
        # Map manual features to indices 0..5
        # Order in `extract_user_features` result dict matches?
        # NO, dict is unordered. 
        # In `train_user_model.py`:
        # `manual_features_list = df['text'].apply(extract_user_features).tolist()`
        # `pd.DataFrame(manual_features_list)` sorts columns alphabetically?
        # NO, `pd.DataFrame(list_of_dicts)` uses keys as columns.
        # If Python 3.7+, dict insert order is preserved.
        # `extract_user_features` returns:
        # leak_keyword_count, defense_keyword_count, has_rrn, has_phone, has_account, text_len
        # Let's assume indices 0,1,2,3,4,5 correspond to these keys in that order IF training script preserved it.
        # BUT, to be safe, I should map keys to indices based on my knowledge or check training script.
        # `pd.DataFrame` creates columns in alphanumeric order if not specified? 
        # Wait, if I pass a list of dicts, pandas aligns them.
        # But `hstack([X_manual, X_tfidf])` combines them.
        # So indices 0..5 are Manual, 6..1005 are TF-IDF.
        # What is the order of X_manual columns?
        # If I didn't specify columns, Pandas sorts them?
        # Let's check `train_user_model.py`: `X_manual = pd.DataFrame(manual_features_list)`
        # Pandas default behavior: keys are sorted? Or usage order?
        # In recent pandas, it usually respects insertion order or sorts.
        # CRITICAL: If feature indices shift, model breaks.
        # Let's assume alphabetical order for safety? 
        # Keys: 'defense_keyword_count', 'has_account', 'has_phone', 'has_rrn', 'leak_keyword_count', 'text_len' (Sorted).
        # My `extract_user_features` returns in a specific order.
        # To be ROBUST, I should map explicitly.
        # Start indices logic:
        # I'll create a feature vector (dict) where keys are global indices.
        
        feature_map = {
           'defense_keyword_count': 0, 
           'has_account': 1, 
           'has_phone': 2, 
           'has_rrn': 3, 
           'leak_keyword_count': 4, 
           'text_len': 5
           # Wait, I need to know the ACTUAL column order from training.
           # I can't check the dataframe now.
           # BUT, `extract_user_features` defines the dict.
           # If pandas sorts alphabetically:
           # defense, has_account, has_phone, has_rrn, leak, text_len.
           # Let's assume this sorted order.
           # This is risky. 
           # If I assume incorrect order, 'text_len' might be 'has_account'.
           # However, TF-IDF manual implementation uses `idx`.
           # TF-IDF starts at index 6.
           
        }
        
        # CRITICAL: Must match FEATURE_ORDER in train_user_model.py
        # ['leak_keyword_count', 'defense_keyword_count', 'has_rrn', 'has_phone', 'has_account', 'text_len']
        
        features = {}
        # 0: leak_keyword_count
        features[0] = float(manual_feats['leak_keyword_count'])
        # 1: defense_keyword_count
        features[1] = float(manual_feats['defense_keyword_count'])
        # 2: has_rrn
        features[2] = float(manual_feats['has_rrn'])
        # 3: has_phone
        features[3] = float(manual_feats['has_phone'])
        # 4: has_account
        features[4] = float(manual_feats['has_account'])
        # 5: text_len
        features[5] = float(manual_feats['text_len'])
            
        # 2. TF-IDF Features
        tfidf_vector = compute_tfidf(text, tfidf_config)
        offset = 6 # len(manual_features)
        for idx, val in tfidf_vector.items():
            features[offset + int(idx)] = val
            
        # 3. Predict
        # 1) Heuristic Override: If Defense Keyword exists, it's Safe.
        if features[1] > 0: # 1 is 'defense_keyword_count'
             prob_percent = 0.0
        else:
             # 2) Model Prediction
             prob_percent = predict_rf_lite(features, rf_trees) * 100.0
        
        return prob_percent, manual_feats

    except Exception as e:
        print(f"User Lite Inference Error: {e}")
        return 0.0, {}
