'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ArrowRight, Check, Moon, Sun, MessageCircle, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [darkMode, setDarkMode] = useState(false);

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

  const checkSlug = async (value: string) => {
    if (value.length < 3) {
      setAvailable(null);
      return;
    }
    
    setChecking(true);
    try {
      const res = await fetch(`/api/registro?slug=${value}`);
      const data = await res.json();
      setAvailable(data.available);
    } catch {
      setAvailable(null);
    }
    setChecking(false);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(value);
    checkSlug(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slug) {
      router.push(`/${slug}`);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-emerald-50 via-white to-teal-50'}`}>
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-emerald-600" />
            <span className="font-bold text-xl text-gray-800 dark:text-white">AsistenciaQR</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>
            <Button onClick={() => router.push('/registro')} variant="outline" className="dark:border-gray-600 dark:text-white">
              Registrar organización
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Sistema de Asistencia con QR
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Control de asistencia para escuelas, empresas e instituciones.
            Escanea código QR, registra entradas y salidas, genera reportes.
          </p>
        </div>

        {/* Acceso rápido */}
        <Card className="max-w-md mx-auto shadow-xl dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-center dark:text-white">Acceder a tu organización</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">
                  Nombre de tu organización
                </label>
                <div className="flex">
                  <span className="bg-gray-100 dark:bg-gray-700 border border-r-0 rounded-l px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                    asisteqr.com/
                  </span>
                  <Input
                    value={slug}
                    onChange={handleSlugChange}
                    placeholder="mi-escuela"
                    className="rounded-l-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                {checking && (
                  <p className="text-sm text-gray-400 mt-1">Verificando...</p>
                )}
                {!checking && available === true && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Organización encontrada
                  </p>
                )}
                {!checking && available === false && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">No encontrada</p>
                )}
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!slug}>
                Ir a mi organización <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Características */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <Card className="text-center p-6 dark:bg-gray-800 dark:border-gray-700">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="font-semibold mb-2 dark:text-white">Escaneo QR</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Usa la cámara del celular para registrar asistencia instantáneamente
            </p>
          </Card>
          <Card className="text-center p-6 dark:bg-gray-800 dark:border-gray-700">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-semibold mb-2 dark:text-white">Reportes</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Exporta a PDF o Excel con filtros por fecha y grupo
            </p>
          </Card>
          <Card className="text-center p-6 dark:bg-gray-800 dark:border-gray-700">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🏢</span>
            </div>
            <h3 className="font-semibold mb-2 dark:text-white">Multi-organización</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cada institución tiene su propio espacio con datos aislados
            </p>
          </Card>
        </div>

        {/* Sección de contacto para cotización */}
        <div className="mt-16">
          <Card className="max-w-2xl mx-auto dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl dark:text-white">¿Necesitas una solución personalizada?</CardTitle>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Cada organización tiene necesidades diferentes. Contáctanos para una cotización personalizada.
              </p>
            </CardHeader>
            <CardContent className="text-center">
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">WhatsApp</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <Phone className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Teléfono</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                • Escuelas, empresas, gimnasios, consultorios, etc.<br/>
                • Personas ilimitadas según tu plan<br/>
                • Soporte técnico incluido<br/>
                • Personalización de marca
              </p>
              <Button 
                className="mt-6 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => router.push('/registro')}
              >
                Solicitar información
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400">© 2024 AsistenciaQR. Sistema multi-tenant de control de asistencia.</p>
        </div>
      </footer>
    </div>
  );
}
