'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Users, QrCode, Printer, BarChart3, ArrowLeft, Plus, Trash2,
  Edit, Download, Camera, CameraOff, CheckCircle, XCircle,
  Moon, Sun, Search, Upload, Lock, LogOut, User, Settings,
  FileText, FileSpreadsheet, Calendar, TrendingUp, UserPlus,
  Shield, Image as ImageIcon, Save, X, Building2, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Tipos
interface Tenant {
  id: string;
  slug: string;
  nombre: string;
  logoUrl: string | null;
  colorPrimario: string;
  colorSecundario: string;
  plan: string;
}

interface Usuario {
  id: string;
  username: string;
  nombre: string;
  email: string | null;
  rol: string;
}

interface Grupo {
  id: string;
  nombre: string;
  descripcion: string | null;
  color: string;
  activo: boolean;
  _count?: { personas: number };
}

interface Persona {
  id: string;
  codigo: string;
  nombre: string;
  apellido: string;
  codigoQr: string;
  grupoId: string | null;
  grupo?: Grupo;
}

interface Asistencia {
  id: string;
  personaId: string;
  tipo: string;
  fecha: string;
  hora: string;
  metodo: string;
  persona: Persona;
}

interface Estadisticas {
  totalPersonas: number;
  totalGrupos: number;
  asistenciasHoy: number;
  entradasHoy: number;
  salidasHoy: number;
  porcentajeAsistencia: number;
  datosGrafico: { dia: string; total: number }[];
  ultimosMovimientos: Asistencia[];
}

type Seccion = 'dashboard' | 'administrar' | 'registrar' | 'imprimir' | 'reportes' | 'usuarios' | 'configuracion';

