import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { CompanyConfig, PayrollFrequency } from '../types/payroll.ts';

interface CompanySettingsModalProps {
  open: boolean;
  company: CompanyConfig;
  onClose: () => void;
  onSave: (patch: Partial<CompanyConfig>) => Promise<void>;
}

export function CompanySettingsModal({
  open,
  company,
  onClose,
  onSave,
}: CompanySettingsModalProps) {
  const [name, setName] = useState(company.name);
  const [nit, setNit] = useState(company.nit);
  const [address, setAddress] = useState(company.address);
  const [city, setCity] = useState(company.city);
  const [activeYear, setActiveYear] = useState(String(company.activeYear));
  const [defaultFrequency, setDefaultFrequency] = useState<PayrollFrequency>(
    company.defaultFrequency,
  );
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name: name.trim() || company.name,
        nit: nit.trim() || company.nit,
        address: address.trim() || company.address,
        city: city.trim() || company.city,
        activeYear: Number(activeYear) || 2026,
        defaultFrequency,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Datos Institucionales — INAMOD / SENA
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Razón Social / Centro
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                NIT
              </label>
              <input
                type="text"
                required
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ciudad / Regional
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Dirección Sede
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Vigencia Legal Activa
              </label>
              <select
                value={activeYear}
                onChange={(e) => setActiveYear(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md bg-white"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Periodicidad Base
              </label>
              <select
                value={defaultFrequency}
                onChange={(e) => setDefaultFrequency(e.target.value as PayrollFrequency)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="Mensual">Mensual</option>
                <option value="Quincenal">Quincenal</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 cursor-pointer"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
