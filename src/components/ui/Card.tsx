import * as React from 'react';
import { ChevronRight } from 'lucide-react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
}

export function Card({ children, hover = true, className = '', ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`bg-white/95 border border-slate-200/80 rounded-2xl overflow-hidden transition-all duration-200 ${hover ? 'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60' : 'shadow-sm shadow-slate-200/40'} ${className}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardHeader({ children, className = '', ...props }: CardHeaderProps) {
  return (
    <div
      {...props}
      className={`px-6 py-4 border-b border-slate-100 ${className}`}
    >
      {children}
    </div>
  );
}

interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardBody({ children, className = '', ...props }: CardBodyProps) {
  return (
    <div {...props} className={`p-6 ${className}`}>{children}</div>
  );
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardFooter({ children, className = '', ...props }: CardFooterProps) {
  return (
    <div
      {...props}
      className={`px-6 py-4 border-t border-slate-100 bg-slate-50 ${className}`}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
}

export function StatCard({ title, value, icon, trend, trendPositive }: StatCardProps) {
  return (
    <Card className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
          {icon || <ChevronRight className="w-5 h-5" />}
        </div>
      </div>
      {trend && (
        <p className={`text-xs font-medium mt-2 ${trendPositive ? 'text-emerald-600' : 'text-red-600'}`}>
          {trendPositive ? '▲' : '▼'} {trend}
        </p>
      )}
    </Card>
  );
}
