import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantBySlug } from '@/lib/tenant';
import { nanoid } from 'nanoid';

// GET - Listar grupos
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

    const grupos = await db.grupo.findMany({
      where: { 
        tenantId: tenant.id,
        activo: true,
      },
      include: {
        _count: {
          select: { personas: true }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    return NextResponse.json(grupos);
  } catch (error) {
    console.error('Error al obtener grupos:', error);
    return NextResponse.json({ error: 'Error al obtener grupos' }, { status: 500 });
  }
}

// POST - Crear grupo
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
    const { nombre, descripcion, color } = data;

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    // Verificar límite de grupos
    const gruposActuales = await db.grupo.count({
      where: { tenantId: tenant.id }
    });

    if (gruposActuales >= tenant.maxGrupos) {
      return NextResponse.json({ 
        error: `Límite alcanzado: máximo ${tenant.maxGrupos} grupos en su plan` 
      }, { status: 403 });
    }

    const grupo = await db.grupo.create({
      data: {
        nombre,
        descripcion,
        color: color || '#10B981',
        tenantId: tenant.id,
      }
    });

    // Registrar actividad
    await db.actividad.create({
      data: {
        tenantId: tenant.id,
        accion: 'crear',
        entidad: 'grupo',
        entidadId: grupo.id,
        detalles: `Grupo creado: ${nombre}`,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      }
    });

    return NextResponse.json(grupo);
  } catch (error) {
    console.error('Error al crear grupo:', error);
    return NextResponse.json({ error: 'Error al crear grupo' }, { status: 500 });
  }
}

// PUT - Actualizar grupo
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
    const { id, nombre, descripcion, color, activo } = data;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const grupo = await db.grupo.update({
      where: { 
        id,
        tenantId: tenant.id,
      },
      data: {
        nombre,
        descripcion,
        color,
        activo,
      }
    });

    return NextResponse.json(grupo);
  } catch (error) {
    console.error('Error al actualizar grupo:', error);
    return NextResponse.json({ error: 'Error al actualizar grupo' }, { status: 500 });
  }
}

// DELETE - Eliminar grupo
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
    const grupo = await db.grupo.update({
      where: { 
        id,
        tenantId: tenant.id,
      },
      data: { activo: false }
    });

    return NextResponse.json({ success: true, grupo });
  } catch (error) {
    console.error('Error al eliminar grupo:', error);
    return NextResponse.json({ error: 'Error al eliminar grupo' }, { status: 500 });
  }
}
