import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Play, Star, Search, Bell } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-toastify';

export default function Dashboard() {
  const location = useLocation();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'studying');
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [messages, setMessages] = useState([]);
  const [showMessages, setShowMessages] = useState(false);
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
    api.get('/enrollments')
      .then(res => {
        setEnrollments(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    api.get('/recommendations')
      .then(res => setRecommendations(res.data.recommendations || []))
      .catch(console.error);

    api.get('/gamification')
      .then(res => setLeaderboard(res.data.leaderboard || []))
      .catch(console.error);

    api.get('/messages')
      .then(res => {
        if (res.data.success) {
          setMessages(res.data.messages || []);
          if (res.data.unreadCount > 0) {
            toast(`📬 강사로부터 새 메시지 ${res.data.unreadCount}개가 도착했어요!`, { autoClose: 6000, icon: '💌' });
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state?.tab]);

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">내 강의실</h1>
        <div className="relative">
          <button
            onClick={() => setShowMessages(!showMessages)}
            className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
            title="받은 메시지"
          >
            <Bell size={22} className="text-slate-500" />
            {messages.some(m => !m.isRead) && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
          {showMessages && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">강사 메시지</h3>
                <span className="text-xs text-slate-400">{messages.length}개</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="p-4 text-sm text-slate-400 text-center">받은 메시지가 없습니다.</p>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className="p-4 border-b border-slate-50 hover:bg-slate-50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{msg.actionType === 'mentor' ? '👨‍🏫' : '💌'}</span>
                        <span className="text-xs font-semibold text-slate-600">{msg.actionType === 'mentor' ? '1:1 멘토링 안내' : '강사 격려 메시지'}</span>
                        <span className="text-xs text-slate-300 ml-auto">{new Date(msg.createdAt).toLocaleDateString('ko-KR')}</span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{msg.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
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

      {/* 페이스메이커 랭킹 & 추천 커리큘럼 영역 */}
      <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 페이스메이커 리더보드 */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            🏆 페이스메이커 랭킹
          </h2>
          <p className="text-xs text-slate-500 mb-6">같이 성장하는 우수 수강생 리더보드</p>
          
          <div className="space-y-4">
            {leaderboard.length > 0 ? leaderboard.map((user, idx) => (
              <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-600' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800 text-sm">{user.name} <span className="text-xs text-slate-500 font-normal">Lv.{user.level}</span></div>
                  <div className="text-xs text-primary-600 font-bold">{user.xp} XP</div>
                </div>
              </div>
            )) : <p className="text-sm text-slate-500 text-center py-4">랭킹 데이터가 없습니다.</p>}
          </div>
        </div>

        {/* AI 추천 커리큘럼 */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            ✨ AI 맞춤형 커리큘럼 추천
          </h2>
          <p className="text-xs text-slate-500 mb-6">회원님의 학습 패턴과 목표에 맞춰 선별된 강의입니다.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.length > 0 ? recommendations.map(course => (
              <Link to={`/course/${course.id}`} key={course.id} className="group flex gap-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition-shadow">
                <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0">
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight mb-2 group-hover:text-primary-600 transition-colors">{course.title}</h3>
                  <div className="bg-primary-50 rounded-lg p-2 mt-auto">
                    <p className="text-[10px] text-primary-700 leading-snug break-keep">
                      "{course.aiReason}"
                    </p>
                  </div>
                </div>
              </Link>
            )) : (
              <div className="col-span-full border-dashed border-2 border-slate-200 rounded-2xl p-8 text-center text-slate-500">
                추천할 강의가 더 이상 없습니다. 모든 강의를 마스터하셨네요!
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
