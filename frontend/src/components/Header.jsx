import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, User, LogOut } from 'lucide-react';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // URL의 q 파라미터로 초기화하되, 입력은 로컬 state로 즉각 관리해 한글 겹침 방지
  const [localQuery, setLocalQuery] = useState(searchParams.get('q') || '');
  const isPlayer = location.pathname.startsWith('/player');

  useEffect(() => {
    // 외부 요소(뒤로가기 등)로 URL이 바뀔 때만 로컬 state 동기화
    setLocalQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const handleGlobalSearch = (e) => {
    const val = e.target.value;
    setLocalQuery(val);
    
    if (val) {
      navigate(`/?q=${encodeURIComponent(val)}`, { replace: true });
    } else {
      navigate(`/`, { replace: true });
    }
  };

  const userId = localStorage.getItem('userId');
  const userRole = localStorage.getItem('userRole');
  const userName = localStorage.getItem('userName');

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    window.location.href = '/';
  };

  if (isPlayer) return null;

  const isAdminOrInstructor = userRole === 'admin' || userRole === 'instructor';

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center text-white transform group-hover:rotate-12 transition-transform">
            <BookOpen size={18} />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent">
            Starfish Run
          </span>
        </Link>
        
        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <div className="relative">
            <input 
              type="text" 
              value={localQuery}
              onChange={handleGlobalSearch}
              placeholder="배우고 싶은 지식을 검색해보세요" 
              className="w-full bg-slate-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-shadow"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {userId ? (
            <>
              {isAdminOrInstructor ? (
                <Link to="/admin" className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors hidden sm:block">
                  관리자 대시보드
                </Link>
              ) : (
                <Link to="/dashboard" className="text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors hidden sm:block">
                  내 강의실
                </Link>
              )}
              
              <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-800">{userName}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{userRole}</p>
                </div>
                <button onClick={handleLogout} className="btn-outline flex items-center gap-2 text-sm px-3 py-1.5 ml-2 border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50">
                  <LogOut size={14} />
                  <span className="hidden sm:inline">로그아웃</span>
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className="btn-primary flex items-center gap-2 text-sm">
              <User size={16} />
              <span>로그인 / 가입</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
