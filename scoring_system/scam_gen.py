import os
import time
import random
import pandas as pd
import vertexai
from vertexai.generative_models import GenerativeModel, SafetySetting, HarmCategory, HarmBlockThreshold

# ==========================================
# [필수] 설정
# ==========================================
PROJECT_ID = "gen-lang-client-0596496961" 
LOCATION = "us-central1"

# Vertex AI 초기화
vertexai.init(project=PROJECT_ID, location=LOCATION)

# ★ 팁: 2.0이 혹시 불안정하거나 404가 뜨면 "gemini-1.5-flash"로 바꾸세요.
MODEL_NAME = "gemini-2.0-flash-001" 
try:
    model = GenerativeModel(MODEL_NAME)
except:
    print(f"⚠️ {MODEL_NAME} 모델을 찾을 수 없어 1.5-flash로 전환합니다.")
    MODEL_NAME = "gemini-1.5-flash"
    model = GenerativeModel(MODEL_NAME)

TOTAL_ROWS = 80000
OUTPUT_PATH = "scam_dataset_vertex_v2.csv"
SAVE_INTERVAL = 500

# -------------------------------------------------------
# 안전 설정
# -------------------------------------------------------
safety_settings = [
    SafetySetting(
        category=HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH,
    ),
    SafetySetting(
        category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH,
    ),
    SafetySetting(
        category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH,
    ),
    SafetySetting(
        category=HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH,
    ),
]

# -------------------------------------------------------
# 시나리오 및 설정
# -------------------------------------------------------
CATEGORY_SCENARIOS = {
    "가족": [
        "자녀 사칭 (엄마 나 폰 고장났어, 액정 수리비 줘)",
        "자녀 사칭 (문화상품권 급한데 사서 번호만 보내줘)",
        "지인 사칭 (나 급한데 돈 좀 빌려줘, 나중에 줄게)",
        "납치 빙자 (당신 아들 데리고 있다, 돈 보내)"
    ],
    "회사/아르바이트": [
        "고수익 알바 모집 (쿠팡/쇼핑몰 리뷰 작성, 일당 당일지급)",
        "쇼핑몰 위장 (세금 문제로 차명 계좌 임대, 수수료 지급)",
        "채용 합격 (신분증/통장 사본 요구, 보안앱 설치 유도)",
        "재택 근무 (재택 알바, 간단한 업무)"
    ],
    "상거래 전반": [
        "해외 결제 승인 (아마존/페이팔 본인 아님 신고 유도)",
        "택배 주소 불일치 (도로명 주소 미일치, 링크 확인)",
        "유료 멤버십 (넷플릭스/유튜브 자동 갱신 예정, 환불 링크)",
        "청첩장/돌잔치 (모바일 청첩장 링크 클릭 유도)"
    ],
    "주거와 생활": [
        "정부 지원금 (재난 지원금/생활 안정 자금 신청)",
        "저금리 대출 (정부 지원 서민 대출 승인)",
        "검찰/경찰 (서울중앙지검, 대포통장 연루 조사)",
        "과태료 (쓰레기 투기/교통 위반 과태료 고지서)"
    ],
    "건강": [
        "건강보험 (환급금 조회 및 신청)",
        "건강검진 (무료 대상자 선정, 결과 조회)",
        "백신/방역 (방역 지원금 신청)",
        "지원 물품 (마스크/키트 배송 주소 입력)"
    ]
}

CATEGORY_DISTRIBUTION = {
    "상거래 전반": 0.2102,
    "가족": 0.2047,
    "회사/아르바이트": 0.1963,
    "주거와 생활": 0.1865,
    "건강": 0.2024
}

FAKE_LINKS = ["han.gl/xyz", "bit.ly/claim", "korea-bank.lo", "check-safe.kr", "me2.do/fkd"]
FAKE_PHONES = ["02-1588-0000", "010-0000-0000", "1644-XXXX", "010-XXXX-XXXX"]
# ★ 핵심: 파이썬에서 랜덤으로 붙일 머리말들
PREFIXES = ["[Web발신]", "[국외발신]", "(광고)", "[공지]", "[긴급]", ""]

# -------------------------------------------------------
# 유틸리티 함수
# -------------------------------------------------------
def get_existing_counts(filepath):
    if not os.path.exists(filepath): return {}
    try:
        df = pd.read_csv(filepath)
        if 'category' not in df.columns: return {}
        return df['category'].value_counts().to_dict()
    except: return {}

def fill_slots(text: str, category: str) -> str:
    # 1. 슬롯 채우기
    if "{링크}" in text:
        text = text.replace("{링크}", random.choice(FAKE_LINKS))
    if "{전화번호}" in text:
        text = text.replace("{전화번호}", random.choice(FAKE_PHONES))
    
    # 2. ★ 후처리: 카테고리에 따라 머리말(Prefix) 확률적 부착
    # 가족/지인 사칭은 [Web발신]이 거의 없음. (5% 확률)
    # 나머지는 [Web발신]이 많음. (40% 확률)
    if category == "가족":
        if random.random() < 0.05: # 5% 확률
            text = random.choice(PREFIXES) + " " + text
    else:
        if random.random() < 0.4: # 40% 확률
            p = random.choice(PREFIXES)
            if p: text = p + " " + text

    return text.strip()

