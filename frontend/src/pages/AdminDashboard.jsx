import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, Presentation, Activity } from 'lucide-react';
import api from '../api/axios';
import useAuthStore from '../store/useAuthStore';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'instructor') {
      navigate('/');
      return;
    }

    api.get('/admin/stats')
      .then(res => {
        const data = res.data;
        if (data.success) {
          setStats(data.stats);
          setUsers(data.users);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [navigate, user]);

  if (loading) return <div className="p-10 text-center text-slate-500">통계 데이터를 불러오는 중...</div>;
  if (!stats) return <div className="p-10 text-center text-red-500">데이터를 불러오지 못했습니다.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 border-l-4 border-primary-500 pl-4">
            관리자 대시보드
          </h1>
          <p className="text-slate-500 mt-2 pl-4">전체 수강생 통계 및 현황을 모니터링합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          title="전체 가입자" 
          value={stats.totalStudents} 
          icon={<Users size={24} className="text-blue-500" />} 
          bg="bg-blue-50"
        />
        <StatCard 
          title="현재 개설 강의" 
          value={stats.totalCourses} 
          icon={<Presentation size={24} className="text-emerald-500" />} 
          bg="bg-emerald-50"
        />
        <StatCard 
          title="총 누적 수강등록" 
          value={stats.totalEnrollments} 
          icon={<BookOpen size={24} className="text-purple-500" />} 
          bg="bg-purple-50"
        />
        <StatCard 
          title="활성도 (최근)" 
          value="High" 
          icon={<Activity size={24} className="text-orange-500" />} 
          bg="bg-orange-50"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card p-6 border-t-4 border-t-primary-500">
          <h2 className="text-xl font-bold mb-6 text-slate-800">사용자 권한 관리 리스트</h2>
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm text-slate-600">
               <thead className="bg-slate-50 text-slate-500 font-medium">
                 <tr>
                   <th className="py-3 px-4 rounded-tl-lg">사용자명</th>
                   <th className="py-3 px-4">이메일</th>
                   <th className="py-3 px-4">권한</th>
                   <th className="py-3 px-4 rounded-tr-lg">상태</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {users.map(u => (
                   <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                     <td className="py-3 px-4 font-medium text-slate-800">{u.name}</td>
                     <td className="py-3 px-4">{u.email}</td>
                     <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                          u.role === 'admin' ? 'bg-red-100 text-red-600' : 
                          u.role === 'instructor' ? 'bg-amber-100 text-amber-600' : 'bg-primary-50 text-primary-600'
                        }`}>
                          {u.role.toUpperCase()}
                        </span>
                     </td>
                     <td className="py-3 px-4"><span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2"></span>정상</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>

        <div className="card p-6 border-t-4 border-t-emerald-500">
          <h2 className="text-xl font-bold mb-6 text-slate-800">코스별 인기 통계 (Top 5)</h2>
          <div className="space-y-6">
             {stats.enrollmentsByCourse.map((course, idx) => (
                <div key={idx}>
                   <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-700 font-medium line-clamp-1 pr-4">{course.courseTitle}</span>
                      <span className="text-primary-600 font-bold shrink-0">{course.count} 명</span>
                   </div>
                   <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min((course.count / Math.max(stats.totalStudents, 1)) * 100, 100)}%`}}></div>
                   </div>
                </div>
             ))}
             {stats.enrollmentsByCourse.length === 0 && <p className="text-sm text-slate-500">아직 수강생이 없습니다.</p>}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <RiskStudentsTable />
      </div>
    </div>
  );
}

function RiskStudentsTable() {
  const [riskStudents, setRiskStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/risk-students')
      .then(res => {
        if(res.data.success) {
          setRiskStudents(res.data.riskStudents);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleAction = async (targetId, actionType) => {
    try {
      const message = actionType === 'message' ? '격려 메시지' : '1:1 멘토링 매칭';
      const res = await api.post('/admin/interventions', {
        targetId,
        actionType,
        message
      });
      if(res.data.success) {
        import('react-toastify').then(({toast}) => toast.success(`${message} 작수 성공! 대상 학생에게 전송됩니다.`));
      }
    } catch(err) {
      console.error(err);
      import('react-toastify').then(({toast}) => toast.error('작업에 실패했습니다.'));
    }
  };

  if(loading) return <div className="card p-6 border-t-4 border-t-red-500 text-center text-slate-500">위험군 데이터를 분석 중입니다...</div>;

  return (
    <div className="card p-6 border-t-4 border-t-red-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-500">
          <Activity size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">AI 기반 집중 관리 대상자 리포트</h2>
          <p className="text-sm text-slate-500">반복 되감기, 정지 등 학습 이탈 징후가 보이는 수강생을 AI가 실시간으로 분석합니다.</p>
        </div>
      </div>

      {riskStudents.length === 0 ? (
        <div className="bg-slate-50 p-6 rounded-xl text-center text-slate-500">
          현재 집중 리스크가 감지된 수강생이 없습니다. 모두 집중해서 잘 듣고 있어요! 🎉
        </div>
      ) : (
        <div className="space-y-4">
          {riskStudents.map(student => (
            <div key={student.id} className="bg-white border text-sm border-slate-200 rounded-xl p-5 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
               <div className="flex-1">
                 <div className="flex items-center gap-3 mb-2">
                   <h3 className="font-bold text-slate-800 text-base">{student.userName} <span className="text-slate-400 font-normal text-sm">({student.userEmail})</span></h3>
                   <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${student.riskLevel === 'High' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                     {student.riskLevel} RISK
                   </span>
                 </div>
                 <p className="text-primary-700 font-medium mb-2">{student.courseName}</p>
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex gap-2">
                    <span className="shrink-0 text-xl mt-0.5">🤖</span>
                    <p className="text-slate-600 text-[13px] leading-relaxed">{student.aiSummary}</p>
                 </div>
               </div>

               <div className="shrink-0 flex flex-col gap-2 justify-center md:border-l md:border-slate-100 md:pl-6">
                 <button onClick={() => handleAction(student.id, 'message')} className="btn-outline border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-200 py-2 px-4 shadow-sm text-xs">
                   ✉️ 자동 격려 메시지
                 </button>
                 <button onClick={() => handleAction(student.id, 'mentor')} className="btn-primary py-2 px-4 shadow-sm text-xs shadow-primary-500/20">
                   👨‍🏫 1:1 멘토 배정
                 </button>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, bg }) {
  return (
    <div className="card p-6 flex items-center justify-between">
      <div>
        <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
        {icon}
      </div>
    </div>
  );
}
