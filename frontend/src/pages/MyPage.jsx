import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Bell, Lock, BookOpen, Clock, Award, Zap, Edit2, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import useAuthStore from '../store/useAuthStore';
import api from '../api/axios';
import { toast } from 'react-toastify';

export default function MyPage() {
  const { user, updateUser } = useAuthStore();
  const [gamification, setGamification] = useState(null);
  const [userStats, setUserStats] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || `${(user?.name || 'user').toLowerCase().replace(/\s/g, '')}@example.com`);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [isPwLoading, setIsPwLoading] = useState(false);

  useEffect(() => {
    api.get('/gamification')
      .then(res => { if (res.data.success) setGamification(res.data.myStats); })
      .catch(err => console.error(err));

    api.get('/user/stats')
      .then(res => { if (res.data.success) setUserStats(res.data.stats); })
      .catch(err => console.error(err));
  }, []);

  const handlePasswordChange = async () => {
    if (pwForm.next !== pwForm.confirm) { toast.error('새 비밀번호가 일치하지 않습니다.'); return; }
    if (pwForm.next.length < 6) { toast.error('비밀번호는 6자 이상이어야 합니다.'); return; }
    setIsPwLoading(true);
    try {
      const res = await api.put('/user/password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      if (res.data.success) {
        toast.success('비밀번호가 변경되었습니다.');
        setPwForm({ current: '', next: '', confirm: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsPwLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const res = await api.put('/user/profile', { name: editName, email: editEmail });
      if (res.data.success) {
        updateUser(res.data.user); // Zustand 스토어 업데이트
        setIsEditing(false);
        toast.success("프로필 정보가 수정되었습니다.");
      }
    } catch(err) {
      toast.error("프로필 수정에 실패했습니다.");
      console.error(err);
    }
  };

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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col relative overflow-hidden">
            {gamification && (
              <motion.div 
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className="absolute top-4 right-4 bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 font-extrabold px-3 py-1 rounded-full text-xs flex items-center gap-1 shadow-sm border border-yellow-200"
              >
                <Zap size={14} className="fill-yellow-600/50" />
                Lv.{gamification.level}
              </motion.div>
            )}
            
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-4 text-primary-600 relative group cursor-pointer">
                <User size={48} />
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <Edit2 size={24} className="text-white" />
                </div>
              </div>
              
              {!isEditing ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-slate-800">{userName}</h2>
                    <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-primary-500 transition-colors">
                      <Edit2 size={14} />
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 capitalize mb-4">
                    {userRole === 'admin' ? '운영자' : userRole === 'instructor' ? '강사' : '학생'}
                  </p>
                </>
              ) : (
                <div className="w-full mb-4 space-y-2">
                  <input 
                    type="text" 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full text-center font-bold px-3 py-1.5 border border-primary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  />
                  <div className="flex gap-2 justify-center mt-2">
                    <button onClick={handleProfileUpdate} className="flex items-center gap-1 bg-primary-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-primary-700">
                      <Check size={14}/> 저장
                    </button>
                    <button onClick={() => { setIsEditing(false); setEditName(userName); }} className="flex items-center gap-1 bg-slate-200 text-slate-600 px-3 py-1 rounded text-xs font-semibold hover:bg-slate-300">
                      <X size={14}/> 취소
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {gamification && !isEditing && (
              <div className="w-full mb-6">
                <div className="flex justify-between text-xs text-slate-500 font-semibold mb-1.5">
                  <span>경험치 (XP)</span>
                  <span className="text-primary-600">{gamification.xp} <span className="text-slate-400 font-normal">/ {gamification.level * 100}</span></span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(gamification.xp % 100)}%` }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                  />
                </div>
                
                {gamification.badges && gamification.badges.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">획득한 배지</h4>
                    <div className="flex flex-wrap gap-2">
                      {gamification.badges.map((badge, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + (idx * 0.1) }}
                          className="bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm"
                        >
                          🏅 {badge.replace(/_/g, ' ')}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="w-full pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail size={16} className="text-slate-400" />
                {isEditing ? (
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-400" />
                ) : (
                  <span>{user?.email || `${userName.toLowerCase().replace(/\s/g, '')}@example.com`}</span>
                )}
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
              <div className="text-3xl font-bold text-slate-800 group-hover:text-white transition-colors">{userStats ? userStats.studyingCount : '—'}<span className="text-sm font-normal ml-1 text-slate-500 group-hover:text-primary-100 transition-colors">개</span></div>
            </Link>
            
            <Link to="/dashboard" state={{ tab: 'completed' }} className="group bg-white border border-slate-100 p-5 rounded-2xl shadow-sm transform hover:scale-[1.02] hover:bg-gradient-to-br hover:from-primary-500 hover:to-primary-600 hover:border-transparent hover:shadow-md transition-all duration-300 block">
              <div className="flex items-center gap-3 mb-2">
                <Award size={20} className="text-amber-500 group-hover:text-primary-100 transition-colors" />
                <span className="font-medium text-sm text-slate-600 group-hover:text-primary-50 transition-colors">수료한 강의</span>
              </div>
              <div className="text-3xl font-bold text-slate-800 group-hover:text-white transition-colors">{userStats ? userStats.completedCount : '—'}<span className="text-sm font-normal ml-1 text-slate-500 group-hover:text-primary-100 transition-colors">개</span></div>
            </Link>

            <div className="group bg-white border border-slate-100 p-5 rounded-2xl shadow-sm transform hover:scale-[1.02] hover:bg-gradient-to-br hover:from-primary-500 hover:to-primary-600 hover:border-transparent hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <Clock size={20} className="text-emerald-500 group-hover:text-primary-100 transition-colors" />
                <span className="font-medium text-sm text-slate-600 group-hover:text-primary-50 transition-colors">총 학습 시간</span>
              </div>
              <div className="text-3xl font-bold text-slate-800 group-hover:text-white transition-colors">{userStats ? userStats.totalLearningHours : '—'}<span className="text-sm font-normal ml-1 text-slate-500 group-hover:text-primary-100 transition-colors">시간</span></div>
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
                  <input type="password" placeholder="현재 비밀번호" value={pwForm.current} onChange={e => setPwForm(p => ({...p, current: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                  <input type="password" placeholder="새 비밀번호 (6자 이상)" value={pwForm.next} onChange={e => setPwForm(p => ({...p, next: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                  <input type="password" placeholder="새 비밀번호 확인" value={pwForm.confirm} onChange={e => setPwForm(p => ({...p, confirm: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                  <button onClick={handlePasswordChange} disabled={isPwLoading} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-60 flex items-center gap-2">
                    {isPwLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
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
