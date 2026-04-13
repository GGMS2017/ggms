import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Header from './components/Header';
import Home from './pages/Home';
import CourseDetail from './pages/CourseDetail';
import Auth from './pages/Auth';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Player from './pages/Player';
import AdminDashboard from './pages/AdminDashboard';
import MyPage from './pages/MyPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <Header />
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/course/:id" element={<CourseDetail />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes (Any logged in user) */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
            <Route path="/player/:courseId" element={<ProtectedRoute><Player /></ProtectedRoute>} />

            {/* Protected Routes (Admin / Instructor only) */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} /> 
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
