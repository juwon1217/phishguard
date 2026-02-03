import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from scipy.sparse import hstack
from user_feature_engineering import extract_user_features

# 1. Load Data
print("Loading data...")
df = pd.read_csv("leakage_analysis/user_leak_data.csv")

# 2. Extract Manual Features
print("Extracting manual features...")
manual_features_list = df['text'].apply(extract_user_features).tolist()
# CRITICAL: Enforce explicit column order to match inference
FEATURE_ORDER = ['leak_keyword_count', 'defense_keyword_count', 'has_rrn', 'has_phone', 'has_account', 'text_len']
X_manual = pd.DataFrame(manual_features_list, columns=FEATURE_ORDER)

# 3. Vectorization (TF-IDF)
print("Vectorizing...")
vectorizer = TfidfVectorizer(max_features=1000, ngram_range=(1, 3))
X_tfidf = vectorizer.fit_transform(df['text'].astype(str))

# 4. Combine Features
print("combining features...")
X_final = hstack([X_manual, X_tfidf])
y = df['label']

# 5. Split Data
X_train, X_test, y_train, y_test = train_test_split(X_final, y, test_size=0.2, random_state=42)

# 6. Train Model
print("Training Random Forest...")
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# 7. Evaluate
preds = model.predict(X_test)
print("\n[Evaluation Result]")
print(f"Accuracy: {accuracy_score(y_test, preds):.4f}")
print(classification_report(y_test, preds))

# 8. Save Artifacts
print("Saving artifacts...")
joblib.dump(model, "leakage_analysis/user_leak_model.joblib")
joblib.dump(vectorizer, "leakage_analysis/user_tfidf.joblib")
print("Done.")
