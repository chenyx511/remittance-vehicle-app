import { act } from 'react-dom/test-utils';
import { useAuthStore } from './authStore';

vi.mock('@/services/api', () => ({
  authApi: {
    login: vi.fn(async () => ({
      code: 200,
      message: '登录成功',
      data: {
        user: {
          id: '1',
          username: 'test-user',
          email: 'test@example.com',
          role: 'STAFF',
          department: 'IT',
          phone: '',
        },
        token: 'mock-token',
      },
    })),
    logout: vi.fn(async () => ({
      code: 200,
      message: '登出成功',
      data: null,
    })),
  },
  setMockCurrentUser: vi.fn(),
}));

describe('authStore', () => {
  beforeEach(() => {
    const { getState, setState } = useAuthStore;
    const initial = getState();
    setState({
      ...initial,
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('登录成功后应设置 user、token 和 isAuthenticated', async () => {
    const { login } = useAuthStore.getState();

    await act(async () => {
      await login({ username: 'any', password: 'any' });
    });

    const state = useAuthStore.getState();
    expect(state.user).not.toBeNull();
    expect(state.token).not.toBeNull();
    expect(state.isAuthenticated).toBe(true);
  });

  it('logout 后应清空 user、token 和 isAuthenticated', async () => {
    const store = useAuthStore.getState();
    await act(async () => {
      await store.logout();
    });

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
