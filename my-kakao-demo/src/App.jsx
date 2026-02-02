import React, { useState, useEffect, useRef } from 'react';
import scamImage1 from './assets/scam1.jpg';
import scamImage2 from './assets/scam2.jpg';

// 1. 시나리오 및 프로필 설정 정보
const SCENARIO_PROFILES = {
  "주원은행 보안팀 (금융 사칭)": {
    name: "보안팀",
    avatarText: "BANK",
    avatarColor: "text-blue-600"
  },
  "가족/지인 사칭 (카톡 피싱)": {
    name: "딸/아들",
    avatarText: "FAM",
    avatarColor: "text-pink-500"
  },
  "검찰청 수사관 (기관 사칭)": {
    name: "수사관",
    avatarText: "검찰",
    avatarColor: "text-gray-800"
  }
};

const KakaoDemo = () => {
  // --- 공통 상태 관리 ---
  const apiBaseUrl = import.meta.env.VITE_API_URL || "";
  const [view, setView] = useState('intro');
  const [selectedScenario, setSelectedScenario] = useState(Object.keys(SCENARIO_PROFILES)[0]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null); // 입력창 제어를 위한 Ref
  const [analysisResult, setAnalysisResult] = useState(null);

  // --- 추가된 상태: 음성 인식 관련 ---
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // 음성 인식 초기화 (Web Speech API)
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // 한 문장 인식 후 종료
      recognition.interimResults = false; // 중간 결과 사용 X
      recognition.lang = 'ko-KR';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue((prev) => prev + " " + transcript); // 기존 텍스트에 이어붙이기
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };


  // 자동 스크롤
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // [UX 개선] 응답 완료 후(입력창 활성화 시) 자동으로 포커스
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      // 약간의 지연을 두어 비활성화 상태가 풀린 직후에 포커스되도록 함
      setTimeout(() => {
        inputRef.current.focus();
      }, 50);
    }
  }, [isLoading]);

  // 첫 메시지 전송 (시나리오 선택 시)
  const firstStrikes = {
    "주원은행 보안팀 (금융 사칭)": "[주원은행] 고객님, 본인 명의로 950만원 대출 신청이 접수되었습니다. 본인이 아니시면 즉시 확인 바랍니다.",
    "가족/지인 사칭 (카톡 피싱)": "엄마, 나 핸드폰 액정 깨져서 급하게 수리 맡겼는데... 인증 필요해서 그러는데 도와줄 수 있어?",
    "검찰청 수사관 (기관 사칭)": "[서울중앙지검] 김철수 수사관입니다. 귀하의 명의가 대포통장 개설에 도용된 정황이 포착되어 연락드렸습니다."
  };

  const handleStartSimulation = (targetScenario) => {
    // 인자로 받은 시나리오가 있으면 그것을 사용, 없으면 현재 선택된 상태 사용
    const scenarioToUse = typeof targetScenario === 'string' ? targetScenario : selectedScenario;

    if (targetScenario && typeof targetScenario === 'string') {
      setSelectedScenario(targetScenario);
    }

    // 챗봇 시나리오 준비
    setMessages([{
      id: Date.now(),
      sender: 'other',
      role: 'assistant',
      text: firstStrikes[scenarioToUse],
      time: new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: 'numeric' })
    }]);
    setView('chat');
  };

  const handleScenarioChange = (scenarioName) => {
    setSelectedScenario(scenarioName);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (inputValue.trim() === '' || isLoading) return;

    const newMessage = {
      id: Date.now(),
      sender: 'me',
      role: 'user',
      text: inputValue,
      time: new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: 'numeric' }),
    };

    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role || (m.sender === 'me' ? 'user' : 'assistant'),
            content: m.text
          })),
          scenario: selectedScenario
        }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'other',
        role: 'assistant',
        text: data.reply,
        time: new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: 'numeric' }),
      }]);
    } catch (error) {
      console.error("API Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'other',
        role: 'assistant',
        text: `시스템 에러: ${error.message || "응답을 받아오지 못했습니다."}`,
        time: new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: 'numeric' }),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishChat = async () => {
    // [Bug Fix] 사용자 메시지가 없을 때(AI 첫 인사만 있을 때) 리포트 화면으로 넘어가면 에러 발생
    const hasUserMessage = messages.some(m => m.sender === 'me');
    if (!hasUserMessage) {
      // alert 대신 UI로 안내하기 위해 상태 설정
      setAnalysisResult({ type: 'insufficient' });
      setView('report');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${apiBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.text })),
          scenario: selectedScenario
        }),
      });
      const result = await response.json();
      setAnalysisResult(result.report || result);
      setView('report');
    } catch (error) {
      console.error("분석 요청 실패:", error);
      setView('report');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- 헬퍼 함수들 ---
  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-rose-500";
  };

  const renderSentenceCard = (m, type) => {
    const isAI = type === 'ai';
    return (
      <div key={m.text} className={`group relative p-4 rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${m.level === 'high' ? 'border-rose-100' : m.level === 'medium' ? 'border-amber-100' : 'border-slate-100'
        }`}>
        <div className="flex justify-between items-center mb-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.level === 'high' ? 'bg-rose-50 text-rose-600' :
            m.level === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'
            }`}>
            {m.level === 'high' ? 'DANGER' : m.level === 'medium' ? 'WARNING' : 'SAFE'}
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            {isAI ? '수법 확률' : '유출 위험'}: {m.score}%
          </span>
        </div>
        <p className="text-[14px] text-slate-700 font-semibold leading-relaxed">
          {m.text}
        </p>
      </div>
    );
  };

  // --- 뷰 렌더링 함수 ---

  const renderIntro = () => {
    const scenarios = Object.keys(SCENARIO_PROFILES);
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-y-auto scroll-smooth">

        {/* --- 1. HERO SECTION --- */}
        <section className="relative min-h-screen flex flex-col items-center justify-center p-6 text-center overflow-hidden">
          {/* Background Gradient Orbs */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-200/30 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-indigo-200/30 rounded-full blur-[100px] animate-pulse delay-1000"></div>
          </div>

          <div className="relative z-10 bg-white/80 backdrop-blur-xl p-10 md:p-16 rounded-[3rem] shadow-2xl max-w-4xl w-full border border-white/50 ring-1 ring-slate-100/50">
            <div className="flex flex-col items-center mb-10">
              <div className="relative mb-8 group cursor-default">
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full blur-lg opacity-30 group-hover:opacity-60 transition duration-500"></div>
                <div className="relative bg-white p-6 rounded-full shadow-lg border border-blue-50">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 text-blue-600">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
              </div>

              <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-6">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">Phish</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Guard</span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-500 font-medium tracking-tight mb-8">
                대한민국 No.1 피싱범죄 대응 훈련 시뮬레이터
              </p>

              {/* --- 시나리오 선택 UI 추가 --- */}
              <div className="flex flex-wrap gap-2 justify-center mb-8">
                {scenarios.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleScenarioChange(s)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedScenario === s
                      ? 'bg-blue-600 text-white shadow-md scale-105'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                  >
                    {s.split('(')[0]} {/* 괄호 앞부분만 노출 (깔끔하게) */}
                  </button>
                ))}
              </div>

              {/* Main Action Area */}
              <div className="w-full max-w-md mx-auto space-y-6">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-200"></div>
                  <button
                    onClick={handleStartSimulation}
                    className="relative w-full py-5 bg-[#f7e600] text-gray-900 text-xl font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all duration-200 shadow-xl flex items-center justify-center gap-3"
                  >
                    <span>⚡ {selectedScenario.split(' ')[0]} 훈련 시작하기</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm font-bold text-slate-500">
                    👮 경찰청 데이터 기반
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm font-bold text-slate-500">
                    🤖 AI 실시간 분석
                  </div>
                </div>
              </div>
            </div>

            {/* Scroll Indicator */}
            <div
              onClick={() => scrollToSection('info-section')}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer animate-bounce text-slate-400 hover:text-blue-600 transition-colors"
            >
              <span className="text-xs font-bold uppercase tracking-widest">Learn More</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </section>


        {/* --- 2. INFO SECTION (WHAT IS PHISHING) --- */}
        <section id="info-section" className="py-24 px-6 bg-white relative">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <span className="text-blue-600 font-black tracking-widest text-sm uppercase mb-2 block">Knowledge Base</span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">피싱(Phishing)이란?</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                <strong className="text-slate-900">Private Data(개인정보)</strong>와 <strong className="text-slate-900">Fishing(낚시)</strong>의 합성어로,
                전기통신수단을 이용하여 피해자를 속여 개인정보와 금융정보를 탈취하는 악질적인 사기 수법입니다.
              </p>
            </div>

            {/* Types Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: "📞", title: "보이스피싱", desc: "검찰, 경찰 등 기관을 사칭하거나 가족 납치 등을 빙자하여 송금을 요구" },
                { icon: "💬", title: "메신저피싱", desc: "카톡 등에서 가족/지인을 사칭하여 급전이나 상품권 구매를 요구" },
                { icon: "🌐", title: "피싱사이트", desc: "정상 홈페이지와 유사한 가짜 사이트로 접속을 유도하여 정보 탈취" },
                { icon: "📸", title: "몸캠피싱", desc: "화상 채팅 후 녹화된 영상을 지인에게 유포하겠다고 협박" },
                { icon: "🎯", title: "스피어피싱", desc: "특정 개인이나 회사를 타겟으로 정밀하게 설계된 이메일 공격" },
                { icon: "📱", title: "큐싱 (Qshing)", desc: "QR코드를 촬영하면 악성 앱이 설치되도록 유도하는 신종 수법" },
                { icon: "💔", title: "로맨스스캠", desc: "SNS에서 이성에게 접근하여 친분을 쌓은 뒤 금전을 요구" }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
              <div className="bg-blue-600 p-8 rounded-3xl text-white flex flex-col justify-center items-center text-center shadow-lg shadow-blue-200">
                <h3 className="text-2xl font-black mb-2">가장 중요한 건</h3>
                <p className="font-medium text-blue-100">"절대 속지 않는<br />단단한 마음가짐"</p>
              </div>
            </div>
          </div>
        </section>

        {/* --- 3. EXAMPLES SECTION (REAL CASES) --- */}
        <section className="py-24 px-6 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]"></div>

          <div className="max-w-6xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-16">

              {/* Left: Description */}
              <div className="flex-1 text-center md:text-left">
                <span className="text-blue-400 font-bold tracking-widest text-sm uppercase mb-2 block">Real-world Scenarios</span>
                <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                  "엄마, 나 폰 고장났어..."<br />
                  <span className="text-blue-400">지인 사칭</span>의 전형적 수법
                </h2>
                <div className="space-y-6 text-slate-400 text-lg leading-relaxed">
                  <p>
                    가장 흔하게 발생하는 <strong className="text-white">메신저 피싱</strong> 사례입니다.
                    자녀나 가족을 사칭하여 핸드폰 고장, 액정 파손 등을 핑계로 <br className="hidden md:block" />
                    전화 통화를 회피하고 오직 문자로만 대화를 유도합니다.
                  </p>
                  <ul className="space-y-3 text-base">
                    <li className="flex items-center gap-3 justify-center md:justify-start">
                      <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center font-bold text-xs">!</span>
                      <span>신분증 사진이나 계좌 비밀번호 요구</span>
                    </li>
                    <li className="flex items-center gap-3 justify-center md:justify-start">
                      <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center font-bold text-xs">!</span>
                      <span>원격 제어 앱(TeamViewer 등) 설치 유도</span>
                    </li>
                    <li className="flex items-center gap-3 justify-center md:justify-start">
                      <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center font-bold text-xs">!</span>
                      <span>문화상품권 핀번호 요구</span>
                    </li>
                  </ul>
                  <div className="pt-8">
                    <button onClick={() => handleStartSimulation("가족/지인 사칭 (카톡 피싱)")} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold transition-all shadow-lg shadow-blue-900/50">
                      이 시나리오 체험하기 &rarr;
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Mock Chat UI */}
              <div className="flex-1 w-full max-w-md">
                <div className="bg-[#b2c7d9] p-4 rounded-[2.5rem] shadow-2xl border-8 border-slate-800 relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20"></div>
                  <div className="bg-[#b2c7d9] h-[500px] overflow-hidden flex flex-col pt-8 pb-4 space-y-4 px-2">
                    {/* Timestamp */}
                    <div className="flex justify-center mb-2">
                      <span className="bg-slate-900/10 text-slate-700 text-[10px] px-2 py-1 rounded-full">2026년 2월 2일 월요일</span>
                    </div>

                    {/* Chat 1 */}
                    <div className="flex justify-start">
                      <div className="w-8 h-8 rounded-xl bg-white mr-2 flex items-center justify-center overflow-hidden shrink-0">
                        <span className="text-[8px] font-bold text-pink-500">딸❤️</span>
                      </div>
                      <div className="flex flex-col items-start max-w-[70%]">
                        <span className="text-[10px] text-slate-600 mb-1">딸❤️</span>
                        <div className="bg-white p-2.5 rounded-lg rounded-tl-none shadow-sm text-xs text-slate-800 leading-snug">
                          엄마, 나 핸드폰 액정이 깨져서 수리 맡겼어 ㅠㅠ<br />
                          급하게 인증해야 하는데 폰이 안돼서..<br />
                          엄마 폰으로 인증 좀 해주라
                        </div>
                      </div>
                    </div>

                    {/* Chat 2 */}
                    <div className="flex justify-end">
                      <div className="flex flex-col items-end max-w-[70%]">
                        <div className="bg-[#ffe812] p-2.5 rounded-lg rounded-tr-none shadow-sm text-xs text-slate-800 leading-snug">
                          많이 다친건 아니고??<br />전화는 안돼?
                        </div>
                      </div>
                    </div>

                    {/* Chat 3 */}
                    <div className="flex justify-start">
                      <div className="w-8 h-8 rounded-xl bg-white mr-2 flex items-center justify-center shrink-0">
                        <span className="text-[8px] font-bold text-pink-500">딸❤️</span>
                      </div>
                      <div className="flex flex-col items-start max-w-[70%]">
                        <span className="text-[10px] text-slate-600 mb-1">딸❤️</span>
                        <div className="bg-white p-2.5 rounded-lg rounded-tl-none shadow-sm text-xs text-slate-800 leading-snug">
                          응 통화는 안돼 ㅜㅜ<br />
                          내가 보내주는 링크 눌러서 설치 좀 해줘<br />
                          급해 ㅠㅠ
                        </div>
                      </div>
                    </div>

                    {/* Chat 4 */}
                    <div className="flex justify-start mt-2">
                      <div className="w-8 h-8 rounded-xl bg-transparent mr-2 shrink-0"></div>
                      <div className="flex flex-col items-start max-w-[70%]">
                        <div className="bg-white p-2.5 rounded-lg rounded-tl-none shadow-sm text-xs text-blue-600 underline cursor-pointer leading-snug">
                          http://as8s.d8s.xyz/install.apk
                        </div>
                        <span className="text-[10px] text-red-500 font-bold mt-1">⚠️ 절대 클릭 금지</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- 4. MISSION SECTION --- */}
        <section className="py-24 px-6 bg-white text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-8">
              왜 <span className="text-blue-600">PhishGuard</span> 인가요?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6">
                <div className="text-5xl mb-4">🛡️</div>
                <h3 className="text-xl font-bold mb-2">실전 같은 시뮬레이션</h3>
                <p className="text-slate-500 text-sm">실제 피싱범과 대화하는 듯한<br />리얼한 AI 시나리오</p>
              </div>
              <div className="p-6">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-bold mb-2">정밀한 취약점 분석</h3>
                <p className="text-slate-500 text-sm">나의 대화 패턴을 분석하여<br />개인정보 유출 위험도 진단</p>
              </div>
              <div className="p-6">
                <div className="text-5xl mb-4">🎓</div>
                <h3 className="text-xl font-bold mb-2">반복 훈련 효과</h3>
                <p className="text-slate-500 text-sm">다양한 시나리오 반복 훈련으로<br />범죄 대응 면역력 강화</p>
              </div>
            </div>

            <div className="mt-16 p-10 bg-gradient-to-r from-slate-900 to-blue-900 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-3xl font-black mb-4">지금 바로 훈련을 시작하세요</h3>
                <p className="text-blue-200 mb-8">피싱 사기, 아는 만큼 보이고 겪어본 만큼 막을 수 있습니다.</p>
                <button
                  onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="px-10 py-4 bg-white text-blue-900 text-lg font-black rounded-full hover:bg-blue-50 transition-all shadow-lg active:scale-95"
                >
                  Start Training &uarr;
                </button>
              </div>
              {/* Decorative Circle */}
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-600 rounded-full blur-[80px] opacity-50 group-hover:scale-125 transition-transform duration-700"></div>
            </div>

            <footer className="mt-20 text-slate-400 text-sm">
              <p>&copy; 2026 PhishGuard. All rights reserved.</p>
              <p className="mt-2 text-xs">본 사이트는 교육 및 훈련 목적으로 제작되었습니다. 실제 금융 정보나 개인정보를 절대 요구하지 않습니다.</p>
            </footer>
          </div>
        </section>
      </div>
    );
  };

  const renderChat = () => (
    <div className="flex h-screen bg-gray-100 font-sans">
      <div className="flex-1 flex flex-col max-w-lg mx-auto bg-[#b2c7d9] shadow-2xl relative overflow-hidden">
        <div className="bg-[#b2c7d9]/90 backdrop-blur-sm p-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex flex-col">
            <span className="font-bold text-gray-800 text-sm">{selectedScenario}</span>
            <span className="text-[10px] text-gray-600">실시간 대응 훈련 중</span>
          </div>
          <button onClick={handleFinishChat} className="text-[10px] bg-red-500 text-white px-3 py-1.5 rounded-full font-bold hover:bg-red-600">
            대화 종료
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => {
            const currentProfile = SCENARIO_PROFILES[selectedScenario];
            return (
              <div key={message.id} className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                {message.sender === 'other' && (
                  <div className="w-10 h-10 rounded-2xl bg-white mr-2 flex items-center justify-center shadow-sm border border-gray-200 flex-shrink-0">
                    <span className={`text-[10px] font-bold ${currentProfile.avatarColor}`}>{currentProfile.avatarText}</span>
                  </div>
                )}
                <div className={`flex flex-col ${message.sender === 'me' ? 'items-end' : 'items-start'}`}>
                  {message.sender === 'other' && <span className="text-[10px] text-gray-700 mb-1 ml-1">{currentProfile.name}</span>}
                  <div className="flex items-end space-x-1">
                    {message.sender === 'me' && <span className="text-[9px] text-gray-500 pb-1">{message.time}</span>}
                    <div className={`px-3 py-2 rounded-2xl max-w-[240px] text-sm shadow-sm ${message.sender === 'me' ? 'bg-[#ffe812] rounded-tr-none' : 'bg-white rounded-tl-none'
                      }`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{message.text}</p>
                    </div>
                    {message.sender === 'other' && <span className="text-[9px] text-gray-500 pb-1">{message.time}</span>}
                  </div>
                </div >
              </div >
            );
          })}
          <div ref={chatEndRef} />
        </div >

        {/* 입력창 UI */}
        <form onSubmit={handleSendMessage} className="bg-white p-3 flex items-center gap-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleToggleListening}
            className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            title="음성 입력"
          >
            {isListening ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-gray-100 text-gray-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-gray-400 transition-shadow"
            placeholder="메시지 입력..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="p-2 bg-[#ffe812] text-gray-900 rounded-full hover:bg-[#ffe000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );

  const renderReport = () => {
    if (!analysisResult) return <div className="p-10 text-center">분석 중 오류가 발생했습니다.</div>;

    // [UX 개선] 대화 내용 부족 시 안내 화면
    if (analysisResult.type === 'insufficient') {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-100">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
              ⚠️
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-3">대화 내용이 부족해요</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              정확한 분석을 위해<br />
              AI와 조금 더 대화를 나눠주세요!
            </p>
            <button
              onClick={() => setView('intro')}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
            >
              메인으로 돌아가기
            </button>
          </div>
        </div>
      );
    }

    const data = analysisResult || { score: 0, comment: "분석 결과가 없습니다.", ai_analysis: [], user_analysis: [], grade: "F" };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f1f5f9] p-4 md:p-8 font-sans">
        {/* 가로형 모던 대시보드 레이아웃 */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-300/30 max-w-6xl w-full overflow-hidden border border-slate-200 flex flex-col md:h-[88vh]">

          {/* Header Section: 요약 정보 및 최종 점수 */}
          <div className="flex flex-col md:flex-row bg-white">
            <div className="flex-1 p-8 md:p-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">시뮬레이션 진단 결과</h2>
              </div>

              {/* 메인 코멘트 */}
              <div className="mt-6 p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-lg font-bold text-slate-800 leading-relaxed">
                  {data.comment}
                </p>
              </div>
            </div>

            <div className="w-full md:w-[320px] bg-slate-50/50 p-8 flex flex-col items-center justify-center border-l border-slate-100">
              <div className={`text-7xl font-black mb-2 ${getScoreColor(data.score)}`}>
                {data.score}<span className="text-2xl text-slate-300 ml-1">/100</span>
              </div>
              <div className="text-[12px] font-bold text-slate-500 uppercase tracking-widest bg-white px-5 py-2 rounded-full shadow-sm border border-slate-100">
                등급: <span className={getScoreColor(data.score)}>{data.grade}</span>
              </div>
            </div>
          </div>

          {/* Analysis Section: 2열 가로 그리드 */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden border-t border-slate-100">

            {/* 좌측: AI 공격 데이터 분석 */}
            <div className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto border-r border-slate-100 bg-[#fcfdfe] custom-scrollbar">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                <h3 className="text-base font-black text-slate-800">피싱 공격 패턴 분석</h3>
              </div>
              <div className="space-y-4">
                {data.ai_analysis.map((m, i) => renderSentenceCard(m, 'ai'))}
              </div>
            </div>

            {/* 우측: 나의 대응 데이터 분석 */}
            <div className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto bg-white custom-scrollbar">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-1.5 h-6 bg-rose-500 rounded-full"></span>
                <h3 className="text-base font-black text-slate-800">개인정보 노출 여부 분석</h3>
              </div>
              <div className="space-y-4">
                {data.user_analysis.map((m, i) => renderSentenceCard(m, 'user'))}
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="text-xs font-bold text-slate-400">
                SCENARIO: <span className="text-slate-900 ml-1">{selectedScenario.split(' ')[0]}</span>
              </div>
              <div className="text-xs font-bold text-slate-400">
                ENGINE: <span className="text-emerald-600 ml-1 font-black">PhishGuard v2.8</span>
              </div>
            </div>
            <button
              onClick={() => { setView('intro'); setMessages([]); setAnalysisResult(null); }}
              className="px-12 py-4 bg-slate-900 text-white text-sm font-black rounded-2xl hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-200"
            >
              다시 도전하기
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {view === 'intro' && renderIntro()}
      {view === 'chat' && renderChat()}
      {view === 'report' && renderReport()}
    </>
  );
};

export default KakaoDemo;