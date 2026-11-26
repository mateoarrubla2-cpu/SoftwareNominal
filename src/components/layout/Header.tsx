import * as React from 'react';
import { Bell, Calendar, Search, User, HelpCircle } from 'lucide-react';
import { ROLE_LABELS } from '@/types/auth';

interface HeaderProps {
  userName: string;
  userRole: string;
  onNotificationClick: () => void;
  onProfileClick: () => void;
}

export function Header({ userName, userRole, onNotificationClick, onProfileClick }: HeaderProps) {
  return (
    <header className="h-16 bg-[#fbfdfc]/92 backdrop-blur-xl border-b border-[#dfe9e2] px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-[0_4px_18px_rgba(48,91,67,.05)]">
      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-1">
          <div className="w-2 h-6 bg-emerald-600 rounded-full" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Panel de Control
          </span>
        </div>
        <h1 className="text-sm font-semibold text-slate-900 hidden sm:block">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-200">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-32 text-xs bg-transparent border-none outline-none focus:ring-0 text-slate-700 placeholder-slate-400"
          />
        </div>

        <button
          onClick={onNotificationClick}
          className="relative p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
          aria-label="Notificaciones"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <button
          onClick={onProfileClick}
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors group"
          aria-label="Perfil de usuario"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-semibold group-hover:scale-105 transition-transform">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="hidden sm:block text-xs font-medium text-slate-700">{userName}</span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold {getRoleBadgeClass(userRole)}">
            {ROLE_LABELS[userRole as keyof typeof ROLE_LABELS]}
          </span>
        </button>
      </div>
    </header>
  );
}

function getRoleBadgeClass(role: string): string {
  switch (role) {
    case 'ADMINISTRADOR': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'INSTRUCTOR': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'ESTUDIANTE': return 'bg-amber-100 text-amber-700 border-amber-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getPageTitle(): string {
  // This could be dynamic based on route
  return 'Dashboard';
}
