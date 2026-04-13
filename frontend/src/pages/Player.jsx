import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PlayCircle, CheckCircle2, Circle, MessageSquare, FileText, ChevronDown, ChevronUp, Menu, NotebookPen, Bot, Send, Code, Loader2 } from 'lucide-react';
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
  const [isBottomExpanded, setIsBottomExpanded] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Video Progress Tracking State
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const progressTimerRef = useRef(null);
  const lastSavedTimeRef = useRef(0);

  // AI Tutor Chat State
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', content: '안녕하세요! 강의를 듣다가 궁금한 점이 생기면 언제든 질문해주세요. 현재 시청 중인 타임라인에 맞춰 답변을 드릴게요.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto Grader State
  const [codeSnippet, setCodeSnippet] = useState('');
  const [gradeResult, setGradeResult] = useState(null);
  const [isGrading, setIsGrading] = useState(false);

  // Q&A State
  const [qaList, setQaList] = useState([]);
  const [qaInput, setQaInput] = useState('');
  const [isQaLoading, setIsQaLoading] = useState(false);

  // Intervention & AI Risk Tracking State
  const { user } = useAuthStore();
  const [seekCount, setSeekCount] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [aiQuiz, setAiQuiz] = useState(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

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
    if (currentLecture && currentLecture.id && courseId) {
      api.get(`/qa/${courseId}/${currentLecture.id}`)
        .then(res => { if (res.data.success) setQaList(res.data.questions); })
        .catch(() => {});
    }
  }, [currentLecture, courseId]);

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

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: newMsg.content,
        courseId,
        lectureId: currentLecture?.id,
        currentTime
      });
      if (res.data.success) {
        setChatMessages(prev => [...prev, { role: 'ai', content: res.data.reply }]);
      }
    } catch (err) {
      console.error(err);
      toast.error('AI 튜터와 연결할 수 없습니다.');
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ai_tutor' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const handleQaSubmit = async () => {
    if (!qaInput.trim()) return;
    setIsQaLoading(true);
    try {
      const res = await api.post('/qa', {
        courseId,
        lectureId: currentLecture?.id,
        question: qaInput.trim()
      });
      if (res.data.success) {
        setQaList(prev => [res.data.qa, ...prev]);
        setQaInput('');
        toast.success('질문이 등록되었습니다.');
      }
    } catch (err) {
      toast.error('질문 등록에 실패했습니다.');
      console.error(err);
    } finally {
      setIsQaLoading(false);
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
        if (res.data.earnedXP > 0) {
          toast.success(`🎉 수강 완료! ${res.data.earnedXP} XP를 획득했습니다!`, { icon: '🎁', style: {background: '#fef3c7', color: '#b45309', fontWeight: 'bold'} });
        } else {
          toast.success('수강을 완료했습니다!');
        }
        if (res.data.earnedBadges && res.data.earnedBadges.length > 0) {
          const badgeNames = { first_lecture: '첫 강의 완료', lecture_5: '5강 돌파', lecture_10: '10강 달성', streak_3: '3일 연속 학습', streak_7: '7일 연속 학습', xp_500: 'XP 500 달성' };
          res.data.earnedBadges.forEach(b => {
            setTimeout(() => toast(`🏅 새 배지 획득! "${badgeNames[b] || b}"`, { icon: '✨', style: {background: '#f0fdf4', color: '#166534', fontWeight: 'bold'}, autoClose: 5000 }), 1200);
          });
        }
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

  const fetchAiQuiz = async () => {
    if (!currentLecture) return;
    setIsQuizLoading(true);
    setAiQuiz(null);
    setSelectedOption(null);
    setQuizSubmitted(false);
    try {
      const res = await api.post('/ai/quiz', { courseId, lectureId: currentLecture.id });
      if (res.data.success) setAiQuiz(res.data.quiz);
    } catch (err) {
      setAiQuiz({ question: '이 강의에서 배운 핵심 개념을 스스로 정리해보세요.', options: ['완전히 이해했어요', '대부분 이해했어요', '조금 헷갈려요', '다시 봐야 할 것 같아요'], answerIndex: 0, explanation: '자기 평가를 통해 학습 상태를 점검하세요.' });
    } finally {
      setIsQuizLoading(false);
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
          fetchAiQuiz();
       }
       return newCount;
    });
  };

  const handleSpeedUp = () => {
    saveEvent('speed_up', 'Speed increased');
    toast.info('배속 재생이 설정되었습니다.', { autoClose: 1000 });
  };

  const handleAiChatSubmit = async (e) => {
    if (e.preventDefault) e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const playbackProgress = currentTime;
      const res = await api.post('/ai/chat', { 
        message: userMessage, 
        courseId, 
        lectureId: currentLecture?.id,
        timeStr: formatTime(playbackProgress)
      });
      if (res.data.success) {
        setChatMessages(prev => [...prev, { role: 'ai', content: res.data.reply }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'ai', content: '연결에 실패했습니다. 다시 시도해주세요.' }]);
    } finally {
      setIsChatLoading(false);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleGradeSubmit = async () => {
    if (!codeSnippet.trim()) return;
    setIsGrading(true);
    setGradeResult(null);

    try {
      const res = await api.post('/course/grade', {
        codeSnippet,
        assignmentTitle: currentLecture?.title
      });
      if (res.data.success) {
        setGradeResult(res.data.result);
      }
    } catch (err) {
      console.error("Grade submission failed:", err);
      toast.error('채점 결과 수신에 오류가 발생했습니다.');
    } finally {
      setIsGrading(false);
    }
  };

  if(!course) return <div className="p-10 text-center">Loading Course Player...</div>;

  const completedSet = new Set(enrollment?.progress?.completedLectures || []);
  const isCurrentCompleted = currentLecture && completedSet.has(currentLecture.id);

  const parseDuration = (durStr) => {
    if (!durStr) return 300;
    const parts = durStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 300;
  };
  const totalDuration = currentLecture ? parseDuration(currentLecture.duration) : 300;
  const formatTime = (secs) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;

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
           {formatTime(currentTime)} / {currentLecture ? currentLecture.duration : '00:00'} 학습 경과
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
          {/* Left Main Area: Video + Tabs */}
         <div className="flex-1 flex flex-col bg-slate-900 relative min-w-0 transition-all duration-300">
            <div 
              className={`w-full ${isBottomExpanded ? 'h-[25vh] shrink-0' : 'flex-1'} bg-black relative group transition-all duration-500 overflow-hidden cursor-pointer`}
              onClick={togglePlay}
            >
               {/* 1. Dummy Video Screen (Black screen with running text) */}
               <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 select-none pointer-events-none">
                 <div className="text-white text-6xl font-mono opacity-50 mb-4 tracking-wider">
                   {formatTime(currentTime)}
                 </div>
                 <div className="text-slate-400 text-sm tracking-widest uppercase">
                   Simulated Secure Video Stream
                 </div>
               </div>

               <div className="absolute top-4 left-4 text-white/70 text-sm font-medium z-10 drop-shadow-md pointer-events-none">
                 {currentLecture?.title}
               </div>

               {/* Center Play Button Overlay (when paused) */}
               {!isPlaying && !showQuiz && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-20 transition-opacity">
                    <div className="w-20 h-20 bg-primary-600/90 rounded-full flex items-center justify-center text-white scale-100 hover:scale-110 transition-transform shadow-[0_0_30px_rgba(var(--primary-600),0.5)]">
                      <PlayCircle size={40} className="ml-2" />
                    </div>
                 </div>
               )}

               {/* Custom Video Controls Bar */}
               <div 
                 className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 pb-4 pt-12 px-6 via-black/40 to-transparent z-30 transition-all duration-300 ${isPlaying ? 'opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0' : 'opacity-100'}`}
                 onClick={e => e.stopPropagation()}
               >
                 {/* Progress Bar */}
                 <div className="w-full h-1.5 bg-white/20 hover:h-2.5 transition-all cursor-pointer rounded-full mb-4 relative" 
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        setCurrentTime(Math.floor(percent * totalDuration));
                      }}>
                    <div className="bg-primary-500 h-full relative transition-[width] duration-100 rounded-full" style={{ width: `${Math.min(100, (currentTime / totalDuration) * 100)}%` }}>
                       <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow scale-0 group-hover:scale-100 transition-transform"></div>
                    </div>
                 </div>

                 {/* Control Buttons */}
                 <div className="flex items-center justify-between text-white">
                   <div className="flex items-center gap-4">
                     <button onClick={togglePlay} className="hover:text-primary-400 transition-colors">
                       {isPlaying ? <span className="font-bold text-sm tracking-wider w-8 inline-block text-center border border-white/30 rounded py-1">| |</span> : <PlayCircle size={24} />}
                     </button>
                     <button onClick={handleSeekBackward} className="hover:text-primary-400 transition-colors text-xs font-bold bg-white/10 px-2 py-1.5 rounded-md" title="10초 되감기">
                        -10s
                     </button>
                     <div className="text-xs font-mono opacity-80 pl-2">
                       {formatTime(currentTime)} / {currentLecture ? currentLecture.duration : '00:00'}
                     </div>
                   </div>
                   <div className="flex items-center gap-4">
                     <button onClick={handleSpeedUp} className="hover:text-primary-400 transition-colors text-xs font-bold border border-white/30 px-2 py-1 rounded">
                        1.5x
                     </button>
                   </div>
                 </div>
               </div>

               {/* Intervention Quiz Popup overlay */}
               {showQuiz && (
                  <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6">
                     <div className="bg-white text-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center text-xl shrink-0">🧠</div>
                          <div>
                            <h3 className="text-lg font-bold">집중력 체크 퀴즈</h3>
                            <p className="text-xs text-slate-400">같은 구간을 반복 시청 중이에요. 간단한 퀴즈로 이해도를 확인해볼까요?</p>
                          </div>
                        </div>

                        {isQuizLoading ? (
                          <div className="flex flex-col items-center py-8 gap-3 text-slate-400">
                            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                            <p className="text-sm">AI가 퀴즈를 생성하고 있어요...</p>
                          </div>
                        ) : aiQuiz ? (
                          <div>
                            <p className="font-semibold text-sm mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">{aiQuiz.question}</p>
                            <div className="space-y-2 mb-4">
                              {aiQuiz.options.map((opt, idx) => {
                                let btnClass = 'w-full text-left py-2.5 px-4 rounded-xl text-sm font-medium transition-all border ';
                                if (!quizSubmitted) {
                                  btnClass += selectedOption === idx ? 'bg-primary-50 border-primary-400 text-primary-700' : 'bg-slate-50 border-slate-200 hover:border-primary-300 hover:bg-primary-50/50';
                                } else {
                                  if (idx === aiQuiz.answerIndex) btnClass += 'bg-green-50 border-green-400 text-green-700';
                                  else if (idx === selectedOption) btnClass += 'bg-red-50 border-red-300 text-red-600 line-through';
                                  else btnClass += 'bg-slate-50 border-slate-200 text-slate-400';
                                }
                                return (
                                  <button key={idx} className={btnClass} onClick={() => !quizSubmitted && setSelectedOption(idx)}>
                                    <span className="font-bold mr-2">{['①','②','③','④'][idx]}</span>{opt}
                                  </button>
                                );
                              })}
                            </div>
                            {quizSubmitted && (
                              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-sm text-blue-700">
                                💡 {aiQuiz.explanation}
                              </div>
                            )}
                            <div className="flex gap-2">
                              {!quizSubmitted ? (
                                <button onClick={() => selectedOption !== null && setQuizSubmitted(true)} disabled={selectedOption === null} className="flex-1 py-2.5 bg-primary-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-medium text-sm transition-colors hover:bg-primary-700">
                                  제출하기
                                </button>
                              ) : (
                                <button onClick={() => { setShowQuiz(false); setQuizAnswered(true); setIsPlaying(true); }} className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl font-medium text-sm hover:bg-primary-700">
                                  이어서 학습하기 ▶
                                </button>
                              )}
                              <button onClick={() => { setShowQuiz(false); setQuizAnswered(true); }} className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200">
                                닫기
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <button onClick={() => { setShowQuiz(false); setQuizAnswered(true); setIsPlaying(true); }} className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium text-sm hover:bg-primary-700">
                              이해했어요! 이어서 볼게요.
                            </button>
                            <button onClick={() => { setShowQuiz(false); setQuizAnswered(true); }} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200">
                              잠시 쉴게요.
                            </button>
                          </div>
                        )}
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
                    onClick={() => { setActiveTab('note'); setIsBottomExpanded(true); }}
                    className={`px-6 py-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'note' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                     <FileText size={16} /> 강의 노트
                  </button>
                  <button 
                    onClick={() => { setActiveTab('qa'); setIsBottomExpanded(true); }}
                    className={`px-6 py-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'qa' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                     <MessageSquare size={16} /> Q&A 게시판
                  </button>
                  <button 
                    onClick={() => { setActiveTab('assignment'); setIsBottomExpanded(true); }}
                    className={`px-6 py-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'assignment' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                     <Code size={16} className={activeTab === 'assignment' ? 'text-primary-600' : 'text-slate-400'} /> 과제 제출 (AI 채점)
                  </button>
                  <button 
                    onClick={() => { setActiveTab('ai_tutor'); setIsBottomExpanded(true); }}
                    className={`px-6 py-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ai_tutor' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                     <Bot size={16} className={activeTab === 'ai_tutor' ? 'text-primary-600' : 'text-slate-400'} /> AI 튜터상담
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
                    <div className="prose prose-slate max-w-none pb-8">
                      <h3 className="text-xl font-bold mb-4 border-b pb-2">{currentLecture?.title}</h3>
                      {currentLecture?.note ? (
                        <div className="mt-4 leading-relaxed marker:text-primary-500" dangerouslySetInnerHTML={{ __html: currentLecture.note }}></div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <NotebookPen size={40} className="text-slate-300 mb-4" />
                          <p className="text-slate-500 text-sm font-medium">이 강의는 등록된 노트가 없습니다.</p>
                          <p className="text-slate-400 text-xs mt-1">강사가 학습 자료를 준비 중입니다.</p>
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === 'qa' && (
                    <div>
                      <div className="mb-6 flex gap-4">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold shrink-0">Q</div>
                        <div className="w-full">
                           <textarea
                             className="w-full border py-3 px-4 rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
                             rows="2"
                             placeholder="강의 중에 궁금한 점이 있으신가요?"
                             value={qaInput}
                             onChange={e => setQaInput(e.target.value)}
                           />
                           <div className="flex justify-end mt-2">
                             <button
                               onClick={handleQaSubmit}
                               disabled={!qaInput.trim() || isQaLoading}
                               className="btn-primary text-sm px-4 py-1.5 rounded-lg flex items-center gap-2 disabled:opacity-50"
                             >
                               {isQaLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                               질문 등록
                             </button>
                           </div>
                        </div>
                      </div>
                      {qaList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <MessageSquare size={36} className="text-slate-300 mb-3" />
                          <p className="text-slate-500 text-sm">아직 등록된 질문이 없습니다.</p>
                          <p className="text-slate-400 text-xs mt-1">첫 번째 질문을 남겨보세요!</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {qaList.map((q, idx) => (
                            <div key={q._id || idx} className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-700">Q</div>
                                <span className="font-semibold text-sm">{q.userName || '수강생'}</span>
                                <span className="text-xs text-slate-400">{new Date(q.createdAt).toLocaleDateString('ko-KR')}</span>
                              </div>
                              <p className="text-sm text-slate-700 ml-8">{q.question}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === 'ai_tutor' && (
                    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="bg-primary-50 px-4 py-3 border-b border-primary-100 flex items-center gap-3 shrink-0">
                        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white"><Bot size={18} /></div>
                        <div>
                          <h4 className="text-sm font-bold text-primary-900">스타피시 비전 AI 튜터</h4>
                          <p className="text-[10px] text-primary-600">현재 영상 구간: {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')}</p>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {chatMessages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'}`}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        {isChatLoading && (
                          <div className="flex justify-start">
                            <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1 shadow-sm">
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                      
                      <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                        <form onSubmit={handleAiChatSubmit} className="flex items-center gap-2 relative">
                          <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="AI 튜터에게 질문하기 (현재 영상 문맥 자동 포함)" 
                            className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 pr-10 hover:bg-slate-50 transition-colors"
                          />
                          <button 
                            type="submit" 
                            disabled={!chatInput.trim() || isChatLoading}
                            className="absolute right-1 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center disabled:opacity-50 hover:bg-primary-700 transition-colors"
                          >
                            <Send size={14} className="ml-0.5" />
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                  {activeTab === 'assignment' && (
                    <div className="h-full flex flex-col pt-2 pb-8 max-w-3xl mx-auto">
                      <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 mb-6 flex gap-3">
                        <div className="text-2xl">🤖</div>
                        <div>
                          <h4 className="font-bold text-primary-900 mb-1">실습 과제 제출 및 실시간 AI 코드 리뷰</h4>
                          <p className="text-sm text-primary-700 leading-relaxed">
                            작성하신 코드를 아래에 붙여넣으세요. 제출 즉시 <strong>가독성, 로직 무결성, 효율성</strong> 기준에 맞춰 AI가 채점하고 피드백을 부여합니다.
                          </p>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col gap-4">
                        <textarea
                          placeholder="// 여기에 실습 코드를 작성하거나 붙여넣으세요..."
                          className="w-full flex-1 min-h-[250px] p-4 bg-slate-800 text-slate-100 font-mono text-sm rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none"
                          value={codeSnippet}
                          onChange={(e) => setCodeSnippet(e.target.value)}
                          disabled={isGrading}
                          spellCheck={false}
                        />

                        <button
                          onClick={handleGradeSubmit}
                          disabled={isGrading || !codeSnippet.trim()}
                          className="btn-primary w-full py-3 flex justify-center items-center gap-2 font-bold"
                        >
                          {isGrading ? (
                            <><Loader2 size={18} className="animate-spin" /> 철저히 분석 및 채점 중...</>
                          ) : (
                            <><Code size={18} /> 실습 코드 제출 및 채점받기</>
                          )}
                        </button>

                        {gradeResult && (
                          <div className="mt-6 bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-4">
                            <div className={`p-6 border-b flex items-center justify-between ${gradeResult.score >= 80 ? 'bg-emerald-50 border-emerald-100' : gradeResult.score >= 60 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
                              <div>
                                <h3 className="font-bold text-lg text-slate-800">채점 결과 리포트</h3>
                                <p className="text-slate-600 text-sm mt-1">{gradeResult.oneLineFeedback}</p>
                              </div>
                              <div className="text-center">
                                <span className={`text-4xl font-extrabold ${gradeResult.score >= 80 ? 'text-emerald-600' : gradeResult.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                                  {gradeResult.score}
                                </span>
                                <span className="text-slate-500 text-sm block">/ 100점</span>
                              </div>
                            </div>
                            <div className="p-6 space-y-4">
                              <div className="flex gap-4">
                                <div className="text-xl">📖</div>
                                <div>
                                  <h4 className="font-bold text-slate-800 text-sm">가독성 판단</h4>
                                  <p className="text-slate-600 text-sm leading-relaxed">{gradeResult.readability}</p>
                                </div>
                              </div>
                              <div className="flex gap-4">
                                <div className="text-xl">⚙️</div>
                                <div>
                                  <h4 className="font-bold text-slate-800 text-sm">로직 및 버그 유무</h4>
                                  <p className="text-slate-600 text-sm leading-relaxed">{gradeResult.logic}</p>
                                </div>
                              </div>
                              <div className="flex gap-4">
                                <div className="text-xl">⚡</div>
                                <div>
                                  <h4 className="font-bold text-slate-800 text-sm">효율성 (알고리즘)</h4>
                                  <p className="text-slate-600 text-sm leading-relaxed">{gradeResult.efficiency}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
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
