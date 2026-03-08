'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, User, Lock, ArrowLeft, Check, Loader2, X, Moon, Sun } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

export default function RegistroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  const [darkMode, setDarkMode] = useState(false);

  const [form, setForm] = useState({
    nombre: '',
    slug: '',
    adminNombre: '',
    adminUsername: '',
    adminPassword: '',
    adminEmail: '',
  });

  // Cargar modo noche desde localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  const generateSlug = (nombre: string) => {
    return nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  };

  const checkSlug = async (slug: string) => {
    if (slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    setCheckingSlug(true);
    try {
      const res = await fetch(`/api/registro?slug=${slug}`);
      const data = await res.json();
      setSlugAvailable(data.available);
    } catch {
      setSlugAvailable(null);
    }
    setCheckingSlug(false);
  };

  const handleNombreChange = (nombre: string) => {
    setForm(prev => ({
      ...prev,
      nombre,
      slug: generateSlug(nombre)
    }));
    checkSlug(generateSlug(nombre));
  };

  const handleSlugChange = (slug: string) => {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setForm(prev => ({ ...prev, slug: cleanSlug }));
    checkSlug(cleanSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(data);
      } else {
        setError(data.error || 'Error al registrar');
      }
    } catch {
      setError('Error de conexión');
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-emerald-50 via-white to-teal-50'}`}>
        <Card className="max-w-md w-full shadow-xl dark:bg-gray-800">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2 dark:text-white">¡Organización creada!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {success.tenant.nombre} está lista para usar.
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Tus credenciales:</p>
              <p className="font-mono text-sm dark:text-gray-300"><strong>Usuario:</strong> {success.admin.username}</p>
              <p className="font-mono text-sm dark:text-gray-300"><strong>Contraseña:</strong> (la que elegiste)</p>
              <p className="font-mono text-sm dark:text-gray-300"><strong>URL:</strong> asisteqr.com/{success.tenant.slug}</p>
            </div>

            <Button 
              onClick={() => router.push(`/${success.tenant.slug}`)}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              Ir a mi organización
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-emerald-50 via-white to-teal-50'}`}>
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-600" />
              <span className="font-bold text-lg dark:text-white">AsistenciaQR</span>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>
        </div>
      </header>

      {/* Form */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8">
        <Card className="shadow-xl dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl dark:text-white">Registrar nueva organización</CardTitle>
            <p className="text-gray-500 dark:text-gray-400">Crea tu espacio de trabajo en minutos</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información de la organización */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2 dark:text-white">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  Información de la organización
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Nombre *</label>
                    <Input
                      value={form.nombre}
                      onChange={(e) => handleNombreChange(e.target.value)}
                      placeholder="Escuela Juan Pérez"
                      required
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">URL personalizada *</label>
                    <div className="flex">
                      <span className="bg-gray-100 dark:bg-gray-700 border border-r-0 rounded-l px-3 py-2 text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">
                        asisteqr.com/
                      </span>
                      <Input
                        value={form.slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder="escuela-juan-perez"
                        className="rounded-l-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    {checkingSlug && (
                      <p className="text-xs text-gray-400 mt-1">Verificando...</p>
                    )}
                    {!checkingSlug && slugAvailable === true && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Disponible
                      </p>
                    )}
                    {!checkingSlug && slugAvailable === false && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <X className="w-3 h-3" /> No disponible
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Administrador */}
              <div className="space-y-4 pt-4 border-t dark:border-gray-700">
                <h3 className="font-semibold text-lg flex items-center gap-2 dark:text-white">
                  <User className="w-5 h-5 text-emerald-600" />
                  Administrador
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Nombre completo *</label>
                    <Input
                      value={form.adminNombre}
                      onChange={(e) => setForm(prev => ({ ...prev, adminNombre: e.target.value }))}
                      placeholder="Juan García"
                      required
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Email</label>
                    <Input
                      type="email"
                      value={form.adminEmail}
                      onChange={(e) => setForm(prev => ({ ...prev, adminEmail: e.target.value }))}
                      placeholder="juan@ejemplo.com"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Usuario *</label>
                    <Input
                      value={form.adminUsername}
                      onChange={(e) => setForm(prev => ({ ...prev, adminUsername: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                      placeholder="admin"
                      required
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Contraseña *</label>
                    <Input
                      type="password"
                      value={form.adminPassword}
                      onChange={(e) => setForm(prev => ({ ...prev, adminPassword: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <Alert className="border-red-500 bg-red-50 dark:bg-red-900/20">
                  <AlertDescription className="text-red-600 dark:text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => router.push('/')} className="dark:border-gray-600 dark:text-white">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={loading || slugAvailable === false}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear organización'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
