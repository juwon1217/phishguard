import React, { useState, useEffect, useRef } from 'react';
import scamImage1 from './assets/scam1.jpg';
import scamImage2 from './assets/scam2.jpg';

// 1. 시나리오 및 프로필 설정 정보 (기존 유지)
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

  const scenarios = Object.keys(SCENARIO_PROFILES);

  // --- 자동 스크롤 (기존 유지) ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // --- [수정 사항] 입력창 자동 포커스 로직 ---
  // 로딩이 끝나거나 채팅창으로 진입할 때 자동으로 입력창에 커서를 올립니다.
  useEffect(() => {
    if (!isLoading && view === 'chat') {
      inputRef.current?.focus(); //
    }
  }, [isLoading, view]);

  // --- 음성 인식 로직 초기화 (기존 유지) ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'ko-KR';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("음성 인식 에러:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다. 크롬 브라우저를 권장합니다.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // --- 이벤트 핸들러 (기존 유지) ---
  const handleStartSimulation = () => {
    const firstStrikes = {
      "주원은행 보안팀 (금융 사칭)": "고객님 안녕하십니까 주원은행 보안팀입니다. 지금 고객님 계좌에서 비정상적인 해외 결제 시도가 포착되었습니다.",
      "가족/지인 사칭 (카톡 피싱)": "나 폰 액정 깨져서 수리 맡겼어 ㅜ 급하게 결제할거 있는데 지금 폰이 안 돼서 확인하면 답장 좀 빨리해줘!",
      "검찰청 수사관 (기관 사칭)": "서울중앙지검 수사 1팀입니다. 본인 명의로 된 대포 통장이 범죄에 연루되어 연락드렸습니다. 본인 확인을 위해 성함과 생년월일을 말씀해 주십시오."
    };

    setMessages([{
      id: Date.now(),
      sender: 'other',
      role: 'assistant',
      text: firstStrikes[selectedScenario],
      time: new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: 'numeric' })
    }]);
    setView('chat');
  };

  const handleScenarioChange = (e) => {
    setSelectedScenario(e.target.value);
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
      const response = await fetch('http://localhost:8000/chat', { // 로컬 테스트 주소로 통일
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
    } finally {
      setIsLoading(false); // 로딩 해제 시 위에서 정의한 useEffect가 포커스를 다시 잡습니다.
    }
  };

  const handleFinishChat = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:8000/analyze', {
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

  // --- 뷰 렌더링 함수 ---
  const displayNames = {
    "주원은행 보안팀 (금융 사칭)": "보안팀",
    "가족/지인 사칭 (카톡 피싱)": "가족/지인 사칭",
    "검찰청 수사관 (기관 사칭)": "검찰청 수사관"
  };

const renderIntro = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 font-sans text-slate-900 overflow-y-auto">
      
      {/* 1. Hero Section: 시뮬레이션 시작 (기존 기능 유지) */}
      <section className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="bg-white/90 backdrop-blur-md p-10 md:p-16 rounded-[3rem] shadow-2xl max-w-3xl w-full border border-white/50 transition-all hover:shadow-3xl">
          
          {/* --- 여기서부터 새 디자인 로고 부분 --- */}
          <div className="flex flex-col items-center mb-10">
            {/* 애니메이션 SVG 방패 아이콘 */}
            <div className="relative mb-6 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white p-5 rounded-full shadow-sm border border-blue-50">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-14 h-14 text-blue-600 animate-[pulse_3s_infinite]"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
            </div>

            {/* 그라데이션 타이포그래피 제목 */}
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900">
                Phish
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Guard
              </span>
            </h1>
            
            {/* 하단 강조 라인 */}
            <div className="w-20 h-1.5 bg-blue-600 rounded-full opacity-80"></div>
          </div>
          {/* --- 로고 부분 끝 --- */}

    <p className="text-lg md:text-xl text-gray-600 mb-12 leading-relaxed break-keep font-medium">
      점점 교묘해지는 <span className="text-blue-600 font-bold underline underline-offset-8 decoration-2">보이스피싱</span> 범죄<br/>
      실전 시뮬레이션을 통해 대응력을 키우세요.
    </p>
          
          <div className="w-full max-w-md mx-auto space-y-8">
            <div className="text-left">
              <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block pl-1">
                훈련 시나리오 선택
              </label>
              <div className="relative">
                <select 
                  value={selectedScenario}
                  onChange={handleScenarioChange}
                  className="w-full p-4 pl-6 pr-12 border-2 border-slate-100 rounded-2xl bg-slate-50/50 text-gray-800 text-base font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                >
                  {scenarios.map(s => (
                    <option key={s} value={s}>{displayNames[s] || s}</option>
                  ))}
                </select>
              </div>
            </div>

            <button 
              onClick={handleStartSimulation}
              className="w-full py-5 bg-[#f7e600] text-gray-900 text-xl font-black rounded-2xl hover:bg-[#ffe812] hover:scale-[1.03] shadow-xl hover:shadow-2xl active:scale-95 transition-all duration-300 ring-offset-2 focus:ring-4 focus:ring-[#f7e600]/50"
            >
              훈련 시작하기
            </button>
          </div>
          
          <div className="mt-12 animate-bounce text-slate-400">
            <p className="text-xs font-bold mb-2">스크롤하여 피싱 예방 가이드 보기</p>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 mx-auto">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
            </svg>
          </div>
        </div>
      </section>

      {/* 2. Educational Content: 피싱의 이해 */}
      <section className="max-w-5xl mx-auto px-6 py-20 space-y-24">
        
        {/* 가이드 A: 피싱의 주요 유형 */}
        <div className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 italic">"그들은 당신의 심리를 노립니다"</h2>
            <p className="text-slate-500 font-medium">최신 피싱 범죄의 주요 유형을 확인하세요.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "메신저 피싱", desc: "지인을 사칭하여 긴급한 금전이나 정보를 요구", icon: "💬" }, //
              { title: "기관 사칭", desc: "검찰, 금감원 등을 사칭하여 범죄 연루 협박", icon: "🏛️" }, //
              { title: "스미싱/큐싱", desc: "URL 링크나 QR코드를 통한 악성 앱 설치 유도", icon: "🔗" } //
            ].map((item, i) => (
              <div key={i} className="bg-white p-8 rounded-[2rem] shadow-lg border border-slate-50 transition-transform hover:-translate-y-2">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-black mb-3">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 가이드 B: 실제 피해 사례 (이미지 위주) */}
        <div className="bg-slate-900 rounded-[3rem] p-10 md:p-20 text-white shadow-2xl space-y-16">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <span className="inline-block px-4 py-1 rounded-full bg-blue-500 text-xs font-black uppercase tracking-widest">Case Study 01</span>
              <h2 className="text-3xl font-black leading-tight">"엄마, 나 폰 액정 깨졌어..."<br/>메신저 피싱의 전형</h2>
              <p className="text-slate-400 leading-relaxed">
                자녀를 사칭하여 휴대폰 고장을 이유로 접근한 뒤, 원격 제어 앱 설치나 카드 정보를 요구합니다.
              </p>
              <ul className="space-y-3 text-sm font-bold text-blue-400">
                <li className="flex items-center gap-2">✓ 지인이 평소와 다른 말투로 돈을 요구하나요?</li>
                <li className="flex items-center gap-2">✓ 출처 불분명한 링크(APK)를 보내나요?</li>
              </ul>
            </div>
            <div className="flex-1 w-full aspect-square bg-slate-800 rounded-3xl overflow-hidden border border-slate-700 flex items-center justify-center italic text-slate-500 relative">
              {/* 이미지 들어갈 자리 */}
              <img src={scamImage1} alt="Messenger Phishing Example" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl mb-2"></span>
              </div>
            </div>
          </div>
          
          <hr className="border-slate-800" />

          <div className="flex flex-col md:flex-row-reverse items-center gap-12">
            <div className="flex-1 space-y-6">
              <span className="inline-block px-4 py-1 rounded-full bg-red-500 text-xs font-black uppercase tracking-widest">Case Study 02</span>
              <h2 className="text-3xl font-black leading-tight">"서울중앙지검 수사관입니다"<br/>기관 사칭 공포 유발</h2>
              <p className="text-slate-400 leading-relaxed">
                마약이나 금융 범죄에 연루되었다고 압박하며 '안전 계좌'로의 송금을 유도합니다.
              </p>
              <ul className="space-y-3 text-sm font-bold text-red-400">
                <li className="flex items-center gap-2">✓ 수사기관은 절대로 전화로 자금 이체를 요구하지 않습니다.</li>
                <li className="flex items-center gap-2">✓ 보안 유지를 핑계로 주변과의 연락을 차단하나요?</li>
              </ul>
            </div>
            <div className="flex-1 w-full aspect-square bg-slate-800 rounded-3xl overflow-hidden border border-slate-700 flex items-center justify-center italic text-slate-500 relative">
               {/* 이미지 들어갈 자리 */}
               <img src={scamImage2} alt="Agency Phishing Example" className="w-full h-full object-cover" />
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl mb-2"></span>
              </div>
            </div>
          </div>
        </div>

        {/* 가이드 C: 7가지 주의 신호 (Scoring System 기반) */}
        <div className="space-y-12 pb-20">
          <h2 className="text-3xl font-black text-center">알고리즘이 탐지하는 7대 위험 신호</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "지인 사칭", x: "x1" }, { name: "기관 사칭", x: "x2" },
              { name: "금전 요구", x: "x3" }, { name: "기술 유도", x: "x4" },
              { name: "긴급성 조장", x: "x5" }, { name: "미끼 키워드", x: "x6" },
              { name: "로맨스 스캠", x: "x7" }, { name: "URL 포함", x: "URL" }
            ].map((item, i) => (
              <div key={i} className="bg-slate-100/50 p-6 rounded-2xl text-center border border-slate-200">
                <div className="text-xs font-black text-blue-500 mb-1">{item.x}</div>
                <div className="font-bold text-slate-700">{item.name}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-400 text-sm italic font-medium">
            PhishGuard의 XGBoost 알고리즘은 위 요소들을 실시간으로 분석하여 위험도를 측정합니다.
          </p>
        </div>

      </section>

      {/* Footer */}
      <footer className="bg-white py-10 border-t border-slate-100 text-center">
        <p className="text-gray-400 text-xs font-bold tracking-widest">© 2026 PhishGuard Project. All rights reserved.</p>
        <p className="text-[10px] text-gray-300 mt-2">자료 출처: 대한민국 법제처 생활법령정보 / 금융감독원 / 경찰청</p>
      </footer>
    </div>
  );

  const renderChat = () => (
    <div className="flex h-screen bg-gray-100 font-sans">
      <div className="flex-1 flex flex-col max-w-lg mx-auto bg-[#b2c7d9] shadow-2xl relative overflow-hidden">
        {/* 헤더 */}
        <div className="bg-[#b2c7d9]/90 backdrop-blur-sm p-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex flex-col">
            <span className="font-bold text-gray-800 text-sm">{selectedScenario}</span>
            <span className="text-[10px] text-gray-600">실시간 대응 훈련 중</span>
          </div>
          <button onClick={handleFinishChat} className="text-[10px] bg-red-500 text-white px-3 py-1.5 rounded-full font-bold hover:bg-red-600">
            대화 종료
          </button>
        </div>

        {/* 채팅 내역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-center my-4">
            <span className="bg-black/10 text-white text-[10px] px-3 py-1 rounded-full">
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </span>
          </div>

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
                    <div className={`px-3 py-2 rounded-2xl max-w-[240px] text-sm shadow-sm ${
                      message.sender === 'me' ? 'bg-[#ffe812] rounded-tr-none' : 'bg-white rounded-tl-none'
                    }`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{message.text}</p>
                    </div>
                    {message.sender === 'other' && <span className="text-[9px] text-gray-500 pb-1">{message.time}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex justify-start items-center">
              <div className="w-10 h-10 rounded-2xl bg-white mr-2 flex items-center justify-center border border-gray-200">
                <span className={`text-[10px] font-bold ${SCENARIO_PROFILES[selectedScenario].avatarColor} animate-pulse`}>...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* 하단 입력창 + 마이크 버튼 */}
        <div className="bg-white p-3 space-y-2 border-t">
          {isListening && (
            <div className="flex items-center justify-center py-2 bg-blue-50 rounded-xl">
              <div className="flex space-x-1">
                <div className="w-1.5 h-4 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-6 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1.5 h-4 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="ml-3 text-xs font-bold text-blue-600">목소리를 듣고 있어요...</span>
            </div>
          )}
          
          <form onSubmit={handleSendMessage} className="flex items-center">
            <button
              type="button"
              onClick={handleToggleListening}
              className={`mr-2 p-2.5 rounded-xl transition-all duration-300 relative overflow-hidden flex-shrink-0 ${
                isListening ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {isListening && (<span className="absolute inset-0 rounded-xl animate-ping bg-blue-400 opacity-75"></span>)}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`h-6 w-6 relative z-10 transition-transform duration-300 ${isListening ? 'scale-110 drop-shadow-sm' : ''}`}>
                <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
              </svg>
            </button>

            <input
              ref={inputRef} //
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isListening ? "말씀해 주세요..." : "메시지를 입력하세요"}
              disabled={isLoading}
              className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 mr-2 text-sm outline-none focus:ring-1 focus:ring-yellow-400 w-full"
            />
            <button type="submit" disabled={isLoading} className="bg-[#f7e600] p-2.5 rounded-xl flex-shrink-0">
              <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const renderReport = () => {
    const data = analysisResult || {
      score: 0,
      grade: "분석 중",
      comment: "데이터를 불러오는 중입니다...",
      details: { detected_keywords: [] }
    };

    const getScoreColor = (score) => {
      if (score >= 80) return "text-green-500";
      if (score >= 50) return "text-yellow-500";
      return "text-red-500";
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 font-sans">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-slate-100">
          <div className="text-center mb-8">
            <div className="inline-block p-4 rounded-full bg-slate-50 mb-4"><span className="text-4xl">📊</span></div>
            <h2 className="text-2xl font-black text-slate-800">보안 진단 리포트</h2>
            <p className="text-sm text-slate-400 mt-1">대화 내용을 정밀 분석한 결과입니다.</p>
          </div>
          <div className="flex flex-col items-center mb-10">
            <div className={`text-6xl font-black mb-2 ${getScoreColor(data.score)}`}>
              {data.score}<span className="text-2xl text-slate-300">/100</span>
            </div>
            <div className="px-4 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold tracking-widest">등급: {data.grade}</div>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl mb-8 border border-slate-100">
            <p className="text-sm text-slate-700 leading-relaxed break-keep">"{data.comment}"</p>
          </div>
          <div className="space-y-3 mb-10 text-left">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 font-medium">참여 시나리오</span>
              <span className="text-slate-700 font-bold">{selectedScenario.split(' ')[0]}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 font-medium">탐지된 위험 요소</span>
              <span className="text-red-400 font-bold">
                {data.details?.detected_keywords?.length > 0 ? data.details.detected_keywords.join(', ') : '없음'}
              </span>
            </div>
          </div>
          <button onClick={() => { setView('intro'); setMessages([]); setAnalysisResult(null); }} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all">
            시뮬레이션 다시하기
          </button>
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