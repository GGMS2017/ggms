import { Link } from 'react-router-dom';
import { User, Mail, Bell, Lock, BookOpen, Clock, Award } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

export default function MyPage() {
  const { user } = useAuthStore();
  const userName = user?.name || '사용자';
  const userRole = user?.role || 'student';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">마이페이지</h1>
        <p className="text-sm text-slate-500 mt-1">프로필 정보와 학습 통계를 한눈에 확인하세요.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-4 text-primary-600">
              <User size={48} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">{userName}</h2>
            <p className="text-sm text-slate-500 capitalize mb-4">
              {userRole === 'admin' ? '운영자' : userRole === 'instructor' ? '강사' : '학생'}
            </p>
            
            <div className="w-full pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail size={16} className="text-slate-400" />
                <span>{userName.toLowerCase().replace(/\s/g, '')}@example.com</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <User size={16} className="text-slate-400" />
                <span>기본 로그인 방식</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Settings */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Stats Glassmorphism Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link to="/dashboard" state={{ tab: 'studying' }} className="group bg-white border border-slate-100 p-5 rounded-2xl shadow-sm transform hover:scale-[1.02] hover:bg-gradient-to-br hover:from-primary-500 hover:to-primary-600 hover:border-transparent hover:shadow-md transition-all duration-300 block">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen size={20} className="text-primary-500 group-hover:text-primary-100 transition-colors" />
                <span className="font-medium text-sm text-slate-600 group-hover:text-primary-50 transition-colors">수강 중인 강의</span>
              </div>
              <div className="text-3xl font-bold text-slate-800 group-hover:text-white transition-colors">3<span className="text-sm font-normal ml-1 text-slate-500 group-hover:text-primary-100 transition-colors">개</span></div>
            </Link>
            
            <Link to="/dashboard" state={{ tab: 'completed' }} className="group bg-white border border-slate-100 p-5 rounded-2xl shadow-sm transform hover:scale-[1.02] hover:bg-gradient-to-br hover:from-primary-500 hover:to-primary-600 hover:border-transparent hover:shadow-md transition-all duration-300 block">
              <div className="flex items-center gap-3 mb-2">
                <Award size={20} className="text-amber-500 group-hover:text-primary-100 transition-colors" />
                <span className="font-medium text-sm text-slate-600 group-hover:text-primary-50 transition-colors">수료한 강의</span>
              </div>
              <div className="text-3xl font-bold text-slate-800 group-hover:text-white transition-colors">1<span className="text-sm font-normal ml-1 text-slate-500 group-hover:text-primary-100 transition-colors">개</span></div>
            </Link>

            <div className="group bg-white border border-slate-100 p-5 rounded-2xl shadow-sm transform hover:scale-[1.02] hover:bg-gradient-to-br hover:from-primary-500 hover:to-primary-600 hover:border-transparent hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <Clock size={20} className="text-emerald-500 group-hover:text-primary-100 transition-colors" />
                <span className="font-medium text-sm text-slate-600 group-hover:text-primary-50 transition-colors">총 학습 시간</span>
              </div>
              <div className="text-3xl font-bold text-slate-800 group-hover:text-white transition-colors">24<span className="text-sm font-normal ml-1 text-slate-500 group-hover:text-primary-100 transition-colors">시간</span></div>
            </div>
          </div>

          {/* Settings Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="border-b border-slate-100 p-6">
              <h3 className="text-lg font-bold text-slate-800">계정 설정</h3>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Bell size={16} className="text-slate-400" /> 알림 설정
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">새로운 강의가 등록되거나 과제 기한이 다가올 때 알림을 받습니다.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <Lock size={16} className="text-slate-400" /> 비밀번호 변경
                </h4>
                <div className="space-y-3 max-w-sm">
                  <input type="password" placeholder="현재 비밀번호" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                  <input type="password" placeholder="새 비밀번호" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                  <button className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                    비밀번호 업데이트
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
