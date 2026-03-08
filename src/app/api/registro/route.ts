import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';
import { generateTenantSlug, isSlugAvailable } from '@/lib/tenant';
import { nanoid } from 'nanoid';

// POST - Registrar nueva organización
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { nombre, slug: requestedSlug, adminNombre, adminUsername, adminPassword, adminEmail } = data;

    if (!nombre || !adminNombre || !adminUsername || !adminPassword) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos: nombre, adminNombre, adminUsername, adminPassword' 
      }, { status: 400 });
    }

    // Generar o validar slug
    let slug = requestedSlug || generateTenantSlug(nombre);
    
    // Verificar disponibilidad del slug
    const available = await isSlugAvailable(slug);
    if (!available) {
      let counter = 1;
      while (!(await isSlugAvailable(`${slug}-${counter}`))) {
        counter++;
      }
      slug = `${slug}-${counter}`;
    }

    // Hashear contraseña
    const hashedPassword = createHash('sha256').update(adminPassword).digest('hex');

    // Crear tenant con admin
    const tenant = await db.tenant.create({
      data: {
        slug,
        nombre,
        emailContacto: adminEmail,
      }
    });

    // Crear usuario admin
    const admin = await db.usuario.create({
      data: {
        username: adminUsername,
        password: hashedPassword,
        nombre: adminNombre,
        email: adminEmail,
        rol: 'admin',
        tenantId: tenant.id,
      }
    });

    // Crear configuración por defecto
    await db.configuracion.create({
      data: {
        tenantId: tenant.id,
        nombreInstitucion: nombre,
      }
    });

    // Registrar actividad
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
    console.error('Error al registrar organización:', error);
    return NextResponse.json({ 
      error: 'Error al registrar organización',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
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

  const available = await isSlugAvailable(slug);

  return NextResponse.json({
    slug,
    available,
    message: available ? 'Disponible' : 'No disponible'
  });
}
