# 🛡️ PhishGuard (AI 기반 보이스피싱 방어 훈련 플랫폼)

> **"지피지기면 백전백승, AI 범죄자를 상대로 당신의 방어력을 증명하세요."**
> *Developed by Team 강태공*

PhishGuard는 생성형 AI(Generative AI)를 활용하여 실제 보이스피싱 범죄 상황을 시뮬레이션하는 고급 보안 교육 플랫폼입니다. 정해진 답을 고르는 기존의 객관식 교육과 달리, 사용자는 AI 공격자와 자유롭게 대화하며 자신의 설득력과 방어 능력을 검증받을 수 있습니다.

![PhishGuard Version](https://img.shields.io/badge/Version-v3.0_Final-blue) ![License](https://img.shields.io/badge/License-MIT-green)

---

## 🚀 주요 기능 (Key Features)

### 1. 🤖 적응형 AI "레드팀" (Adaptive AI)
**Google Gemini 2.5 Pro**를 탑재한 AI가 실제 범죄자 페르소나(은행원, 수사관, 가족)를 완벽하게 연기합니다. 사용자의 반응에 따라 협박 강도를 높이거나, 동정심을 유발하는 등 실시간으로 공격 전략을 바꿉니다.

### 2. ⚡ 실시간 개인정보 유출 탐지 & AI 방어 태세
독자 개발한 **Random Forest Lite 모델**과 룰 베이스 엔진이 0.1초 단위로 대화를 분석합니다.
- **개인정보(PII) 탐지**: 주민번호, 계좌번호, 전화번호, 민감 키워드(비밀번호, 인증번호 등)
- **방어 행동 감지 (Defense Mode)**: 사용자가 상대의 신원을 역검증하거나(Who), 의심하는(Doubt) 패턴을 인식하여 즉시 피드백을 제공합니다.

### 3. 🛡️ 동적 보안 어드바이저 (Dynamic AI Security Advisory)
단순한 경고를 넘어, **"왜 당신의 답변이 위험한가?"**를 AI 보안 전문가가 1:1로 코칭합니다.
- **상황별 맞춤 분석**: 사용자가 "비밀번호는 1234야"라고 답하면, *"비밀번호 직접 언급은 매우 위험합니다. '직접 방문해 확인하겠다'고 응대하세요."* 라는 구체적인 솔루션을 생성합니다. (Leakage Score 40% 이상 시 발동)

### 4. 📊 독창적인 채점 알고리즘: "방어 성공률 (Defense Success Rate)"
단순히 유출 실수를 차감하는 방식이 아닙니다. **"공격 난이도 대비 얼마나 잘 방어했는가"**를 평가합니다.

$$
\text{총점} = 100 \times \left( 1 - \frac{\text{누적 유출 위험도}}{\text{누적 AI 공격 강도} + 0.5} \right)
$$

- **4자리 숫자 패널티**: 사용자 답변에 **4자리 이상의 연속된 숫자**(전화번호, 계좌, PIN 추정)가 포함될 경우, 치명적인 유출로 간주하여 패널티를 부여합니다.

### 5. 🎨 사용자 경험(UX) 중심의 디자인
- **Visual Analysis Loading**: 리포트 생성 대기 시간을 **"AI 정밀 진단"** 시각화 화면으로 전환하여 사용자 신뢰도를 높였습니다.
- **Glassmorphism UI**: 최신 트렌드를 반영한 유리 질감 인터페이스와 몰입감 넘치는 인터랙션.
- **상세 리포트**: 텍스트 대신 **직관적인 태그(Chip)**와 타임라인 형태의 피드백으로 내 실력을 한눈에 파악.

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분 | 기술 | 설명 |
| :--- | :--- | :--- |
| **Frontend** | ![React](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) | 대화형 인터페이스, 분석 대기 UX, 리포트 시각화 |
| **Backend** | ![Flask](https://img.shields.io/badge/Flask-3.0-black) ![Python](https://img.shields.io/badge/Python-3.9-yellow) | REST API 서버, AI 모델 파이프라인 |
| **AI Core** | ![Gemini](https://img.shields.io/badge/Google-Gemini_2.5_Pro-blue) | 페르소나 시뮬레이션 & 보안 어드바이저 (LLM) |
| **Analytics** | ![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-Lite-orange) | 서버리스 최적화 경량화 RF 분류 모델 |
| **Deploy** | ![Vercel](https://img.shields.io/badge/Vercel-Production-black) | Frontend/Backend 통합 호스팅 (Serverless) |

---

## 📂 프로젝트 구조 (Project Structure)

```bash
📦 PhishGuard
├── 📂 my-kakao-demo/       # [Frontend] React 애플리케이션
│   ├── src/
│   │   ├── components/     # 채팅, 로딩(Analyzing), 리포트 UI
│   │   ├── App.jsx         # 메인 로직 (뷰 상태 관리, 음성 제어)
│   │   └── index.css       # Tailwind CSS 스타일링
├── 📂 scoring_utils/       # [Backend] 분석 및 채점 모듈
│   ├── inference_lite.py   # 대규모 라이브러리 없는 경량 추론 엔진
│   ├── user_inference.py   # 유출 위험도 계산 로직
│   └── rf_model_lite.json  # 학습된 RF 모델 가중치 (JSON 포맷)
├── main.py                 # [Backend] Flask API & Gemini 연동
└── requirements.txt        # Python 의존성 목록
```

---

## 📢 배포 링크 (Live Demo)

현재 Vercel을 통해 정식 배포되어 누구나 체험할 수 있습니다.

👉 **[PhishGuard 최종 버전 체험하기](https://phishguard-jw.vercel.app/)**
*(크롬, 사파리 등 모던 브라우저 환경에 최적화되어 있습니다.)*

---

## 📝 라이선스 & 팀 정보

이 프로젝트는 **DACON : 피싱·스캠 예방을 위한 서비스 개발 경진대회**를 위해 개발되었습니다.

- **Team Name**: 강태공 (Gang Tae Gong)
- **License**: MIT License

> *"우리는 물고기가 아닌, 피싱범을 낚습니다."*