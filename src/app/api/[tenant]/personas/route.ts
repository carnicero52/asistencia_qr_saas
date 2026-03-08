import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantBySlug } from '@/lib/tenant';
import { nanoid } from 'nanoid';

// GET - Listar personas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params;
    const tenant = await getTenantBySlug(tenantSlug);
    
    if (!tenant) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const grupoId = searchParams.get('grupoId');
    const busqueda = searchParams.get('busqueda');

    const where: any = {
      tenantId: tenant.id,
      activo: true,
    };

    if (grupoId) {
      where.grupoId = grupoId;
    }

    if (busqueda) {
      where.OR = [
        { nombre: { contains: busqueda, mode: 'insensitive' } },
        { apellido: { contains: busqueda, mode: 'insensitive' } },
        { codigo: { contains: busqueda, mode: 'insensitive' } },
      ];
    }

    const personas = await db.persona.findMany({
      where,
      include: {
        grupo: true,
      },
      orderBy: [
        { apellido: 'asc' },
        { nombre: 'asc' },
      ]
    });

    return NextResponse.json(personas);
  } catch (error) {
    console.error('Error al obtener personas:', error);
    return NextResponse.json({ error: 'Error al obtener personas' }, { status: 500 });
  }
}

// POST - Crear persona
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params;
    const tenant = await getTenantBySlug(tenantSlug);
    
    if (!tenant) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    const data = await request.json();
    const { nombre, apellido, codigo, grupoId, email, telefono } = data;

    if (!nombre || !apellido) {
      return NextResponse.json({ error: 'Nombre y apellido son requeridos' }, { status: 400 });
    }

    // Verificar límite de personas
    const personasActuales = await db.persona.count({
      where: { tenantId: tenant.id }
    });

    if (personasActuales >= tenant.maxPersonas) {
      return NextResponse.json({ 
        error: `Límite alcanzado: máximo ${tenant.maxPersonas} personas en su plan` 
      }, { status: 403 });
    }

    // Generar código único si no se proporciona
    const codigoFinal = codigo || nanoid(6).toUpperCase();
    
    // Generar código QR único
    const codigoQr = `${tenant.slug}-${nanoid(8)}`;

    const persona = await db.persona.create({
      data: {
        nombre,
        apellido,
        codigo: codigoFinal,
        codigoQr,
        grupoId: grupoId || null,
        email,
        telefono,
        tenantId: tenant.id,
      },
      include: {
        grupo: true,
      }
    });

    // Registrar actividad
    await db.actividad.create({
      data: {
        tenantId: tenant.id,
        accion: 'crear',
        entidad: 'persona',
        entidadId: persona.id,
        detalles: `Persona creada: ${nombre} ${apellido}`,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      }
    });

    return NextResponse.json(persona);
  } catch (error) {
    console.error('Error al crear persona:', error);
    return NextResponse.json({ error: 'Error al crear persona' }, { status: 500 });
  }
}

// PUT - Actualizar persona
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params;
    const tenant = await getTenantBySlug(tenantSlug);
    
    if (!tenant) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    const data = await request.json();
    const { id, nombre, apellido, codigo, grupoId, email, telefono, activo } = data;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const persona = await db.persona.update({
      where: { 
        id,
        tenantId: tenant.id,
      },
      data: {
        nombre,
        apellido,
        codigo,
        grupoId: grupoId || null,
        email,
        telefono,
        activo,
      },
      include: {
        grupo: true,
      }
    });

    return NextResponse.json(persona);
  } catch (error) {
    console.error('Error al actualizar persona:', error);
    return NextResponse.json({ error: 'Error al actualizar persona' }, { status: 500 });
  }
}

// DELETE - Eliminar persona
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params;
    const tenant = await getTenantBySlug(tenantSlug);
    
    if (!tenant) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Soft delete
    const persona = await db.persona.update({
      where: { 
        id,
        tenantId: tenant.id,
      },
      data: { activo: false }
    });

    return NextResponse.json({ success: true, persona });
  } catch (error) {
    console.error('Error al eliminar persona:', error);
    return NextResponse.json({ error: 'Error al eliminar persona' }, { status: 500 });
  }
}
