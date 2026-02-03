# analyzer.py
import joblib
import pandas as pd
import re # [추가] 숫자 패턴(계좌/전번) 감지를 위한 라이브러리
from scipy.sparse import hstack
from scoring_system.feature_engineering import extract_manual_features

# 1. 모델 및 벡터라이저 로드 (DACON 폴더 기준 경로)
try:
    # train.py에서 저장한 파일들 로드
    model = joblib.load("scoring_system/xgb_model.joblib")
    vectorizer = joblib.load("scoring_system/tfidf_vectorizer.joblib")
    print("✅ XGBoost 모델 및 TF-IDF 벡터라이저 로드 완료")
except Exception as e:
    print(f"❌ 모델 로드 실패: {e}")

def analyze_phishing_chat(messages, scenario):
    """
    XGBoost 모델을 사용하여 대화 전체의 피싱 위험도를 수치화합니다.
    """
    # 1. 분석할 텍스트 추출 (사용자가 입력한 모든 메시지를 하나로 합침)
    user_texts = [m['content'] for m in messages if m['role'] == 'user']
    full_text = " ".join(user_texts)

    if not full_text.strip():
        return {"score": 0, "grade": "분석 불가", "comment": "사용자 메시지가 존재하지 않습니다."}

    # 2. 수동 특성 추출 (x1~x7 점수화)
    manual_feat_dict = extract_manual_features(full_text)
    X_manual = pd.DataFrame([manual_feat_dict])

    # 3. TF-IDF 벡터화 (문맥 분석)
    X_tfidf = vectorizer.transform([full_text])

    # 4. 특성 결합 및 예측
    X_final = hstack([X_manual, X_tfidf])
    
    # 피싱일 확률(0~1) 산출 (공격자의 정교함 측정)
    prob = float(model.predict_proba(X_final)[0][1])
    
    # [수정] 단순 4자리(연도 등)는 제외하고, 전화번호(010...)나 6자리 이상(계좌/카드)만 감지
    # 패턴설명: (01로 시작하는 폰번호) OR (하이픈 포함된 계좌형태) OR (6자리 이상 연속 숫자)
    sensitive_pattern = r'(01[0-9][\s-]?\d{3,4}[\s-]?\d{4})|(\d{3,}-\d{2,}-\d{3,})|(\d{6,})'
    has_numbers = 1 if re.search(sensitive_pattern, full_text) else 0
    leakage_penalty = (
        manual_feat_dict['financial_score'] * 20 + 
        manual_feat_dict['agency_score'] * 15 +
        manual_feat_dict['family_score'] * 10 +
        manual_feat_dict['has_url'] * 25 +
        has_numbers * 35 # 숫자 유출 시 치명적 감점
    )
    
    # 5. 안전 점수 계산
    # [수정] 공격의 위험도와 사용자의 유출 수치를 결합하여 점수를 깎습니다.
    # 정보를 다 줬다면 prob가 낮더라도 leakage_penalty에 의해 점수가 폭락합니다.
    safety_score = max(0, 100 - (prob * 40) - leakage_penalty)
    safety_score = round(safety_score, 1)

    # 6. 등급 및 코멘트 판정
    if safety_score >= 80:
        grade = "A (안전)"
        comment = "피싱 의도를 완벽히 간파하고 개인정보를 안전하게 보호하셨습니다."
    elif safety_score >= 50:
        grade = "B (주의)"
        comment = "일부 민감한 정보가 노출될 뻔했으나 대체로 잘 방어하셨습니다."
    else:
        grade = "C (위험)"
        comment = "피싱 공격자의 압박에 중요한 정보를 유출했을 가능성이 매우 높습니다."

    # 7. 탐지된 위험 키워드 추출 (details에 전달)
    detected = [k.replace("_score", "") for k, v in manual_feat_dict.items() if v > 0 and k != "text_len"]
    if has_numbers: detected.append("sensitive_info_leaked")

    # [이중 분석 섹션 시작] AI 공격성과 사용자 유출도를 각각 리스트로 생성
    ai_analysis = []
    user_analysis = []

    for msg in messages:
        text = msg['content']
        m_feat = extract_manual_features(text)
        t_feat = vectorizer.transform([text])
        final_feat = hstack([pd.DataFrame([m_feat]), t_feat])
        
        # 1. AI(Assistant) 메시지 분석: 모델의 공격 확률 사용
        if msg['role'] == 'assistant':
            attack_prob = float(model.predict_proba(final_feat)[0][1])
            danger_level = "high" if attack_prob > 0.7 else "medium" if attack_prob > 0.3 else "low"
            
            ai_analysis.append({
                "text": text,
                "score": round(attack_prob * 100, 1),
                "level": danger_level
            })
            
        # 2. 사용자(User) 메시지 분석: 키워드 가중치 및 숫자 패턴 사용
        elif msg['role'] == 'user':
            sent_has_num = 1 if re.search(r'\d{4,}', text) else 0
            leak_score = (m_feat['financial_score'] * 40 + m_feat['agency_score'] * 30 + 
                          m_feat['has_url'] * 40 + sent_has_num * 60)
            
            danger_level = "high" if leak_score >= 50 else "medium" if leak_score > 0 else "low"
            
            user_analysis.append({
                "text": text,
                "score": min(100, leak_score),
                "level": danger_level
            })

    return {
        "score": safety_score,
        "grade": grade,
        "comment": comment,
        "ai_analysis": ai_analysis,
        "user_analysis": user_analysis,
        "details": {
            "scenario": scenario,
            "detected_keywords": detected,
            "phishing_prob": round(prob * 100, 2)
        }
    }
