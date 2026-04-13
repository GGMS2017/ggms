import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      // 로그인 성공 시 스토어 업데이트
      login: (userData, authToken) => set({
        user: userData,
        token: authToken,
        isAuthenticated: true,
      }),

      // 프로필 수정 등 사용자 정보 갱신 처리
      updateUser: (newUserData) => set((state) => ({
        user: { ...state.user, ...newUserData }
      })),

      // 로그아웃 처리
      logout: () => set({
        user: null,
        token: null,
        isAuthenticated: false,
      })
    }),
    {
      name: 'auth-storage', // localStorage key name
    }
  )
);

export default useAuthStore;
