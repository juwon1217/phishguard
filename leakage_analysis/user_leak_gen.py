import pandas as pd
import random
import faker

# Initialize Faker for Korean data
fake = faker.Faker('ko_KR')

# Target: 5000 samples
TARGET_COUNT = 5000

# --- LEAK PATTERNS (Label 1) ---
LEAK_TEMPLATES = [
    "제 이름은 {name}입니다.",
    "이름은 {name}이고요.",
    "저는 {name}라고 합니다.",
    "주민번호는 {rrn} 입니다.",
    "제 민번 {rrn} 맞나요?",
    "주민등록번호 앞자리는 {birth}이고 뒤는 {rrn_back}입니다.",
    "신분증 보내드렸어요. {rrn} 확인해주세요.",
    "계좌번호는 {account} 입니다.",
    "국민은행 {account} 로 보내면 되나요?",
    "농협 {account} 제 계좌입니다.",
    "비밀번호는 {pwd} 입니다.",
    "비번 {pwd} 이걸로 설정해주세요.",
    "핀번호 {pin} 눌렀습니다.",
    "전화번호는 {phone} 입니다.",
    "제 폰번 {phone} 로 연락주세요.",
    "집 주소는 {addr} 입니다.",
    "배송지는 {addr} 로 해주세요.",
    "지금 OTP 번호 {otp} 떴어요.",
    "보안카드 번호 {otp} 불러드릴게요.",
    "{name}, {phone}, {rrn} 전부 보냈습니다.",
    "네 알겠습니다. {account} 여기로 입금 받을게요."
]

# --- DEFENSE PATTERNS (Label 0) ---
DEFENSE_TEMPLATES = [
    "누구세요?",
    "어디시죠?",
    "제가 님을 어떻게 믿나요?",
    "신분증 보여주세요.",
    "보이스피싱 아닌가요?",
    "경찰에 신고하겠습니다.",
    "더 이상 연락하지 마세요.",
    "필요 없습니다.",
    "관심 없어요.",
    "은행 가서 직접 처리할게요.",
    "직접 방문해서 해결하겠습니다.",
    "전화 끊으세요.",
    "사기치지 마세요.",
    "이미 신고했습니다.",
    "가족한테 확인해볼게요.",
    "확인해보고 다시 연락드릴게요.",
    "지금 바빠서 나중에 통화해요.",
    "제 정보는 제가 알아서 합니다.",
    "앱 설치 안 할 겁니다.",
    "모르는 url은 안 눌러요.",
    "됐습니다.",
    "안해요.",
    "싫습니다."
]

def generate_rrn():
    front = f"{random.randint(50, 99):02d}{random.randint(1, 12):02d}{random.randint(1, 28):02d}"
    back = f"{random.randint(1, 4)}{random.randint(100000, 999999)}"
    return f"{front}-{back}"

def generate_phone():
    return f"010-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"

def generate_account():
    # Various bank formats
    formats = [
        f"{random.randint(100,999)}-{random.randint(10,99)}-{random.randint(100000,999999)}",
        f"{random.randint(1000,9999)}-{random.randint(10,99)}-{random.randint(100000,999999)}",
        f"{random.randint(100,999)}-{random.randint(100000,999999)}-{random.randint(10,99)}"
    ]
    return random.choice(formats)

def generate_data():
    data = []
    
    # 1. Generate Leaks (50%)
    for _ in range(TARGET_COUNT // 2):
        tpl = random.choice(LEAK_TEMPLATES)
        text = tpl.format(
            name=fake.name(),
            rrn=generate_rrn(),
            birth=f"{random.randint(50, 99):02d}{random.randint(1, 12):02d}{random.randint(1, 28):02d}",
            rrn_back=f"{random.randint(1, 4)}{random.randint(100000, 999999)}",
            account=generate_account(),
            pwd=f"{random.randint(1000, 9999)}",
            pin=f"{random.randint(100000, 999999)}",
            phone=generate_phone(),
            addr=fake.address(),
            otp=f"{random.randint(100000, 999999)}"
        )
        data.append({"text": text, "label": 1}) # 1 = Leak

    # 2. Generate Defense (50%)
    for _ in range(TARGET_COUNT // 2):
        text = random.choice(DEFENSE_TEMPLATES)
        # Add some random variations
        if random.random() > 0.5:
            text = text + " " + random.choice(DEFENSE_TEMPLATES)
        data.append({"text": text, "label": 0}) # 0 = Safe/Defense
        
    df = pd.DataFrame(data)
    # Shuffle
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    return df

if __name__ == "__main__":
    print(f"Generating {TARGET_COUNT} samples...")
    df = generate_data()
    print(df.head())
    print(df['label'].value_counts())
    df.to_csv("leakage_analysis/user_leak_data.csv", index=False)
    print("Saved to leakage_analysis/user_leak_data.csv")
