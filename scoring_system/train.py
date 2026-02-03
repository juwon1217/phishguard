import pandas as pd
import numpy as np
import joblib
import re
import random
import shap
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score

import config
from model import build_model
from feature_engineering import extract_manual_features

def inject_safe_links(df, target_ratio=0.15):
    SAFE_LINKS = [
        " https://map.naver.com/p/entry/place/1234", 
        " https://youtu.be/dQw4w9WgXcQ",             
        " https://n.news.naver.com/article/001",     
        " https://m.coupang.com/nm/products",        
        " www.instagram.com/p/Cg4x"                 
    ]
    df_aug = df.copy()
    normal_indices = df_aug[df_aug['label'] == 0].index
    if len(normal_indices) == 0: return df_aug

    n_samples = int(len(normal_indices) * target_ratio)
    selected_indices = random.sample(list(normal_indices), n_samples)
    
    for idx in selected_indices:
        original_text = df_aug.loc[idx, 'text']
        fake_link = random.choice(SAFE_LINKS)
        new_text = f"{original_text} {fake_link}" if random.random() > 0.5 else f"{fake_link} {original_text}"
        df_aug.loc[idx, 'text'] = new_text
    return df_aug

def clean_text(text):
    if not isinstance(text, str): return ""
    artifacts = [r"\[Web발신\]", r"\[국외발신\]", r"\(광고\)", r"\[공지\]", r"Web발신", r"국외발신"]
    for art in artifacts:
        text = re.sub(art, "", text)
    return text.strip()

def load_data():
    df_normal_raw = pd.read_csv(config.TRAIN_DATA_PATH)
    # scam 데이터 로드 부분은 실제 경로에 맞춰 수정 필요
    df_scam = pd.read_csv("scam_dataset_vertex_v2.csv") 

    df_scam['text'] = df_scam['text'].apply(clean_text)
    target_normal_count = int(len(df_scam) * (0.85 / 0.15))
    
    df_normal = df_normal_raw.sample(n=min(len(df_normal_raw), target_normal_count), random_state=42)
    df = pd.concat([df_normal[['text', 'label']], df_scam[['text', 'label']]], axis=0, ignore_index=True)
    df = inject_safe_links(df, target_ratio=0.15)
    
    return train_test_split(df['text'], df['label'], test_size=0.2, random_state=42, stratify=df['label'])

def get_feature_importance_dict(model, X_test, feature_names, manual_features_list):
    """
    SHAP 값을 기반으로 Manual Features의 평균 기여도를 딕셔너리로 리턴하는 함수
    """
    explainer = shap.TreeExplainer(model)
    # 연산 속도를 위해 테스트셋 전체 중 최대 500개 샘플 사용
    sample_size = min(len(X_test.toarray() if hasattr(X_test, "toarray") else X_test), 500)
    X_sample = X_test.tocsr()[:sample_size] if hasattr(X_test, "tocsr") else X_test[:sample_size]
    
    shap_values = explainer.shap_values(X_sample)
    
    # SHAP 값의 절대값 평균 계산 (특성 중요도)
    abs_shap = np.abs(shap_values).mean(axis=0)
    feature_importance = dict(zip(feature_names, abs_shap))
    
    # config.MANUAL_FEATURES에 해당하는 항목만 추출
    result_dict = {feat: float(feature_importance.get(feat, 0)) for feat in manual_features_list}
    
    return result_dict

def main():
    X_train_raw, X_test_raw, y_train, y_test = load_data()

    # 1. Feature Engineering
    X_train_manual = pd.DataFrame(X_train_raw.apply(extract_manual_features).tolist())
    X_test_manual = pd.DataFrame(X_test_raw.apply(extract_manual_features).tolist())

    # 2. Vectorization
    vectorizer = TfidfVectorizer(
        max_features=config.TFIDF_MAX_FEATURES,
        min_df=config.TFIDF_MIN_DF,
        max_df=config.TFIDF_MAX_DF,
        ngram_range=(1, 2)
    )
    X_train_tfidf = vectorizer.fit_transform(X_train_raw.astype(str))
    X_test_tfidf = vectorizer.transform(X_test_raw.astype(str))

    # 특성 결합
    X_train_final = hstack([X_train_manual, X_train_tfidf])
    X_test_final = hstack([X_test_manual, X_test_tfidf])
    
    all_feature_names = X_train_manual.columns.tolist() + vectorizer.get_feature_names_out().tolist()

    # 3. Model Training (XGB_PARAMS 적용)
    print("Training XGBoost...")
    scam_ratio = float(np.sum(y_train == 0)) / np.sum(y_train == 1)
    model = build_model(scale_pos_weight=scam_ratio) # 내부에서 config.XGB_PARAMS 사용 가정
    
    model.fit(X_train_final, y_train, eval_set=[(X_test_final, y_test)], verbose=False)

    # 4. Predict Proba & Evaluation
    probs = model.predict_proba(X_test_final)[:, 1]
    preds = (probs > config.THRESHOLD).astype(int)
    
    print(f"\n[Evaluation]\nAccuracy: {accuracy_score(y_test, preds):.4f}")
    print(f"F1 Score: {f1_score(y_test, preds):.4f}")
    print(f"ROC-AUC: {roc_auc_score(y_test, probs):.4f}")

    # 5. SHAP Analysis (결과 딕셔너리 리턴)
    analysis_result = get_feature_importance_dict(
        model, X_test_final, all_feature_names, config.MANUAL_FEATURES
    )
    
    print("\n[Manual Feature Importance (SHAP)]")
    print(analysis_result)
    
    # 모델 저장
    joblib.dump(model, "xgb_model.joblib")
    joblib.dump(vectorizer, "tfidf_vectorizer.joblib")
    
    return analysis_result

if __name__ == "__main__":
    result = main()