import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';

export default function Dashboard() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-slate-900">내 강의실</h1>
      
      {enrollments.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center border-dashed border-2">
          <p className="text-slate-500 mb-6 text-lg">아직 신청한 수강 내역이 없습니다.</p>
          <Link to="/" className="btn-primary">강의 찾아보기</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map(enroll => {
            const course = enroll.course;
            const completed = enroll.progress.completedLectures || [];
            
            // 전체 강의 수 계산
            const totalLecturesCount = course.curriculum.reduce(
              (acc, sec) => acc + sec.lectures.length, 0
            );
            
            const progressPercent = totalLecturesCount === 0 
              ? 0 
              : Math.round((completed.length / totalLecturesCount) * 100);

            return (
              <div key={course.id} className="card p-6 flex flex-col group hover:-translate-y-1 transition-transform">
                <div className="flex gap-4 mb-4">
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
                    <span>이어보기</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
