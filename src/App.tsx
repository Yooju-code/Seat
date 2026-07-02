/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  X,
  Check,
  RefreshCw,
  RotateCcw,
  Sparkles,
  School,
  AlertTriangle,
  HelpCircle,
  LayoutGrid,
  CheckCircle2,
  Unlock,
  Info,
  UserX
} from "lucide-react";

// 학생별로 고유하게 매칭되는 학교 테마 이모지 리스트
const STUDENT_EMOJIS: { [key: number]: string } = {
  1: "🎒", // 책가방
  2: "✏️", // 연필
  3: "📓", // 공책
  4: "💡", // 아이디어/전구
  5: "⭐", // 스타/칭찬 스티커
  6: "🎨", // 팔레트
  7: "🔍", // 돋보기
  8: "📐", // 삼각자
  9: "🧪", // 시험관
  10: "🧬", // 과학/현미경 대신 DNA
  11: "📚", // 책들
  12: "🧭", // 나침반
  13: "🎈", // 풍선
  14: "🍀", // 네잎클로버
  15: "🏆", // 트로피
  16: "🎯", // 과녁
  17: "🚀", // 로켓
  18: "🔔", // 학교 종
  19: "🍎", // 사과 (선생님 선물)
  20: "👑", // 왕관
};

export default function App() {
  // 1. 상태(State) 정의
  const [studentCount, setStudentCount] = useState<number>(15);
  
  // 20개의 자리 중 '제외된 자리(X)' 여부를 기록하는 불리언 배열 (크기 20)
  const [blockedSeats, setBlockedSeats] = useState<boolean[]>(Array(20).fill(false));
  
  // 배정 결과 배열 (크기 20)
  // - null: 아직 아무도 없거나, 설정되지 않은 빈자리
  // - "X": 선생님이 직접 제외시킨 자리
  // - "학생 X": 배정된 학생 이름
  const [assignedSeats, setAssignedSeats] = useState<(string | null)[]>(Array(20).fill(null));
  
  // 자리 배정이 완료되었는지 여부
  const [isAssigned, setIsAssigned] = useState<boolean>(false);
  
  // 자리 섞기 애니메이션용 상태
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  
  // 사용법/도움말 아코디언 상태
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // 2. 파생 상태(Derived State) 계산
  const blockedCount = blockedSeats.filter(Boolean).length;
  const availableSeatsCount = 20 - blockedCount;
  const isSeatShortage = studentCount > availableSeatsCount;

  // 3. 주요 기능 함수
  const handleToggleSeat = (index: number) => {
    if (isAssigned) return;
    
    setBlockedSeats((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  // 실제 자리 배정을 수행하는 핵심 셔플 알고리즘
  const performSeatingAssignment = (currentBlocked = blockedSeats, currentCount = studentCount) => {
    const students = Array.from({ length: currentCount }, (_, i) => `학생 ${i + 1}`);

    const availableIndices: number[] = [];
    for (let i = 0; i < 20; i++) {
      if (!currentBlocked[i]) {
        availableIndices.push(i);
      }
    }

    // 피셔-예이츠 셔플
    const shuffledIndices = [...availableIndices];
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
    }

    const newAssignments = Array(20).fill(null);
    for (let i = 0; i < 20; i++) {
      if (currentBlocked[i]) {
        newAssignments[i] = "X";
      }
    }

    for (let s = 0; s < students.length; s++) {
      const targetSeatIndex = shuffledIndices[s];
      newAssignments[targetSeatIndex] = students[s];
    }

    setAssignedSeats(newAssignments);
    setIsAssigned(true);
  };

  // '자리 배정' 및 '다시 자리 배정' 클릭 시 시각적 셔플링 연출 후 최종 배치
  const handleAssignSeats = () => {
    if (isSeatShortage) return;
    setIsShuffling(true);

    let ticks = 0;
    const interval = setInterval(() => {
      setAssignedSeats(() => {
        const temp = Array(20).fill(null);
        
        for (let i = 0; i < 20; i++) {
          if (blockedSeats[i]) {
            temp[i] = "X";
          }
        }
        
        const nonBlocked: number[] = [];
        for (let i = 0; i < 20; i++) {
          if (!blockedSeats[i]) nonBlocked.push(i);
        }
        
        const shuffledNonBlocked = [...nonBlocked].sort(() => Math.random() - 0.5);
        
        const tempStudents = Array.from({ length: studentCount }, (_, i) => `학생 ${i + 1}`);
        for (let s = 0; s < tempStudents.length && s < shuffledNonBlocked.length; s++) {
          temp[shuffledNonBlocked[s]] = tempStudents[s];
        }
        
        return temp;
      });

      ticks++;
      if (ticks > 8) {
        clearInterval(interval);
        performSeatingAssignment();
        setIsShuffling(false);
      }
    }, 70);
  };

  const handleModifySettings = () => {
    setIsAssigned(false);
    setAssignedSeats(Array(20).fill(null));
  };

  const handleResetAll = () => {
    setStudentCount(15);
    setBlockedSeats(Array(20).fill(false));
    setAssignedSeats(Array(20).fill(null));
    setIsAssigned(false);
  };

  const getStudentNumber = (nameStr: string | null): number => {
    if (!nameStr) return 1;
    const match = nameStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 1;
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-sans p-4 md:p-6 flex flex-col justify-between">
      {/* 본문 전체 콘텐츠 컨테이너 */}
      <div className="max-w-6xl mx-auto w-full flex-grow flex flex-col gap-6">
        
        {/* 상단 헤더 섹션 - Clean Utility / Minimal style */}
        <header className="bg-white border border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between shadow-xs rounded-2xl gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-sm shadow-blue-100 flex items-center justify-center">
              <School className="w-5 h-5" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2 justify-center sm:justify-start">
                스마트 자리 바꾸기
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold border border-slate-200">
                  자리 바꾸기 프로그램
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                초보 선생님을 위한 직관적이고 직각선적인 미니멀 자리 배치 시스템
              </p>
            </div>
          </div>

          {/* 상단 통계 수치 판 (Clean Utility / Minimal 특유의 수치 모듈) */}
          <div className="flex items-center gap-6 text-sm border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 w-full sm:w-auto justify-around sm:justify-end">
            <div className="text-center px-2">
              <p className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">학생 수</p>
              <p id="stat-students" className="text-base font-semibold text-slate-800">{studentCount}</p>
            </div>
            <div className="text-center px-2 border-x border-slate-100">
              <p className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">빈자리(X)</p>
              <p id="stat-x" className="text-base font-semibold text-rose-600">{blockedCount}</p>
            </div>
            <div className="text-center px-2">
              <p className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">배정 가능</p>
              <p id="stat-avail" className="text-base font-semibold text-blue-600">{availableSeatsCount}</p>
            </div>
          </div>
        </header>

        {/* 도움말 가이드 및 아코디언 */}
        <div className="flex justify-end -mb-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs px-3 py-1.5 rounded-xl cursor-pointer transition-all"
            id="btn-help-toggle"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {showHelp ? "사용법 닫기" : "사용법 보기"}
          </button>
        </div>

        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
              id="help-guide-panel"
            >
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs text-slate-600 text-xs md:text-sm leading-relaxed">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2 text-sm">
                  <Info className="w-4 h-4 text-blue-500" />
                  쉽고 깔끔한 사용 가이드
                </h3>
                <ul className="space-y-1.5 pl-1 font-medium text-slate-500 text-xs">
                  <li>
                    • <strong className="text-slate-700 font-semibold">인원 설정</strong>: 왼쪽 패널의 드롭다운을 통해 학생 수(1명~20명)를 고르세요.
                  </li>
                  <li>
                    • <strong className="text-slate-700 font-semibold">빈자리 X 지정</strong>: 배정하기 전에 우측 배치도에서 자리를 클릭하면 제외 자리가 되어 <strong className="text-rose-500">X</strong> 자리가 됩니다.
                  </li>
                  <li>
                    • <strong className="text-slate-700 font-semibold">배정</strong>: 파란색 <strong className="text-blue-600">자리 배정</strong> 버튼을 누르면 즉시 배치됩니다!
                  </li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 메인 화면 레이아웃: 사이드바 + 교실 배치도 */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 왼쪽 사이드바: 컨트롤 패널 */}
          <aside className="lg:col-span-4 bg-white rounded-2xl p-5 shadow-xs border border-slate-200 flex flex-col gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                1. 학생 인원수 선택
              </label>
              
              <div className="relative">
                <select
                  value={studentCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setStudentCount(val);
                    handleModifySettings();
                  }}
                  disabled={isAssigned || isShuffling}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-800 appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  id="dropdown-student-count"
                >
                  {Array.from({ length: 20 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}명 (학생 1 ~ 학생 {i + 1})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* 자리 알림 및 오류 메시지 */}
            {isSeatShortage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-start gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <strong>자리 부족 경고:</strong><br />
                  학생 수({studentCount}명)가 배치 가능 자리({availableSeatsCount}개)보다 많습니다. 교실 배치도에서 X 자리를 더 줄여 주세요.
                </div>
              </div>
            )}

            {/* 하단 제어 버튼 모듈 - Clean Minimal styling */}
            <div className="flex flex-col gap-2.5 pt-2">
              {!isAssigned ? (
                <button
                  onClick={handleAssignSeats}
                  disabled={isSeatShortage || isShuffling}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                  id="btn-assign-seats"
                >
                  <Sparkles className="w-4 h-4" />
                  자리 배정
                </button>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={handleAssignSeats}
                    disabled={isShuffling}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                    id="btn-shuffle-seats"
                  >
                    <RefreshCw className={`w-4 h-4 ${isShuffling ? "animate-spin" : ""}`} />
                    {isShuffling ? "자리 배정 중..." : "다시 자리 배정"}
                  </button>

                  <button
                    onClick={handleModifySettings}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    id="btn-modify-settings"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    자리 설정 수정
                  </button>
                </div>
              )}

              {/* 전체 초기화 */}
              <button
                onClick={handleResetAll}
                disabled={isShuffling}
                className="w-full py-2.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-all text-xs flex items-center justify-center gap-1 cursor-pointer"
                id="btn-reset-all"
              >
                <RotateCcw className="w-3 h-3" />
                전체 초기화
              </button>
            </div>

            {/* 미니멀 팁 정보 */}
            <div className="p-3 bg-blue-50/80 rounded-xl text-[11px] text-blue-700 leading-relaxed font-medium">
              <span className="font-bold">💡 빈자리 팁:</span><br />
              • 회색 자리를 클릭하면 <strong className="text-rose-600">X (빈자리)</strong>가 됩니다.<br />
              • X 자리는 학생이 자동 배치되지 않습니다.
            </div>
          </aside>

          {/* 오른쪽 메인 섹션: 교실 배치도 */}
          <section className="lg:col-span-8 bg-white p-5 md:p-6 rounded-2xl shadow-xs border border-slate-200">
            
            {/* 교탁 표시 (칠판 앞 방향 지시자) */}
            <div className="text-center mb-6 text-slate-400 font-bold uppercase tracking-[0.2em] text-xs py-1.5 bg-slate-50 border border-slate-100 rounded-lg max-w-sm mx-auto">
              칠판 (앞)
            </div>

            {/* 교실 배치 및 그리드 영역 */}
            <div className="w-full overflow-x-auto pb-2">
              <div className="min-w-[580px] max-w-3xl mx-auto">
                
                {/* 4행 5열 교실 레이아웃 테이블 형태 */}
                <div className="grid grid-cols-[40px_repeat(5,1fr)] gap-y-3.5 gap-x-3">
                  
                  {/* 행/열 인덱스 헤더: 첫 번째 코너는 빈칸 */}
                  <div className="flex items-center justify-center"></div>
                  
                  {/* 열 이름 헤더 (1열 ~ 5열) */}
                  {Array.from({ length: 5 }, (_, colIndex) => (
                    <div
                      key={`col-header-${colIndex}`}
                      className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest py-1 select-none"
                    >
                      {colIndex + 1}열
                    </div>
                  ))}

                  {/* 4개의 행 순회 */}
                  {Array.from({ length: 4 }, (_, rowIndex) => (
                    <div key={`row-group-${rowIndex}`} className="contents">
                      
                      {/* 행의 가장 왼쪽 인덱스 가이드 */}
                      <div className="flex items-center justify-center text-[10px] font-bold text-slate-400 select-none">
                        {rowIndex + 1}행
                      </div>

                      {/* 행 마다 5개의 열(자리) 렌더링 */}
                      {Array.from({ length: 5 }, (_, colIndex) => {
                        const seatIndex = rowIndex * 5 + colIndex;
                        const seatNumber = seatIndex + 1;
                        const seatNumString = seatNumber;
                        
                        const isBlocked = blockedSeats[seatIndex];
                        const assignedValue = assignedSeats[seatIndex];

                        // 테마에 맞는 CSS 클래스 계산
                        let cardClass = "";
                        if (isAssigned) {
                          if (assignedValue === "X") {
                            cardClass = "bg-rose-50 border-rose-200 text-rose-500 cursor-not-allowed";
                          } else if (assignedValue === null) {
                            cardClass = "bg-white border-slate-200 text-slate-400 border-dashed cursor-not-allowed";
                          } else {
                            cardClass = "bg-[#E0F2FE] border-[#7DD3FC] text-[#0369A1] shadow-xs";
                          }
                        } else {
                          if (isBlocked) {
                            cardClass = "bg-rose-50 border-rose-200 text-rose-500 shadow-inner";
                          } else {
                            cardClass = "bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer";
                          }
                        }

                        return (
                          <motion.div
                            key={`seat-${seatIndex}`}
                            layout
                            className="relative"
                          >
                            {/* 자리 카드 엘리먼트 */}
                            <button
                              onClick={() => handleToggleSeat(seatIndex)}
                              disabled={isAssigned || isShuffling}
                              className={`w-full h-20 md:h-24 rounded-xl border-2 text-center p-2 flex flex-col justify-between transition-all duration-200 select-none relative overflow-hidden group ${cardClass}`}
                              id={`seat-card-${seatNumber}`}
                              title={
                                isAssigned 
                                  ? undefined 
                                  : isBlocked 
                                  ? "클릭하여 빈자리 지정 해제" 
                                  : "클릭하여 이 자리를 빈자리로 지정"
                              }
                            >
                              {/* 카드 상단: 자리 번호 */}
                              <span className="absolute top-2 left-3 text-[10px] font-bold opacity-40 text-slate-500">
                                {seatNumString}
                              </span>

                              {/* 카드 우측 상단 상태 지시 */}
                              {!isAssigned && !isBlocked && (
                                <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-bold text-blue-500 bg-blue-50 px-1 py-0.5 rounded border border-blue-100">
                                  X 지정
                                </span>
                              )}

                              {/* 카드 중앙: 콘텐츠 영역 */}
                              <div className="w-full h-full flex flex-col items-center justify-center pt-2">
                                {isAssigned ? (
                                  assignedValue === "X" ? (
                                    <div className="x-mark text-rose-500/20 font-bold text-3xl">X</div>
                                  ) : assignedValue === null ? (
                                    <span className="text-[10px] text-slate-400 font-medium">(비어있음)</span>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                      <span className="text-lg md:text-xl filter drop-shadow-sm leading-none">
                                        {STUDENT_EMOJIS[getStudentNumber(assignedValue)] || "🎒"}
                                      </span>
                                      <span className="text-xs md:text-sm font-bold tracking-tight text-[#0369A1]">
                                        {assignedValue}
                                      </span>
                                    </div>
                                  )
                                ) : (
                                  isBlocked ? (
                                    <div className="x-mark text-rose-500/20 font-bold text-3xl">X</div>
                                  ) : (
                                    <span className="text-[10px] text-slate-300 font-medium group-hover:text-blue-400 transition-colors">
                                      (대기)
                                    </span>
                                  )
                                )}
                              </div>
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  ))}

                </div>
              </div>
            </div>

            {/* 하단 배치 설명 및 컬러 범례 */}
            <div className="w-full max-w-xl border-t border-slate-100 mt-6 pt-4 flex flex-wrap gap-4 items-center justify-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-slate-200 bg-white inline-block"></span>
                <span>대기 자리</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-rose-200 bg-rose-50 inline-block"></span>
                <span>X 지정 빈자리</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-[#7DD3FC] bg-[#E0F2FE] inline-block"></span>
                <span>학생 배치 완료</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-slate-200 border-dashed bg-white inline-block"></span>
                <span>자동 빈자리</span>
              </div>
            </div>

          </section>

        </main>
      </div>

      {/* 하단 푸터 */}
      <footer className="mt-8 text-center text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
        <p>© 2026 스마트 자리 바꾸기 — 깔끔하고 공평한 교실 자리 바꾸기 도구</p>
      </footer>
    </div>
  );
}
