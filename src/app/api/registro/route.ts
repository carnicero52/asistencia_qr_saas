import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

// Generar slug único
function generateSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50) || 'org';
}

// Verificar si slug está disponible
async function isSlugAvailable(slug: string): Promise<boolean> {
  try {
    const existing = await db.tenant.findUnique({
      where: { slug },
      select: { id: true }
    });
    return !existing;
  } catch {
    return true;
  }
}

// POST - Registrar nueva organización
export async function POST(request: NextRequest) {
  console.log('=== INICIO REGISTRO ===');

  try {
    const body = await request.json();
    console.log('Body recibido:', JSON.stringify(body));

    const { nombre, slug: requestedSlug, adminNombre, adminUsername, adminPassword, adminEmail } = body;

    // Validaciones
    if (!nombre || !adminNombre || !adminUsername || !adminPassword) {
      console.log('Faltan campos:', { nombre: !!nombre, adminNombre: !!adminNombre, adminUsername: !!adminUsername, adminPassword: !!adminPassword });
      return NextResponse.json({
        success: false,
        error: 'Faltan campos requeridos',
        required: ['nombre', 'adminNombre', 'adminUsername', 'adminPassword']
      }, { status: 400 });
    }

    // Generar slug único
    let slug = requestedSlug || generateSlug(nombre);
    console.log('Slug inicial:', slug);

    // Asegurar que el slug sea único
    let counter = 0;
    let finalSlug = slug;
    while (!(await isSlugAvailable(finalSlug))) {
      counter++;
      finalSlug = `${slug}-${counter}`;
      console.log('Intentando slug:', finalSlug);
      if (counter > 100) {
        return NextResponse.json({
          success: false,
          error: 'No se pudo generar un slug único'
        }, { status: 500 });
      }
    }
    slug = finalSlug;
    console.log('Slug final:', slug);

    // Hashear contraseña
    const hashedPassword = createHash('sha256').update(adminPassword).digest('hex');
    console.log('Password hasheado');

    // Crear tenant
    console.log('Creando tenant...');
    const tenant = await db.tenant.create({
      data: {
        slug,
        nombre,
        emailContacto: adminEmail || null,
      }
    });
    console.log('Tenant creado:', tenant.id);

    // Crear usuario admin
    console.log('Creando usuario admin...');
    const admin = await db.usuario.create({
      data: {
        username: adminUsername,
        password: hashedPassword,
        nombre: adminNombre,
        email: adminEmail || null,
        rol: 'admin',
        tenantId: tenant.id,
      }
    });
    console.log('Admin creado:', admin.id);

    // Crear configuración
    console.log('Creando configuración...');
    await db.configuracion.create({
      data: {
        tenantId: tenant.id,
        nombreInstitucion: nombre,
      }
    });
    console.log('Configuración creada');

    // Registrar actividad (opcional, no fallar si hay error)
    try {
      await db.actividad.create({
        data: {
          tenantId: tenant.id,
          usuarioId: admin.id,
          accion: 'registro',
          entidad: 'tenant',
          entidadId: tenant.id,
          detalles: `Organización registrada: ${nombre}`,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        }
      });
    } catch (e) {
      console.log('Actividad no registrada (no crítico):', e);
    }

    console.log('=== REGISTRO EXITOSO ===');

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        nombre: tenant.nombre,
      },
      admin: {
        id: admin.id,
        username: admin.username,
        nombre: admin.nombre,
      },
      loginUrl: `/${slug}`,
    });

  } catch (error) {
    console.error('=== ERROR EN REGISTRO ===');
    console.error('Error:', error);

    let errorMessage = 'Error desconocido';
    let errorDetails = '';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';

      // Detectar errores específicos de Prisma
      if (error.message.includes('Unique constraint')) {
        errorMessage = 'El nombre de usuario o slug ya existe';
      } else if (error.message.includes('Foreign key')) {
        errorMessage = 'Error de referencia en la base de datos';
      } else if (error.message.includes('Connection')) {
        errorMessage = 'Error de conexión a la base de datos';
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: errorDetails.substring(0, 300),
    }, { status: 500 });
  }
}

// GET - Verificar disponibilidad de slug
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'Slug requerido' }, { status: 400 });
  }

  try {
    const available = await isSlugAvailable(slug);

    return NextResponse.json({
      slug,
      available,
      message: available ? 'Disponible' : 'No disponible'
    });
  } catch (error) {
    return NextResponse.json({
      slug,
      available: true,
      message: 'Error verificando, asumimos disponible'
    });
  }
}
