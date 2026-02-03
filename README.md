# 🛡️ PhishGuard (AI-Powered Vishing Simulation Platform)

> **"Experience real-world voice phishing scenarios with AI Red Teams and analyze your leakage risks in real-time."**

PhishGuard is an advanced cybersecurity training platform that uses Generative AI to simulate realistic voice phishing (vishing) attacks. Unlike traditional static quizzes, PhishGuard engages users in dynamic, open-ended conversations with an AI "Red Team" actor, analyzing their responses for sensitive information leakage.

![PhishGuard Overview](https://img.shields.io/badge/Version-v2.8-blue) ![License](https://img.shields.io/badge/License-MIT-green)

---

## 🚀 Key Features

### 1. 🤖 Adaptive AI "Red Team"
Powered by **Google Gemini 2.5 Pro**, the AI assumes specific personas (Banker, Family, Prosecutor) and adapts its attack strategy based on user responses. It uses psychological triggers like urgency, authority, and family emergencies to test user defenses.

### 2. ⚡ Real-time Leakage Detection (Lightweight AI)
A custom-built **Random Forest (Lite)** model runs in real-time to analyze user messages for:
- **PII Leakage**: Resident Registration Numbers (RRN), Account Numbers, Phone Numbers.
- **Sensitive Keywords**: Bank names, passwords, authentication codes.
- **Defense Patterns**: Detecting if the user is verifying identity or refusing demands.

### 3. 📊 Advanced Scoring System: "Defense Success Rate"
We rejected simple deduction-based scoring. Instead, we implemented a sophisticated **Defense Success Rate** formula that evaluates how well the user defended *relative* to the attack intensity.

$$
\text{Total Score} = 100 \times \left( 1 - \frac{\text{Total User Leakage}}{\text{Total AI Difficulty} + 0.5} \right)
$$

- **Dynamic Difficulty Adjustment**: If the AI attacks aggressively (High Difficulty) but the user defends well, the score remains high.
- **Digit Pattern Penalty**: A heuristic algorithm applies a massive penalty if **4+ consecutive digits** (potential PIN/Account/Phone) are detected in user responses.

### 4. 🎨 Modern Interactive Dashboard
- **React + Vite Frontend**: A silky-smooth chat interface with glassmorphism design.
- **Visual Analytics**: Interactive report cards with color-coded risk tags (Green for Safe/Defense, Red for Danger).
- **Grade System**: Instant A-F grading with personalized actionable feedback.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | ![React](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) | Interactive UI, Speech-to-Text, Real-time state management. |
| **Backend** | ![Flask](https://img.shields.io/badge/Flask-3.0-black) ![Python](https://img.shields.io/badge/Python-3.9-yellow) | REST API, AI Orchestration, Stateless architecture. |
| **AI Core** | ![Gemini](https://img.shields.io/badge/Google-Gemini_2.5_Pro-blue) | "Red Team" Persona generation, Conversation context management. |
| **Analysis** | ![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-Lite-orange) | Custom `RandomForest` model for leakage probability (Compressed for serverless). |
| **Deployment** | ![Vercel](https://img.shields.io/badge/Vercel-Production-black) | Serverless deployment for both Frontend and Backend. |

---

## 📂 Project Structure

```bash
📦 PhishGuard
├── 📂 my-kakao-demo/       # [Frontend] React Application
│   ├── src/
│   │   ├── components/     # Chat & Report UI Components
│   │   ├── App.jsx         # Main UI Logic (Chat, Audio, Report)
│   │   └── index.css       # Tailwind CSS Styling
├── 📂 scoring_utils/       # [Backend] Analysis Modules
│   ├── inference_lite.py   # Lightweight Model Inference (No heavy libs)
│   ├── user_inference.py   # Leakage Detection Logic
│   └── rf_model_lite.json  # Pre-trained Random Forest Weights
├── main.py                 # [Backend] Flask Entry Point & Scoring API
└── requirements.txt        # Python Dependencies
```

---

## 🧠 Smart Scoring Algorithm Detail

The core of PhishGuard is its fairness in evaluation.

1.  **AI Danger (Difficulty)**:
    *   The AI's messages are analyzed for phishing patterns (Family Impersonation, Financial Demand, Urgency).
    *   Higher aggression = Higher Difficulty Denominator.

2.  **User Leakage (Fault)**:
    *   User messages are scored for leakage probability.
    *   **Heuristic Override**: Any sequence of 4+ digits (e.g., "1234", "010-1234") adds a `+0.5` weighted penalty to the leakage score, assuming high risk of PII exposure.

3.  **Result**:
    *   A user who stays silent against a low-level attack gets a moderate score.
    *   A user who actively defends ("Who are you?", "I will call the bank") against a high-level attack gets a **Perfect Score**.

---

## 📢 Deployment

The project is live on Vercel:
👉 **[Live Demo Link](https://phishguard-final-clean-nshp9n7t8-juwon1217s-projects.vercel.app)**

*(Note: The AI requires a valid Google Cloud API Key to function)*

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
Designed for the **DACON 2026 Security AI Hackathon**.

> *Built with ❤️ by Team MadScientist / Juwon*