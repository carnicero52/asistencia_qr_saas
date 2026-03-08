# Sistema de Asistencia QR - Multi-Tenant

Sistema completo multi-tenant de control de asistencia mediante código QR.

## 🏢 Arquitectura Multi-Tenant

Una **sola instalación** puede servir a **múltiples organizaciones**:
- Cada organización tiene su propia URL: `asisteqr.com/mi-escuela`
- Datos completamente aislados entre organizaciones
- Logo y colores personalizados por organización
- Usuarios y permisos por organización

## ✨ Características

### Para cada Organización
- 📊 Dashboard con estadísticas
- 👥 Gestión de grupos y personas
- 📱 Registro de asistencia QR (cámara o imagen)
- 🖨️ Tarjetas QR descargables
- 📈 Reportes con filtros por fecha
- 📤 Exportar a PDF y Excel
- ⚙️ Configuración personalizada

### Para el Super Admin
- 🏢 Gestión de todas las organizaciones
- 📊 Estadísticas globales
- 🔧 Control de planes y límites
- 👁️ Auditoría de actividades

## 🚀 Inicio Rápido

### 1. Crear una nueva organización

Visita `/registro` y completa el formulario:
- Nombre de la organización
- Datos del administrador

### 2. Acceder a tu organización

Ve a `/tu-organizacion` y inicia sesión con las credenciales del administrador.

## 📋 Variables de Entorno

```env
# Base de datos Neon PostgreSQL
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Clave secreta para sesiones
AUTH_SECRET="tu-clave-secreta"

# Clave del super-admin (para API)
SUPER_ADMIN_KEY="tu-clave-super-admin"
```

## 🔐 Credenciales

### Super Admin (gestión global)
- Acceder a: `/super-admin`
- Key: La que configures en `SUPER_ADMIN_KEY`

### Admin de organización
- Se crea al registrar una nueva organización
- Usuario/contraseña: Los que definas al registrar

## 🛠️ Tecnologías

- **Frontend**: Next.js 16, React 19, TypeScript
- **Estilos**: Tailwind CSS 4, shadcn/ui
- **Base de datos**: PostgreSQL (Neon)
- **ORM**: Prisma
- **QR**: html5-qrcode

## 📝 Planes

| Plan | Personas | Grupos | Usuarios | Precio |
|------|----------|--------|----------|--------|
| Gratis | 100 | 10 | 5 | $0/mes |
| Básico | 500 | 20 | 10 | $9/mes |
| Premium | ∞ | ∞ | ∞ | $29/mes |

## 📄 Licencia

MIT
