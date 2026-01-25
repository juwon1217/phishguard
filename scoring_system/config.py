# config.py

# Manual Feature Engineering Keywords
FAMILY_KEYWORDS = ["엄마", "아빠", "딸", "아들", "고장", "수리", "편의점"]
AGENCY_KEYWORDS = ["검찰", "수사관", "서울지검", "금감원", "금융위원회", "계좌", "도용"]
URGENCY_KEYWORDS = ["즉시", "마감", "당장", "긴급", "구속", "영장", "유포"]
FINANCIAL_KEYWORDS = ["상품권", "핀번호", "송금", "이체", "대출", "승인", "선입금"]
URL_KEYWORDS = ["http", "https", ".com", ".kr", "bit.ly"]

# TF-IDF Settings
TFIDF_MAX_FEATURES = 1000
TFIDF_MIN_DF = 2
TFIDF_MAX_DF = 0.95

# XGBoost Hyperparameters
XGB_PARAMS = {
    "objective": "binary:logistic",
    "eval_metric": "logloss",
    "max_depth": 4,
    "learning_rate": 0.1,
    "n_estimators": 100,
    "random_state": 42,
    "n_jobs": -1
}

# Threshold for classification
THRESHOLD = 0.5

# Data paths
TRAIN_DATA_PATH = "data/train.csv"
TEST_DATA_PATH = "data/test.csv"
MODEL_PATH = "models/phishing_xgb_model.joblib"

# Feature names
MANUAL_FEATURES = [
    "family_score",
    "agency_score",
    "urgency_score",
    "financial_score",
    "has_url",
    "text_len"
]

#model preset
XGB_PARAMS = {
    "n_estimators": 200,
    "learning_rate": 0.1,
    "max_depth": 6,
    "objective": "binary:logistic",
    "n_jobs": -1,
    "random_state": 42,
    "eval_metric": "logloss"
}