export default function TenantPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  // Estados de autenticación
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [errorLogin, setErrorLogin] = useState('');

  // Estados principales
  const [seccion, setSeccion] = useState<Seccion>('dashboard');
  const [darkMode, setDarkMode] = useState(false);

  // Estados de datos
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error' | 'info'; texto: string } | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('todos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Estados de formularios
  const [modalGrupo, setModalGrupo] = useState(false);
  const [modalPersona, setModalPersona] = useState(false);
  const [formGrupo, setFormGrupo] = useState({ nombre: '', descripcion: '', color: '#10B981' });
  const [formPersona, setFormPersona] = useState({ nombre: '', apellido: '', codigo: '', grupoId: '' });

  // Estados de cámara
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Cargar tenant al inicio
  useEffect(() => {
    const loadTenant = async () => {
      try {
        // Verificar sesión guardada
        const savedToken = localStorage.getItem(`token_${tenantSlug}`);
        const savedUser = localStorage.getItem(`user_${tenantSlug}`);

        if (savedToken && savedUser) {
          // Verificar sesión con el servidor
          const res = await fetch(`/api/${tenantSlug}/auth`, {
            headers: { 'Authorization': `Bearer ${savedToken}` }
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.valid) {
              setToken(savedToken);
              setUsuario(JSON.parse(savedUser));
              setTenant(data.tenant);
            }
          }
        }

        // Cargar info del tenant
        const tenantRes = await fetch(`/api/${tenantSlug}/auth`);
        if (tenantRes.ok) {
          // Tenant existe
        }
      } catch (error) {
        console.error('Error cargando tenant:', error);
      } finally {
        setLoadingTenant(false);
      }
    };

    loadTenant();
  }, [tenantSlug]);

  // Dark mode
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

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorLogin('');

    try {
      const res = await fetch(`/api/${tenantSlug}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setToken(data.token);
        setUsuario(data.usuario);
        setTenant(data.tenant);
        localStorage.setItem(`token_${tenantSlug}`, data.token);
        localStorage.setItem(`user_${tenantSlug}`, JSON.stringify(data.usuario));
        setLoginForm({ username: '', password: '' });
      } else {
        setErrorLogin(data.error || 'Error al iniciar sesión');
      }
    } catch {
      setErrorLogin('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    if (token) {
      try {
        await fetch(`/api/${tenantSlug}/auth`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch {}
    }
    setToken(null);
    setUsuario(null);
    localStorage.removeItem(`token_${tenantSlug}`);
    localStorage.removeItem(`user_${tenantSlug}`);
    setSeccion('dashboard');
  };

  // Cargar datos
  useEffect(() => {
    if (token && tenant) {
      cargarDatos();
    }
  }, [seccion, token, tenant]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      const [gruposRes, personasRes, asisRes, statsRes] = await Promise.all([
        fetch(`/api/${tenantSlug}/grupos`, { headers }),
        fetch(`/api/${tenantSlug}/personas`, { headers }),
        fetch(`/api/${tenantSlug}/asistencia`, { headers }),
        fetch(`/api/${tenantSlug}/estadisticas`, { headers })
      ]);

      if (gruposRes.ok) setGrupos(await gruposRes.json());
      if (personasRes.ok) setPersonas(await personasRes.json());
      if (asisRes.ok) setAsistencias(await asisRes.json());
      if (statsRes.ok) setEstadisticas(await statsRes.json());
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Registrar asistencia
  const registrarAsistencia = async (codigoQr: string) => {
    try {
      const res = await fetch(`/api/${tenantSlug}/asistencia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ codigoQr })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const tipoTexto = data.tipo === 'entrada' ? '🟢 ENTRADA' : '🔴 SALIDA';
        setMensaje({
          tipo: 'success',
          texto: `${tipoTexto}\n${data.persona.nombre} ${data.persona.apellido}\n${data.persona.codigo}`
        });
        cargarDatos();
        if (navigator.vibrate) navigator.vibrate(200);
      } else {
        setMensaje({ tipo: 'error', texto: data.error || 'Error al registrar' });
      }
      setTimeout(() => setMensaje(null), 4000);
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión' });
      setTimeout(() => setMensaje(null), 3000);
    }
  };

  // Scanner QR
  const startScanner = useCallback(async () => {
    if (!scannerRef.current) return;
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }

      html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          try {
            await html5QrCodeRef.current?.stop();
            setCameraActive(false);
          } catch {}
          await registrarAsistencia(decodedText);
        },
        () => {}
      );
      setCameraActive(true);
    } catch (err) {
      console.error('Error iniciando cámara:', err);
      setMensaje({ tipo: 'error', texto: 'No se pudo acceder a la cámara' });
    }
  }, [token, tenantSlug]);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (seccion === 'registrar' && token) {
      const timer = setTimeout(() => startScanner(), 300);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [seccion, startScanner, stopScanner, token]);

  // CRUD Grupos
  const guardarGrupo = async () => {
    if (!formGrupo.nombre) {
      setMensaje({ tipo: 'error', texto: 'El nombre es obligatorio' });
      return;
    }
    try {
      await fetch(`/api/${tenantSlug}/grupos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formGrupo)
      });
      await cargarDatos();
      setModalGrupo(false);
      setFormGrupo({ nombre: '', descripcion: '', color: '#10B981' });
      setMensaje({ tipo: 'success', texto: 'Grupo guardado' });
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al guardar' });
    }
    setTimeout(() => setMensaje(null), 3000);
  };

  const eliminarGrupo = async (id: string) => {
    if (!confirm('¿Eliminar este grupo?')) return;
    try {
      await fetch(`/api/${tenantSlug}/grupos?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await cargarDatos();
      setMensaje({ tipo: 'success', texto: 'Grupo eliminado' });
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al eliminar' });
    }
    setTimeout(() => setMensaje(null), 3000);
  };

  // CRUD Personas
  const guardarPersona = async () => {
    if (!formPersona.nombre || !formPersona.apellido) {
      setMensaje({ tipo: 'error', texto: 'Nombre y apellido son obligatorios' });
      return;
    }
    try {
      await fetch(`/api/${tenantSlug}/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formPersona)
      });
      await cargarDatos();
      setModalPersona(false);
      setFormPersona({ nombre: '', apellido: '', codigo: '', grupoId: '' });
      setMensaje({ tipo: 'success', texto: 'Persona guardada' });
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al guardar' });
    }
    setTimeout(() => setMensaje(null), 3000);
  };

  const eliminarPersona = async (id: string) => {
    if (!confirm('¿Eliminar esta persona?')) return;
    try {
      await fetch(`/api/${tenantSlug}/personas?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await cargarDatos();
      setMensaje({ tipo: 'success', texto: 'Persona eliminada' });
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al eliminar' });
    }
    setTimeout(() => setMensaje(null), 3000);
  };

  // Exportar
  const exportarReporte = async (tipo: 'pdf' | 'excel') => {
    try {
      let url = `/api/${tenantSlug}/exportar?type=${tipo}`;
      if (fechaInicio) url += `&fechaInicio=${fechaInicio}`;
      if (fechaFin) url += `&fechaFin=${fechaFin}`;
      if (grupoSeleccionado !== 'todos') url += `&grupoId=${grupoSeleccionado}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await res.blob();

      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `reporte_asistencia.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`;
      link.click();
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al exportar' });
    }
  };

  // Descargar tarjeta
  const descargarTarjeta = (persona: Persona) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(persona.codigoQr)}`;
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const primaryColor = tenant?.colorPrimario || '#10B981';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 300, 400);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 280, 380);
    ctx.fillStyle = primaryColor;
    ctx.fillRect(10, 10, 280, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(tenant?.nombre || 'Institución', 150, 42);
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`${persona.nombre} ${persona.apellido}`, 150, 100);
    ctx.font = '14px Arial';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(`Código: ${persona.codigo}`, 150, 125);

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = qrUrl;
    img.onload = () => {
      ctx.drawImage(img, 50, 170, 200, 200);
      const link = document.createElement('a');
      link.download = `tarjeta_${persona.codigo}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  // Filtros
  const personasFiltradas = personas.filter(p => {
    const matchBusqueda = `${p.nombre} ${p.apellido} ${p.codigo}`.toLowerCase().includes(busqueda.toLowerCase());
    const matchGrupo = grupoSeleccionado === 'todos' || p.grupoId === grupoSeleccionado;
    return matchBusqueda && matchGrupo;
  });

  const primaryColor = tenant?.colorPrimario || '#10B981';
  const isAdmin = usuario?.rol === 'admin';

  // Loading inicial
  if (loadingTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  // Tenant no encontrado
  if (!tenant && !loadingTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Organización no encontrada</h2>
            <p className="text-gray-500 mb-4">La organización "{tenantSlug}" no existe.</p>
            <Button onClick={() => router.push('/')}>Volver al inicio</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Login
  if (!usuario) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-emerald-50 to-teal-100'}`}>
        <div className="absolute top-4 right-4">
          <button onClick={toggleDarkMode} className="p-2 rounded-full bg-white/80 dark:bg-gray-800 shadow-lg">
            {darkMode ? <Sun className="w-6 h-6 text-yellow-500" /> : <Moon className="w-6 h-6 text-gray-600" />}
          </button>
        </div>

        {tenant?.logoUrl && (
          <img src={tenant.logoUrl} alt="Logo" className="w-20 h-20 object-contain mb-4" />
        )}

        <Card className="w-full max-w-md shadow-xl dark:bg-gray-800">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor + '20' }}>
              <Lock className="w-8 h-8" style={{ color: primaryColor }} />
            </div>
            <CardTitle className="text-2xl dark:text-white">{tenant?.nombre || 'Sistema de Asistencia'}</CardTitle>
            <p className="text-gray-500 dark:text-gray-400">Inicie sesión para continuar</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Usuario</label>
                <Input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="mt-1 dark:bg-gray-700"
                  placeholder="Ingrese su usuario"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Contraseña</label>
                <Input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="mt-1 dark:bg-gray-700"
                  placeholder="Ingrese su contraseña"
                  required
                />
              </div>

              {errorLogin && (
                <Alert className="border-red-500 bg-red-50 dark:bg-red-900/20">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-600">{errorLogin}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" style={{ backgroundColor: primaryColor }} disabled={loading}>
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                Iniciar Sesión
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-sm text-gray-500">
          <a href="/" className="hover:underline">← Volver al inicio</a>
        </p>
      </div>
    );
  }

  // Dashboard y resto del sistema
  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header style={{ backgroundColor: primaryColor }} className="text-white p-4 shadow-lg sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => setSeccion('dashboard')} className="flex items-center gap-2 hover:opacity-80">
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <Building2 className="w-6 h-6" />
            )}
            <span className="font-bold hidden sm:inline">{tenant?.nombre}</span>
          </button>
          <h1 className="font-bold text-lg hidden md:block">
            {seccion === 'dashboard' && 'Dashboard'}
            {seccion === 'administrar' && 'Administrar'}
            {seccion === 'registrar' && 'Registrar Asistencia'}
            {seccion === 'imprimir' && 'Imprimir Tarjetas'}
            {seccion === 'reportes' && 'Reportes'}
            {seccion === 'configuracion' && 'Configuración'}
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-80 hidden sm:inline">{usuario?.nombre}</span>
            <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-white/20">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={handleLogout} className="p-2 rounded-full hover:bg-white/20" title="Cerrar sesión">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mensaje */}
      {mensaje && (
        <div className="p-4 max-w-6xl mx-auto w-full">
          <Alert className={
            mensaje.tipo === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
            mensaje.tipo === 'info' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
            'border-red-500 bg-red-50 dark:bg-red-900/20'
          }>
            {mensaje.tipo === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
             mensaje.tipo === 'info' ? <QrCode className="w-5 h-5 text-blue-600" /> :
             <XCircle className="w-5 h-5 text-red-600" />}
            <AlertDescription className="whitespace-pre-line font-medium dark:text-white">{mensaje.texto}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-2">
            {[
              { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
              { id: 'registrar', icon: QrCode, label: 'Registrar' },
              { id: 'administrar', icon: Users, label: 'Administrar' },
              { id: 'imprimir', icon: Printer, label: 'Tarjetas' },
              { id: 'reportes', icon: FileText, label: 'Reportes' },
              ...(isAdmin ? [{ id: 'configuracion', icon: Settings, label: 'Config' }] : []),
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setSeccion(item.id as Seccion)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  seccion === item.id
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                style={seccion === item.id ? { backgroundColor: primaryColor } : {}}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
        {/* Dashboard */}
        {seccion === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="dark:bg-gray-800">
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2" style={{ color: primaryColor }} />
                  <p className="text-2xl font-bold dark:text-white">{estadisticas?.totalPersonas || 0}</p>
                  <p className="text-sm text-gray-500">Personas</p>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-800">
                <CardContent className="p-4 text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold dark:text-white">{estadisticas?.asistenciasHoy || 0}</p>
                  <p className="text-sm text-gray-500">Asistencias Hoy</p>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-800">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold dark:text-white">{estadisticas?.porcentajeAsistencia || 0}%</p>
                  <p className="text-sm text-gray-500">% Asistencia</p>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-800">
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <p className="text-2xl font-bold dark:text-white">{estadisticas?.totalGrupos || 0}</p>
                  <p className="text-sm text-gray-500">Grupos</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="dark:bg-gray-800 border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Entradas Hoy</p>
                  <p className="text-3xl font-bold text-green-600">{estadisticas?.entradasHoy || 0}</p>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-800 border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Salidas Hoy</p>
                  <p className="text-3xl font-bold text-red-600">{estadisticas?.salidasHoy || 0}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-white text-sm">Últimos Movimientos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {estadisticas?.ultimosMovimientos?.slice(0, 10).map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <div>
                        <p className="font-medium dark:text-white">{a.persona.nombre} {a.persona.apellido}</p>
                        <p className="text-xs text-gray-500">{a.persona.codigo}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${a.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {a.tipo === 'entrada' ? '🟢 Entrada' : '🔴 Salida'}
                        </span>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{a.hora}</p>
                      </div>
                    </div>
                  ))}
                  {(!estadisticas?.ultimosMovimientos || estadisticas.ultimosMovimientos.length === 0) && (
                    <p className="text-center text-gray-500 py-4">No hay movimientos recientes</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Registrar */}
        {seccion === 'registrar' && (
          <div className="space-y-4">
            <div id="qr-reader-temp" style={{ display: 'none' }}></div>
            <Card className="dark:bg-gray-800">
              <CardContent className="p-4">
                <div id="qr-reader" ref={scannerRef} className="w-full min-h-[300px] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden" />
                <div className="flex gap-2 mt-4">
                  {!cameraActive ? (
                    <Button onClick={startScanner} className="flex-1" style={{ backgroundColor: primaryColor }}>
                      <Camera className="w-4 h-4 mr-2" /> Iniciar Cámara
                    </Button>
                  ) : (
                    <Button onClick={stopScanner} variant="outline" className="flex-1">
                      <CameraOff className="w-4 h-4 mr-2" /> Detener Cámara
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-white text-sm">Últimos registros de hoy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {asistencias.slice(0, 10).map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <div>
                        <p className="font-medium text-sm dark:text-white">{a.persona.nombre} {a.persona.apellido}</p>
                        <p className="text-xs text-gray-500">{a.persona.codigo}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg">{a.tipo === 'entrada' ? '🟢' : '🔴'}</span>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{a.hora}</p>
                      </div>
                    </div>
                  ))}
                  {asistencias.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No hay registros hoy</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Administrar */}
        {seccion === 'administrar' && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => { setModalGrupo(true); setFormGrupo({ nombre: '', descripcion: '', color: '#10B981' }); }} style={{ backgroundColor: primaryColor }}>
                <Plus className="w-4 h-4 mr-2" /> Nuevo Grupo
              </Button>
              <Button onClick={() => { setModalPersona(true); setFormPersona({ nombre: '', apellido: '', codigo: '', grupoId: '' }); }} variant="outline">
                <UserPlus className="w-4 h-4 mr-2" /> Nueva Persona
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {grupos.map(grupo => (
                <Card key={grupo.id} className="dark:bg-gray-800">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 dark:text-white">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: grupo.color }} />
                        {grupo.nombre}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => eliminarGrupo(grupo.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {personas.filter(p => p.grupoId === grupo.id).length} persona(s)
                    </p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {personas.filter(p => p.grupoId === grupo.id).map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                          <div>
                            <p className="text-sm font-medium dark:text-white">{p.nombre} {p.apellido}</p>
                            <p className="text-xs text-gray-500">{p.codigo}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => eliminarPersona(p.id)}>
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {personas.filter(p => !p.grupoId).length > 0 && (
              <Card className="dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="dark:text-white">Sin grupo asignado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2">
                    {personas.filter(p => !p.grupoId).map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <div>
                          <p className="text-sm font-medium dark:text-white">{p.nombre} {p.apellido}</p>
                          <p className="text-xs text-gray-500">{p.codigo}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => eliminarPersona(p.id)}>
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Imprimir */}
        {seccion === 'imprimir' && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar persona..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="dark:bg-gray-700"
                />
              </div>
              <select
                value={grupoSeleccionado}
                onChange={(e) => setGrupoSeleccionado(e.target.value)}
                className="border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="todos">Todos los grupos</option>
                {grupos.map(g => (
                  <option key={g.id} value={g.id}>{g.nombre}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {personasFiltradas.map(p => (
                <Card key={p.id} className="dark:bg-gray-800">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium dark:text-white">{p.nombre} {p.apellido}</p>
                      <p className="text-sm text-gray-500">{p.codigo}</p>
                    </div>
                    <Button onClick={() => descargarTarjeta(p)} variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" /> Tarjeta
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {personasFiltradas.length === 0 && (
              <p className="text-center text-gray-500 py-8">No hay personas registradas</p>
            )}
          </div>
        )}

        {/* Reportes */}
        {seccion === 'reportes' && (
          <div className="space-y-4">
            <Card className="dark:bg-gray-800">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-sm text-gray-500">Fecha Inicio</label>
                    <Input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="dark:bg-gray-700"
                    />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-sm text-gray-500">Fecha Fin</label>
                    <Input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="dark:bg-gray-700"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => exportarReporte('pdf')} variant="outline">
                      <FileText className="w-4 h-4 mr-2" /> PDF
                    </Button>
                    <Button onClick={() => exportarReporte('excel')} variant="outline">
                      <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-white">Historial de Asistencia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-300">Fecha</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-300">Persona</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-300">Tipo</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-300">Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {asistencias.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                            {new Date(a.fecha).toLocaleDateString('es-ES')}
                          </td>
                          <td className="px-4 py-2">
                            <p className="font-medium text-gray-800 dark:text-white">{a.persona.nombre} {a.persona.apellido}</p>
                            <p className="text-xs text-gray-500">{a.persona.codigo}</p>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${a.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {a.tipo === 'entrada' ? '🟢 Entrada' : '🔴 Salida'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{a.hora}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {asistencias.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No hay registros</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Configuración */}
        {seccion === 'configuracion' && isAdmin && (
          <div className="space-y-4">
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-white">Información de la Organización</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Nombre</label>
                  <p className="font-medium dark:text-white">{tenant?.nombre}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">URL</label>
                  <p className="font-mono text-sm dark:text-white">asisteqr.com/{tenant?.slug}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Plan actual</label>
                  <p className="font-medium capitalize dark:text-white">{tenant?.plan}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Modales */}
      {modalGrupo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md dark:bg-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="dark:text-white">Nuevo Grupo</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setModalGrupo(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Nombre *</label>
                <Input
                  value={formGrupo.nombre}
                  onChange={(e) => setFormGrupo({ ...formGrupo, nombre: e.target.value })}
                  className="dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">Descripción</label>
                <Input
                  value={formGrupo.descripcion}
                  onChange={(e) => setFormGrupo({ ...formGrupo, descripcion: e.target.value })}
                  className="dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formGrupo.color}
                    onChange={(e) => setFormGrupo({ ...formGrupo, color: e.target.value })}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={formGrupo.color}
                    onChange={(e) => setFormGrupo({ ...formGrupo, color: e.target.value })}
                    className="dark:bg-gray-700"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={guardarGrupo} style={{ backgroundColor: primaryColor }} className="flex-1">Guardar</Button>
                <Button variant="outline" onClick={() => setModalGrupo(false)}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {modalPersona && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md dark:bg-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="dark:text-white">Nueva Persona</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setModalPersona(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-gray-500">Nombre *</label>
                  <Input
                    value={formPersona.nombre}
                    onChange={(e) => setFormPersona({ ...formPersona, nombre: e.target.value })}
                    className="dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Apellido *</label>
                  <Input
                    value={formPersona.apellido}
                    onChange={(e) => setFormPersona({ ...formPersona, apellido: e.target.value })}
                    className="dark:bg-gray-700"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Código (opcional)</label>
                <Input
                  value={formPersona.codigo}
                  onChange={(e) => setFormPersona({ ...formPersona, codigo: e.target.value })}
                  className="dark:bg-gray-700"
                  placeholder="Se genera automáticamente"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">Grupo</label>
                <select
                  value={formPersona.grupoId}
                  onChange={(e) => setFormPersona({ ...formPersona, grupoId: e.target.value })}
                  className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Sin grupo</option>
                  {grupos.map(g => (
                    <option key={g.id} value={g.id}>{g.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={guardarPersona} style={{ backgroundColor: primaryColor }} className="flex-1">Guardar</Button>
                <Button variant="outline" onClick={() => setModalPersona(false)}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t py-4 text-center text-sm text-gray-500">
        <p>AsistenciaQR • Sistema multi-tenant</p>
      </footer>
    </div>
  );
}
