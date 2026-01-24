import React, { useState, useEffect, useRef } from 'react';

// 1. 시나리오 및 프로필 설정 정보 (상수로 분리)
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
  const [view, setView] = useState('intro'); // 'intro', 'chat', 'report'
  const [selectedScenario, setSelectedScenario] = useState(Object.keys(SCENARIO_PROFILES)[0]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const [analysisResult, setAnalysisResult] = useState(null); // 팀원 B의 결과를 저장할 곳

  const scenarios = Object.keys(SCENARIO_PROFILES);

  // --- 자동 스크롤 ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // --- 이벤트 핸들러 ---
  
  // 시뮬레이션 시작 (Intro -> Chat)
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

  // 시나리오 변경
  const handleScenarioChange = (e) => {
    setSelectedScenario(e.target.value);
  };

  // 메시지 전송
  const handleSendMessage = async (e) => {
    e.preventDefault();
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
      const response = await fetch('http://localhost:8000/chat', {
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
      setIsLoading(false);
    }
  };

  // --- 뷰 렌더링 함수 ---
const displayNames = {
  "주원은행 보안팀 (금융 사칭)": "보안팀",
  "가족/지인 사칭 (카톡 피싱)": "가족/지인 사칭",
  "검찰청 수사관 (기관 사칭)": "검찰청 수사관"
};
  // 1. 인트로 페이지
  const renderIntro = () => (
    // 배경 그라데이션 적용
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6 text-center font-sans">
      
      {/* 카드형 컨테이너 */}
      <div className="bg-white/90 backdrop-blur-md p-12 rounded-[2rem] shadow-2xl max-w-3xl w-full border border-white/50 transition-all hover:shadow-3xl">
        
        {/* (선택사항) 상단에 일러스트 이미지를 넣을 공간 */}
        {/* <img src="..." alt="보안 일러스트" className="w-48 mx-auto mb-8" /> */}

        {/* 타이포그래피 강화 */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight flex items-center justify-center gap-3">
          <span className="text-blue-600">🛡️</span> PhishGuard 시뮬레이터
        </h1>
        <p className="text-lg text-gray-600 mb-12 leading-relaxed break-keep">
          점점 교묘해지는 <span className="text-blue-600 font-bold">보이스피싱</span> 범죄<br className="hidden md:block"/>
          실전 같은 시뮬레이션을 통해 당신의 대응 능력을 키우세요.
        </p>
        
        {/* 폼 영역 너비 조정 및 디자인 */}
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="text-left">
            <label className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 block pl-1">
              시작할 시나리오 선택
            </label>
            <div className="relative">
              <select 
                value={selectedScenario}
                onChange={handleScenarioChange}
                className="w-full p-4 pl-5 pr-10 border-2 border-gray-200 rounded-2xl bg-gray-50/50 text-gray-800 text-base font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
              >
                {scenarios.map(s => (
                  <option key={s} value={s}>
                    {displayNames[s] || s}
                  </option>
                ))}
              </select>
              {/* 커스텀 화살표 아이콘 (Tailwind Heroicons 활용 예시) */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* 버튼 인터랙션 강화 */}
          <button 
            onClick={handleStartSimulation}
            className="w-full py-4 bg-[#f7e600] text-gray-900 text-lg font-bold rounded-2xl hover:bg-[#ffe812] hover:scale-[1.02] hover:shadow-lg active:scale-95 transition-all duration-300 ease-in-out ring-offset-2 focus:ring-4 focus:ring-[#f7e600]/50"
          >
            시뮬레이션 시작하기
          </button>
        </div>

      </div>
      
      {/* 하단 저작권/팀 정보 (선택사항) */}
      <p className="text-gray-400 text-sm mt-8">
        © 2026 PhishGuard Team. All rights reserved.
      </p>
    </div>
  );

  // 2. 메인 대화창 (기존 코드 유지 및 대화 종료 버튼 추가)
  const renderChat = () => (
    <div className="flex h-screen bg-gray-100 font-sans">
      <div className="flex-1 flex flex-col max-w-lg mx-auto bg-[#b2c7d9] shadow-2xl relative">
        {/* 상단 헤더 */}
        <div className="bg-[#b2c7d9]/90 backdrop-blur-sm p-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex flex-col">
            <span className="font-bold text-gray-800 text-sm">{selectedScenario}</span>
            <span className="text-[10px] text-gray-600">실시간 대응 훈련 중</span>
          </div>
          {/* 대화 종료 버튼 추가 */}
          <button 
            onClick={handleFinishChat}
            className="text-[10px] bg-red-500 text-white px-3 py-1.5 rounded-full font-bold hover:bg-red-600"
          >
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
                    <span className={`text-[10px] font-bold ${currentProfile.avatarColor}`}>
                      {currentProfile.avatarText}
                    </span>
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

        {/* 하단 입력창 */}
        <form onSubmit={handleSendMessage} className="bg-white p-3 flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="메시지를 입력하세요"
            disabled={isLoading}
            className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 mr-2 text-sm outline-none focus:ring-1 focus:ring-yellow-400"
          />
          <button type="submit" disabled={isLoading} className="bg-[#f7e600] p-2.5 rounded-xl">
            <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );

  // 3. 리포트 페이지 (임시)
  const renderReport = () => {
    // 데이터가 아직 안 왔을 때를 대비한 기본값 설정
    const data = analysisResult || {
      score: 0,
      grade: "분석 중",
      comment: "데이터를 불러오는 중입니다...",
      details: { detected_keywords: [] }
    };

    // 점수에 따른 게이지 색상 결정
    const getScoreColor = (score) => {
      if (score >= 80) return "text-green-500";
      if (score >= 50) return "text-yellow-500";
      return "text-red-500";
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 font-sans">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-slate-100 transition-all">
          
          {/* 상단 아이콘 및 타이틀 */}
          <div className="text-center mb-8">
            <div className="inline-block p-4 rounded-full bg-slate-50 mb-4">
              <span className="text-4xl">📊</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800">보안 진단 리포트</h2>
            <p className="text-sm text-slate-400 mt-1">대화 내용을 정밀 분석한 결과입니다.</p>
          </div>

          {/* 메인 점수 영역 */}
          <div className="flex flex-col items-center mb-10">
            <div className={`text-6xl font-black mb-2 ${getScoreColor(data.score)}`}>
              {data.score}<span className="text-2xl text-slate-300">/100</span>
            </div>
            <div className="px-4 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold tracking-widest">
              등급: {data.grade}
            </div>
          </div>

          {/* 분석 코멘트 */}
          <div className="bg-slate-50 p-6 rounded-3xl mb-8 border border-slate-100">
            <p className="text-sm text-slate-700 leading-relaxed break-keep">
              "{data.comment}"
            </p>
          </div>

          {/* 상세 내역 (위험 키워드 등) */}
          <div className="space-y-3 mb-10 text-left">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 font-medium">참여 시나리오</span>
              <span className="text-slate-700 font-bold">{selectedScenario.split(' ')[0]}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 font-medium">탐지된 위험 요소</span>
              <span className="text-red-400 font-bold">
                {data.details?.detected_keywords?.length > 0 
                  ? data.details.detected_keywords.join(', ') 
                  : '없음'}
              </span>
            </div>
          </div>

          {/* 버튼 영역 */}
          <button 
            onClick={() => {
              setView('intro');
              setMessages([]);
              setAnalysisResult(null);
            }}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black hover:shadow-xl transition-all active:scale-95"
          >
            시뮬레이션 다시하기
          </button>
        </div>
      </div>
    );
  };
  const handleFinishChat = async () => {
    try {
      setIsLoading(true); // 분석 중 로딩 표시 (선택사항)
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.text })),
          scenario: selectedScenario
        }),
      });
      const result = await response.json();
      
      // 분석 결과를 저장하고 리포트 페이지로 이동
      setAnalysisResult(result.report || result);
      setView('report');
    } catch (error) {
      console.error("분석 요청 실패:", error);
      setView('report'); // 에러가 나도 일단 페이지는 넘김
    } finally {
      setIsLoading(false);
    }
  };
  // --- 최종 렌더링 ---
  return (
    <>
      {view === 'intro' && renderIntro()}
      {view === 'chat' && renderChat()}
      {view === 'report' && renderReport()}
    </>
  );
};

export default KakaoDemo;