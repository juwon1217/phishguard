# analyzer.py

def analyze_phishing_chat(messages, scenario):
    """
    PhishGuard 대화 분석 엔진 (임시 버전)
    - messages: [{'role': 'user', 'content': '...'}, ...] 형태의 리스트
    - scenario: 사용자가 선택한 피싱 시나리오 명
    """
    
    # 1. 분석을 위한 기본 점수 설정
    score = 100
    risk_keywords = ["계좌", "비밀번호", "인증번호", "송금", "카드번호", "이름"]
    detected_risks = []

    # 2. 대화 내역 분석 (간단한 키워드 탐지 예시)
    # 사용자가 보낸 메시지(role: user)에서 위험 키워드가 있는지 확인합니다.
    for msg in messages:
        if msg['role'] == 'user':
            content = msg['content']
            for keyword in risk_keywords:
                if keyword in content:
                    score -= 15  # 위험 키워드 노출 시 감점
                    if keyword not in detected_risks:
                        detected_risks.append(keyword)

    # 3. 점수 범위 제한 (0 ~ 100)
    score = max(0, score)

    # 4. 분석 코멘트 생성 (점수대별)
    if score >= 80:
        comment = "피싱 시도에 매우 신착하게 대응하셨습니다. 개인정보를 안전하게 보호했습니다."
        grade = "A (안전)"
    elif score >= 50:
        comment = "일부 민감한 정보가 노출될 뻔했으나 대체로 잘 방어하셨습니다."
        grade = "B (주의)"
    else:
        comment = "피싱 공격자에게 중요한 정보가 노출되었습니다. 실제 상황이라면 매우 위험합니다."
        grade = "C (위험)"

    # 5. 최종 결과 반환 (React에서 리포트로 보여줄 데이터)
    return {
        "score": score,
        "grade": grade,
        "comment": comment,
        "details": {
            "scenario": scenario,
            "detected_keywords": detected_risks,
            "message_count": len(messages)
        }
    }