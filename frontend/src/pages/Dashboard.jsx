import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Star, Search } from 'lucide-react';

export default function Dashboard() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('studying');
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('courseFavorites');
    return saved ? JSON.parse(saved) : [];
  });

  const toggleFavorite = (courseId) => {
    setFavorites(prev => {
      const newFavs = prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId];
      localStorage.setItem('courseFavorites', JSON.stringify(newFavs));
      return newFavs;
    });
  };

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    fetch('http://localhost:3000/api/enrollments', {
      headers: { 'Authorization': userId || '' }
    })
      .then(res => res.json())
      .then(data => {
        setEnrollments(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-10 text-center text-slate-500">불러오는 중...</div>;

  const enrichedEnrollments = enrollments.map(enroll => {
    const course = enroll.course;
    const completed = enroll.progress.completedLectures || [];
    const totalLecturesCount = course.curriculum.reduce(
      (acc, sec) => acc + sec.lectures.length, 0
    );
    const progressPercent = totalLecturesCount === 0 
      ? 0 
      : Math.round((completed.length / totalLecturesCount) * 100);
    return { ...enroll, progressPercent };
  });

  const filteredEnrollments = enrichedEnrollments.filter(enroll => 
    activeTab === 'completed' ? enroll.progressPercent === 100 : enroll.progressPercent < 100
  ).filter(enroll => 
    dashboardSearchQuery === '' ? true : enroll.course.title.toLowerCase().includes(dashboardSearchQuery.toLowerCase())
  ).sort((a, b) => {
    const aFav = favorites.includes(a.course.id) ? 1 : 0;
    const bFav = favorites.includes(b.course.id) ? 1 : 0;
    return bFav - aFav;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-slate-900">내 강의실</h1>
      
      {enrollments.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center border-dashed border-2">
          <p className="text-slate-500 mb-6 text-lg">아직 신청한 수강 내역이 없습니다.</p>
          <Link to="/" className="btn-primary">강의 찾아보기</Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-8 border-b border-slate-200">
            <div className="flex gap-6">
              <button
                className={`pb-3 font-medium transition-colors relative ${activeTab === 'studying' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setActiveTab('studying')}
              >
                수강중인 강의
                {activeTab === 'studying' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                )}
              </button>
              <button
                className={`pb-3 font-medium transition-colors relative ${activeTab === 'completed' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setActiveTab('completed')}
              >
                수강 완료한 강의
                {activeTab === 'completed' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                )}
              </button>
            </div>
            
            <div className="relative pb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 -mt-1 text-slate-400" size={14} />
              <input 
                type="text" 
                value={dashboardSearchQuery}
                onChange={(e) => setDashboardSearchQuery(e.target.value)}
                placeholder="내 강의 검색..." 
                className="pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-shadow w-48 focus:w-64"
              />
            </div>
          </div>

          {filteredEnrollments.length === 0 ? (
            <div className="card p-12 text-center flex flex-col items-center justify-center border-dashed border-2">
              <p className="text-slate-500 text-lg">
                {activeTab === 'studying' ? '현재 수강중인 강의가 없습니다.' : '수강 완료한 강의가 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEnrollments.map(enroll => {
                const { course, progressPercent } = enroll;
                const isFavorite = favorites.includes(course.id);

                return (
                  <div key={course.id} className="card p-6 flex flex-col group hover:-translate-y-1 transition-transform relative">
                <button 
                  onClick={(e) => { e.preventDefault(); toggleFavorite(course.id); }}
                  className="absolute right-6 top-6 z-10 transition-transform active:scale-90"
                  aria-label="즐겨찾기 토글"
                >
                  <Star 
                    size={22} 
                    className={`transition-colors ${isFavorite ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm' : 'text-slate-300 hover:text-slate-400'}`} 
                  />
                </button>
                <div className="flex gap-4 mb-4 pr-8">
                  <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-primary-600 transition-colors">
                      {course.title}
                    </h3>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100">
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span className="text-slate-500">진도율</span>
                    <span className="text-primary-600">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 mb-6 overflow-hidden">
                    <div 
                      className="bg-primary-500 h-2.5 rounded-full transition-all duration-1000 ease-out relative" 
                      style={{ width: `${progressPercent}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 w-full h-full skeleton-shine"></div>
                    </div>
                  </div>
                  
                  <Link 
                    to={`/player/${course.id}`} 
                    className="w-full btn-outline flex items-center justify-center gap-2 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200"
                  >
                    <Play size={16} />
                    <span>{progressPercent === 100 ? '복습하기' : '이어보기'}</span>
                  </Link>
                </div>
              </div>
            );
          })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
