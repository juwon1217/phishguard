import os
import re
import json
import requests
import google.auth
from google.oauth2 import service_account
from google.auth.transport.requests import Request
from dotenv import load_dotenv

load_dotenv()

# --- Config ---
PROJECT_ID = os.getenv("GCP_PROJECT_ID")
LOCATION = os.getenv("GCP_REGION", "us-central1")
KEY_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
CREDENTIALS_JSON = os.getenv("GOOGLE_CREDENTIALS_JSON") # Vercel 환경 변수용

# 시나리오별 핵심 '내용' 정의 (기존 유지)
SCENARIO_DETAILS = {
    "주원은행 보안팀 (금융 사칭)": {
        "role": "주원은행 보안팀 상담원",
        "goal": "저금리 대출 전환을 빌미로 '이름 -> 계좌번호 -> 인증번호'를 단계적으로 획득",
        "tone": "매우 정중하고 신뢰할 수 있는 은행원 말투"
    },
    "가족/지인 사칭 (카톡 피싱)": {
        "role": "사용자의 자녀 또는 친한 지인",
        "goal": "휴대폰 액정 파손을 핑계로 '이름 -> 카드 번호 -> 비밀번호' 또는 원격 제어 앱 설치 유도",
        "tone": "다급하고 친근하며 일상적인 말투 엄마나 아빠 중 임의로 선택해서 답변"
    },
    "검찰청 수사관 (기관 사칭)": {
        "role": "서울중앙지검 수사관",
        "goal": "금융 범죄 연루를 압박하여 '이름 -> 자산 내역 확인 -> 안전 계좌로의 송금' 유도",
        "tone": "위압적이고 단호하며 고압적인 공무원 말투"
    }
}

