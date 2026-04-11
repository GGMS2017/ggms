import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PlayCircle, CheckCircle2, Circle, MessageSquare, FileText, ChevronDown, ChevronUp, Menu, NotebookPen } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../store/useAuthStore';

export default function Player() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  
  const [currentLecture, setCurrentLecture] = useState(null);
  const [activeTab, setActiveTab] = useState('note');
  const [expandedSections, setExpandedSections] = useState({});
  const [activeSidebarTab, setActiveSidebarTab] = useState('curriculum');
  const [memoText, setMemoText] = useState('');
  const [isBottomExpanded, setIsBottomExpanded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Video Progress Tracking State
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const progressTimerRef = useRef(null);
  const lastSavedTimeRef = useRef(0);

  // Intervention & AI Risk Tracking State
  const { user } = useAuthStore();
  const [seekCount, setSeekCount] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/courses/${courseId}`),
      api.get('/enrollments')
    ]).then(([courseRes, enrollmentsRes]) => {
      const courseData = courseRes.data;
      const enrollmentsData = enrollmentsRes.data;
      
      setCourse(courseData);
      
      const myEnroll = enrollmentsData.find(e => e.courseId === courseId);
      setEnrollment(myEnroll);

      if(courseData.curriculum && courseData.curriculum.length > 0) {
        setExpandedSections({ [courseData.curriculum[0].id]: true });
        
        const allCompleted = myEnroll ? myEnroll.progress.completedLectures : [];
        let cur = courseData.curriculum[0].lectures[0];
        
        courseData.curriculum.some(sec => {
          const uncompleted = sec.lectures.find(l => !allCompleted.includes(l.id));
          if(uncompleted) {
            cur = uncompleted;
            setExpandedSections(prev => ({...prev, [sec.id]: true}));
            return true;
          }
          return false;
        });
        setCurrentLecture(cur);
      }
    }).catch((err) => {
      console.error(err);
      toast.error('강의 정보를 불러오는데 실패했습니다.');
    });

    // 동기부여 Toast 알림 (마운트 시점 1회)
    toast('💪 매일 1시간 학습 목표까지 20분 남았어요! 끝까지 화이팅!', {
       position: "bottom-left",
       autoClose: 5000,
       hideProgressBar: false,
       closeOnClick: true,
       pauseOnHover: true,
       draggable: true,
       theme: "light",
       icon: "🔥"
    });
  }, [courseId]);

  useEffect(() => {
    if (currentLecture && currentLecture.id) {
      const storedMemo = localStorage.getItem(`memo_${currentLecture.id}`);
      setMemoText(storedMemo || '');

      // 이어보기 셋팅 (저장된 시간이 있다면 가져옴)
      if (enrollment && enrollment.progress && enrollment.progress.positions) {
        const savedTime = enrollment.progress.positions[currentLecture.id] || 0;
        setCurrentTime(savedTime);
        lastSavedTimeRef.current = savedTime;
        if (savedTime > 0) {
          toast.info(`이전 시청 기록(${savedTime}초)부터 이어봅니다.`, { autoClose: 2000, position: "top-center" });
        }
      } else {
        setCurrentTime(0);
        lastSavedTimeRef.current = 0;
      }
      setIsPlaying(false);
    }
  }, [currentLecture, enrollment]);

  const handleMemoChange = (e) => {
    const text = e.target.value;
    setMemoText(text);
    if (currentLecture && currentLecture.id) {
      localStorage.setItem(`memo_${currentLecture.id}`, text);
    }
  };

  const toggleSection = (secId) => {
    setExpandedSections(prev => ({ ...prev, [secId]: !prev[secId] }));
  };

  const markAsComplete = async () => {
    if(!currentLecture) return;
    try {
      const res = await api.post(`/enrollments/${courseId}/complete`, { lectureId: currentLecture.id });
      if(res.data.success) {
        setEnrollment(prev => ({
          ...prev,
          progress: {
            ...prev.progress,
            completedLectures: res.data.completedLectures
          }
        }));
        toast.success('수강을 완료했습니다!');
      }
    } catch(err) {
      console.error(err);
      toast.error('수강 완료 처리에 실패했습니다.');
    }
  };

  // Video Progress Tracker (Simulation)
  useEffect(() => {
    let intervalId;
    if (isPlaying) {
      intervalId = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          
          // Throttling: 매 10초마다 서버에 진행률 저장
          if (newTime - lastSavedTimeRef.current >= 10) {
            saveProgress(newTime);
            lastSavedTimeRef.current = newTime;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying, currentLecture]);

  const saveProgress = async (timeToSave) => {
    if (!currentLecture) return;
    try {
      await api.post(`/enrollments/${courseId}/progress`, {
        lectureId: currentLecture.id,
        currentTime: timeToSave
      });
      console.log('Saved time: ', timeToSave);
    } catch(err) {
      console.error('Progress save error', err);
    }
  };

  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    saveEvent(nextState ? 'play' : 'pause');
  };

  const saveEvent = async (eventType, details = '') => {
    if (!currentLecture) return;
    try {
      await api.post(`/enrollments/${courseId}/events`, {
        eventType,
        details
      });
    } catch(err) {
      console.error('Event save error', err);
    }
  };

  const handleSeekBackward = () => {
    setCurrentTime(prev => Math.max(0, prev - 10));
    saveEvent('seek_backward', 'rewind 10s');
    setSeekCount(prev => {
       const newCount = prev + 1;
       if (newCount >= 3 && !quizAnswered) { // 3회 이상 되감기 시 집중력 저하로 간주
          setShowQuiz(true);
          setIsPlaying(false);
       }
       return newCount;
    });
  };

  const handleSpeedUp = () => {
    saveEvent('speed_up', 'Speed increased');
    toast.info('배속 재생이 설정되었습니다.', { autoClose: 1000 });
  };

  if(!course) return <div className="p-10 text-center">Loading Course Player...</div>;

  const completedSet = new Set(enrollment?.progress?.completedLectures || []);
  const isCurrentCompleted = currentLecture && completedSet.has(currentLecture.id);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-900 text-slate-200">
      {/* Player Topbar */}
      <header className="h-14 flex items-center justify-between px-4 bg-slate-950 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <span className="font-semibold text-sm line-clamp-1">{course.title}</span>
        </div>
        <div className="text-xs text-slate-400 font-medium font-mono">
           {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')} 학습 완료
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
         {/* Left Main Area: Video + Tabs */}
         <div className="flex-1 flex flex-col bg-slate-900 relative min-w-0 transition-all duration-300">
            <div className={`w-full ${isBottomExpanded ? 'h-[25vh] shrink-0' : 'flex-1'} bg-black flex flex-col items-center justify-center relative group transition-all duration-500 overflow-hidden`}>
               {/* Video Mockup Content */}
               <div className="absolute top-4 left-4 text-white/50 text-sm font-medium z-10">
                 {currentLecture?.title}
               </div>

               <div className="flex items-center gap-6 z-10">
                  <button onClick={handleSeekBackward} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all backdrop-blur-sm" title="10초 되감기">
                     <span className="text-xs font-bold">-10s</span>
                  </button>
                  <button onClick={togglePlay} className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-primary-500/80 hover:scale-110 transition-all backdrop-blur-sm">
                     {isPlaying ? <span className="font-bold">Pause</span> : <PlayCircle size={32} />}
                  </button>
                  <button onClick={handleSpeedUp} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all backdrop-blur-sm" title="배속 설정">
                     <span className="text-xs font-bold">1.5x</span>
                  </button>
               </div>
               
               <p className="mt-6 text-slate-400 text-sm">
                  {isPlaying ? '재생 중...' : '클릭하여 시뮬레이터 재생'}
               </p>
               
               {/* Progress Bar UI mock */}
               <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20 group-hover:h-2 transition-all cursor-pointer">
                  <div className="bg-primary-500 h-full relative transition-all duration-1000" style={{ width: `${(currentTime / 300) * 100}%` }}>
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow scale-0 group-hover:scale-100 transition-transform"></div>
                  </div>
               </div>

               {/* Intervention Quiz Popup overlay */}
               {showQuiz && (
                  <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6">
                     <div className="bg-white text-slate-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300">
                        <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">☕</div>
                        <h3 className="text-xl font-bold mb-2">잠깐 환기할까요?</h3>
                        <p className="text-slate-500 text-sm mb-6">동일한 구간을 반복해서 시청하셨네요.<br/>집중력이 약간 떨어진 것 같아요. 간단한 퀴즈를 풀고 다시 집중해볼까요?</p>
                        
                        <div className="space-y-3">
                           <button onClick={() => { setShowQuiz(false); setQuizAnswered(true); togglePlay(); }} className="w-full py-3 bg-slate-100 hover:bg-primary-50 hover:text-primary-600 rounded-xl font-medium transition-colors text-sm border border-transparent hover:border-primary-200">
                              이해했어요! 이어서 볼게요.
                           </button>
                           <button onClick={() => { setShowQuiz(false); setQuizAnswered(true); }} className="w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors text-sm border border-transparent">
                              아니요, 잠시 쉴게요.
                           </button>
                        </div>
                     </div>
                  </div>
               )}
            </div>

            {/* Bottom Tabs & Content */}
            <div className={`${isBottomExpanded ? 'flex-1' : 'shrink-0'} flex flex-col min-h-0 bg-white text-slate-800 rounded-tl-xl mt-2 overflow-hidden shadow-[0_-5px_15px_rgba(0,0,0,0.1)] relative transition-all duration-500`}>
               
               {/* Expand Handle */}
               <button 
                 onClick={() => setIsBottomExpanded(!isBottomExpanded)}
                 className="absolute top-0 inset-x-0 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors z-20 cursor-ns-resize border-b border-slate-200"
                 aria-label="노트 및 질문 탭 크기 조절"
               >
                 {isBottomExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
               </button>

               <div className="flex border-b border-slate-200 px-2 shrink-0 pt-6">
                  <button 
                    onClick={() => setActiveTab('note')}
                    className={`px-6 py-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'note' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                     <FileText size={16} /> 강의 노트
                  </button>
                  <button 
                    onClick={() => setActiveTab('qa')}
                    className={`px-6 py-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'qa' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                     <MessageSquare size={16} /> Q&A 게시판
                  </button>
                  <div className="ml-auto px-4 py-3 flex items-center">
                    <button 
                      onClick={markAsComplete}
                      disabled={isCurrentCompleted}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${isCurrentCompleted ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95'}`}
                    >
                      {isCurrentCompleted ? '학습 완료됨' : '학습 완료하기'}
                    </button>
                  </div>
               </div>
               
               {isBottomExpanded && (
                 <div className="flex-1 overflow-y-auto p-6 bg-slate-50 relative">
                  {activeTab === 'note' && (
                    <div className="prose prose-slate max-w-none">
                      <h3 className="text-xl font-bold mb-4">{currentLecture?.title}</h3>
                      <p className="text-slate-600">이 강의의 핵심 내용을 요약하는 노트 영역입니다. 실제 서비스에서는 마크다운 등 서식이 지원되는 텍스트가 표시됩니다.</p>
                      <ul className="mt-4 space-y-2 text-slate-600">
                        <li>강의 핵심 포인트 1</li>
                        <li>놓치기 쉬운 주의사항</li>
                        <li>실습에 필요한 코드 스니펫</li>
                      </ul>
                    </div>
                  )}
                  {activeTab === 'qa' && (
                    <div>
                      <div className="mb-6 flex gap-4">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold shrink-0">Q</div>
                        <div className="w-full">
                           <textarea className="w-full border py-3 px-4 rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none" rows="2" placeholder="강의 중에 궁금한 점이 있으신가요?"></textarea>
                           <div className="flex justify-end mt-2"><button className="btn-primary text-sm px-4 py-1.5 rounded-lg">질문 등록</button></div>
                        </div>
                      </div>
                      <div className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm mt-4">
                        <div className="flex items-center gap-2 mb-2">
                           <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-500">A</div>
                           <span className="font-semibold text-sm">김강사</span>
                           <span className="text-xs text-slate-400">1일 전</span>
                        </div>
                        <p className="text-sm text-slate-700">이전 수강생 분들이 많이 하셨던 질문들을 여기에 표시하면 좋습니다. 위 강의 노트의 실습 코드를 참고해보세요.</p>
                      </div>
                    </div>
                  )}
                 </div>
               )}
            </div>
         </div>

            {/* Right Sidebar Toggle (Floating when closed) */}
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-white p-2 rounded-l-xl shadow-lg border border-r-0 border-slate-200 hover:bg-slate-50 transition-transform shrink-0 z-40 text-slate-500 hover:text-primary-600"
              >
                 <Menu size={20} />
              </button>
            )}
            
         {/* Right Sidebar: Curriculum Accordions and Memo */}
         <div className={`${isSidebarOpen ? 'w-80 md:w-96' : 'w-0 border-none'} bg-white border-l border-slate-200 flex flex-col shadow-xl z-20 transition-all duration-300 overflow-hidden shrink-0`}>
            
            {activeSidebarTab === 'curriculum' ? (
              <div className="w-80 md:w-96 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
                   <h3 className="font-bold text-slate-800 text-base">커리큘럼</h3>
                   <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors">
                     <ChevronRight size={18} />
                   </button>
                </div>
                <div className="px-4 pb-4 border-b border-slate-100 bg-slate-50 shrink-0">
                   <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                     <div className="bg-primary-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${(completedSet.size / (course.curriculum.reduce((acc, sec) => acc + sec.lectures.length, 0) || 1)) * 100}%`}}></div>
                   </div>
                   <p className="text-xs text-slate-500 mt-2 text-right">{completedSet.size} / {course.curriculum.reduce((acc, sec) => acc + sec.lectures.length, 0)} 완료</p>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                   {course.curriculum.map(sec => (
                     <div key={sec.id} className="border-b border-slate-100">
                        <button 
                          onClick={() => toggleSection(sec.id)}
                          className="w-full px-4 py-3 flex items-center justify-between text-left bg-white hover:bg-slate-50 transition-colors"
                        >
                           <span className="font-semibold text-sm text-slate-800 flex-1">{sec.title}</span>
                           <span className="text-slate-400 ml-2">
                             {expandedSections[sec.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                           </span>
                        </button>
                        
                        {expandedSections[sec.id] && (
                           <div className="bg-slate-50/50 pb-2">
                             {sec.lectures.map(lec => {
                               const isCompleted = completedSet.has(lec.id);
                               const isActive = currentLecture?.id === lec.id;
                               
                               return (
                                 <div 
                                   key={lec.id}
                                   className={`w-full px-4 py-2.5 flex items-center gap-2 transition-colors ${isActive ? 'bg-primary-50/50' : 'hover:bg-white'}`}
                                 >
                                   <button 
                                     onClick={() => setCurrentLecture(lec)}
                                     className="flex-1 min-w-0 flex items-start gap-3 text-left"
                                   >
                                     <div className="mt-0.5 shrink-0">
                                       {isCompleted ? (
                                         <CheckCircle2 size={16} className="text-green-500 fill-green-50" />
                                       ) : isActive ? (
                                         <PlayCircle size={16} className="text-primary-500" />
                                       ) : (
                                         <Circle size={16} className="text-slate-300" />
                                       )}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                       <p className={`text-sm leading-tight ${isActive ? 'font-semibold text-primary-700' : 'text-slate-700'} ${isCompleted && !isActive ? 'text-slate-500' : ''}`}>
                                         {lec.title}
                                       </p>
                                       <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                          {isActive && <span className="text-primary-500 font-medium">재생 중</span>}
                                          {isActive && <span className="text-slate-300">•</span>}
                                          {lec.duration}
                                       </p>
                                     </div>
                                   </button>
                                   <button 
                                     onClick={() => { setCurrentLecture(lec); setActiveSidebarTab('memo'); }}
                                     className="text-slate-400 hover:text-primary-600 p-2 hover:bg-primary-100 rounded-md transition-colors shrink-0"
                                     title="이 강의 메모장 열기"
                                   >
                                     <NotebookPen size={16} />
                                   </button>
                                 </div>
                               );
                             })}
                           </div>
                        )}
                     </div>
                   ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-4 bg-slate-50 relative min-h-0 shadow-inner">
                <div className="flex items-center gap-2 mb-4 shrink-0 pb-3 border-b border-slate-200">
                   <button 
                     onClick={() => setActiveSidebarTab('curriculum')}
                     className="text-slate-500 hover:text-slate-800 transition-colors p-1.5 -ml-1.5 rounded-md hover:bg-slate-200 flex items-center justify-center shrink-0"
                   >
                     <ChevronLeft size={20} />
                   </button>
                   <h3 className="font-bold text-slate-800 text-base">커리큘럼으로 돌아가기</h3>
                </div>
                <div className="flex items-center justify-between mb-3 shrink-0">
                   <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 line-clamp-1">
                     <FileText size={16} className="text-primary-600 shrink-0"/> 
                     <span className="line-clamp-1 text-xs">{currentLecture ? currentLecture.title : '강의 메모'}</span>
                   </h4>
                   {memoText && <span className="text-[10px] text-slate-400 font-medium bg-white px-2 py-1 rounded shadow-sm border border-slate-100 flex-shrink-0 animate-pulse">자동 저장됨</span>}
                </div>
                <textarea 
                  value={memoText}
                  onChange={handleMemoChange}
                  placeholder={currentLecture ? "여기에 현재 강의에 대한 메모를 작성하세요.\n작성된 내용은 브라우저에 자동 저장됩니다.\n\n예: 중요한 단축키 정리, 꼭 알아둬야 할 개념 요약 등" : "강의를 선택해주세요."}
                  disabled={!currentLecture}
                  className="flex-1 w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none text-sm leading-relaxed text-slate-700 shadow-inner bg-white"
                ></textarea>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