def generate_scam_texts(category: str, scenario: str, count: int = 30):
    # ★ 핵심: 카테고리별 말투 지시 분리
    style_instruction = ""
    if category == "가족":
        style_instruction = """
        [매우 중요] 가족이나 친한 친구에게 보내는 카톡처럼 작성하세요.
        - 말투: 반말, 단답형, 다급한 톤, 오타를 가끔 섞으세요.
        - 절대 '고객님', '안녕하십니까' 같은 표현 금지.
        - 예시: "엄마 나 폰 고장남ㅠ", "돈좀 급한데", "이거바바"
        """
    else:
        style_instruction = """
        [매우 중요] 공공기관, 기업, 쇼핑몰의 공식 안내 문자처럼 건조하고 정중하게 작성하세요.
        - 말투: '바랍니다', '되셨습니다', '안내드립니다' 등 문어체 사용.
        - 신뢰를 주기 위해 전문적인 용어를 섞으세요.
        """

    prompt = f"""
    당신은 피싱 문자 및 스미싱 데이터를 생성하는 AI입니다.
    다음 상황에 맞는 문자 메시지를 한국어로 {count}개 작성하세요.
    
    카테고리: {category}
    시나리오: {scenario}
    
    {style_instruction}
    
    [작성 규칙]
    1. URL은 '{{링크}}', 전화번호는 '{{전화번호}}'로 표기하세요.
    2. '[Web발신]' 같은 머리말은 절대 넣지 마세요. (나중에 프로그램이 넣을 것입니다)
    3. 번호 매기지 말고, 오직 메시지 내용만 한 줄에 하나씩 출력하세요.
    """

    try:
        response = model.generate_content(
            prompt,
            safety_settings=safety_settings,
            generation_config={"temperature": 0.95, "max_output_tokens": 8192} # 창의성(Temp) 높임
        )
        
        if response.text:
            return [line.strip() for line in response.text.splitlines() if line.strip()]
        else:
            return []
    except Exception as e:
        print(f"\n⚠️ Vertex AI Error: {e}")
        time.sleep(5)
        return []

# -------------------------------------------------------
# 메인 실행
# -------------------------------------------------------
rows = []
total_generated = 0

print(f"🚀 Vertex AI 데이터 생성 시작 (모델: {MODEL_NAME})")
print(f"📂 저장 파일: {OUTPUT_PATH}")
print(f"☁️ 사용 프로젝트: {PROJECT_ID}")

existing_counts = get_existing_counts(OUTPUT_PATH)
if existing_counts:
    print(f"   ↪ 기존 데이터: {sum(existing_counts.values())}행")
else:
    print("   ↪ 신규 생성")

for category, ratio in CATEGORY_DISTRIBUTION.items():
    target_total = int(TOTAL_ROWS * ratio)
    current_saved = existing_counts.get(category, 0)
    remaining_count = target_total - current_saved
    
    if remaining_count <= 0:
        print(f"\n✅ [{category}] 완료.")
        continue

    print(f"\n▶ [{category}] 목표: {remaining_count}")
    
    generated_in_session = 0
    scenarios = CATEGORY_SCENARIOS[category]

    while generated_in_session < remaining_count:
        scenario = random.choice(scenarios)
        
        batch_size = 30
        if remaining_count - generated_in_session < batch_size:
            batch_size = remaining_count - generated_in_session

        generated_lines = generate_scam_texts(category, scenario, batch_size)

        for line in generated_lines:
            if generated_in_session >= remaining_count: break
            
            rows.append({
                "text": fill_slots(line, category), # category 전달해서 후처리
                "label": 1,
                "category": category
            })
            generated_in_session += 1
            total_generated += 1

        if total_generated % 100 == 0:
            print(f"\r   생성 중... {generated_in_session}/{remaining_count} (누적: {total_generated})", end="")

        if len(rows) >= SAVE_INTERVAL:
            df_temp = pd.DataFrame(rows)[["text", "label", "category"]]
            mode = 'a' if os.path.exists(OUTPUT_PATH) else 'w'
            header = not os.path.exists(OUTPUT_PATH)
            df_temp.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig", mode=mode, header=header)
            
            print(f" 💾 저장 ({len(rows)}행)")
            rows = []
            
        time.sleep(0.5)

if rows:
    df_temp = pd.DataFrame(rows)[["text", "label", "category"]]
    mode = 'a' if os.path.exists(OUTPUT_PATH) else 'w'
    header = not os.path.exists(OUTPUT_PATH)
    df_temp.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig", mode=mode, header=header)

print(f"\n🎉 작업 완료!")