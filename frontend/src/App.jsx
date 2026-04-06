import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import CourseDetail from './pages/CourseDetail';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Player from './pages/Player';
import AdminDashboard from './pages/AdminDashboard'; // 새로 추가된 컴포넌트

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/course/:id" element={<CourseDetail />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<AdminDashboard />} /> 
            <Route path="/player/:courseId" element={<Player />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
