import joblib
import pandas as pd
import sys
import os
from scipy.sparse import hstack
from user_feature_engineering import extract_user_features

# Ensure correct path
sys.path.append(os.getcwd())

def load_models():
    try:
        model = joblib.load("leakage_analysis/user_leak_model.joblib")
        vectorizer = joblib.load("leakage_analysis/user_tfidf.joblib")
        return model, vectorizer
    except FileNotFoundError:
        print("Models not found. Run train_user_model.py first.")
        sys.exit(1)

def predict_leak_risk(text, model, vectorizer):
    # 1. Manual Features
    feats = extract_user_features(text)
    X_manual = pd.DataFrame([feats])
    
    # 2. TF-IDF
    X_tfidf = vectorizer.transform([str(text)])
    
    # 3. Combine
    X_final = hstack([X_manual, X_tfidf])
    
    # 4. Predict
    prob = model.predict_proba(X_final)[0][1] # Probability of Class 1 (Leak)
    return prob * 100, feats

def main():
    print("Loading Leakage Detector Model...")
    model, vectorizer = load_models()
    
    test_sentences = [
        "안녕하세요. 누구시죠?", # Safe
        "비밀번호는 1234입니다.", # Leak
        "제 계좌번호 110-392-392929 국민입니다.", # Leak
        "경찰에 신고하겠습니다. 사기치지 마세요.", # Defense (Safe)
        "이름은 홍길동이고 전화번호는 010-1234-5678 입니다." # Leak
    ]
    
    print("\n--- Automated Test ---")
    for text in test_sentences:
        risk_score, details = predict_leak_risk(text, model, vectorizer)
        status = "DANGER (Leak)" if risk_score > 50 else "SAFE"
        print(f"\nText: {text}")
        print(f"Risk Score: {risk_score:.2f}% [{status}]")
        print(f"Details: {details}")

    print("\n--- Interactive Loop ---")
    while True:
        text = input("\nEnter message (or 'exit'): ")
        if text.lower() == 'exit': break
        
        risk_score, details = predict_leak_risk(text, model, vectorizer)
        status = "DANGER (Leak)" if risk_score > 50 else "SAFE"
        print(f"Risk Score: {risk_score:.2f}% [{status}]")

if __name__ == "__main__":
    main()
