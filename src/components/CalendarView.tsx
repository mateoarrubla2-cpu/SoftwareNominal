import { useState } from 'react';
import {
  AlertCircle,
  Banknote,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plane,
  Plus,
  Scale,
} from 'lucide-react';
import {
  buildCalendarEventsForMonth,
  formatCOP,
  formatShortDate,
  type CalendarEventCategory,
  type CalendarEventItem,
} from '../lib/payrollEngine.ts';
import type { PayrollDatabase } from '../types/payroll.ts';

interface CalendarViewProps {
  db: PayrollDatabase;
  restrictedEmployeeId?: string;
  onQuickAddEventuality?: (dateStr: string) => void;
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getCategoryStyles(cat: CalendarEventCategory): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (cat) {
    case 'pago':
      return {
        bg: 'bg-teal-50',
        text: 'text-teal-800',
        border: 'border-teal-200',
        label: 'Pagos de Nómina',
      };
    case 'vacaciones':
      return {
        bg: 'bg-sky-50',
        text: 'text-sky-800',
        border: 'border-sky-200',
        label: 'Vacaciones',
      };
    case 'eventualidad':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        label: 'Eventualidades',
      };
    case 'hito':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-800',
        border: 'border-slate-300',
        label: 'Hitos Legales',
      };
  }
}

export function CalendarView({
  db,
  restrictedEmployeeId,
  onQuickAddEventuality,
}: CalendarViewProps) {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(10); // 0-indexed: 10 = Noviembre 2026
  const [selectedDate, setSelectedDate] = useState('2026-11-28');
  const [visibleCats, setVisibleCats] = useState<Record<CalendarEventCategory, boolean>>({
    pago: true,
    vacaciones: true,
    eventualidad: true,
    hito: true,
  });

  const allEvents = buildCalendarEventsForMonth(
    db,
    year,
    month,
    restrictedEmployeeId,
  );
  const filteredEvents = allEvents.filter((ev) => visibleCats[ev.category]);

  const eventsByDate = new Map<string, CalendarEventItem[]>();
  for (const ev of filteredEvents) {
    const list = eventsByDate.get(ev.date) ?? [];
    list.push(ev);
    eventsByDate.set(ev.date, list);
  }

  // Build calendar cells (Monday-first grid)
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const jsDay = firstDayOfMonth.getDay(); // 0=Sun..6=Sat
  const leadingEmptyDays = jsDay === 0 ? 6 : jsDay - 1;

  const cells: (number | null)[] = [
    ...Array(leadingEmptyDays).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function jumpToMonth(targetYear: number, targetMonth0: number) {
    setYear(targetYear);
    setMonth(targetMonth0);
    const mm = String(targetMonth0 + 1).padStart(2, '0');
    setSelectedDate(`${targetYear}-${mm}-28`);
  }

  function toggleCategory(cat: CalendarEventCategory) {
    setVisibleCats((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  const mmStr = String(month + 1).padStart(2, '0');
  const selectedDayEvents = eventsByDate.get(selectedDate) ?? [];

  const countPay = allEvents.filter((e) => e.category === 'pago').length;
  const countVac = allEvents.filter((e) => e.category === 'vacaciones').length;
  const countEv = allEvents.filter((e) => e.category === 'eventualidad').length;
  const countHito = allEvents.filter((e) => e.category === 'hito').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Calendario Laboral Integral
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Vista unificada de fechas de pago de nómina, días vacacionales, eventualidades, vencimientos de contrato e hitos legales (Prima, Dotación, Cesantías).
          </p>
        </div>

        {/* Quick Month Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => jumpToMonth(2026, 9)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer ${
              year === 2026 && month === 9
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Oct 2026
          </button>
          <button
            type="button"
            onClick={() => jumpToMonth(2026, 10)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer ${
              year === 2026 && month === 10
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Nov 2026
          </button>
          <button
            type="button"
            onClick={() => jumpToMonth(2026, 11)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer ${
              year === 2026 && month === 11
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Dic 2026 (Prima + Dotación)
          </button>
        </div>
      </div>

      {/* Category Filter Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'pago', count: countPay, icon: Banknote },
              { id: 'vacaciones', count: countVac, icon: Plane },
              { id: 'eventualidad', count: countEv, icon: AlertCircle },
              { id: 'hito', count: countHito, icon: Scale },
            ] as const
          ).map(({ id, count, icon: Icon }) => {
            const st = getCategoryStyles(id);
            const active = visibleCats[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleCategory(id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                  active
                    ? `${st.bg} ${st.text} ${st.border}`
                    : 'bg-white text-slate-400 border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{st.label}</span>
                <span className="font-mono tabular-nums font-semibold">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4 text-slate-700" />
          </button>
          <span className="font-display text-sm font-semibold text-slate-900 min-w-36 text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </div>

      {/* Main Split: Calendar Grid + Day Detail Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* 7-Column Calendar Grid */}
        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2.5 px-2 text-center text-xs font-medium text-slate-500"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
            {cells.map((dayNum, idx) => {
              if (dayNum === null) {
                return <div key={`empty-${idx}`} className="min-h-24 bg-slate-50/50" />;
              }

              const ddStr = String(dayNum).padStart(2, '0');
              const dateKey = `${year}-${mmStr}-${ddStr}`;
              const dayEvents = eventsByDate.get(dateKey) ?? [];
              const isSelected = selectedDate === dateKey;
              const isToday = dateKey === '2026-11-17';

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(dateKey)}
                  className={`min-h-24 p-1.5 text-left align-top flex flex-col gap-1 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/40 ring-2 ring-inset ring-teal-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`font-mono text-xs tabular-nums px-1.5 py-0.5 rounded ${
                        isToday
                          ? 'bg-slate-900 text-white font-semibold'
                          : isSelected
                            ? 'text-teal-800 font-bold'
                            : 'text-slate-700'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="font-mono text-[10px] text-slate-400">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 w-full">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const st = getCategoryStyles(ev.category);
                      return (
                        <div
                          key={ev.id}
                          className={`px-1.5 py-0.5 text-[11px] leading-tight font-medium rounded border truncate ${st.bg} ${st.text} ${st.border}`}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-[11px] font-mono text-slate-500 px-1">
                        +{dayEvents.length - 2} más
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Selected Date Agenda */}
        <div className="xl:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">Detalle del Día</p>
              <h2 className="text-base font-semibold text-slate-900 font-mono mt-0.5">
                {formatShortDate(selectedDate)}
              </h2>
            </div>
            {onQuickAddEventuality && !restrictedEmployeeId && (
              <button
                type="button"
                onClick={() => onQuickAddEventuality(selectedDate)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Eventualidad</span>
              </button>
            )}
          </div>

          <div className="p-5">
            {selectedDayEvents.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CalendarIcon className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500">
                  No hay pagos, vacaciones ni eventualidades registradas para el{' '}
                  <span className="font-mono">{formatShortDate(selectedDate)}</span>.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {selectedDayEvents.map((ev) => {
                  const st = getCategoryStyles(ev.category);
                  return (
                    <div key={ev.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded border ${st.bg} ${st.text} ${st.border}`}
                        >
                          {st.label}
                        </span>
                        {ev.status && (
                          <span className="text-xs font-mono text-slate-500">
                            {ev.status}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {ev.title}
                      </p>
                      <p className="text-xs text-slate-600">{ev.subtitle}</p>
                      {ev.amount !== undefined && ev.amount > 0 && (
                        <p className="text-xs font-mono font-semibold text-teal-700 pt-0.5">
                          Importe: {formatCOP(ev.amount)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
