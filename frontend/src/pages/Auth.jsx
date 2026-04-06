import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userName', data.user.name);
        
        // 권한 분기
        if (data.user.role === 'admin' || data.user.role === 'instructor') {
          // 강사와 관리자는 바로 관리자화면으로 리다이렉트. 이후 Header 상태 업데이트를 위해 window.location.href 사용
          window.location.href = '/admin';
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setErrorMsg(data.error || '로그인에 실패했습니다.');
      }
    } catch(err) {
      console.error(err);
      setErrorMsg('서버와 통신 중 에러가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white mb-4">
            <BookOpen size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">환영합니다</h2>
          <p className="text-slate-500 mt-2">Starfish Run 학습 플랫폼</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">이메일 계정</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="예: admin@test.com / student@test.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
            <input 
              type="password" 
              placeholder="아무 텍스트나 입력하세요 (MVP)"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors"
              required 
            />
          </div>

          {errorMsg && <p className="text-red-500 text-sm font-medium pt-2">{errorMsg}</p>}
          
          <button type="submit" className="w-full btn-primary py-3 mt-4 text-lg">
            로그인
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-sm text-slate-500 text-center">
          <p className="font-semibold mb-2">MVP 테스트용 계정 안내</p>
          <ul className="text-xs space-y-1 bg-slate-50 p-3 rounded-lg text-left inline-block">
            <li>• 관리자: <b>admin@test.com</b></li>
            <li>• 강사: <b>instructor@test.com</b></li>
            <li>• 학생: <b>student@test.com</b></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
