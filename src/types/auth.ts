export type UserRole = 'ADMINISTRADOR' | 'INSTRUCTOR' | 'ESTUDIANTE';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMINISTRADOR: 'Administrador',
  INSTRUCTOR: 'Instructor',
  ESTUDIANTE: 'Estudiante',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  ADMINISTRADOR: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  INSTRUCTOR: 'bg-blue-500/10 text-blue-700 border-blue-200',
  ESTUDIANTE: 'bg-amber-500/10 text-amber-700 border-amber-200',
};

export const DEFAULT_USER: User = {
  id: '1',
  email: 'admin@inamoc.edu.co',
  full_name: 'Administrador del Sistema',
  role: 'ADMINISTRADOR',
  avatar: undefined,
};
