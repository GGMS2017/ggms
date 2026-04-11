import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlayCircle, Clock } from 'lucide-react';
import api from '../api/axios';

export default function Home() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  useEffect(() => {
    api.get('/courses')
      .then(res => {
        setCourses(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-10 text-center text-slate-500">강의 목록을 불러오는 중...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-4 text-slate-900 tracking-tight">K-Digital Training의 핵심 과정</h1>
        <p className="text-lg text-slate-500">실무와 가장 맞닿은 IT 전문 교육을 지금 시작하세요</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.filter(c => c.title.toLowerCase().includes(query.toLowerCase()) || c.description.toLowerCase().includes(query.toLowerCase())).map(course => (
          <Link key={course.id} to={`/course/${course.id}`} className="group block">
            <div className="card overflow-hidden flex flex-col h-full hover:-translate-y-1 transition-transform duration-300">
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                <img 
                  src={course.thumbnail} 
                  alt={course.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <PlayCircle size={12} />
                  <span>{course.curriculum.reduce((acc, sec) => acc + sec.lectures.length, 0)} 강의</span>
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex gap-2 mb-3 flex-wrap">
                  {course.tags.map(tag => (
                    <span key={tag} className="bg-primary-50 text-primary-600 text-xs px-2 py-1 rounded-md font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
                <h3 className="font-bold text-lg mb-2 line-clamp-2 text-slate-800 group-hover:text-primary-600 transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">
                  {course.description}
                </p>
                <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{course.instructor}</span>
                  <div className="flex items-center text-slate-400 gap-1">
                    <Clock size={16} />
                    <span>상시수강</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
