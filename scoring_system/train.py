# train.py
import pandas as pd
import numpy as np
import joblib
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score

import config
from model import build_model
from feature_engineering import extract_manual_features

def load_data():
    try:
        df = pd.read_csv(config.TRAIN_DATA_PATH)
    except FileNotFoundError:
        print("Data not found. Generating dummy data for testing.")
        df = pd.DataFrame({
            'text': [
                '엄마 폰 고장나서 그런데 돈 좀 보내', 
                '검찰 수사관입니다 긴급히 연락바랍니다', 
                '오늘 날씨 되게 좋', 
                '배달 안 되었습니다. 다음 링크를 눌러서 확인: http://bit.ly'
            ] * 50,
            'label': [1, 1, 0, 1] * 50
        })
    
    return train_test_split(df.iloc[:, 0], df.iloc[:, 1], test_size=0.2, random_state=42)

def main():
    # 1. Load Data
    X_train_raw, X_test_raw, y_train, y_test = load_data()

    # 2. Manual Feature Engineering
    print("Extracting manual features...")
    X_train_manual = pd.DataFrame(X_train_raw.apply(extract_manual_features).tolist())
    X_test_manual = pd.DataFrame(X_test_raw.apply(extract_manual_features).tolist())

    # 3. TF-IDF Vectorization
    print("Vectorizing text...")
    vectorizer = TfidfVectorizer(max_features=config.TFIDF_MAX_FEATURES)
    X_train_tfidf = vectorizer.fit_transform(X_train_raw.astype(str))
    X_test_tfidf = vectorizer.transform(X_test_raw.astype(str))

    # 4. Combine Features
    X_train_final = hstack([X_train_manual, X_train_tfidf])
    X_test_final = hstack([X_test_manual, X_test_tfidf])

    print(f"Total features: {X_train_final.shape[1]}")

    # 5. Build and Train Model
    print("Training XGBoost model...")
    # Calculate scale_pos_weight for imbalance
    ratio = float(np.sum(y_train == 0)) / np.sum(y_train == 1) if np.sum(y_train == 1) > 0 else 1.0
    
    model = build_model(scale_pos_weight=ratio)
    model.fit(X_train_final, y_train)

    # 6. Evaluate
    preds = model.predict(X_test_final)
    print("\n[Evaluation]")
    print(f"Accuracy: {accuracy_score(y_test, preds):.4f}")
    print(f"F1 Score: {f1_score(y_test, preds):.4f}")
    
    # 7. Save Artifacts
    joblib.dump(model, "xgb_model.joblib")
    joblib.dump(vectorizer, "tfidf_vectorizer.joblib")
    print("Model and vectorizer saved.")

if __name__ == "__main__":
    main()