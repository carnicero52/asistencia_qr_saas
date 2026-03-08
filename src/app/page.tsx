'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LandingPage() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-emerald-600" />
            <span className="font-bold text-xl text-gray-800">AsistenciaQR</span>
          </div>
          <Button onClick={() => router.push('/registro')} variant="outline">
            Registrar organización
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Sistema de Asistencia con QR
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Control de asistencia para escuelas, empresas e instituciones.
            Escanea código QR, registra entradas y salidas, genera reportes.
          </p>
        </div>

        {/* Acceso rápido */}
        <Card className="max-w-md mx-auto shadow-xl">
          <CardHeader>
            <CardTitle className="text-center">Acceder a tu organización</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">
                  Nombre de tu organización
                </label>
                <div className="flex">
                  <span className="bg-gray-100 border border-r-0 rounded-l px-3 py-2 text-gray-500 text-sm">
                    asisteqr.com/
                  </span>
                  <Input
                    value={slug}
                    onChange={handleSlugChange}
                    placeholder="mi-escuela"
                    className="rounded-l-none"
                  />
                </div>
                {checking && (
                  <p className="text-sm text-gray-400 mt-1">Verificando...</p>
                )}
                {!checking && available === true && (
                  <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Organización encontrada
                  </p>
                )}
                {!checking && available === false && (
                  <p className="text-sm text-red-600 mt-1">No encontrada</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={!slug}>
                Ir a mi organización <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Características */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <Card className="text-center p-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="font-semibold mb-2">Escaneo QR</h3>
            <p className="text-sm text-gray-600">
              Usa la cámara del celular para registrar asistencia instantáneamente
            </p>
          </Card>
          <Card className="text-center p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-semibold mb-2">Reportes</h3>
            <p className="text-sm text-gray-600">
              Exporta a PDF o Excel con filtros por fecha y grupo
            </p>
          </Card>
          <Card className="text-center p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🏢</span>
            </div>
            <h3 className="font-semibold mb-2">Multi-organización</h3>
            <p className="text-sm text-gray-600">
              Cada institución tiene su propio espacio con datos aislados
            </p>
          </Card>
        </div>

        {/* Planes */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Planes disponibles</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="p-6">
              <CardTitle className="text-lg mb-2">Gratis</CardTitle>
              <p className="text-3xl font-bold mb-4">$0<span className="text-sm text-gray-500">/mes</span></p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li>✓ Hasta 100 personas</li>
                <li>✓ Hasta 5 grupos</li>
                <li>✓ Reportes básicos</li>
                <li>✓ Soporte por email</li>
              </ul>
              <Button variant="outline" className="w-full" onClick={() => router.push('/registro')}>
                Comenzar gratis
              </Button>
            </Card>
            <Card className="p-6 border-emerald-500 border-2 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs px-3 py-1 rounded-full">
                Popular
              </span>
              <CardTitle className="text-lg mb-2">Básico</CardTitle>
              <p className="text-3xl font-bold mb-4">$9<span className="text-sm text-gray-500">/mes</span></p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li>✓ Hasta 500 personas</li>
                <li>✓ Hasta 20 grupos</li>
                <li>✓ Reportes avanzados</li>
                <li>✓ Logo personalizado</li>
                <li>✓ Soporte prioritario</li>
              </ul>
              <Button className="w-full" onClick={() => router.push('/registro')}>
                Elegir plan
              </Button>
            </Card>
            <Card className="p-6">
              <CardTitle className="text-lg mb-2">Premium</CardTitle>
              <p className="text-3xl font-bold mb-4">$29<span className="text-sm text-gray-500">/mes</span></p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li>✓ Personas ilimitadas</li>
                <li>✓ Grupos ilimitados</li>
                <li>✓ API access</li>
                <li>✓ Múltiples usuarios</li>
                <li>✓ Soporte 24/7</li>
              </ul>
              <Button variant="outline" className="w-full" onClick={() => router.push('/registro')}>
                Contactar
              </Button>
            </Card>
          </div>
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
