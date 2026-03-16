import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from './App';
import { useAuthStore } from '@/stores/authStore';

describe('ProtectedRoute 行为', () => {
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
  });

  it('未登录访问受保护路由时会重定向到登录页', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Login Page/i)).toBeInTheDocument();
  });

  it('已登录时可以访问受保护路由内容', () => {
    const { setState, getState } = useAuthStore;
    const initial = getState();
    setState({
      ...initial,
      isAuthenticated: true,
      user: {
        id: '1',
        username: 'test-user',
        email: 'test@example.com',
        role: 'STAFF',
        department: 'IT',
        phone: '',
      },
      token: 'mock-token',
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Protected Content/i)).toBeInTheDocument();
  });
});

