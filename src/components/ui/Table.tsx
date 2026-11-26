import * as React from 'react';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export function Table({ children, className = '', ...props }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table {...props} className={`w-full text-left border-collapse ${className}`}>
        {children}
      </table>
    </div>
  );
}

interface TheadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function Thead({ children, ...props }: TheadProps) {
  return <thead {...props}>{children}</thead>;
}

interface TbodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function Tbody({ children, ...props }: TbodyProps) {
  return <tbody {...props}>{children}</tbody>;
}

interface TrProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

export function Tr({ children, ...props }: TrProps) {
  return <tr {...props}>{children}</tr>;
}

interface ThProps extends React.HTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export function Th({ children, ...props }: ThProps) {
  return (
    <th
      {...props}
      className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-[.12em] border-b border-slate-100 bg-slate-50/80"
    >
      {children}
    </th>
  );
}

interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export function Td({ children, ...props }: TdProps) {
  return (
    <td {...props} className="px-6 py-4 text-sm text-slate-700 border-b border-slate-100">
      {children}
    </td>
  );
}
