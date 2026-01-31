import pandas as pd
import numpy as np
import joblib
import re
import random # 필수
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score

import config
from model import build_model
from feature_engineering import extract_manual_features

# ---------------------------------------------------------
# [필수 복구] 이 함수가 없으면 "URL=사기" 공식이 성립해버림
# ---------------------------------------------------------
def inject_safe_links(df, target_ratio=0.15):
    """
    정상 데이터에도 안전한 링크(유튜브, 지도 등)를 섞어서
    모델이 '링크만 있으면 무조건 사기'라고 편법을 쓰지 못하게 함
    """
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
    
    print(f"💉 예방주사: 정상 데이터 {n_samples}개에 안전한 링크 주입 중...")
    
    for idx in selected_indices:
        original_text = df_aug.loc[idx, 'text']
        fake_link = random.choice(SAFE_LINKS)
        
        if random.random() > 0.5:
            new_text = f"{original_text} 이거 봐봐 {fake_link}"
        else:
            new_text = f"여기 어때? {fake_link} {original_text}"
            
        df_aug.loc[idx, 'text'] = new_text
        
    return df_aug

def clean_text(text):
    if not isinstance(text, str): return ""
    artifacts = [
        r"\[Web발신\]", r"\[국외발신\]", r"\(광고\)", r"\[공지\]", 
        r"\[긴급\]", r"\[안내\]", r"Web발신", r"국외발신"
    ]
    for art in artifacts:
        text = re.sub(art, "", text)
    return text.strip()

def load_data():
    try:
        df_normal_raw = pd.read_csv(config.TRAIN_DATA_PATH)
        df_scam = pd.read_csv("scam_dataset_vertex_v2.csv")

        df_scam['text'] = df_scam['text'].apply(clean_text)

        target_normal_count = int(len(df_scam) * (0.85 / 0.15))
        
        if len(df_normal_raw) > target_normal_count:
            df_normal = df_normal_raw.sample(n=target_normal_count, random_state=42)
        else:
            df_normal = df_normal_raw

        df_normal = df_normal[['text', 'label']]
        df_scam = df_scam[['text', 'label']]

        df = pd.concat([df_normal, df_scam], axis=0, ignore_index=True)
        
        # [중요] 여기서 링크 주입을 해야 100점(과적합)이 안 나옵니다!
        df = inject_safe_links(df, target_ratio=0.15)
        
        print(f"Dataset Stats: Normal {len(df_normal)}, Scam {len(df_scam)} (Total {len(df)})")
        
    except FileNotFoundError:
        print("Using dummy data.")
        df = pd.DataFrame({'text': ['t'], 'label': [0]})
    
    return train_test_split(df['text'], df['label'], test_size=0.2, random_state=42, stratify=df['label'])

def main():
    X_train_raw, X_test_raw, y_train, y_test = load_data()

    print("Extracting features...")
    X_train_manual = pd.DataFrame(X_train_raw.apply(extract_manual_features).tolist())
    X_test_manual = pd.DataFrame(X_test_raw.apply(extract_manual_features).tolist())

    print("Vectorizing...")
    # 일상어 제거 (말투 과적합 방지)
    korean_stop_words = [
        '키우는', '같던데', '그치', '맞다', '나갔어', '진짜', '너무', '그냥', 
        '아니', '근데', '오늘', '내일', '지금', '하고', '해서', '있는', 
        '없는', '좀', '잘', '다', '더', '거', '수', '게', '나', '너',
        '은', '는', '이', '가', '을', '를', '에', '의', '와', '과'
    ]

    vectorizer = TfidfVectorizer(
        max_features=config.TFIDF_MAX_FEATURES,
        stop_words=korean_stop_words,
        min_df=5,
        max_df=0.7,
        ngram_range=(1, 2)
    )
    
    X_train_tfidf = vectorizer.fit_transform(X_train_raw.astype(str))
    X_test_tfidf = vectorizer.transform(X_test_raw.astype(str))

    X_train_final = hstack([X_train_manual, X_train_tfidf])
    X_test_final = hstack([X_test_manual, X_test_tfidf])

    print(f"Training XGBoost (Features: {X_train_final.shape[1]})...")
    
    scam_ratio = float(np.sum(y_train == 0)) / np.sum(y_train == 1) if np.sum(y_train == 1) > 0 else 1.0
    
    model = build_model(scale_pos_weight=scam_ratio)
    model.fit(
        X_train_final, y_train,
        eval_set=[(X_test_final, y_test)],
        verbose=True
    )

    preds = model.predict(X_test_final)
    
    print("\n[Evaluation]")
    print(f"Accuracy: {accuracy_score(y_test, preds):.4f}")
    print(f"F1 Score: {f1_score(y_test, preds):.4f}")
    
    joblib.dump(model, "xgb_model.joblib")
    joblib.dump(vectorizer, "tfidf_vectorizer.joblib")
    print("Saved model artifacts.")

if __name__ == "__main__":
    main()