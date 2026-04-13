import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

// Axios 기본 인스턴스 설정
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청(Request) 인터셉터 추가
api.interceptors.request.use(
  (config) => {
    // Zustand 스토어에서 토큰 가져오기 (비동기가 아니라 동기적으로 꺼냄)
    const token = useAuthStore.getState().token;
    
    // 토큰이 존재하면 Authorization 헤더에 삽입
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답(Response) 인터셉터 추가 (선택적인 401 처리 등)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // 401 Unauthorized 발생 시 강제 로그아웃 처리
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
