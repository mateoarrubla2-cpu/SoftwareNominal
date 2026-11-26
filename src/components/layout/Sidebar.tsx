import * as React from 'react';
import { useState } from 'react';
import {
  Menu,
  X,
  Building2,
  GraduationCap,
  Layers,
  Users,
  HardDrive,
  Receipt,
  FileCheck2,
  CalendarDays,
  ClipboardList,
  UserMinus,
  ShieldAlert,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ROLE_LABELS } from '@/types/auth';

interface SidebarProps {
  userRole: string;
  userName: string;
  onLogout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Panel principal', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'empresa', label: 'Empresa', icon: Settings, path: '/empresa' },
  { id: 'legislacion', label: 'Legislación', icon: ClipboardList, path: '/legislacion' },
  { id: 'instructores', label: 'Instructores', icon: GraduationCap, path: '/instructores' },
  { id: 'fichas', label: 'Fichas', icon: Layers, path: '/fichas' },
  { id: 'estudiantes', label: 'Estudiantes', icon: Users, path: '/estudiantes' },
  { id: 'espacios', label: 'Espacios', icon: HardDrive, path: '/espacios' },
  { id: 'empleados', label: 'Empleados', icon: Users, path: '/empleados' },
  { id: 'beneficios', label: 'Beneficios', icon: Receipt, path: '/beneficios' },
  { id: 'periodos', label: 'Períodos', icon: CalendarDays, path: '/periodos' },
  { id: 'recibos', label: 'Recibos', icon: FileCheck2, path: '/recibos' },
  { id: 'vacaciones', label: 'Vacaciones', icon: CalendarDays, path: '/vacaciones' },
  { id: 'eventualidades', label: 'Eventualidades', icon: ClipboardList, path: '/eventualidades' },
  { id: 'liquidaciones', label: 'Liquidaciones', icon: UserMinus, path: '/liquidaciones' },
  { id: 'auditorias', label: 'Auditoría', icon: ShieldAlert, path: '/auditorias' },
];

export function Sidebar({ userRole, userName, onLogout, isCollapsed, setIsCollapsed }: SidebarProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggle = () => setIsCollapsed(!isCollapsed);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 overflow-hidden bg-[#edf7f0] text-[#274536] border-r border-[#d8e9dd] flex flex-col transition-all duration-300 shadow-[12px_0_32px_rgba(34,96,67,.10)] ${
          isCollapsed ? 'translate-x-[-100%]' : 'translate-x-0'
        } lg:static lg:translate-x-0`}
      >
        {/* Header */}
        <div className="relative h-[72px] flex items-center justify-between px-4 border-b border-[#d8e9dd] bg-[#f6fbf8]">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#9fc7ad] to-transparent" />
          <button
            onClick={handleToggle}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900"
            aria-label="Menú"
          >
            {isCollapsed ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#2f7652] shadow-[0_6px_16px_rgba(47,118,82,.22)] flex items-center justify-center text-white ring-1 ring-white/70">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-[0.08em] text-[#1f5138] block truncate">INAMOC</h1>
              <p className="text-[10px] font-medium text-[#71917d] block truncate">Nómina SENA</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="hidden lg:block p-2 text-slate-600 hover:text-slate-900"
            aria-label="Perfil"
          >
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              {userName.charAt(0).toUpperCase()}
            </div>
          </button>
        </div>

        {/* User Profile */}
        <div className="px-4 py-4 border-b border-[#d8e9dd] bg-[#e8f3ec]/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/80 border border-[#c4dbcD] shadow-sm flex items-center justify-center text-[#2f7652] font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#274536] truncate">{userName}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#63a77f] ring-2 ring-[#d7eadf]" />
                <p className="text-[11px] text-[#668573] font-medium">{ROLE_LABELS[userRole as keyof typeof ROLE_LABELS] || userRole}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`group relative flex items-center gap-3 mx-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/90 text-[#2f7652] shadow-[0_5px_18px_rgba(71,120,91,.10)] ring-1 ring-[#d1e4d7]'
                      : 'text-[#5f796b] hover:bg-white/55 hover:text-[#2d6044] hover:translate-x-0.5'
                  }`}
                >
                  {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#4e9870]" />}
                  <item.icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-[#3d8360]' : 'text-[#94aa9d]'}`} />
                  <span className={isCollapsed ? 'hidden' : 'block'}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer - Logout */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-800 transition-colors border-transparent"
          >
            <LogOut className="w-4 h-4" />
            <span className={isCollapsed ? 'hidden' : 'block'}>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-y-0 left-0 z-50 w-64 bg-[#edf7f0] border-r border-[#d8e9dd] flex flex-col transform transition-transform duration-300 translate-x-0 shadow-[12px_0_32px_rgba(34,96,67,.16)]"
        >
          <div className="h-[72px] flex items-center justify-between px-4 border-b border-[#d8e9dd] bg-[#f6fbf8]">
            <div>
              <h1 className="text-sm font-bold tracking-[0.08em] text-[#1f5138]">INAMOC</h1>
              <p className="text-[10px] font-medium text-[#71917d]">Nómina SENA</p>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 text-slate-600 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex-1 py-4 overflow-y-auto">
            <div className="px-3 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/90 text-[#2f7652] ring-1 ring-[#d1e4d7] shadow-sm'
                        : 'text-[#5f796b] hover:bg-white/55 hover:text-[#2d6044]'
                    }`}
                  >
                    {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#4e9870]" />}
                    <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#3d8360]' : 'text-[#94aa9d]'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
          <div className="p-4 border-t border-slate-100">
            <button
              onClick={() => {
                onLogout();
                setMobileOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