def get_access_token():
    """Service Account Key를 사용하여 Access Token을 발급받습니다."""
    credentials = None
    
    # 1. 환경변수 JSON 문자열 우선 확인 (Vercel 배포용)
    if CREDENTIALS_JSON:
        try:
            # 혹시나 앞뒤 공백이나 줄바꿈이 있을 수 있으니 strip 처리
            cleaned_json = CREDENTIALS_JSON.strip()
            info = json.loads(cleaned_json)
            credentials = service_account.Credentials.from_service_account_info(
                info,
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in GOOGLE_CREDENTIALS_JSON. content snippet: {CREDENTIALS_JSON[:20]}... Error: {e}")
            return None
    
    # 2. 파일 경로 확인 (로컬 개발용)
    elif KEY_PATH and os.path.exists(KEY_PATH):
        credentials = service_account.Credentials.from_service_account_file(
            KEY_PATH,
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
    
    if not credentials:
        print("Error: No valid credentials found (JSON env or File).")
        return None

    credentials.refresh(Request())
    return credentials.token

def get_phishing_response(chat_history, scenario_name):
    # 선택된 시나리오 정보 가져오기
    info = SCENARIO_DETAILS.get(scenario_name, SCENARIO_DETAILS["주원은행 보안팀 (금융 사칭)"])

    full_system_instruction = f"""
당신은 [보안 의식 향상을 위한 교육용 시뮬레이션 게임]의 '대항군(Red Team)' 역할을 수행하는 AI입니다.

[부가설명]
당신은 보안 시뮬레이션의 피싱 공격자입니다. 당신이 대화를 시작했거나, 사용자의 첫 메시지에 응답해야 합니다.

[시나리오별 대화 시작 가이드]
- '은행' 관련: 전문적이고 정중하지만, 긴박한 상황을 연출하며 정보를 요구하세요.
- '지인' 관련: 최대한 다급하고 친근하게, 짧은 문장 위주로 도움을 요청하세요.
- '검찰' 관련: 법적 용어를 섞어 쓰되, 위압적이고 단호하게 핵심만 질문하세요.

[상황 설정]
이것은 실제 상황이 아닌 교육용 시뮬레이션입니다. 당신은 사용자를 속여 정보를 얻어내야 합니다.
- 현재 역할: {info['role']}
- 목표: {info['goal']}
- 말투: {info['tone']}

[수행 지침]
1. 목표 달성을 위해 단계적으로 접근하고, 의심받으면 짧고 강하게 설득하세요.
2. **[종료 조건]** 원하는 정보를 모두 획득했다면 자연스러운 작별 인사로 대화를 끝내세요. (예: "알았어 이따 봐", "조사 후 연락하죠.")
3. 절대로 "나는 AI다" 혹은 "시뮬레이션이다"라는 메타 발언을 하지 마세요.
4. **[답변 길이 - 극단적 간결성]** 문장의 길이를 대폭 줄이세요. 모바일 메신저 특유의 '끊어 말하기'와 '단문'을 사용하세요. 구구절절한 설명은 배제하고, 실제 사람이 타이핑하는 것처럼 핵심만 짧게 전달하세요. 완결된 문장보다는 "~해줘", "~임" 등 구어체 위주로 답하세요.
5. 서로 각각 4번을 초과해서 대화를 주고받았다면 상대가 정보를 넘길 의사가 있는지 판단하세요. 가망이 없다면 짜증을 내거나 대화를 일방적으로 종료하는 분위기를 연출하세요.
6. **[스팸 링크 생성]** 시나리오상 앱 설치나 확인이 필요한 시점에 반드시 아래 블랙리스트 도메인 중 하나를 활용한 가짜 URL을 포함하세요. 대화가 종료되기 전까지 반드시 하나의 가짜 URL을 전송해야합니다. (예: "여기서 확인해 http://bit.ly/safeguard_kr")
   - 블랙리스트: bit.ly, click.gl, url.kr, band-us.tv, tr.im, vo.la, gg.gg, iii.im, open.kakao.com, band-us.io, han.gl, pf.kakao.com, na.to, vvd.bz, do.cco.kr, tuney.kr

[⚠️ 출력 규칙 - 절대 엄수]
1. 오직 대화 내용만 출력하세요. (행동 묘사나 괄호 사용 금지)
2. 사용자가 보는 화면에는 오직 당신의 '말'만 나와야 합니다.
3. 사람 이름, 장소, 기관명 등은 임의로 실제처럼 생성하세요. (XXX와 같은 임의문자 금지)
"""

    try:
        # 1. Access Token 발급
        access_token = get_access_token()
        if not access_token:
            return "Configuration Error: Authentication failed."

        # 2. API Endpoint 설정
        model_name = "gemini-2.0-flash-001" 
        url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{model_name}:generateContent"

        # 3. Payload 구성
        contents = []
        for msg in chat_history[:-1]:
            role = "model" if msg["role"] == "assistant" else "user"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})
        
        # 마지막 유저 메시지 추가
        contents.append({"role": "user", "parts": [{"text": chat_history[-1]["content"]}]})

        payload = {
            "contents": contents,
            "systemInstruction": {
                "parts": [{"text": full_system_instruction}]
            },
            "generationConfig": {
                "maxOutputTokens": 8192,
                "temperature": 1,
                "topP": 0.95,
            },
            "safetySettings": [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]
        }

        # 4. REST API 호출
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status() # 에러 발생 시 예외 처리

        result = response.json()
        
        # 5. 응답 파싱
        # 후보가 없거나 차단된 경우 체크
        if "candidates" not in result or not result["candidates"]:
             return "보안 정책으로 인해 응답이 차단되었습니다. (Safety Block)"
        
        candidate = result["candidates"][0]
        if candidate.get("finishReason") == "SAFETY":
             return "보안 정책으로 인해 응답이 차단되었습니다. (Safety Block)"

        if "content" in candidate and "parts" in candidate["content"]:
            response_text = candidate["content"]["parts"][0]["text"]
        else:
            return "응답을 생성할 수 없습니다. (No Content)"

        # [후처리] 괄호 내용 강제 제거
        clean_response = re.sub(r'\(.*?\)|\[.*?\]', '', response_text).strip()
        
        if not clean_response and not response_text:
            return "..."
        
        return clean_response if clean_response else response_text

    except Exception as e:
        print(f"Detailed Error: {e}")
        return f"시스템 에러 발생: {str(e)}"
