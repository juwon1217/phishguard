from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from simulator.model import get_phishing_response # 우리가 만든 모델
from analyzer import analyze_phishing_chat

app = FastAPI()

# React(포트 5173)에서 오는 요청을 허용하는 설정 (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 보안상 나중에는 특정 주소만 허용하도록 수정
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    scenario: str

@app.post("/chat")
async def chat(request: ChatRequest):

    print("\n" + "="*60)
    print(f"📡 새로운 요청 도착! [시나리오: {request.scenario}]")
    print("-" * 60)

    for i, msg in enumerate(request.messages):
        role_label = "나(User)" if msg.role == "user" else "AI(Assistant)"
        print(f"[{i}] {role_label}: {msg.content}")
    
    print("="*60 + "\n")
    
    # React에서 보낸 메시지 형식을 OpenAI/Gemini 형식으로 변환
    formatted_history = [{"role": m.role, "content": m.content} for m in request.messages]
    
    # 팀원 A가 만든 모델 호출
    response_text = get_phishing_response(formatted_history, request.scenario)
    
    return {"reply": response_text}

@app.post("/analyze")
async def analyze(request: ChatRequest):
    # 팀원 B의 함수에 대화 내역 전달
    # request.messages 안에 리스트 형태로 데이터가 들어있습니다.
    messages_data = [m.model_dump() for m in request.messages]
    analysis_report = analyze_phishing_chat(messages_data, request.scenario)
    
    return {"report": analysis_report}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)