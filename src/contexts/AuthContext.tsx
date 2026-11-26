import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { User, AuthState, LoginCredentials, LoginResponse } from '../types/auth';

const AuthContext = createContext<{
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    token: null,
  });

  // Check for existing token on load
  useEffect(() => {
    const token = localStorage.getItem('inamoc_token');
    const userStr = localStorage.getItem('inamoc_user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          token,
        });
      } catch {
        localStorage.removeItem('inamoc_token');
        localStorage.removeItem('inamoc_user');
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          token: null,
        });
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    // Simulate API call - in production this would call your backend
    await new Promise(resolve => setTimeout(resolve, 800));

    // Demo credentials
    if (credentials.email === 'admin@inamoc.edu.co' && credentials.password === 'admin123') {
      const user: User = {
        id: '1',
        email: credentials.email,
        full_name: 'Administrador del Sistema',
        role: 'ADMINISTRADOR',
      };
      const token = 'demo_token_admin_' + Date.now();

      localStorage.setItem('inamoc_token', token);
      localStorage.setItem('inamoc_user', JSON.stringify(user));

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        token,
      });
      return;
    }

    if (credentials.email === 'instructor@inamoc.edu.co' && credentials.password === 'inst123') {
      const user: User = {
        id: '2',
        email: credentials.email,
        full_name: 'María González',
        role: 'INSTRUCTOR',
      };
      const token = 'demo_token_instructor_' + Date.now();

      localStorage.setItem('inamoc_token', token);
      localStorage.setItem('inamoc_user', JSON.stringify(user));

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        token,
      });
      return;
    }

    if (credentials.email === 'estudiante@inamoc.edu.co' && credentials.password === 'est123') {
      const user: User = {
        id: '3',
        email: credentials.email,
        full_name: 'Carlos Rodríguez',
        role: 'ESTUDIANTE',
      };
      const token = 'demo_token_student_' + Date.now();

      localStorage.setItem('inamoc_token', token);
      localStorage.setItem('inamoc_user', JSON.stringify(user));

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        token,
      });
      return;
    }

    throw new Error('Credenciales inválidas. Intenta con admin@inamoc.edu.co / admin123');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('inamoc_token');
    localStorage.removeItem('inamoc_user');
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      token: null,
    });
  }, []);

  const setUser = useCallback((user: User | null) => {
    setState(prev => ({ ...prev, user }));
  }, []);

  const value = {
    state,
    login,
    logout,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
