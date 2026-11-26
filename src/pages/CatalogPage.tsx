import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Plus, Edit, Trash2, RefreshCw, FileCheck2, AlertCircle } from 'lucide-react';

interface CatalogPageProps {
  entityName: string;
  entityNamePlural: string;
  listFn: () => Promise<{ results: any[] }>;
  createFn: (body: any) => Promise<any>;
  updateFn?: (id: string | number, body: any) => Promise<any>;
  deleteFn: (id: string | number) => Promise<void>;
  columns: { key: string; label: string; render?: (item: any) => React.ReactNode }[];
  createFields: { label: string; key: string; type?: 'text' | 'number' | 'email' | 'date' | 'select'; required?: boolean; options?: { label: string; value: string }[]; optionsSource?: () => Promise<{ results: any[] }>; optionLabel?: (item: any) => string; optionValue?: (item: any) => string }[];
  itemToFormData: (item: any) => Record<string, any>;
}

export function CatalogPage({
  entityName,
  entityNamePlural,
  listFn,
  createFn,
  updateFn,
  deleteFn,
  columns,
  createFields,
  itemToFormData,
}: CatalogPageProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldOptions, setFieldOptions] = useState<Record<string, { label: string; value: string }[]>>({});

  useEffect(() => {
    loadItems();
  }, [listFn]);

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      for (const field of createFields) {
        if (!field.optionsSource) continue;
        try {
          const response = await field.optionsSource();
          const options = (response.results || []).map((item) => ({
            label: field.optionLabel ? field.optionLabel(item) : String(item.nombre || item.nombre_completo || item.id),
            value: field.optionValue ? field.optionValue(item) : String(item.id),
          }));
          if (active) setFieldOptions((current) => ({ ...current, [field.key]: options }));
        } catch {
          if (active) setFieldOptions((current) => ({ ...current, [field.key]: [] }));
        }
      }
    };

    loadOptions();
    return () => { active = false; };
  }, [createFields]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await listFn();
      setItems(response.results || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({});
    setError('');
    setSuccess('');
    setShowCreate(true);
  };

  const closeForm = () => {
    setEditingId(null);
    setFormData({});
    setShowCreate(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await createFn(formData);
      setSuccess(`${entityName} creado exitosamente`);
      setShowCreate(false);
      setFormData({});
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Error al crear registro');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    if (!updateFn || editingId === null) {
      setError('Esta sección todavía no permite actualización');
      setLoading(false);
      return;
    }

    try {
      await updateFn(editingId, formData);
      setSuccess(`${entityName} actualizado exitosamente`);
      setShowCreate(false);
      setFormData({});
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar registro');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm(`¿Estás seguro de eliminar este ${entityName}?`)) return;
    try {
      await deleteFn(id);
      await loadItems();
      setSuccess(`${entityName} eliminado`);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{entityNamePlural}</h1>
          <p className="text-slate-500 text-sm">Administra los {entityNamePlural.toLowerCase()} del sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nuevo {entityName}
          </Button>
          <Button variant="ghost" size="sm" onClick={loadItems}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {success && (
        <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm flex items-center gap-2">
          <FileCheck2 className="w-4 h-4" />
          {success}
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <Card className="animate-slide-up">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">{editingId ? `Editar ${entityName}` : `Nuevo ${entityName}`}</h2>
          </div>
          <div className="p-6">
            <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {createFields.map((field) => (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">{field.label}</label>
                    {field.type === 'select' && (field.options || field.optionsSource) ? (
                      <select
                        required={field.required}
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Seleccionar...</option>
                        {(fieldOptions[field.key] || field.options || []).map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type || 'text'}
                        placeholder={field.label}
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    )}
                    {field.required && !formData[field.key] && (
                      <span className="text-xs text-red-500">Este campo es obligatorio</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" type="button" onClick={closeForm}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" isLoading={loading}>
                  {editingId ? `Actualizar ${entityName}` : `Crear ${entityName}`}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <Thead>
              <Tr>
                {columns.map((col) => (
                  <Th key={col.key}>{col.label}</Th>
                ))}
                <Th className="w-24">Acciones</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr>
                  <Td key="loading" colSpan={columns.length + 1} className="text-center py-8 text-slate-500">
                    Cargando...
                  </Td>
                </Tr>
              ) : items.length === 0 ? (
                <Tr>
                  <Td key="empty" colSpan={columns.length + 1} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm text-slate-500">No hay {entityNamePlural.toLowerCase()} registrados</p>
                      <Button variant="ghost" size="sm" onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-1" />
                        Crear primero
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ) : (
                items.map((item) => (
                  <Tr key={String(item.id)}>
                    {columns.map((col) => (
                      <Td key={col.key}>
                        {col.render ? col.render(item) : (
                          <span className="text-slate-700">{item[col.key]}</span>
                        )}
                      </Td>
                    ))}
                    <Td>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const data = itemToFormData(item);
                            setEditingId(item.id);
                            setFormData(data);
                            setError('');
                            setSuccess('');
                            setShowCreate(true);
                          }}
                          title="Editar"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
