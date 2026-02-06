import React, { useState, useEffect, useRef } from 'react';
// 1. 시나리오 및 프로필 설정 정보
const SCENARIO_PROFILES = {
  "가족/지인 사칭 (카톡 피싱)": {
    name: "지인❤️",
    avatarText: "지인",
    avatarColor: "bg-yellow-400 text-slate-900"
  },
  "농협은행 보안팀 (금융 사칭)": {
    name: "보안팀",
    avatarText: "NH",
    avatarColor: "bg-blue-600 text-white"
  },
  "검찰청 수사관 (기관 사칭)": {
    name: "김철수 수사관",
    avatarText: "검찰",
    avatarColor: "bg-slate-800 text-white"
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
    "농협은행 보안팀 (금융 사칭)": "[농협은행] 고객님, 본인 명의로 950만원 대출 신청이 접수되었습니다. 본인이 아니시면 즉시 확인 바랍니다.",
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

    // [UX] 분석형 로딩 화면 진입
    setView('analyzing');

    try {
      // setIsLoading(true)는 필요 없거나 백그라운드 처리를 위해 유지
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

      // 분석 완료 후 리포트 화면으로 전환
      setView('report');
    } catch (error) {
      console.error("분석 요청 실패:", error);
      setView('report');
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
        <p className="text-[14px] text-slate-700 font-semibold leading-relaxed mb-2">
          {m.text}
        </p>

        {/* Render Risk Tags (Chips) */}
        {m.tags && m.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {m.tags.map((tag, idx) => {
              // Dynamic Chip Styling
              const isSafe = tag.includes('방어');
              const chipStyle = isSafe
                ? "bg-emerald-50 border border-emerald-100 text-emerald-600"
                : "bg-rose-50 border border-rose-100 text-rose-600";

              return (
                <span key={idx} className={`${chipStyle} text-[10px] px-2 py-0.5 rounded-md font-bold`}>
                  {tag}
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // --- 뷰 렌더링 함수 ---

  const renderIntro = () => {
    const scenarios = Object.keys(SCENARIO_PROFILES);
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-y-auto scroll-smooth">

        {/* --- 1. HERO SECTION (Redesigned: Immersive & Full Screen) --- */}
        <section className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-purple-50 via-white to-blue-50">

          {/* Animated Background Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-purple-300/30 rounded-full blur-[120px] animate-pulse mix-blend-multiply"></div>
            <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] bg-blue-300/30 rounded-full blur-[120px] animate-pulse delay-1000 mix-blend-multiply"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[100px] -z-10"></div>
          </div>

          <div className="relative z-10 flex flex-col items-center max-w-5xl mx-auto px-6 text-center">

            {/* Logo Icon with Glow */}
            <div className="relative mb-8 group">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition duration-500 animate-pulse"></div>
              <div className="relative bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-lg border border-white/50 ring-1 ring-blue-100/50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-blue-600">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
            </div>

            {/* Main Title */}
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-none mb-6 drop-shadow-sm">
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-slate-900 via-slate-700 to-slate-900">Phish</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-indigo-500">Guard</span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-500 font-medium tracking-tight mb-12 max-w-2xl leading-relaxed">
              대한민국 No.1 <span className="text-slate-800 font-bold">AI 피싱 대응 훈련 시뮬레이터</span><br />
              <span className="text-base text-slate-400 font-normal">실시간 AI 분석으로 당신의 방어력을 증명하세요</span>
            </p>

            {/* Scenario Selection Pills */}
            <div className="flex flex-wrap gap-3 justify-center mb-10">
              {scenarios.map((s) => (
                <button
                  key={s}
                  onClick={() => handleScenarioChange(s)}
                  className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border backdrop-blur-sm ${selectedScenario === s
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 scale-105'
                    : 'bg-white/60 text-slate-500 border-white hover:bg-white hover:border-blue-200 hover:text-blue-600'
                    }`}
                >
                  {s.split('(')[0].replace('농협은행', '은행')}
                </button>
              ))}
            </div>

            {/* Main CTA Button */}
            <div className="w-full max-w-md relative group mb-12">
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-300 to-orange-400 rounded-2xl blur opacity-40 group-hover:opacity-75 transition duration-300"></div>
              <button
                onClick={handleStartSimulation}
                className="relative w-full py-5 bg-[#f7e600] text-gray-900 text-xl font-black rounded-2xl hover:scale-[1.01] active:scale-95 transition-all duration-200 shadow-xl flex items-center justify-center gap-3"
              >
                <span>⚡ 훈련 시작하기</span>
              </button>
            </div>

            {/* Info Chips */}
            <div className="flex gap-4">
              <div className="px-5 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-white text-xs font-bold text-slate-500 shadow-sm flex items-center gap-2">
                <span>👮</span> 경찰청 데이터 기반
              </div>
              <div className="px-5 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-white text-xs font-bold text-slate-500 shadow-sm flex items-center gap-2">
                <span>🤖</span> AI 실시간 분석
              </div>
            </div>
          </div>

          {/* Scroll Indicator (Positioned Absolute to Screen) */}
          <div
            onClick={() => scrollToSection('info-section')}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 cursor-pointer group z-20"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-600 transition-colors">Start Learning</span>
            <div className="w-10 h-10 rounded-full bg-white/80 backdrop-blur shadow-md flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-slate-100 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

          <div className="max-w-6xl mx-auto relative z-10 space-y-32">

            {/* Case 1: Family Impersonation (Left Text, Right Phone) */}
            <div className="flex flex-col md:flex-row items-center gap-16">
              <div className="flex-1 text-center md:text-left">
                <span className="text-blue-400 font-bold tracking-widest text-sm uppercase mb-2 block">Scenario #1</span>
                <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                  "엄마, 나 폰 고장났어..."<br />
                  <span className="text-blue-400">지인 사칭</span>의 전형적 수법
                </h2>
                <div className="space-y-6 text-slate-400 text-lg leading-relaxed">
                  <p>
                    가장 흔하게 발생하는 <strong className="text-white">메신저 피싱</strong> 사례입니다.
                    자녀나 가족을 사칭하여 핸드폰 고장, 액정 파손 등을 핑계로
                    전화 통화를 회피하고 오직 문자로만 대화를 유도합니다.
                  </p>
                  <ul className="space-y-3 text-base">
                    <li className="flex items-center gap-3 justify-center md:justify-start"><span className="text-red-500 font-bold">!</span> 신분증 사진이나 계좌 비밀번호 요구</li>
                    <li className="flex items-center gap-3 justify-center md:justify-start"><span className="text-red-500 font-bold">!</span> 원격 제어 앱(TeamViewer 등) 설치 유도</li>
                    <li className="flex items-center gap-3 justify-center md:justify-start"><span className="text-red-500 font-bold">!</span> 문화상품권 핀번호 요구</li>
                  </ul>
                  <div className="pt-8">
                    <button onClick={() => handleStartSimulation("가족/지인 사칭 (카톡 피싱)")} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold transition-all shadow-lg shadow-blue-900/50">
                      가족 사칭 체험하기 &rarr;
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full max-w-md scale-95 hover:scale-100 transition-transform duration-500">
                {/* Mock Phone UI (Family) */}
                <div className="bg-[#b2c7d9] p-4 rounded-[2.5rem] shadow-2xl border-8 border-slate-800 relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20"></div>
                  <div className="bg-[#b2c7d9] h-[400px] overflow-hidden flex flex-col pt-8 pb-4 space-y-4 px-2">
                    <div className="flex justify-start"><div className="w-8 h-8 rounded-xl bg-slate-200 mr-2 flex items-center justify-center"><span className="text-[10px] text-slate-700 font-bold">지인</span></div><div className="bg-white p-2 text-xs rounded-lg text-black">엄마 폰 고장났어 ㅠㅠ<br />인증 좀 해줘</div></div>
                    <div className="flex justify-end"><div className="bg-[#ffe812] p-2 text-xs rounded-lg text-black">전화는 안돼?</div></div>
                    <div className="flex justify-start"><div className="w-8 h-8 rounded-xl bg-slate-200 mr-2 flex items-center justify-center"><span className="text-[10px] text-slate-700 font-bold">지인</span></div><div className="bg-white p-2 text-xs rounded-lg text-black">응 통화 안돼<br />급하니까 빨리..</div></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Case 2: Bank Impersonation (Right Text, Left Phone) */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-16">
              <div className="flex-1 text-center md:text-left">
                <span className="text-emerald-400 font-bold tracking-widest text-sm uppercase mb-2 block">Scenario #2</span>
                <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                  "고객님, 저금리 대출..."<br />
                  <span className="text-emerald-400">금융 기관 사칭</span>의 수법
                </h2>
                <div className="space-y-6 text-slate-400 text-lg leading-relaxed">
                  <p>
                    은행이나 카드사를 사칭하여 <strong className="text-white">정부 지원 대출</strong> 대상자로 선정되었다며 접근합니다.
                    기존 대출 상환을 유도하거나 신용 등급 상향을 위한 보증금을 요구합니다.
                  </p>
                  <ul className="space-y-3 text-base">
                    <li className="flex items-center gap-3 justify-center md:justify-start"><span className="text-red-500 font-bold">!</span> '최저 금리', '정부 지원' 키워드 강조</li>
                    <li className="flex items-center gap-3 justify-center md:justify-start"><span className="text-red-500 font-bold">!</span> 기존 대출금 상환 요구 (대포 통장)</li>
                    <li className="flex items-center gap-3 justify-center md:justify-start"><span className="text-red-500 font-bold">!</span> 악성 앱 설치 유도 (전화 가로채기)</li>
                  </ul>
                  <div className="pt-8">
                    <button onClick={() => handleStartSimulation("농협은행 보안팀 (금융 사칭)")} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold transition-all shadow-lg shadow-emerald-900/50">
                      금융 사칭 체험하기 &rarr;
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full max-w-md scale-95 hover:scale-100 transition-transform duration-500">
                {/* Mock Phone UI (Bank) */}
                <div className="bg-[#b2c7d9] p-4 rounded-[2.5rem] shadow-2xl border-8 border-slate-800 relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20"></div>
                  <div className="bg-[#b2c7d9] h-[400px] overflow-hidden flex flex-col pt-8 pb-4 space-y-4 px-2">
                    <div className="flex justify-start"><div className="w-8 h-8 rounded-xl bg-green-600 mr-2 flex items-center justify-center text-white"><span className="text-[8px]">Bank</span></div><div className="bg-white p-2 text-xs rounded-lg text-black">[은행] 고객님,<br />정부지원 저금리 대출<br />대상자로 선정되셨습니다.</div></div>
                    <div className="flex justify-end"><div className="bg-[#ffe812] p-2 text-xs rounded-lg text-black">신청하려면 어떻게 해요?</div></div>
                    <div className="flex justify-start"><div className="w-8 h-8 rounded-xl bg-green-600 mr-2 flex items-center justify-center text-white"><span className="text-[8px]">Bank</span></div><div className="bg-white p-2 text-xs rounded-lg text-black">먼저 기존 대출금을<br />일부 상환하셔야 합니다.</div></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Case 3: Prosecutor Impersonation (Left Text, Right Phone) */}
            <div className="flex flex-col md:flex-row items-center gap-16">
              <div className="flex-1 text-center md:text-left">
                <span className="text-amber-400 font-bold tracking-widest text-sm uppercase mb-2 block">Scenario #3</span>
                <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                  "서울중앙지검입니다."<br />
                  <span className="text-amber-400">수사 기관 사칭</span>의 공포
                </h2>
                <div className="space-y-6 text-slate-400 text-lg leading-relaxed">
                  <p>
                    검찰, 경찰 등을 사칭하여 <strong className="text-white">범죄 연루</strong> 사실을 통보하며 피해자를 위축시킵니다.
                    '보안 계좌'로 이체를 요구하거나 금융 자산 보호를 명목으로 정보를 요구합니다.
                  </p>
                  <ul className="space-y-3 text-base">
                    <li className="flex items-center gap-3 justify-center md:justify-start"><span className="text-red-500 font-bold">!</span> 권위적인 말투와 법적 조치 언급</li>
                    <li className="flex items-center gap-3 justify-center md:justify-start"><span className="text-red-500 font-bold">!</span> '보안 계좌'라며 송금 유도</li>
                    <li className="flex items-center gap-3 justify-center md:justify-start"><span className="text-red-500 font-bold">!</span> 주변에 알리지 말라고 협박 (비밀 수사)</li>
                  </ul>
                  <div className="pt-8">
                    <button onClick={() => handleStartSimulation("검찰청 수사관 (기관 사칭)")} className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-full font-bold transition-all shadow-lg shadow-amber-900/50">
                      기관 사칭 체험하기 &rarr;
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full max-w-md scale-95 hover:scale-100 transition-transform duration-500">
                {/* Mock Phone UI (Prosecutor) */}
                <div className="bg-[#b2c7d9] p-4 rounded-[2.5rem] shadow-2xl border-8 border-slate-800 relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20"></div>
                  <div className="bg-[#b2c7d9] h-[400px] overflow-hidden flex flex-col pt-8 pb-4 space-y-4 px-2">
                    <div className="flex justify-start"><div className="w-8 h-8 rounded-xl bg-gray-800 mr-2 flex items-center justify-center text-white"><span className="text-[8px]">검찰</span></div><div className="bg-white p-2 text-xs rounded-lg text-black">[서울중앙지검]<br />김철수 수사관입니다.<br />명의도용 사건 조사중입니다.</div></div>
                    <div className="flex justify-end"><div className="bg-[#ffe812] p-2 text-xs rounded-lg text-black">무슨 일이죠? 전 모르는 일입니다</div></div>
                    <div className="flex justify-start"><div className="w-8 h-8 rounded-xl bg-gray-800 mr-2 flex items-center justify-center text-white"><span className="text-[8px]">검찰</span></div><div className="bg-white p-2 text-xs rounded-lg text-black">본인 명의 대포통장이<br />범죄에 이용되었습니다.<br />협조 안하시면 체포영장...</div></div>
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

  // [NEW] Analyzing Loading Screen
  const renderAnalyzing = () => (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[100px] animate-pulse"></div>

      <div className="relative z-10 bg-white p-10 md:p-14 rounded-[3rem] shadow-2xl flex flex-col items-center text-center max-w-md w-full border border-slate-100/50 backdrop-blur-xl">

        {/* Animated Icon */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-blue-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
          <div className="w-24 h-24 rounded-full bg-slate-50 border-4 border-slate-100 flex items-center justify-center relative z-10 shadow-inner">
            <span className="text-5xl animate-bounce delay-75">🛡️</span>
            {/* Spinning Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-blue-500 animate-spin"></div>
          </div>
        </div>

        <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">보안 진단 중...</h2>
        <p className="text-slate-500 font-medium mb-10 text-sm leading-relaxed">
          AI가 대화의 맥락을 정밀 분석하고 있습니다.<br />
          잠시만 기다려주세요.
        </p>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
          <div className="absolute top-0 left-0 h-full bg-blue-600 rounded-full w-full animate-indeterminate-progress origin-left"></div>
        </div>

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

    const data = analysisResult || { score: 0, comment: "분석 결과가 없습니다.", ai_analysis: [], user_analysis: [], paired_analysis: [], grade: "F" };

    return (
      <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 pb-20">

        {/* Top Navigation / Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4 shadow-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h1 className="text-xl font-black tracking-tight text-slate-800">PhishGuard <span className="text-slate-400 font-medium text-sm">Report</span></h1>
            </div>
            <button onClick={() => { setView('intro'); setMessages([]); setAnalysisResult(null); }} className="text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest">
              Exit Analysis
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-8">

          {/* 1. Score Summary Card (Full Width) */}
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">시뮬레이션 진단 결과</h2>
              <p className="text-xl text-slate-600 leading-relaxed font-medium">
                {data.comment}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center pl-0 md:pl-10 md:border-l border-slate-100 min-w-[200px]">
              <div className={`text-8xl font-black ${getScoreColor(data.score)} tracking-tighter mb-2`}>
                {data.score}
              </div>
              <div className={`text-sm font-bold px-4 py-1.5 rounded-full border ${getScoreColor(data.score).replace('text-', 'bg-').replace('600', '50').replace('500', '50')} ${getScoreColor(data.score).replace('text-', 'border-').replace('600', '200').replace('500', '200')}`}>
                보안 등급 <span className="ml-1">{data.grade}</span>
              </div>
            </div>
          </div>

          {/* 2. Analysis Grid (Natural Height) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Left: AI Attack Analysis */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 h-full">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
                <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                <h3 className="text-lg font-black text-slate-800">피싱 공격 패턴 분석</h3>
              </div>
              <div className="space-y-6">
                {data.ai_analysis.map((m) => renderSentenceCard(m, 'ai'))}
              </div>
            </div>

            {/* Right: User Leakage Analysis */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 h-full">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
                <span className="w-1.5 h-6 bg-rose-500 rounded-full"></span>
                <h3 className="text-lg font-black text-slate-800">개인정보 노출 여부 분석</h3>
              </div>
              <div className="space-y-6">
                {data.user_analysis.map((m) => renderSentenceCard(m, 'user'))}
              </div>
            </div>
          </div>

          {/* 3. Detailed Action Correction Guide (Full Width) */}
          {data.paired_analysis && data.paired_analysis.length > 0 && (
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-10">
                <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                <h3 className="text-xl font-black text-slate-800">상세 행동 교정 가이드</h3>
              </div>

              <div className="space-y-8">
                {data.paired_analysis.map((pair, idx) => (
                  <div key={idx} className="relative pl-6 md:pl-0">
                    {/* Timeline Line (Desktop only) */}
                    <div className="hidden md:block absolute left-[50%] top-0 bottom-0 w-px bg-slate-100 -translate-x-1/2"></div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 relative">
                      {/* AI Side */}
                      <div className="relative">
                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl rounded-tl-sm text-slate-600 text-sm leading-relaxed shadow-sm">
                          <span className="text-[10px] font-bold text-slate-400 block mb-2 uppercase tracking-wide">AI Attack</span>
                          {pair.ai_text}
                        </div>
                      </div>

                      {/* User Side */}
                      <div className="relative">
                        <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-2xl rounded-tr-sm text-blue-900 text-sm leading-relaxed shadow-sm text-right">
                          <span className="text-[10px] font-bold text-blue-400 block mb-2 uppercase tracking-wide">My Response</span>
                          {pair.user_text}
                        </div>

                        {/* Feedback / Success Indicator */}
                        <div className="mt-4">
                          {pair.feedback ? (
                            <div className="bg-amber-50 h-auto py-4 px-5 border-l-4 border-amber-500 rounded-r-xl shadow-sm animate-fade-in-up">
                              <strong className="block text-amber-800 font-bold mb-2 text-xs uppercase tracking-widest">Security Advisory</strong>
                              <p className="text-sm text-amber-900 leading-relaxed font-bold whitespace-pre-wrap">
                                {pair.feedback}
                              </p>
                            </div>
                          ) : (
                            <div className="flex justify-end">
                              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                적절한 대응 확인됨
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="text-center pt-10 text-slate-400 text-xs">
            <p>SCENARIO: <span className="font-bold text-slate-600">{selectedScenario.split(' ')[0].replace('농협은행', '은행')}</span></p>
            <p className="mt-1">ENGINE: PhishGuard v2.8</p>

            <button
              onClick={() => { setView('intro'); setMessages([]); setAnalysisResult(null); }}
              className="mt-8 px-8 py-3 bg-slate-900 text-white font-bold rounded-full hover:bg-black transition-all shadow-lg shadow-slate-200"
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
      {view === 'analyzing' && renderAnalyzing()}
      {view === 'report' && renderReport()}
    </>
  );
};

export default KakaoDemo;