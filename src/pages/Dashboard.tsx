import * as React from 'react';
import {
  Building2,
  Users,
  GraduationCap,
  Layers,
  Receipt,
  FileCheck2,
  CalendarDays,
  UserMinus,
  ShieldAlert,
  TrendingUp,
  DollarSign,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Card, StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  color: string;
  count: number;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Empresas', icon: <Building2 className="w-5 h-5" />, color: 'bg-emerald-100 text-emerald-700', count: 4 },
  { label: 'Instructores', icon: <GraduationCap className="w-5 h-5" />, color: 'bg-blue-100 text-blue-700', count: 8 },
  { label: 'Fichas', icon: <Layers className="w-5 h-5" />, color: 'bg-amber-100 text-amber-700', count: 12 },
  { label: 'Empleados', icon: <Users className="w-5 h-5" />, color: 'bg-indigo-100 text-indigo-700', count: 156 },
  { label: 'Períodos', icon: <CalendarDays className="w-5 h-5" />, color: 'bg-purple-100 text-purple-700', count: 6 },
  { label: 'Recibos', icon: <FileCheck2 className="w-5 h-5" />, color: 'bg-emerald-100 text-emerald-700', count: 936 },
];

const STATS = [
  {
    title: 'Empleados Activos',
    value: '156',
    icon: <Users className="w-5 h-5 text-emerald-600" />,
    trend: '+12 este mes',
    trendPositive: true,
  },
  {
    title: 'Pago Neto Total',
    value: '$48.5M',
    icon: <DollarSign className="w-5 h-5 text-blue-600" />,
    trend: '+8.5% vs mes pasado',
    trendPositive: true,
  },
  {
    title: 'Períodos Abiertos',
    value: '3',
    icon: <CalendarDays className="w-5 h-5 text-amber-600" />,
    trend: '2 pendientes de pago',
    trendPositive: false,
  },
  {
    title: 'Recibos Pendientes',
    value: '24',
    icon: <AlertCircle className="w-5 h-5 text-red-600" />,
    trend: 'Listos para procesar',
    trendPositive: false,
  },
];

export function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel de Control</h1>
          <p className="text-slate-500 text-sm">Bienvenido de vuelta. Aquí tienes un resumen de tu nómina.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">
            <Clock className="w-4 h-4 mr-2" />
            Generar Reporte
          </Button>
          <Button variant="primary" size="sm">
            <DollarSign className="w-4 h-4 mr-2" />
            Nuevo Período
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card>
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Acciones Rápidas</h2>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  variant="ghost"
                  className="w-full py-4 text-left justify-start border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50"
                  leftIcon={action.icon}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-900">{action.label}</span>
                    <span className="text-xs text-slate-500">{action.count} registros</span>
                  </div>
                </Button>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <Card>
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Actividad Reciente</h2>
            </div>
            <div className="p-4 space-y-4">
              {[
                {
                  title: 'Nuevo empleado registrado',
                  subtitle: 'Ana María López - Gestión Administrativa',
                  time: 'Hace 2 horas',
                  icon: <Users className="w-4 h-4 text-emerald-600" />,
                  color: 'text-emerald-600',
                },
                {
                  title: 'Período procesado',
                  subtitle: 'Nómina mensual noviembre 2026',
                  time: 'Hace 5 horas',
                  icon: <FileCheck2 className="w-4 h-4 text-blue-600" />,
                  color: 'text-blue-600',
                },
                {
                  title: 'Solicitud de vacaciones',
                  subtitle: 'Carlos Rodríguez - 15 días',
                  time: 'Ayer',
                  icon: <CalendarDays className="w-4 h-4 text-amber-600" />,
                  color: 'text-amber-600',
                },
                {
                  title: 'Liquidación generada',
                  subtitle: 'Despido - Juan Pérez',
                  time: 'Ayer',
                  icon: <UserMinus className="w-4 h-4 text-red-600" />,
                  color: 'text-red-600',
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color} bg-[${item.color}]/10`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.subtitle}</p>
                    <p className="text-[10px] text-slate-400">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
