# 🛡️ PhishGuard (AI 기반 보이스피싱 방어 훈련 플랫폼)

> **"실전 같은 AI 레드팀과의 대화를 통해 당신의 개인정보 방어력을 테스트하세요."**

PhishGuard는 생성형 AI(Generative AI)를 활용하여 실제 보이스피싱 범죄 상황을 시뮬레이션하는 고급 보안 교육 플랫폼입니다. 정해진 답을 고르는 기존의 객관식 교육과 달리, 사용자는 AI 공격자와 자유롭게 대화하며 자신의 설득력과 방어 능력을 검증받을 수 있습니다.

![PhishGuard Version](https://img.shields.io/badge/Version-v2.8-blue) ![License](https://img.shields.io/badge/License-MIT-green)

---

## 🚀 주요 기능 (Key Features)

### 1. 🤖 적응형 AI "레드팀" (Adaptive AI)
**Google Gemini 2.5 Pro**를 탑재한 AI가 실제 범죄자 페르소나(은행원, 수사관, 가족)를 완벽하게 연기합니다. 사용자의 반응에 따라 협박 강도를 높이거나, 동정심을 유발하는 등 실시간으로 공격 전략을 바꿉니다.

### 2. ⚡ 실시간 개인정보 유출 탐지
독자 개발한 **Random Forest Lite 모델**이 사용자의 메시지를 0.1초 단위로 분석하여 위험을 감지합니다.
- **개인정보(PII) 탐지**: 주민번호, 계좌번호, 전화번호, 민감 키워드(비밀번호, 인증번호 등)
- **방어 행동 감지**: 사용자가 상대의 신원을 묻거나(Who), 의심하는(Doubt) 패턴을 인식하여 가산점 부여

### 3. 📊 독창적인 채점 알고리즘: "방어 성공률 (Defense Success Rate)"
단순히 유출 실수를 차감하는 방식이 아닙니다. **"공격 난이도 대비 얼마나 잘 방어했는가"**를 평가하는 합리적인 수식을 적용했습니다.

$$
\text{총점} = 100 \times \left( 1 - \frac{\text{누적 유출 위험도}}{\text{누적 AI 공격 강도} + 0.5} \right)
$$

- **동적 난이도 반영**: AI의 공격이 거세질수록(난이도 상승), 사용자가 잘 방어하면 점수가 더 견고하게 유지됩니다.
- **4자리 숫자 패널티**: 사용자 답변에 **4자리 이상의 연속된 숫자**(전화번호, 계좌, PIN 추정)가 포함될 경우, 치명적인 유출로 간주하여 유출 위험도에 **+0.5의 가중치**를 즉시 부여합니다.

### 4. 🎨 모던 인터랙티브 대시보드
- **React + Vite 기반**: 유리 질감(Glassmorphism) UI와 부드러운 애니메이션 적용
- **시각적 리포트**: 텍스트 대신 **직관적인 태그(Chip)**로 위험 요인을 표시 (🔴 위험 / 🟢 방어 성공)
- **등급 시스템**: A~F 등급 및 맞춤형 피드백 제공

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분 | 기술 | 설명 |
| :--- | :--- | :--- |
| **Frontend** | ![React](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) | 대화형 인터페이스, 음성 인식(STT), 리포트 시각화 |
| **Backend** | ![Flask](https://img.shields.io/badge/Flask-3.0-black) ![Python](https://img.shields.io/badge/Python-3.9-yellow) | REST API 서버, AI 모델 파이프라인 관리 |
| **AI Internal** | ![Gemini](https://img.shields.io/badge/Google-Gemini_2.5_Pro-blue) | 상황극 페르소나 생성 및 맥락 유지 (Attacker Bot) |
| **Analytics** | ![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-Lite-orange) | 서버리스 환경에 최적화된 경량화 RF 분류 모델 |
| **Infra** | ![Vercel](https://img.shields.io/badge/Vercel-Production-black) | 프론트엔드/백엔드 통합 호스팅 (Serverless Function) |

---

## 📂 프로젝트 구조 (Project Structure)

```bash
📦 PhishGuard
├── 📂 my-kakao-demo/       # [Frontend] React 애플리케이션
│   ├── src/
│   │   ├── components/     # 채팅 및 리포트 UI 컴포넌트
│   │   ├── App.jsx         # 메인 로직 (채팅 흐름, 음성 제어)
│   │   └── index.css       # Tailwind CSS 스타일링
├── 📂 scoring_utils/       # [Backend] 분석 및 채점 모듈
│   ├── inference_lite.py   # 대규모 라이브러리 없는 경량 추론 엔진
│   ├── user_inference.py   # 유출 위험도 계산 로직
│   └── rf_model_lite.json  # 학습된 RF 모델 가중치 (JSON 포맷)
├── main.py                 # [Backend] Flask 앱 진입점 & 채점 API (방어 성공률 공식 포함)
└── requirements.txt        # Python 의존성 목록
```

---

## 🧠 상세 채점 로직 (Scoring Logic)

PhishGuard의 채점 시스템은 사용자의 억울함을 방지하고 실력을 정확히 측정하기 위해 설계되었습니다.

1.  **AI 공격 강도 (Difficulty)**:
    *   매 턴마다 AI 메시지의 피싱 의도(가족 사칭, 금전 요구, 긴급성 등)를 분석하여 `0.0`~`1.0` 사이의 공격 점수를 누적합니다.
    *   공격이 강할수록 분모가 커져, 사소한 실수로 인한 점수 하락폭이 줄어듭니다.

2.  **사용자 유출 위험 (Leakage)**:
    *   사용자 메시지에서 민감 키워드가 발견되면 위험 점수가 누적됩니다.
    *   **휴리스틱 오버라이드 (Heuristic Override)**: `1234`, `010-1234` 등 4자리 이상의 숫자 패턴이 발견되면, 모델 예측값과 별개로 유출 위험도에 `0.5`를 강제로 더합니다. (가장 위험한 행동)

3.  **방어 행동 감지**:
    *   "누구세요?", "은행에 전화해볼게요" 등의 방어적 발화는 유출 위험도를 0으로 초기화하고, **[✅ 방어 행동 감지]** 배지를 부여합니다.

---

## 📢 배포 링크

현재 Vercel을 통해 정식 배포되어 누구나 체험할 수 있습니다.
👉 **[실전 체험 링크 바로가기](https://phishguard-final-clean-nshp9n7t8-juwon1217s-projects.vercel.app)**

*(참고: AI 기능은 유효한 Google Cloud API Key가 설정된 환경에서만 작동합니다.)*

---

## 📝 라이선스

이 프로젝트는 **DACON : 피싱·스캠 예방을 위한 서비스 개발 경진대회** 출품작으로 개발되었습니다.
MIT License에 따라 자유롭게 수정 및 배포가 가능합니다.

> *Developed by Team 강태공*