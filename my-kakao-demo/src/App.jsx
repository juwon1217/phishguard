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

  // --- 뷰 렌더링 함수 ---
  const displayNames = {
    "주원은행 보안팀 (금융 사칭)": "보안팀",
    "가족/지인 사칭 (카톡 피싱)": "가족/지인 사칭",
    "검찰청 수사관 (기관 사칭)": "검찰청 수사관"
  };

  const renderIntro = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 font-sans text-slate-900 overflow-y-auto">
      <section className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="bg-white/90 backdrop-blur-md p-10 md:p-16 rounded-[3rem] shadow-2xl max-w-3xl w-full border border-white/50 transition-all hover:shadow-3xl">
          <div className="flex flex-col items-center mb-10">
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
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900">
                Phish
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Guard
              </span>
            </h1>
            <div className="w-20 h-1.5 bg-blue-600 rounded-full opacity-80"></div>
          </div>
          <p className="text-lg md:text-xl text-gray-600 mb-12 leading-relaxed break-keep font-medium">
            점점 교묘해지는 <span className="text-blue-600 font-bold underline underline-offset-8 decoration-2">보이스피싱</span> 범죄<br />
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
        </div>
      </section>
    </div>
  );

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
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* 입력창 UI 복구 */}
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
    // 1. 초기 데이터 구조 설정 (이중 분석 필드 추가)
    const data = analysisResult || {
      score: 0,
      grade: "분석 중",
      comment: "데이터를 불러오는 중입니다...",
      details: { detected_keywords: [] },
      ai_analysis: [],
      user_analysis: []
    };

    if (!data.ai_analysis?.length && !data.user_analysis?.length) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#f1f5f9] p-4 font-sans">
          <div className="bg-white p-12 rounded-[2.5rem] shadow-xl max-w-md w-full text-center border border-slate-200">
            <div className="text-6xl mb-6">ℹ️</div>
            <h2 className="text-2xl font-black text-slate-900 mb-4">대화 내역이 없습니다</h2>
            <p className="text-slate-500 mb-10 leading-relaxed">
              분석할 수 있는 대화 내용이 존재하지 않습니다.<br />
              시나리오를 선택하여 훈련을 먼저 진행해 주세요.
            </p>
            <button
              onClick={() => { setView('intro'); setMessages([]); setAnalysisResult(null); }}
              className="w-full py-5 bg-slate-900 text-white text-sm font-black rounded-2xl hover:bg-black transition-all active:scale-95 shadow-lg"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      );
    }

    const getScoreColor = (score) => {
      if (score >= 80) return "text-emerald-500";
      if (score >= 50) return "text-amber-500";
      return "text-rose-500";
    };

    // [개선] 기울임꼴과 큰따옴표를 제거한 정갈한 카드 렌더링
    const renderSentenceCard = (m, type) => {
      const isAI = type === 'ai';
      return (
        <div className={`group relative p-4 rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${m.level === 'high' ? 'border-rose-100' : m.level === 'medium' ? 'border-amber-100' : 'border-slate-100'
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

              {/* [수정] 기울임꼴과 큰따옴표 제거한 메인 코멘트 */}
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