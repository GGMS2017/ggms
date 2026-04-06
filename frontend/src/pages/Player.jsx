import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, PlayCircle, CheckCircle2, Circle, MessageSquare, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function Player() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  
  const [currentLecture, setCurrentLecture] = useState(null);
  const [activeTab, setActiveTab] = useState('note');
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    Promise.all([
      fetch(`http://localhost:3000/api/courses/${courseId}`).then(res => res.json()),
      fetch('http://localhost:3000/api/enrollments', { headers: { 'Authorization': userId || '' } }).then(res => res.json())
    ]).then(([courseData, enrollmentsData]) => {
      setCourse(courseData);
      
      const myEnroll = enrollmentsData.find(e => e.courseId === courseId);
      setEnrollment(myEnroll);

      // Section Toggle 초기 상태 (첫번째 섹션 오픈)
      if(courseData.curriculum && courseData.curriculum.length > 0) {
        setExpandedSections({ [courseData.curriculum[0].id]: true });
        // 이어보기 로직 (완료되지 않은 첫번째 강의 선택, 혹은 그냥 첫 강의)
        const allCompleted = myEnroll ? myEnroll.progress.completedLectures : [];
        let cur = courseData.curriculum[0].lectures[0]; // fallback
        
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
    });
  }, [courseId]);

  const toggleSection = (secId) => {
    setExpandedSections(prev => ({ ...prev, [secId]: !prev[secId] }));
  };

  const markAsComplete = async () => {
    const userId = localStorage.getItem('userId');
    if(!currentLecture) return;
    try {
      const res = await fetch(`http://localhost:3000/api/enrollments/${courseId}/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': userId || ''
        },
        body: JSON.stringify({ lectureId: currentLecture.id })
      });
      const data = await res.json();
      if(data.success) {
        setEnrollment(prev => ({
          ...prev,
          progress: {
            ...prev.progress,
            completedLectures: data.completedLectures
          }
        }));
      }
    } catch(err) {
      console.error(err);
    }
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
        <div className="text-xs text-slate-400 font-medium">
           학습 진행 중
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
         {/* Left Main Area: Video + Tabs */}
         <div className="flex-1 flex flex-col bg-slate-900 relative">
            <div className="flex-shrink-0 w-full aspect-video bg-black flex flex-col items-center justify-center relative group">
               {/* Video Mockup Content */}
               <div className="absolute top-4 left-4 text-white/50 text-sm font-medium z-10">
                 {currentLecture?.title}
               </div>

               <button className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-primary-500/80 hover:scale-110 transition-all backdrop-blur-sm z-10">
                  <PlayCircle size={32} />
               </button>
               <p className="mt-4 text-slate-400 text-sm">영상 플레이어 목업 (실제 영상 미포함)</p>
               
               {/* Progress Bar UI mock */}
               <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20 group-hover:h-2 transition-all">
                  <div className="bg-primary-500 w-1/3 h-full relative">
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow scale-0 group-hover:scale-100 transition-transform"></div>
                  </div>
               </div>
            </div>

            {/* Bottom Tabs & Content */}
            <div className="flex-1 flex flex-col min-h-0 bg-white text-slate-800 rounded-tl-xl mt-2 overflow-hidden shadow-[0_-5px_15px_rgba(0,0,0,0.1)]">
               <div className="flex border-b border-slate-200 px-2 shrink-0">
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
            </div>
         </div>

         {/* Right Sidebar: Curriculum Accordions */}
         <div className="w-80 md:w-96 bg-white border-l border-slate-200 flex flex-col shadow-xl z-20">
            <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
               <h3 className="font-bold text-slate-800 text-base">커리큘럼</h3>
               <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                 <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${(completedSet.size / (course.curriculum.reduce((acc, sec) => acc + sec.lectures.length, 0) || 1)) * 100}%`}}></div>
               </div>
               <p className="text-xs text-slate-500 mt-1 text-right">{completedSet.size} / {course.curriculum.reduce((acc, sec) => acc + sec.lectures.length, 0)} 완료</p>
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
                             <button 
                               key={lec.id}
                               onClick={() => setCurrentLecture(lec)}
                               className={`w-full text-left px-5 py-2.5 flex items-start gap-3 transition-colors ${isActive ? 'bg-primary-50/50' : 'hover:bg-white'}`}
                             >
                               <div className="mt-0.5">
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
                           );
                         })}
                       </div>
                    )}
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}
