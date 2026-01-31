PhishGuard: 피싱 및 스캔 예방 시뮬레이션 서비스
보이스피싱 시나리오에 대응하며 보안 의식을 높이는 AI 기반 채팅 시뮬레이션 프로젝트입니다.

# 🛠️ 기술 스택 (Tech Stack)
Frontend: React, Tailwind CSS, Vite

Backend: FastAPI (Python 3.13+), Uvicorn

AI Engine: Google Gemini API (gemini-2.5-flash-lite 추천)

Infrastructure: GitHub

# 📂 프로젝트 구조 (Project Structure)
my-kakao-demo/: React 프론트엔드 소스 코드

simulator/model.py: Gemini API 연동 및 AI 시뮬레이터 설정

main.py: FastAPI 엔드포인트 및 데이터 흐름 제어

analyzer.py: [역할 B 작업 구간] 대화 내역 기반 피싱 위험도 분석 로직

[역할 B] 분석기 개발 가이드 (analyzer.py)
팀원 B는 analyzer.py의 analyze_phishing_chat 함수를 완성해 주시면 됩니다.

1. 입력 데이터 (Input)
main.py로부터 다음과 같은 형식의 messages 리스트를 전달받습니다.

messages = [
    {"role": "assistant", "content": "주원은행 보안팀입니다. 계좌 결제 시도가 포착되었습니다."},
    {"role": "user", "content": "제 개인정보는 1234입니다."}
]

**전달되는 message 예시 :  analyzer.py 내의 analyze_phishing_chat(messages, scenario) 함수로 전달되는 'messages' 인자값**  


**scenario에는 현재 "주원은행 보안팀 (금융 사칭)", "가족/지인 사칭 (카톡 피싱)", "검찰청 수사관 (기관 사칭)" 세가지 종류 존재**

messages = [
    {
        "role": "assistant", 
        "content": "고객님 안녕하십니까, 주원은행 보안팀입니다. 지금 고객님 계좌에서 비정상적인 해외 결제 시도가 포착되었습니다."
    },
    {
        "role": "user", 
        "content": "네 안녕하세요"
    },
    {
        "role": "assistant", 
        "content": "에러 발생: 429 You exceeded your current quota..." # 또는 토큰 부족 관련 메시지
    },
    {
        "role": "user", 
        "content": "아 토큰 좀 더 달라거"
    }
]

2. 출력 데이터 (Output - 필수 반환 형식)
프론트엔드 report 페이지에 정상적으로 출력되도록 아래 딕셔너리 구조를 유지해야함(임시 report 페이지 기준)

return {
    "score": 0~100 사이의 정수,
    "grade": "위험", "주의", "안전" 등 등급 명칭,
    "comment": "사용자에게 전달할 전체적인 분석 평",
    "details": {
        "detected_keywords": ["계좌", "비밀번호", "개인정보"] # 탐지된 위험 키워드 목록
    }
}
완전한 형태의 report 페이지를 만들 때는 어떤 것들을 보여줄지(ex. 피싱 당할 위험이 있는 문장, 개인정보를 몇번째 대화에서 넘겼는지 같은 것들)는 아직 결정안했으니까 회의 필요

# ⚠️ 프로젝트 공통 주의사항 (General Precautions)
1. 보안 및 API 키 관리 (중요)
.env 파일 업로드 금지: 실제 API 키가 포함된 .env 파일은 절대 깃허브 올리지 않기(각자 로컬에서 관리)

환경 설정: 프로젝트를 클론 받은 후, .env.example 파일을 복사하여 .env 파일을 생성하고 본인의 GOOGLE_API_KEY를 입력(공통 키 만들기? <- 회의 필요>)

2. 실행 환경 및 순서
백엔드 실행: python main.py를 실행하여 서버가 http://localhost:8000에서 돌아가고 있는지 확인

프론트엔드 실행: my-kakao-demo 폴더에서 npm run dev를 실행

백엔드 서버가 꺼져 있으면 AI 대화 및 분석 기능이 작동하지 않음

3. 제미나이 모델명 주의해야 함(현재는 gemini-2.0-flash-lite 모델 사용중)

# 시작하는법 (Getting Started)

1. 레포지토리 클론: git clone [repository-url]

2. 백엔드 패키지 설치: pip install -r requirements.txt

3. 프론트엔드 패키지 설치: cd my-kakao-demo && npm install

4. 환경 변수 설정: .env 파일 작성 및 API 키 입력