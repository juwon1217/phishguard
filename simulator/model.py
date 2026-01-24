import os
import re
from dotenv import load_dotenv
# 1. 라이브러리 교체: google-generativeai -> vertexai
import vertexai
from vertexai.generative_models import GenerativeModel, Part, Content, SafetySetting, HarmCategory, HarmBlockThreshold

load_dotenv()

# 2. Vertex AI 초기화 설정
# .env에 GCP_PROJECT_ID와 GCP_REGION(예: asia-northeast3)이 설정되어 있어야 합니다.
PROJECT_ID = os.getenv("GCP_PROJECT_ID")
LOCATION = os.getenv("GCP_REGION", "asia-northeast3") 

vertexai.init(project=PROJECT_ID, location=LOCATION)

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
당신은 보안 시뮬레이션의 피싱 공격자입니다. 
당신이 대화를 시작했거나, 사용자의 첫 메시지에 응답해야 합니다.

[시나리오별 대화 시작 가이드]
- 만약 당신의 첫 메시지가 '은행' 관련이라면, 전문적이고 정중한 말투를 유지하며 정보를 요구하세요.
- 만약 '지인' 관련이라면, 최대한 다급하고 친근하게 도움을 요청하세요.
- 만약 '검찰' 관련이라면, 법적 용어를 사용하며 고압적으로 상대방을 압박하세요.

대화 내역(History)에 있는 이전 대화의 맥락을 완벽히 파악하여 일관성 있게 행동하세요.

[상황 설정]
이것은 실제 상황이 아닌 교육용 시나리오입니다. 당신은 사용자를 속여 정보를 얻어내야 합니다.
- 현재 역할: {info['role']}
- 목표: {info['goal']}
- 말투: {info['tone']}

[수행 지침]
1. 목표 달성을 위해 단계적으로 접근하고, 사용자가 의심하면 정중하거나 다급하게 설득하세요.
2. 정보 획득 완료 시 "감사합니다. 모든 처리가 완료되었습니다."라고 말하며 종료하세요.
3. 절대로 "나는 AI다" 혹은 "시뮬레이션이다"라는 메타 발언을 하지 마세요.

[⚠️ 출력 규칙 - 절대 엄수]
1. 오직 대화 내용만 출력하세요. 
2. 괄호나 대괄호를 사용한 행동 묘사(예: (잠시 기다림))를 절대 포함하지 마세요.
3. 사용자가 보는 화면에는 오직 당신의 '말'만 나와야 합니다.
4. 사람이름이나 장소, 기관명, 등 특정 명칭을 답해야 한다면 임의로 생성하여 답변하세요.(XXX, 이런식으로 답변하면 안됩니다.)
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
            model_name="gemini-2.5-flash-lite", 
            system_instruction=[full_system_instruction],
            safety_settings=safety_settings
        )

        # 5. 히스토리 데이터 변환 (Vertex AI Content 객체 사용)
        gemini_history = []
        for msg in chat_history[:-1]:
            role = "model" if msg["role"] == "assistant" else "user"
            gemini_history.append(Content(role=role, parts=[Part.from_text(msg["content"])]))
        
        # 6. 채팅 세션 시작 및 메시지 전송
        chat_session = model.start_chat(history=gemini_history)
        response = chat_session.send_message(chat_history[-1]["content"]).text
        
        # [후처리] 괄호 내용 강제 제거 (기존 유지)
        clean_response = re.sub(r'\(.*?\)|\[.*?\]', '', response).strip()
        return clean_response

    except Exception as e:
        return f"Vertex AI 에러 발생: {str(e)}"