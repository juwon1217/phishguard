"""
import pandas as pd
from config import TRAIN_DATA_PATH, TEST_DATA_PATH, CATEGORIES

print("Setting up train data...")
try:
    df = pd.read_csv(TRAIN_DATA_PATH)
    df = df[df['category'].isin(CATEGORIES)]
    df.to_csv("modified_train_real.csv", index=False)
except Exception as e:
    print("Train data error:", e)

print("Setting up test data...")
try:
    df = pd.read_csv(TEST_DATA_PATH)
    df = df[df['category'].isin(CATEGORIES)]
    df.to_csv("modified_test_real.csv", index=False)
except Exception as e:
    print("Test data error:", e)
"""
import pandas as pd

from config import TRAIN_DATA_PATH,CATEGORIES

df = pd.read_csv("modified_train_real.csv")

# 카테고리별 개수
category_counts = df['category'].value_counts()

# 전체 개수
total = len(df)

# 비율 계산
category_ratio = (category_counts / total).round(4)

print(category_ratio)
