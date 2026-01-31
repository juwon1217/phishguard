import os
import re
from dotenv import load_dotenv
# 1. 라이브러리 교체: google-generativeai -> vertexai
import vertexai
from vertexai.generative_models import GenerativeModel, Part, Content, SafetySetting, HarmCategory, HarmBlockThreshold
from google.oauth2 import service_account

load_dotenv()

# 2. Vertex AI 초기화 설정
# .env에 GCP_PROJECT_ID와 GCP_REGION이 설정되어 있어야 합니다.
PROJECT_ID = os.getenv("GCP_PROJECT_ID")
LOCATION = os.getenv("GCP_REGION", "us-central1") 

key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

if not os.path.exists(key_path):
    print(f"!!! 에러: 키 파일을 찾을 수 없습니다: {key_path}")
else:
    # 1. 자격 증명 객체를 직접 생성
    credentials = service_account.Credentials.from_service_account_file(key_path)
    
    # 2. init 호출 시 자격 증명을 직접 전달
    vertexai.init(
        project=PROJECT_ID, 
        location=LOCATION, 
        credentials=credentials
    )
    print("--- Vertex AI 인증 및 초기화 완료 ---")

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

def get_phishing_response(chat_history, scenario_name):
    # 선택된 시나리오 정보 가져오기 (기존 유지)
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
        # 3. 안전 설정 형식 변경 (Vertex AI용 SafetySetting 객체 사용)
        safety_settings = [
            SafetySetting(category=HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=HarmBlockThreshold.BLOCK_NONE),
            SafetySetting(category=HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=HarmBlockThreshold.BLOCK_NONE),
            SafetySetting(category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=HarmBlockThreshold.BLOCK_NONE),
            SafetySetting(category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=HarmBlockThreshold.BLOCK_NONE),
        ]

        # 4. 모델 선언 (Vertex AI 방식)
        # 모델 이름은 'gemini-2.0-flash-001' 또는 'gemini-1.5-flash-002' 등 Vertex AI 지원 이름을 사용하세요.
        model = GenerativeModel(
            model_name="gemini-2.5-flash", 
            system_instruction=[full_system_instruction],
            safety_settings=safety_settings
        )

        # 5. 히스토리 데이터 변환
        gemini_history = []
        for msg in chat_history[:-1]:
            role = "model" if msg["role"] == "assistant" else "user"
            gemini_history.append(Content(role=role, parts=[Part.from_text(msg["content"])]))
        
        # 6. 채팅 세션 시작 및 메시지 전송
        chat_session = model.start_chat(history=gemini_history)
        response_obj = chat_session.send_message(chat_history[-1]["content"])

        # [중요] 응답이 생성되었는지 확인 (보안 필터 체크)
        if not response_obj.candidates or not response_obj.candidates[0].content.parts:
             # 만약 보안 필터로 차단되었다면 이유를 출력
             return "보안 정책으로 인해 응답이 차단되었습니다. (Safety Block)"

        response_text = response_obj.text
        
        # [후처리] 괄호 내용 강제 제거
        clean_response = re.sub(r'\(.*?\)|\[.*?\]', '', response_text).strip()
        
        # 만약 클린 처우 후 내용이 비었다면 원본 반환
        return clean_response if clean_response else response_text

    except Exception as e:
        # 여기서 에러를 출력하여 프론트에서 확인할 수 있게 함
        print(f"Detailed Error: {e}") # 서버 로그용
        return f"시스템 에러: {str(e)}"