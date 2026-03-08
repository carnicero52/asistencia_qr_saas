import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';
import { getTenantBySlug } from '@/lib/tenant';

// POST - Login
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params;
    const data = await request.json();
    const { username, password } = data;

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 });
    }

    // Obtener tenant
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    if (!tenant.activo) {
      return NextResponse.json({ error: 'Organización inactiva' }, { status: 403 });
    }

    // Buscar usuario
    const usuario = await db.usuario.findFirst({
      where: {
        username,
        tenantId: tenant.id,
        activo: true,
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 });
    }

    // Verificar contraseña
    const hashedPassword = createHash('sha256').update(password).digest('hex');
    const passwordMatch = usuario.password === hashedPassword || usuario.password === password;

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

    // Crear sesión
    const { nanoid } = await import('nanoid');
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await db.sesion.create({
      data: {
        usuarioId: usuario.id,
        token,
        expiresAt,
      }
    });

    // Registrar actividad
    try {
      await db.actividad.create({
        data: {
          tenantId: tenant.id,
          usuarioId: usuario.id,
          accion: 'login',
          entidad: 'sesion',
          detalles: 'Inicio de sesión',
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        }
      });
    } catch {
      // No fallar si no se puede registrar actividad
    }

    return NextResponse.json({
      success: true,
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        nombre: tenant.nombre,
        logoUrl: tenant.logoUrl,
        colorPrimario: tenant.colorPrimario,
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 });
  }
}

// DELETE - Logout
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (token) {
      await db.sesion.deleteMany({ where: { token } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en logout:', error);
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 });
  }
}

// GET - Verificar sesión o obtener info del tenant
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params;

    // Primero verificar que el tenant existe
    const tenant = await getTenantBySlug(tenantSlug);

    if (!tenant) {
      return NextResponse.json({ error: 'Organización no encontrada', exists: false }, { status: 404 });
    }

    if (!tenant.activo) {
      return NextResponse.json({ error: 'Organización inactiva', exists: false }, { status: 403 });
    }

    // Verificar si hay token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      // No hay token, pero el tenant existe - devolver info para login
      return NextResponse.json({
        exists: true,
        valid: false,
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          nombre: tenant.nombre,
          logoUrl: tenant.logoUrl,
          colorPrimario: tenant.colorPrimario,
          colorSecundario: tenant.colorSecundario,
          plan: tenant.plan,
        }
      });
    }

    // Verificar sesión
    const sesion = await db.sesion.findUnique({
      where: { token },
      include: {
        usuario: {
          include: {
            tenant: true,
          }
        }
      }
    });

    if (!sesion) {
      return NextResponse.json({
        exists: true,
        valid: false,
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          nombre: tenant.nombre,
          logoUrl: tenant.logoUrl,
          colorPrimario: tenant.colorPrimario,
          colorSecundario: tenant.colorSecundario,
          plan: tenant.plan,
        }
      });
    }

    if (sesion.expiresAt < new Date()) {
      await db.sesion.delete({ where: { id: sesion.id } });
      return NextResponse.json({
        exists: true,
        valid: false,
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          nombre: tenant.nombre,
          logoUrl: tenant.logoUrl,
          colorPrimario: tenant.colorPrimario,
          colorSecundario: tenant.colorSecundario,
          plan: tenant.plan,
        }
      });
    }

    if (sesion.usuario.tenant.slug !== tenantSlug) {
      return NextResponse.json({ valid: false, error: 'Sesión no pertenece a esta organización' }, { status: 403 });
    }

    return NextResponse.json({
      exists: true,
      valid: true,
      usuario: {
        id: sesion.usuario.id,
        username: sesion.usuario.username,
        nombre: sesion.usuario.nombre,
        email: sesion.usuario.email,
        rol: sesion.usuario.rol,
      },
      tenant: sesion.usuario.tenant,
    });

  } catch (error) {
    console.error('Error verificando sesión:', error);
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 });
  }
}
