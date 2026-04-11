import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const ProtectedRoute = ({ children, requireRole }) => {
  const { isAuthenticated, user } = useAuthStore();

  // 로그인하지 않은 경우 로그인 페이지로 이동
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 특정 역할(role)이 필수이고, 사용자의 역할이 그에 맞지 않는 경우 대시보드로 이동
  if (requireRole && user?.role !== requireRole) {
    return <Navigate to="/dashboard" replace />;
  }

  // 통과 시 자식 컴포넌트 렌더링
  return children;
};

export default ProtectedRoute;
