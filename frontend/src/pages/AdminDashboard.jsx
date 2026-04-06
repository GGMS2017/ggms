import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, Presentation, Activity } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('userRole');
    
    if (role !== 'admin' && role !== 'instructor') {
      navigate('/');
      return;
    }

    fetch('http://localhost:3000/api/admin/stats', {
      headers: { 'Authorization': userId }
    })
      .then(res => res.json())
      .then(data => {
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
  }, [navigate]);

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
