# 피싱 탐지 스코어링 시스템 명세서 (Phishing Detection Scoring System Specification)

## 1. 개요 (Overview)
본 문서는 피싱 탐지 스코어링 시스템의 기술 명세서입니다. 이 시스템은 악성 문자 메시지를 탐지하기 위해 도메인 지식 기반의 수동 특성 공학(Manual Feature Engineering)과 TF-IDF 벡터화를 결합한 하이브리드 분류 모델을 사용합니다.

핵심 알고리즘으로는 XGBoost(eXtreme Gradient Boosting)를 사용하여 추출된 특성들을 바탕으로 최종 위험도 점수를 산출합니다.

## 2. 시스템 워크플로우 (System Workflow)

데이터 처리 파이프라인은 다음 4단계로 구성됩니다.

1.  **입력 처리 (Input Processing)**: 원본 SMS 텍스트 데이터 수신.
2.  **특성 공학 (Feature Engineering)**: 텍스트에서 수치형 특성 추출.
3.  **벡터화 (Vectorization)**: 텍스트의 문맥을 벡터 공간으로 변환.
4.  **분류 (Classification)**: 학습된 모델을 사용하여 확률 점수 생성.

### 워크플로우 다이어그램

Raw Text Input (원본 텍스트)
    │
    ├── [경로 A] 수동 특성 추출 (키워드 카운팅, 휴리스틱)
    │       │
    │       └──> 수치형 특성 벡터 (x1, x2, ...)
    │
    ├── [경로 B] TF-IDF 벡터화 (문맥 분석)
    │       │
    │       └──> 고차원 희소 행렬 (Sparse Matrix)
    │
    └──> 특성 결합 (경로 A + 경로 B 연결)
            │
            ▼
    XGBoost Classifier (분류기)
            │
            ▼
    Output Score (위험 확률 0.0 ~ 1.0)

---

## 3. 특성 공학 변수 (Feature Engineering Variables)

본 시스템은 일반적인 피싱 수법(사칭, 긴급성, 금전 요구)에서 파생된 사전 정의된 변수들을 사용합니다.

### 3.1. 수동 특성 (Manual Features - 휴리스틱)

| 변수명 | 설명 | 주요 지표 (키워드 예시) | 로직 |
| :--- | :--- | :--- | :--- |
| **family_score** | 가족 구성원 사칭 | 엄마, 아빠, 딸, 아들, 고장, 수리, 편의점 | 액정 파손 등을 핑계로 접근하는 지인 사칭 패턴의 키워드 등장 횟수 계산. |
| **agency_score** | 공공기관 및 기업 사칭 | 검찰, 수사관, 서울지검, 금감원, 금융위원회, 계좌, 도용 | 공포심이나 복종을 유발하기 위한 기관 사칭 관련 키워드 등장 횟수 계산. |
| **urgency_score** | 심리적 압박 및 긴급성 유도 | 즉시, 마감, 당장, 긴급, 구속, 영장, 유포 | 이성적 판단을 흐리게 하는 긴급성 관련 단어 등장 횟수 계산. |
| **financial_score** | 금전 거래 요구 | 상품권, 핀번호, 송금, 이체, 대출, 승인, 선입금 | 금전적 이득을 취하기 위한 관련 용어 등장 횟수 계산. |
| **has_url** | URL 포함 여부 | http, https, .com, .kr, bit.ly | 이진값 (URL 있음=1, 없음=0). 피싱 문자는 URL 포함 빈도가 매우 높음. |
| **text_len** | 문자 메시지 길이 | (문자 수) | 메시지 길이 분포 분석 (피싱 문자는 특정 길이 패턴을 보일 수 있음). |

### 3.2. 문맥적 특성 (Contextual Features - TF-IDF)

* **방식**: TF-IDF (Term Frequency-Inverse Document Frequency)
* **어휘 크기**: 상위 500 ~ 1,000개 특성 (설정 가능)
* **목적**: 수동으로 정의한 키워드 외에, 데이터 전반에 나타나는 의미론적 패턴과 문맥을 포착.

---

## 4. 알고리즘 및 모델 (Algorithm & Model)

### 4.1. 분류기: XGBoost
최종 스코어링 메커니즘으로 XGBoost(eXtreme Gradient Boosting) 분류기를 사용합니다.

* **유형**: GBDT (Gradient Boosted Decision Trees)
* **목적 함수**: 이진 로지스틱 회귀 (binary:logistic)
* **평가 지표**: Log Loss (logloss)

### 4.2. 선정 근거
1.  **정형 데이터 성능**: 제한된 샘플 크기의 정형(Tabular) 데이터에서 딥러닝 모델보다 우수한 성능을 보임.
2.  **특성 중요도 (Feature Importance)**: 각 특성의 기여도(Gain/Cover)를 산출하여, 어떤 키워드가 알림을 유발했는지 분석 및 설명 가능 (XAI).
3.  **속도**: 실시간 탐지에 적합하도록 학습 및 추론 속도가 최적화됨.

## 5. 스코어링 및 해석 (Scoring & Interpretation)

모델은 0.0에서 1.0 사이의 확률 값($P$)을 출력합니다.

* **점수 범위**: 0.0 $\le$ $P$ $\le$ 1.0
* **임계값 (Threshold)**: 0.5 (기본값)

| 확률 점수 | 분류 결과 | 해석 |
| :--- | :--- | :--- |
| **0.00 ~ 0.49** | **정상 (Benign, 0)** | 일반적인 메시지. 피싱 위험 낮음. |
| **0.50 ~ 1.00** | **악성 (Malicious, 1)** | 고위험군. 피싱 공격 패턴과 일치하는 요소 포함. |

---

## 6. 환경 및 의존성 (Environment & Dependencies)

* **언어**: Python 3.x
* **핵심 라이브러리**:
    * `scikit-learn`: TF-IDF 벡터화 및 데이터 분할.
    * `xgboost`: 그라디언트 부스팅 모델.
    * `pandas` / `numpy`: 데이터 조작 및 벡터 연산.
    * `joblib`: 모델 직렬화 및 저장.