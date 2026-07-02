/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
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
  Lock,
  Unlock,
  Info,
  UserX,
  Plus,
  Trash2,
  Save,
  Download,
  AlertCircle
} from "lucide-react";
import { saveClassroomToFirebase, loadClassroomFromFirebase } from "./firebase";

// 학생별로 고유하게 매칭되는 학교 테마 이모지 리스트 (이름 해시코드를 이용해 항상 일관된 이모지를 반환합니다)
const STUDENT_EMOJIS = [
  "🎒", "✏️", "📓", "💡", "⭐", "🎨", "🔍", "📐", "🧪", "📚", 
  "🧭", "🎈", "🍀", "🏆", "🎯", "🚀", "🔔", "🍎", "👑", "🌈",
  "🦖", "🍕", "🎨", "🎮", "🎸", "🛹", "🧁", "🍩", "🍿", "🧩"
];

export default function App() {
  // 1. 상태(State) 정의
  // 학생 명단 (기본 15명으로 시작)
  const [studentList, setStudentList] = useState<string[]>(
    Array.from({ length: 15 }, (_, i) => `학생 ${i + 1}`)
  );
  
  // 20개의 자리 중 '제외된 자리(X)' 여부를 기록하는 불리언 배열 (크기 20)
  const [blockedSeats, setBlockedSeats] = useState<boolean[]>(Array(20).fill(false));
  
  // 고정석 지정 목록 (크기 20): 각 자리에 고정된 학생 이름 혹은 null
  const [fixedSeats, setFixedSeats] = useState<(string | null)[]>(Array(20).fill(null));
  
  // 배정 결과 배열 (크기 20): null, "X", 혹은 배정된 학생 이름
  const [assignedSeats, setAssignedSeats] = useState<(string | null)[]>(Array(20).fill(null));
  
  // 자리 배정이 완료되었는지 여부
  const [isAssigned, setIsAssigned] = useState<boolean>(false);
  
  // 자리 섞기 애니메이션 상태
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  
  // 작동 모드 선택: "blocked" (빈자리 X 지정 모드) vs "fixed" (고정석 지정 모드)
  const [activeMode, setActiveMode] = useState<"blocked" | "fixed">("blocked");
  
  // 고정석 선택을 위해 클릭한 자리 인덱스 (null이 아니면 학생 선택 팝업 표출)
  const [selectedSeatForLocking, setSelectedSeatForLocking] = useState<number | null>(null);
  
  // 로딩 상태 및 알림 메시지 상태
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  
  // 도움말 화면 토글
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // 2. 파생 상태(Derived State) 계산
  const studentCount = studentList.length;
  const blockedCount = blockedSeats.filter(Boolean).length;
  
  // 현재 설정된 고정석 중 실제로 존재하는 학생들과 매칭되는 유효한 고정석 개수 계산
  const validFixedSeatsCount = fixedSeats.reduce((acc, name, idx) => {
    if (name && studentList.includes(name) && !blockedSeats[idx]) {
      return acc + 1;
    }
    return acc;
  }, 0);

  // 실제 학생들이 들어갈 수 있는 총 자리수 (전체 20 - X자리)
  const availableSeatsCount = 20 - blockedCount;
  
  // 배치 불가능 오류 상태 정의
  // 전체 학생 수 중 고정되지 않은 학생 수 > 남은 유효한 자리 수 (전체 20 - X자리 - 고정석자리)
  const nonFixedStudentsCount = studentCount - validFixedSeatsCount;
  const remainingSeatsCount = 20 - blockedCount - validFixedSeatsCount;
  const isSeatShortage = nonFixedStudentsCount > remainingSeatsCount;

  // 알림 메시지 간편 노출 함수
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 3. 컴포넌트 마운트 시 자동 로드 (새로고침 및 다중 기기 싱크 지원)
  useEffect(() => {
    async function initLoad() {
      try {
        setIsLoading(true);
        const saved = await loadClassroomFromFirebase();
        if (saved) {
          if (saved.studentList) setStudentList(saved.studentList);
          if (saved.blockedSeats) setBlockedSeats(saved.blockedSeats);
          if (saved.fixedSeats) setFixedSeats(saved.fixedSeats);
          if (saved.assignedSeats) {
            setAssignedSeats(saved.assignedSeats);
            const hasAssignments = saved.assignedSeats.some(
              (val: any) => val !== null && val !== "X"
            );
            setIsAssigned(hasAssignments);
          }
          showToast("데이터베이스에서 이전 설정을 자동으로 불러왔습니다.", "success");
        } else {
          showToast("초기 설정을 생성했습니다. 마음껏 변경해 보세요!", "info");
        }
      } catch (err) {
        showToast("데이터베이스 연결에 실패하여 로컬 모드로 시작합니다.", "error");
      } finally {
        setIsLoading(false);
      }
    }
    initLoad();
  }, []);

  // 4. 드롭다운 변경 시 학생 수 자동 조절 기능
  const handleAdjustStudentCount = (newCount: number) => {
    if (newCount < 1 || newCount > 20) return;
    
    setStudentList((prev) => {
      if (prev.length === newCount) return prev;
      if (prev.length < newCount) {
        // 모자라면 "학생 X" 형태로 이름을 채워서 늘려줍니다
        const diff = newCount - prev.length;
        const added = Array.from(
          { length: diff },
          (_, i) => `학생 ${prev.length + i + 1}`
        );
        return [...prev, ...added];
      } else {
        // 넘치면 뒤에서 잘라내고, 삭제된 학생이 고정석에 지정되어 있으면 해제시킵니다
        const sliced = prev.slice(0, newCount);
        setFixedSeats((prevFixed) =>
          prevFixed.map((name) => (name && sliced.includes(name) ? name : null))
        );
        return sliced;
      }
    });
    
    // 안전하게 현재 배치 모드를 초기화합니다
    handleModifySettings();
  };

  // 학생 추가 기능
  const handleAddStudent = () => {
    if (studentList.length >= 20) {
      showToast("학생은 최대 20명까지 등록할 수 있습니다.", "error");
      return;
    }
    
    // 중복되지 않는 이름 생성
    let nextNum = studentList.length + 1;
    let newName = `학생 ${nextNum}`;
    while (studentList.includes(newName)) {
      nextNum++;
      newName = `학생 ${nextNum}`;
    }

    setStudentList((prev) => [...prev, newName]);
    handleModifySettings();
    showToast(`${newName}이(가) 명단에 추가되었습니다.`, "info");
  };

  // 학생 삭제 기능
  const handleRemoveStudent = (indexToRemove: number) => {
    if (studentList.length <= 1) {
      showToast("최소 1명의 학생은 유지되어야 합니다.", "error");
      return;
    }
    
    const targetName = studentList[indexToRemove];
    
    setStudentList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    
    // 삭제되는 학생의 고정석 및 배치 결과 연동 제거
    setFixedSeats((prev) => prev.map((name) => (name === targetName ? null : name)));
    setAssignedSeats((prev) => prev.map((name) => (name === targetName ? null : name)));
    
    handleModifySettings();
    showToast(`${targetName} 학생이 삭제되었습니다.`, "info");
  };

  // 학생 이름 수정 기능
  const handleUpdateStudentName = (index: number, newName: string) => {
    const oldName = studentList[index];
    if (oldName === newName) return;
    if (!newName.trim()) return;

    setStudentList((prev) => {
      const next = [...prev];
      next[index] = newName;
      return next;
    });

    // 고정석 이름과 배치결과 이름을 함께 수정하여 끊김 현상을 예방합니다
    setFixedSeats((prev) => prev.map((name) => (name === oldName ? newName : name)));
    setAssignedSeats((prev) => prev.map((name) => (name === oldName ? newName : name)));
  };

  // '학생 명단 저장' 기능 (Firestore 동기화)
  const handleSaveStudentList = async () => {
    try {
      setIsLoading(true);
      // 현재의 명단 및 설정을 통째로 저장합니다.
      await saveClassroomToFirebase({
        studentCount: studentList.length,
        studentList,
        blockedSeats,
        fixedSeats,
        assignedSeats
      });
      showToast("학생 명단이 데이터베이스에 안전하게 저장되었습니다.", "success");
    } catch (err) {
      showToast("명단 저장 중 오류가 발생했습니다. 다시 시도해 주세요.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // '현재 자리 저장' 기능
  const handleSaveSeatingLayout = async () => {
    try {
      setIsLoading(true);
      await saveClassroomToFirebase({
        studentCount: studentList.length,
        studentList,
        blockedSeats,
        fixedSeats,
        assignedSeats
      });
      showToast("현재 교실 자리 배치가 데이터베이스에 성공적으로 저장되었습니다.", "success");
    } catch (err) {
      showToast("자리배치 저장에 실패했습니다. 연결을 확인하세요.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // '저장된 자리 불러오기' 기능
  const handleLoadSeatingLayout = async () => {
    try {
      setIsLoading(true);
      const saved = await loadClassroomFromFirebase();
      if (saved) {
        if (saved.studentList) setStudentList(saved.studentList);
        if (saved.blockedSeats) setBlockedSeats(saved.blockedSeats);
        if (saved.fixedSeats) setFixedSeats(saved.fixedSeats);
        if (saved.assignedSeats) {
          setAssignedSeats(saved.assignedSeats);
          const hasAssignments = saved.assignedSeats.some(
            (val: any) => val !== null && val !== "X"
          );
          setIsAssigned(hasAssignments);
        }
        showToast("데이터베이스에서 자리배치를 무사히 불러왔습니다.", "success");
      } else {
        showToast("데이터베이스에 저장된 자리배치 기록이 없습니다.", "error");
      }
    } catch (err) {
      showToast("저장된 자리배치를 불러오는 중 오류가 발생했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 교실 자리 클릭 핸들러 (X토글 또는 고정석 관리)
  const handleToggleSeat = (index: number) => {
    if (isAssigned) return;

    if (activeMode === "blocked") {
      // 빈자리 X 지정 모드
      setBlockedSeats((prev) => {
        const next = [...prev];
        const updatedVal = !next[index];
        next[index] = updatedVal;
        
        // 만약 자리를 X로 만드는데 고정석 학생이 등록되어 있다면, 고정석 설정을 해제합니다
        if (updatedVal) {
          setFixedSeats((prevFixed) => {
            const nextFixed = [...prevFixed];
            nextFixed[index] = null;
            return nextFixed;
          });
        }
        return next;
      });
    } else {
      // 고정석 지정 모드
      if (blockedSeats[index]) {
        showToast("X로 지정된 빈자리에는 고정석을 지정할 수 없습니다. X 지정을 먼저 해제하세요.", "error");
        return;
      }
      setSelectedSeatForLocking(index);
    }
  };

  // 특정 자리에 학생을 고정석으로 지정하는 기능
  const handleSelectStudentForFixedSeat = (studentName: string | null) => {
    if (selectedSeatForLocking === null) return;
    
    const seatIdx = selectedSeatForLocking;

    setFixedSeats((prev) => {
      const next = [...prev];
      
      // 만약 선택된 학생이 다른 자리에 이미 고정석으로 지정되어 있다면, 이전 자리를 초기화하여 중복 지정을 막습니다
      if (studentName) {
        for (let i = 0; i < next.length; i++) {
          if (next[i] === studentName) {
            next[i] = null;
          }
        }
      }
      
      next[seatIdx] = studentName;
      return next;
    });

    setSelectedSeatForLocking(null);
    showToast(
      studentName 
        ? `자리 ${seatIdx + 1}번에 '${studentName}' 학생이 고정석으로 지정되었습니다.` 
        : `자리 ${seatIdx + 1}번의 고정석 지정이 해제되었습니다.`, 
      "info"
    );
  };

  // 자리 배치 결과의 Lock 아이콘 직접 클릭 시 고정/해제 바로가기 기능
  const handleDirectToggleFixed = (index: number, studentName: string) => {
    setFixedSeats((prev) => {
      const next = [...prev];
      if (next[index] === studentName) {
        next[index] = null;
        showToast(`자리 ${index + 1}번 '${studentName}' 고정석을 해제했습니다.`, "info");
      } else {
        // 타 자리에 이미 지정되어 있다면 정리
        for (let i = 0; i < next.length; i++) {
          if (next[i] === studentName) {
            next[i] = null;
          }
        }
        next[index] = studentName;
        showToast(`자리 ${index + 1}번 '${studentName}' 고정석으로 등록했습니다.`, "info");
      }
      return next;
    });
  };

  // 핵심 배정 로직 (고정석 우선 배치 규칙 지원)
  const performSeatingAssignment = () => {
    // 1. 제외(X) 자리 목록 확인
    const newAssignments = Array(20).fill(null);
    for (let i = 0; i < 20; i++) {
      if (blockedSeats[i]) {
        newAssignments[i] = "X";
      }
    }

    // 2. 유효한 고정석 선배치
    const placedStudents = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const fixedStudent = fixedSeats[i];
      // 고정석에 지정된 학생이 현재 학생 목록에 실존하고, 자리가 X가 아닌 경우에만 유효하게 사전배치
      if (fixedStudent && studentList.includes(fixedStudent) && !blockedSeats[i]) {
        newAssignments[i] = fixedStudent;
        placedStudents.add(fixedStudent);
      }
    }

    // 3. 고정석에 앉지 못한 비고정 학생 풀 만들기
    const nonFixedStudents = studentList.filter((name) => !placedStudents.has(name));

    // 4. 고정석도 아니고, X도 아닌 비어있는 배치 대상 자리 인덱스 추출
    const emptyIndices: number[] = [];
    for (let i = 0; i < 20; i++) {
      if (!blockedSeats[i] && newAssignments[i] === null) {
        emptyIndices.push(i);
      }
    }

    // 5. 비어있는 자리 무작위 셔플 (Fisher-Yates 알고리즘)
    const shuffledEmptyIndices = [...emptyIndices];
    for (let i = shuffledEmptyIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledEmptyIndices[i], shuffledEmptyIndices[j]] = [shuffledEmptyIndices[j], shuffledEmptyIndices[i]];
    }

    // 6. 섞인 비어있는 자리에 비고정 학생들을 하나씩 순서대로 배치
    for (let s = 0; s < nonFixedStudents.length; s++) {
      if (s < shuffledEmptyIndices.length) {
        const targetSeatIdx = shuffledEmptyIndices[s];
        newAssignments[targetSeatIdx] = nonFixedStudents[s];
      }
    }

    setAssignedSeats(newAssignments);
    setIsAssigned(true);
  };

  // '자리 배정하기' 셔플링 시각효과 실행기
  const handleAssignSeats = () => {
    if (isSeatShortage) return;
    setIsShuffling(true);

    let ticks = 0;
    const interval = setInterval(() => {
      setAssignedSeats(() => {
        const temp = Array(20).fill(null);
        
        // 1. X 지정 배치
        for (let i = 0; i < 20; i++) {
          if (blockedSeats[i]) temp[i] = "X";
        }
        
        // 2. 고정석 선배치
        const placed = new Set<string>();
        for (let i = 0; i < 20; i++) {
          const fixedName = fixedSeats[i];
          if (fixedName && studentList.includes(fixedName) && !blockedSeats[i]) {
            temp[i] = fixedName;
            placed.add(fixedName);
          }
        }

        // 3. 임시 배치용 무작위 인덱스 선정
        const nonFixed = studentList.filter((n) => !placed.has(n));
        const freeIndices: number[] = [];
        for (let i = 0; i < 20; i++) {
          if (!blockedSeats[i] && temp[i] === null) {
            freeIndices.push(i);
          }
        }

        const shuffledFree = [...freeIndices].sort(() => Math.random() - 0.5);
        for (let s = 0; s < nonFixed.length && s < shuffledFree.length; s++) {
          temp[shuffledFree[s]] = nonFixed[s];
        }

        return temp;
      });

      ticks++;
      if (ticks > 6) {
        clearInterval(interval);
        performSeatingAssignment();
        setIsShuffling(false);
      }
    }, 80);
  };

  const handleModifySettings = () => {
    setIsAssigned(false);
    setAssignedSeats(Array(20).fill(null));
  };

  const handleResetAll = () => {
    setStudentList(Array.from({ length: 15 }, (_, i) => `학생 ${i + 1}`));
    setBlockedSeats(Array(20).fill(false));
    setFixedSeats(Array(20).fill(null));
    setAssignedSeats(Array(20).fill(null));
    setIsAssigned(false);
    showToast("모든 데이터가 성공적으로 리셋되었습니다.", "info");
  };

  // 이름 글자를 기준으로 시각 일치를 주기 위한 간단한 해시 이모지 검색기
  const getStudentEmoji = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % STUDENT_EMOJIS.length;
    return STUDENT_EMOJIS[index];
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-sans p-4 md:p-6 flex flex-col justify-between">
      
      {/* 알림 메시지 (Toast) 레이어 */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`p-3.5 rounded-xl shadow-lg border text-xs md:text-sm font-bold flex items-center gap-2.5 ${
                toast.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : toast.type === "error"
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : toast.type === "error" ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span className="flex-1">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 로딩 인디케이터 오버레이 */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px] z-40 flex items-center justify-center">
          <div className="bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3 font-semibold text-sm text-slate-700">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            데이터베이스 동기화 중...
          </div>
        </div>
      )}

      {/* 본문 전체 콘텐츠 컨테이너 */}
      <div className="max-w-7xl mx-auto w-full flex-grow flex flex-col gap-6">
        
        {/* 상단 헤더 섹션 - Clean Utility / Minimal style */}
        <header className="bg-white border border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between shadow-xs rounded-2xl gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-sm shadow-blue-100 flex items-center justify-center shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2 justify-center md:justify-start">
                스마트 자리 바꾸기
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-md font-bold border border-blue-100 uppercase tracking-wider">
                  Firebase Cloud 연결됨
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                고정석 지정 및 실시간 데이터베이스 저장 기능이 통합된 차세대 교사용 자리배치 유틸리티
              </p>
            </div>
          </div>

          {/* 상단 통계 수치 판 (Clean Utility / Minimal 특유의 수치 모듈) */}
          <div className="flex items-center gap-5 text-sm border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 w-full md:w-auto justify-around md:justify-end shrink-0">
            <div className="text-center px-1">
              <p className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">전체 학생</p>
              <p id="stat-students" className="text-base font-bold text-slate-800">{studentCount}명</p>
            </div>
            <div className="text-center px-1 border-x border-slate-100">
              <p className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">빈자리(X)</p>
              <p id="stat-x" className="text-base font-bold text-rose-600">{blockedCount}개</p>
            </div>
            <div className="text-center px-1 mr-1">
              <p className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">지정 고정석</p>
              <p id="stat-fixed" className="text-base font-bold text-amber-600 flex items-center justify-center gap-0.5">
                <Lock className="w-3.5 h-3.5 text-amber-500 inline" />
                {validFixedSeatsCount}개
              </p>
            </div>
            <div className="text-center px-2 bg-blue-50/50 rounded-lg py-1 border border-blue-100/40">
              <p className="text-blue-500 uppercase tracking-wider text-[9px] font-bold">배정 가능</p>
              <p id="stat-avail" className="text-base font-bold text-blue-600">{availableSeatsCount}석</p>
            </div>
          </div>
        </header>

        {/* 도움말 가이드 및 아코디언 */}
        <div className="flex justify-between items-center -mb-2">
          <div className="text-xs font-semibold text-slate-500 bg-slate-200/50 px-3 py-1 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>클라우드 동기화 모드 작동 중</span>
          </div>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs px-3 py-1.5 rounded-xl cursor-pointer transition-all"
            id="btn-help-toggle"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {showHelp ? "사용 설명서 접기" : "사용 설명서 보기"}
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
              <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-xs text-slate-600 text-xs md:text-sm leading-relaxed">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2.5 text-sm">
                  <Info className="w-4 h-4 text-blue-500" />
                  스마트 자리배치 심화 기능 가이드
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ul className="space-y-1.5 pl-1 font-medium text-slate-500 text-xs">
                    <li>
                      • <strong className="text-slate-700 font-semibold">학생 관리 & 이름 변경</strong>: 명단에서 이름을 수정하고 <strong className="text-teal-600">"학생 명단 저장"</strong> 버튼을 눌러보세요. 새로고침해도 반영됩니다.
                    </li>
                    <li>
                      • <strong className="text-slate-700 font-semibold">고정석 지정 방법</strong>: 작동 모드를 <strong className="text-amber-600">"고정석 지정"</strong>으로 바꾼 후 자리를 클릭하면, 항상 그 자리에 앉을 학생을 영구 지정할 수 있습니다.
                    </li>
                  </ul>
                  <ul className="space-y-1.5 pl-1 font-medium text-slate-500 text-xs">
                    <li>
                      • <strong className="text-slate-700 font-semibold">동작 순서</strong>: 자리 배정 시 <span className="bg-amber-100 text-amber-800 px-1 rounded">🔒 고정석</span>이 우선 선점되고, 나머지 비고정 학생들이 X 자리를 피해서 임의 셔플됩니다.
                    </li>
                    <li>
                      • <strong className="text-slate-700 font-semibold">배치 불러오기</strong>: 최종 결정된 배치는 <strong className="text-purple-600">"현재 자리 저장"</strong>을 통해 클라우드에 영구 백업 가능합니다.
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 메인 화면 레이아웃: 사이드바 + 교실 배치도 */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 왼쪽 영역: 학생 명단 및 데이터 관리 패널 */}
          <section className="lg:col-span-4 space-y-6">
            
            {/* 1. 학생 명단 관리 카드 */}
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4.5 h-4.5 text-blue-600" />
                  <h2 className="font-bold text-slate-800 text-sm">학생 명단 관리</h2>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                  {studentCount}명 등록됨
                </span>
              </div>

              {/* 학생 수 빠른 드롭다운 조절 */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 shrink-0">빠른 인원 설정:</span>
                <div className="relative flex-grow">
                  <select
                    value={studentCount}
                    onChange={(e) => handleAdjustStudentCount(parseInt(e.target.value, 10))}
                    disabled={isShuffling}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none transition-all text-slate-800 font-bold cursor-pointer"
                  >
                    {Array.from({ length: 20 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}명 자동 구성
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 학생 개별 리스트 편집 영역 */}
              <div className="max-h-[220px] overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50/50 space-y-2">
                {studentList.map((name, index) => {
                  const isStudentFixed = fixedSeats.includes(name);
                  return (
                    <div
                      key={`student-editor-${index}`}
                      className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-150 shadow-2xs group"
                    >
                      {/* 순번 배지 및 고정 표시 */}
                      <span className="text-[10px] font-bold text-slate-400 w-5 text-center">
                        {index + 1}
                      </span>

                      {/* 이름 입력 인풋 필드 */}
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => handleUpdateStudentName(index, e.target.value)}
                        placeholder="이름 입력"
                        className="flex-1 text-xs font-bold text-slate-700 bg-transparent focus:bg-slate-50 px-1 py-0.5 rounded border border-transparent focus:border-slate-200 outline-none transition-all"
                      />

                      {/* 고정석 정보 배지 표시 */}
                      {isStudentFixed && (
                        <span
                          title="이 학생은 고정석이 지정되어 있습니다."
                          className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-200 flex items-center gap-0.5"
                        >
                          <Lock className="w-2.5 h-2.5" />
                          고정
                        </span>
                      )}

                      {/* 학생 삭제 버튼 */}
                      <button
                        onClick={() => handleRemoveStudent(index)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                        title="이 학생 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* 명단 컨트롤 액션 버튼 */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleAddStudent}
                  className="py-2 px-3 border border-dashed border-slate-300 text-slate-600 hover:text-blue-600 hover:bg-blue-50/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  학생 추가
                </button>

                <button
                  onClick={handleSaveStudentList}
                  className="py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-xs hover:shadow-sm cursor-pointer"
                  title="현재 수정된 학생 명단을 데이터베이스에 저장합니다."
                >
                  <Save className="w-3.5 h-3.5" />
                  학생 명단 저장
                </button>
              </div>
            </div>

            {/* 2. 배정 제어 카드 */}
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <LayoutGrid className="w-4.5 h-4.5 text-blue-600" />
                <h2 className="font-bold text-slate-800 text-sm">자리 배정 제어</h2>
              </div>

              {/* 자리 알림 및 배치 오류 메시지 */}
              {isSeatShortage ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-start gap-2.5 font-medium leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <strong>배치 불가 (자리 부족)!</strong><br />
                    • 배정 대상 학생: <span className="font-bold text-rose-700">{nonFixedStudentsCount}명</span><br />
                    • 남은 유효 자리: <span className="font-bold text-rose-700">{remainingSeatsCount}석</span><br />
                    <span className="text-[10px] text-slate-500 block mt-1">• 교실에서 X 표시를 줄여 자리를 확보해 주세요.</span>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50/50 border border-blue-100 text-blue-900 text-xs p-3 rounded-xl flex items-start gap-2 font-medium">
                  <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>준비 상태 양호:</strong> 모든 학생을 안전하게 무작위 배치할 수 있는 자리가 확보되었습니다.
                  </div>
                </div>
              )}

              {/* 배치 실행 버튼들 */}
              <div className="space-y-2">
                {!isAssigned ? (
                  <button
                    onClick={handleAssignSeats}
                    disabled={isSeatShortage || isShuffling}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    랜덤 자리 배정
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleAssignSeats}
                      disabled={isShuffling}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      <RefreshCw className={`w-4 h-4 ${isShuffling ? "animate-spin" : ""}`} />
                      {isShuffling ? "자리 섞는 중..." : "다시 자리 배정"}
                    </button>

                    <button
                      onClick={handleModifySettings}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      자리 설정 수정하기 (편집 모드)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 3. 자리배치 저장 및 백업 카드 (차별화된 보라색 테마 적용) */}
            <div className="bg-purple-50/40 border border-purple-150 rounded-2xl p-4 md:p-5 flex flex-col gap-3.5">
              <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <span className="p-1 bg-purple-100 text-purple-700 rounded-lg">💾</span>
                  클라우드 자리배치 백업
                </span>
                <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">
                  실시간 연동
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSaveSeatingLayout}
                  className="py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer"
                  title="현재 배치 결과를 클라우드에 영구 백업합니다."
                >
                  <Save className="w-3.5 h-3.5" />
                  현재 자리 저장
                </button>

                <button
                  onClick={handleLoadSeatingLayout}
                  className="py-2.5 px-3 bg-white border border-purple-200 hover:bg-purple-50/50 text-purple-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer"
                  title="이전에 클라우드에 저장한 자리 배치를 복구합니다."
                >
                  <Download className="w-3.5 h-3.5" />
                  저장 자리 불러오기
                </button>
              </div>
            </div>

            {/* 전체 리셋 버튼 */}
            <button
              onClick={handleResetAll}
              disabled={isShuffling}
              className="w-full py-2 bg-slate-200/65 hover:bg-slate-200 border border-slate-300 text-slate-500 font-semibold rounded-xl text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer uppercase tracking-wider"
            >
              <RotateCcw className="w-3 h-3" />
              모든 설정 및 데이터 초기화
            </button>

          </section>

          {/* 오른쪽 영역: 메인 교실 배치도 및 고정석 제어 */}
          <section className="lg:col-span-8 bg-white p-4 md:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col gap-5">
            
            {/* 작동 모드 및 고정석 모드 토글 바 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-500 flex items-center gap-1 ml-1">
                <span>⚡</span>
                <span>클릭 작동 모드 선택:</span>
              </div>
              
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  onClick={() => setActiveMode("blocked")}
                  className={`flex-1 sm:flex-initial text-xs font-bold py-1.5 px-3.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    activeMode === "blocked"
                      ? "bg-slate-800 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" />
                  빈자리 (X) 지정
                </button>

                <button
                  onClick={() => setActiveMode("fixed")}
                  className={`flex-1 sm:flex-initial text-xs font-bold py-1.5 px-3.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    activeMode === "fixed"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  고정석 지정 모드
                </button>
              </div>
            </div>

            {/* 교탁 표시 */}
            <div className="text-center text-slate-400 font-bold uppercase tracking-[0.25em] text-[10px] py-1.5 bg-slate-50 border border-slate-100 rounded-lg max-w-sm mx-auto w-full select-none">
              칠판 (교탁 방향)
            </div>

            {/* 교실 배치 및 그리드 영역 */}
            <div className="w-full overflow-x-auto pb-2">
              <div className="min-w-[580px] max-w-3xl mx-auto">
                
                {/* 4행 5열 교실 레이아웃 그리드 */}
                <div className="grid grid-cols-[40px_repeat(5,1fr)] gap-y-3 gap-x-2.5">
                  
                  {/* 첫 번째 코너 공백 */}
                  <div className="flex items-center justify-center"></div>
                  
                  {/* 열 헤더 */}
                  {Array.from({ length: 5 }, (_, colIndex) => (
                    <div
                      key={`col-header-${colIndex}`}
                      className="text-center text-[10px] font-bold text-slate-400 select-none uppercase tracking-widest"
                    >
                      {colIndex + 1}열
                    </div>
                  ))}

                  {/* 4개 행 생성 */}
                  {Array.from({ length: 4 }, (_, rowIndex) => (
                    <div key={`row-group-${rowIndex}`} className="contents">
                      
                      {/* 행 지시 가이드 */}
                      <div className="flex items-center justify-center text-[10px] font-bold text-slate-400 select-none">
                        {rowIndex + 1}행
                      </div>

                      {/* 열 루프 */}
                      {Array.from({ length: 5 }, (_, colIndex) => {
                        const seatIndex = rowIndex * 5 + colIndex;
                        const seatNumber = seatIndex + 1;
                        
                        const isBlocked = blockedSeats[seatIndex];
                        const assignedValue = assignedSeats[seatIndex];
                        const fixedStudentOnThisSeat = fixedSeats[seatIndex];

                        // 테마별 카드 배경 및 외각선 스타일 분기
                        let cardStyle = "bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:bg-blue-50/10 cursor-pointer";
                        
                        if (isAssigned) {
                          if (assignedValue === "X") {
                            cardStyle = "bg-rose-50 border-rose-200 text-rose-400 cursor-not-allowed";
                          } else if (assignedValue === null) {
                            cardStyle = "bg-white border-slate-200 text-slate-300 border-dashed cursor-not-allowed";
                          } else if (fixedStudentOnThisSeat === assignedValue) {
                            // 고정석과 실제 매칭된 학생이 앉아있는 프리미엄 카드
                            cardStyle = "bg-amber-50 border-amber-300 text-amber-900 shadow-xs ring-1 ring-amber-200/50";
                          } else {
                            cardStyle = "bg-[#E0F2FE] border-[#7DD3FC] text-[#0369A1] shadow-2xs";
                          }
                        } else {
                          if (isBlocked) {
                            cardStyle = "bg-rose-50 border-rose-200 text-rose-500 shadow-inner";
                          } else if (fixedStudentOnThisSeat) {
                            cardStyle = "bg-amber-50/70 border-amber-300 text-amber-700 shadow-2xs";
                          }
                        }

                        return (
                          <motion.div
                            key={`seat-${seatIndex}`}
                            layout
                            className="relative"
                          >
                            <button
                              onClick={() => handleToggleSeat(seatIndex)}
                              disabled={isAssigned || isShuffling}
                              className={`w-full h-20 md:h-22 rounded-xl border-2 text-center p-1.5 flex flex-col justify-between transition-all duration-200 select-none relative overflow-hidden group ${cardStyle}`}
                              id={`seat-card-${seatNumber}`}
                            >
                              {/* 자리 번호 */}
                              <span className="absolute top-1.5 left-2.5 text-[9px] font-mono font-bold opacity-50 text-slate-500">
                                {seatNumber}
                              </span>

                              {/* 상태 아이콘 표시 (우측 상단) */}
                              <div className="absolute top-1.5 right-2 flex items-center gap-0.5 z-10">
                                {fixedStudentOnThisSeat && (
                                  <span className="text-[8px] font-bold text-amber-700 bg-amber-100 px-1 py-0.5 rounded flex items-center gap-0.5 border border-amber-200">
                                    <Lock className="w-2 h-2 fill-amber-700 stroke-[3]" />
                                    고정
                                  </span>
                                )}
                                
                                {/* 셔플 및 정적 상태에서 직접 고정 지정 토글 링크 */}
                                {isAssigned && assignedValue && assignedValue !== "X" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation(); // 카드 자체 클릭 이벤트 전파 차단
                                      handleDirectToggleFixed(seatIndex, assignedValue);
                                    }}
                                    className="p-0.5 bg-white/80 hover:bg-white text-slate-500 hover:text-amber-600 rounded border border-slate-200 shadow-3xs transition-colors cursor-pointer"
                                    title="이 학생을 이 자리에 영구 고정/해제"
                                  >
                                    {fixedStudentOnThisSeat === assignedValue ? (
                                      <Lock className="w-2.5 h-2.5 text-amber-600 stroke-[3]" />
                                    ) : (
                                      <Unlock className="w-2.5 h-2.5 text-slate-400" />
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* 카드 내 핵심 콘텐츠 */}
                              <div className="w-full h-full flex flex-col items-center justify-center pt-2">
                                {isAssigned ? (
                                  assignedValue === "X" ? (
                                    <span className="text-rose-400 font-extrabold text-2xl">X</span>
                                  ) : assignedValue === null ? (
                                    <span className="text-[9px] text-slate-300">(자동빈자리)</span>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center">
                                      <span className="text-base md:text-lg leading-none">
                                        {getStudentEmoji(assignedValue)}
                                      </span>
                                      <span className={`text-[11px] md:text-xs font-bold mt-1 tracking-tight ${
                                        fixedStudentOnThisSeat === assignedValue ? "text-amber-800" : "text-[#0369A1]"
                                      }`}>
                                        {assignedValue}
                                      </span>
                                    </div>
                                  )
                                ) : (
                                  // 배치 전 설정 상태
                                  isBlocked ? (
                                    <span className="text-rose-400 font-extrabold text-2xl">X</span>
                                  ) : fixedStudentOnThisSeat ? (
                                    <div className="flex flex-col items-center justify-center">
                                      <span className="text-[10px] text-amber-700 font-bold leading-none">
                                        {getStudentEmoji(fixedStudentOnThisSeat)}
                                      </span>
                                      <span className="text-[10px] text-amber-800 font-extrabold mt-1 tracking-tight max-w-[80px] truncate">
                                        {fixedStudentOnThisSeat}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] text-slate-300 group-hover:text-blue-500 transition-colors">
                                      {activeMode === "blocked" ? "(대기)" : "(고정석 지정)"}
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

            {/* 하단 배치 가이드 라인 범례 */}
            <div className="w-full max-w-xl border-t border-slate-100 mt-2 pt-4 flex flex-wrap gap-4 items-center justify-center text-[10px] text-slate-400 font-bold uppercase tracking-wider mx-auto">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded border border-slate-200 bg-white inline-block"></span>
                <span>대기석</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded border border-rose-200 bg-rose-50 inline-block"></span>
                <span>X 빈자리</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded border border-amber-300 bg-amber-50 inline-block"></span>
                <span>고정 지정석</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded border border-[#7DD3FC] bg-[#E0F2FE] inline-block"></span>
                <span>배치 완료</span>
              </div>
            </div>

          </section>

        </main>
      </div>

      {/* 고정석 학생 배정 다이얼로그 (팝업 모달) */}
      <AnimatePresence>
        {selectedSeatForLocking !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 배경 블러 어둡게 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSeatForLocking(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            ></motion.div>

            {/* 모달 박스 */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 shadow-xl relative z-10 flex flex-col gap-4 max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                    자리 {selectedSeatForLocking + 1}번 고정석 지정
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">이 자리에 고정할 학생을 명단에서 선택해 주세요.</p>
                </div>
                <button
                  onClick={() => setSelectedSeatForLocking(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 학생 선택 리스트 */}
              <div className="overflow-y-auto max-h-[300px] p-1 space-y-1.5">
                
                {/* 1. 고정 해제 옵션 */}
                <button
                  onClick={() => handleSelectStudentForFixedSeat(null)}
                  className="w-full text-left p-3 rounded-xl border border-dashed border-slate-200 text-slate-500 hover:bg-slate-50 transition-all text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span>고정석 지정 해제 (랜덤 배치)</span>
                  <span className="text-[10px] text-slate-400">지정 안 함</span>
                </button>

                <div className="border-b border-slate-100 my-2"></div>

                {/* 2. 학생 이름 목록 루프 */}
                {studentList.map((studentName, idx) => {
                  const currentlyFixedSeatIdx = fixedSeats.indexOf(studentName);
                  const isAlreadyFixed = currentlyFixedSeatIdx !== -1;

                  return (
                    <button
                      key={`lock-student-option-${idx}`}
                      onClick={() => handleSelectStudentForFixedSeat(studentName)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs font-bold flex items-center justify-between cursor-pointer
                        ${
                          isAlreadyFixed
                            ? "bg-amber-50/50 border-amber-200 text-amber-800"
                            : "bg-white border-slate-150 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getStudentEmoji(studentName)}</span>
                        <span>{studentName}</span>
                      </div>

                      {isAlreadyFixed && (
                        <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold flex items-center gap-0.5">
                          <Lock className="w-2 h-2 fill-amber-800" />
                          {currentlyFixedSeatIdx + 1}번에 지정됨
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 닫기 및 유의사항 */}
              <div className="bg-slate-50 p-2.5 rounded-xl text-[10px] text-slate-400 font-medium leading-relaxed">
                ※ 이미 다른 자리에 지정된 학생을 선택하면, 해당 학생은 새로운 자리로 고정석이 옮겨지며 이전 자리는 해제됩니다.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 하단 푸터 */}
      <footer className="mt-8 text-center text-[10px] text-slate-400 font-semibold tracking-wider uppercase border-t border-slate-200 pt-5">
        <p>© 2026 스마트 자리 바꾸기 — 클라우드 연동 및 지능형 고정 배치 도구</p>
      </footer>
    </div>
  );
}
