import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmpresaPage, LegislacionPage, InstructoresPage, FichasPage, EstudiantesPage, EmpleadosPage, EspaciosTrabajoPage } from '@/pages/CatalogPages';
import {
  BeneficiosPage,
  PeriodosPage,
  RecibosPage,
  VacacionesPage,
  EventualidadesPage,
  LiquidacionesPage,
  AuditoriasPage,
} from '@/pages/PayrollPages';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-[spin_1s_linear_infinite] text-emerald-600" />
          <p className="text-sm text-slate-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-[spin_1s_linear_infinite] text-emerald-600" />
          <p className="text-sm text-slate-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (state.isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="empresa" element={<EmpresaPage />} />
            <Route path="legislacion" element={<LegislacionPage />} />
            <Route path="instructores" element={<InstructoresPage />} />
            <Route path="fichas" element={<FichasPage />} />
            <Route path="estudiantes" element={<EstudiantesPage />} />
            <Route path="empleados" element={<EmpleadosPage />} />
            <Route path="espacios" element={<EspaciosTrabajoPage />} />
            <Route path="beneficios" element={<BeneficiosPage />} />
            <Route path="periodos" element={<PeriodosPage />} />
            <Route path="recibos" element={<RecibosPage />} />
            <Route path="vacaciones" element={<VacacionesPage />} />
            <Route path="eventualidades" element={<EventualidadesPage />} />
            <Route path="liquidaciones" element={<LiquidacionesPage />} />
            <Route path="auditorias" element={<AuditoriasPage />} />
          </Route>

          {/* Redirect root */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
