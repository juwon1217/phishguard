import os
from openai import OpenAI
import pandas as pd
import random
import time

# =====================
# 1. 설정 및 API 초기화
# =====================
API_KEY = input()  # 여기에 실제 API 키를 입력하세요
client = OpenAI(api_key=API_KEY)

TOTAL_ROWS = 80000        # 총 생성 목표
OUTPUT_PATH = "scam_conversation_dataset.csv"
SAVE_INTERVAL = 1000      # 1000건마다 중간 저장

# 제공해주신 HTML 내용을 바탕으로 재구성한 카테고리별 시나리오
CATEGORY_SCENARIOS = {
    "가족": [
        "자녀 사칭 (액정 파손/수리비 요구)",
        "자녀 사칭 (문화상품권/구글기프트카드 대리 구매)",
        "지인 사칭 (급한 돈/경조사비 요구)",
        "납치 빙자 (자녀 납치 거짓 협박)"
    ],
    "회사/아르바이트": [
        "고수익 알바 모집 (구매대행/리뷰 작성)",
        "쇼핑몰 위장 (세금 문제로 개인 계좌 차명 사용)",
        "채용 합격 통보 (신분증/통장 사본 요구)",
        "재택 근무 (보안 프로그램 설치 유도)"
    ],
    "상거래 전반": [
        "해외 결제 승인 (본인 아님 신고 유도)",
        "택배 주소 불일치/배송 지연 알림",
        "유료 멤버십 자동 갱신 알림",
        "모바일 청첩장/돌잔치 초대장 (링크 클릭 유도)"
    ],
    "주거와 생활": [
        "정부 지원금/재난 지원금 신청 안내",
        "저금리 대환 대출 (서민 금융 지원 빙자)",
        "검찰/경찰 사칭 (대포 통장 연루/범죄 수사)",
        "쓰레기 무단 투기/교통 법규 위반 과태료 고지서"
    ],
    "건강": [
        "국민건강보험 환급금 안내",
        "무료 건강 검진 대상자 알림",
        "백신 접종 예약/증명서 발급",
        "코로나/전염병 관련 마스크 및 지원 물품 신청"
    ]
}

# 데이터 생성 비율 (요청하신 분포)
CATEGORY_DISTRIBUTION = {
    "상거래 전반": 0.2102,
    "가족": 0.2047,
    "회사/아르바이트": 0.1963,
    "주거와 생활": 0.1865,
    "건강": 0.2024
}

# 가짜 데이터 슬롯
FAKE_LINKS = ["han.gl/xyz", "bit.ly/claim", "korea-bank.lo", "check-safe.kr"]
FAKE_PHONES = ["02-1588-0000", "010-0000-0000", "1644-XXXX"]

# =====================
# 2. 유틸리티 함수
# =====================
def fill_slots(text: str) -> str:
    """텍스트 내의 특정 키워드를 가짜 정보로 치환하여 현실감 부여"""
    if "{링크}" in text:
        text = text.replace("{링크}", random.choice(FAKE_LINKS))
    if "{전화번호}" in text:
        text = text.replace("{전화번호}", random.choice(FAKE_PHONES))
    return text

def generate_scam_texts(category: str, scenario: str, count: int = 5):
    """
    LLM을 사용하여 특정 카테고리와 시나리오에 맞는 스캠 문장 생성
    """
    prompt = f"""
    Role: You are a scammer creating phishing messages (Smishing/Voice Phishing).
    Target Language: Korean (Natural, urgent, persuasive).
    Category: {category}
    Scenario: {scenario}

    Task: Generate {count} distinct phishing sentences based on the scenario.
    
    Guidelines:
    - Varies from short SMS style ("Web발신") to longer chat messages.
    - Include placeholders like '{{링크}}' for URLs or '{{전화번호}}' for contact numbers randomly.
    - Make it sound official or urgent depending on the context.
    - Do not number the output. Just raw lines.
    - Only output the Korean text.

    Examples from HTML Context:
    - "엄마 나 폰 고장나서 수리맡겼어 문자 확인하면 답장줘"
    - "[Web발신] 귀하의 대출신청이 승인되었습니다. 승인확인: {{링크}}"
    - "서울중앙지검입니다. 귀하의 명의가 대포통장에 도용되었습니다."
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": "You are a realistic phishing text generator."},
                      {"role": "user", "content": prompt}],
            temperature=0.9,
            max_tokens=500
        )
        content = response.choices[0].message.content
        return [line.strip() for line in content.splitlines() if line.strip()]
    except Exception as e:
        print(f"⚠️ Error generating text: {e}")
        return []

# =====================
# 3. 메인 로직
# =====================
rows = []
total_generated = 0

print(f"🚀 스캠 데이터셋 생성 시작 (목표: {TOTAL_ROWS}행)")
print(f"📂 저장 파일명: {OUTPUT_PATH}")

for category, ratio in CATEGORY_DISTRIBUTION.items():
    target_count = int(TOTAL_ROWS * ratio)
    current_count = 0
    scenarios = CATEGORY_SCENARIOS[category]
    
    print(f"\n▶ Category: {category} (목표: {target_count}행)")

    while current_count < target_count:
        # 랜덤 시나리오 선택
        scenario = random.choice(scenarios)
        
        # 한 번에 5~10개 문장 생성 요청
        batch_size = random.randint(5, 10)
        generated_lines = generate_scam_texts(category, scenario, batch_size)

        for line in generated_lines:
            if current_count >= target_count:
                break
                
            final_text = fill_slots(line)
            
            rows.append({
                "text": final_text,
                "label": 1,
                "category": category
            })
            
            current_count += 1
            total_generated += 1

        # 진행 상황 출력
        if total_generated % 100 == 0:
            print(f"\r   [{category}] 생성 중... {current_count}/{target_count} (전체: {total_generated})", end="")

        # 중간 저장 (Checkpoint)
        if len(rows) >= SAVE_INTERVAL:
            df_temp = pd.DataFrame(rows)
            # 컬럼 순서 강제 지정: text, label, category
            df_temp = df_temp[["text", "label", "category"]]
            
            if not os.path.exists(OUTPUT_PATH):
                df_temp.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig", mode='w')
            else:
                df_temp.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig", mode='a', header=False)
            
            rows = [] # 메모리 비우기
            
        time.sleep(0.5) # API 속도 조절

# =====================
# 4. 남은 데이터 최종 저장
# =====================
if rows:
    df_temp = pd.DataFrame(rows)
    df_temp = df_temp[["text", "label", "category"]]
    
    if not os.path.exists(OUTPUT_PATH):
        df_temp.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig", mode='w')
    else:
        df_temp.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig", mode='a', header=False)

print(f"\n\n🎉 생성 완료! 총 {total_generated}행이 {OUTPUT_PATH}에 저장되었습니다.")