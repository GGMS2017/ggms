import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlayCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState("section_1_1");

  useEffect(() => {
    fetch(`http://localhost:3000/api/courses/${id}`)
      .then(res => res.json())
      .then(data => {
        setCourse(data);
        if(data.curriculum && data.curriculum.length > 0) {
          setExpandedSection(data.curriculum[0].id);
        }
        setLoading(false);
      });
  }, [id]);

  const handleEnroll = async () => {
    const userId = localStorage.getItem('userId');
    try {
      const res = await fetch('http://localhost:3000/api/enroll', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': userId || ''
        },
        body: JSON.stringify({ courseId: id })
      });
      const data = await res.json();
      if(data.success || data.error === 'Already enrolled') {
        navigate('/dashboard');
      }
    } catch(err) {
      console.error(err);
    }
  };

  if (loading || !course) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="bg-slate-50 pb-20">
      {/* Hero Section */}
      <div className="bg-slate-900 text-white relative">
        <div className="absolute inset-0 overflow-hidden mix-blend-overlay opacity-20">
           <img src={course.thumbnail} alt="BG" className="w-full h-full object-cover blur-sm" />
        </div>
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 relative z-10 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="flex gap-2 mb-4">
              {course.tags.map(tag => (
                <span key={tag} className="bg-white/20 px-2 py-1 rounded text-xs font-medium">#{tag}</span>
              ))}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">{course.title}</h1>
            <p className="text-lg text-slate-300 mb-8 max-w-xl leading-relaxed">{course.description}</p>
            <div className="flex items-center gap-4">
              <button onClick={handleEnroll} className="btn-primary px-8 py-4 text-lg shadow-lg shadow-primary-500/30">
                수강 신청하기
              </button>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
               <img src={course.thumbnail} alt={course.title} className="w-full aspect-video object-cover" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-10">
        <div className="md:col-span-2 space-y-10">
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <BookOpenIcon /> 강의 소개
            </h2>
            <div className="card p-8 text-slate-700 leading-relaxed text-lg">
              이 과정은 <strong>{course.instructor}</strong>이(가) 진행하는 정규 과정으로, 
              이론부터 실무 프로젝트까지 단계별로 학습할 수 있도록 구성되어 있습니다.<br/><br/>
              현재 현업에서 가장 많이 사용되는 기술 스택을 중심으로, 실습 위주의 커리큘럼을 제공합니다.
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <ListIcon /> 커리큘럼 목차
            </h2>
            <div className="card divide-y divide-slate-100">
              {course.curriculum.map((section, idx) => (
                <div key={section.id} className="overflow-hidden">
                  <button 
                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-semibold text-lg text-slate-800">{section.title}</span>
                    <div className="text-slate-400">
                      {expandedSection === section.id ? <ChevronUp size={20} /> : <ChevronDown size={20}/>}
                    </div>
                  </button>
                  {expandedSection === section.id && (
                    <div className="px-6 pb-5 pt-2 bg-slate-50/50">
                      <div className="space-y-3">
                        {section.lectures.map((lec, lidx) => (
                          <div key={lec.id} className="flex gap-4 items-center p-3 rounded-lg bg-white border border-slate-100 shadow-sm hover:border-primary-200 transition-colors">
                            <div className="bg-primary-50 text-primary-600 rounded-full p-2 flex-shrink-0">
                              <PlayCircle size={18} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-800">{lec.title}</h4>
                            </div>
                            <div className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              {lec.duration}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="hidden md:block">
          <div className="sticky top-24 card p-6">
             <h3 className="font-bold text-lg mb-4">학습 요약</h3>
             <ul className="space-y-4 mb-8">
               <li className="flex items-center gap-3 text-slate-600">
                  <CheckCircle size={20} className="text-green-500" />
                  <span>실습 위주의 프로젝트 진행</span>
               </li>
               <li className="flex items-center gap-3 text-slate-600">
                  <CheckCircle size={20} className="text-green-500" />
                  <span>무제한 상시 수강 가능</span>
               </li>
               <li className="flex items-center gap-3 text-slate-600">
                  <CheckCircle size={20} className="text-green-500" />
                  <span>수료증 발급 지원</span>
               </li>
             </ul>
             <button onClick={handleEnroll} className="w-full btn-primary py-3">
               수강 신청
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const BookOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
)

const ListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
)
