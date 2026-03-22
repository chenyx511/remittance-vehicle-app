import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginCredentials } from '@/types';
import { authApi, setMockCurrentUser } from '@/services/api';
import { getErrorMessage } from '@/lib/error';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(credentials);
          const user = response.data.user;
          set({
            user,
            token: response.data.token,
            isAuthenticated: true,
            isLoading: false,
          });
          // 同步到 mock API 的 currentUser，避免刷新后状态不一致
          setMockCurrentUser(user);
        } catch (error: unknown) {
          set({
            error: getErrorMessage(error) || '登录失败',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.logout();
        } finally {
          setMockCurrentUser(null);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      checkAuth: async () => {
        const { token, user } = get();
        if (!token) {
          set({
            user: null,
            isAuthenticated: false,
          });
          return;
        }

        // 在 mock 环境中，持久化的是完整 user 信息，这里只需要根据本地状态恢复鉴权标记
        if (user) {
          set({
            isAuthenticated: true,
          });
        }
      },

      clearError: () => set({ error: null }),

      setUser: (user) => {
        set({ user });
        setMockCurrentUser(user);
      },
    }),
    {
      name: 'auth-storage',
      // 持久化 token、user、isAuthenticated，刷新后恢复登录态，避免任意页刷新都回到登录页
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // 从本地存储恢复时，同步到 mock API 的 currentUser
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          setMockCurrentUser(state.user);
        } else {
          setMockCurrentUser(null);
        }
      },
    },
  ),
);
