import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';

const demoCredentials = [
  { role: 'Administrador', email: 'admin@inamoc.edu.co', password: 'admin123', color: 'bg-emerald-500' },
  { role: 'Instructor', email: 'instructor@inamoc.edu.co', password: 'inst123', color: 'bg-blue-500' },
  { role: 'Estudiante', email: 'estudiante@inamoc.edu.co', password: 'est123', color: 'bg-amber-500' },
];

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm mb-4">
            <Building2 className="w-8 h-8 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">INAMOC Nómina</h1>
            <p className="text-sm text-slate-500 mt-1">Sistema de Gestión de Nómina SENA</p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg">
          <CardBody className="pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Correo electrónico</label>
                <Input
                  leftIcon={<Mail className="w-4 h-4" />}
                  type="email"
                  placeholder="correo@inamoc.edu.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  error={error && !password ? 'Ingresa tus credenciales' : undefined}
                />
              </div>

              <div className="relative space-y-2">
                <label className="text-sm font-medium text-slate-700">Contraseña</label>
                <Input
                  leftIcon={<Lock className="w-4 h-4" />}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  error={error && !email ? 'Ingresa tus credenciales' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Mostrar contraseña"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                className="mt-2"
              >
                Iniciar sesión <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200"></span>
              </div>
              <span className="relative flex justify-center text-xs uppercase font-medium text-slate-400 bg-white px-2">
                o continúa con
              </span>
            </div>

            {/* Demo credentials info */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Acceso rápido:</p>
              <div className="space-y-1.5">
                {demoCredentials.map((cred) => (
                  <div
                    key={cred.email}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => {
                      setEmail(cred.email);
                      setPassword(cred.password);
                    }}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${cred.color} shadow-sm`}>
                      <span className="text-[10px] font-bold">{cred.role.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{cred.role}</p>
                      <p className="text-[10px] text-slate-500 truncate">{cred.email}</p>
                    </div>
                    <div className="text-xs text-slate-400">{cred.password}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} INAMOC - Sistema de Nómina SENA
          </p>
        </div>
      </div>
    </div>
  );
}
