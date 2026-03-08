import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const SUPER_ADMIN_KEY = process.env.SUPER_ADMIN_KEY || 'super-admin-secret-2024';

// Verificar autenticación de super admin
function verifySuperAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const key = authHeader?.replace('Bearer ', '');
  return key === SUPER_ADMIN_KEY;
}

// GET - Listar todos los tenants
export async function GET(request: NextRequest) {
  if (!verifySuperAdmin(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const tenants = await db.tenant.findMany({
      include: {
        _count: {
          select: {
            usuarios: true,
            personas: true,
            grupos: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Obtener estadísticas de asistencia por tenant
    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const asistenciasHoy = await db.asistencia.count({
          where: {
            persona: { tenantId: tenant.id },
            fecha: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999))
            }
          }
        });

        return {
          ...tenant,
          asistenciasHoy,
        };
      })
    );

    return NextResponse.json(tenantsWithStats);
  } catch (error) {
    console.error('Error al listar tenants:', error);
    return NextResponse.json({ error: 'Error al obtener tenants' }, { status: 500 });
  }
}

// POST - Crear tenant (super admin)
export async function POST(request: NextRequest) {
  if (!verifySuperAdmin(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { slug, nombre, plan, maxUsuarios, maxPersonas, maxGrupos, emailContacto } = data;

    if (!slug || !nombre) {
      return NextResponse.json({ error: 'Slug y nombre son requeridos' }, { status: 400 });
    }

    const tenant = await db.tenant.create({
      data: {
        slug,
        nombre,
        plan: plan || 'gratis',
        maxUsuarios: maxUsuarios || 5,
        maxPersonas: maxPersonas || 100,
        maxGrupos: maxGrupos || 10,
        emailContacto,
      }
    });

    // Crear configuración por defecto
    await db.configuracion.create({
      data: {
        tenantId: tenant.id,
        nombreInstitucion: nombre,
      }
    });

    return NextResponse.json(tenant);
  } catch (error) {
    console.error('Error al crear tenant:', error);
    return NextResponse.json({ error: 'Error al crear tenant' }, { status: 500 });
  }
}

// PUT - Actualizar tenant
export async function PUT(request: NextRequest) {
  if (!verifySuperAdmin(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { id, ...updates } = data;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const tenant = await db.tenant.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(tenant);
  } catch (error) {
    console.error('Error al actualizar tenant:', error);
    return NextResponse.json({ error: 'Error al actualizar tenant' }, { status: 500 });
  }
}

// DELETE - Eliminar tenant (soft delete)
export async function DELETE(request: NextRequest) {
  if (!verifySuperAdmin(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Soft delete
    const tenant = await db.tenant.update({
      where: { id },
      data: { activo: false },
    });

    return NextResponse.json({ success: true, tenant });
  } catch (error) {
    console.error('Error al eliminar tenant:', error);
    return NextResponse.json({ error: 'Error al eliminar tenant' }, { status: 500 });
  }
}
