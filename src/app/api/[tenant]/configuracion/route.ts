import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantBySlug } from '@/lib/tenant';

// GET - Obtener configuración
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

    const config = await db.configuracion.findUnique({
      where: { tenantId: tenant.id }
    });

    return NextResponse.json({
      ...config,
      tenantId: tenant.id,
      nombreInstitucion: config?.nombreInstitucion || tenant.nombre,
      logoUrl: tenant.logoUrl,
      colorPrimario: tenant.colorPrimario,
      colorSecundario: tenant.colorSecundario,
    });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

// PUT - Actualizar configuración
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
    const { nombreInstitucion, logoUrl, colorPrimario, colorSecundario, toleranciaMinutos, emailNotificaciones, activarNotificaciones } = data;

    // Actualizar tenant
    const tenantUpdated = await db.tenant.update({
      where: { id: tenant.id },
      data: {
        nombre: nombreInstitucion,
        logoUrl,
        colorPrimario,
        colorSecundario,
      }
    });

    // Actualizar o crear configuración
    const config = await db.configuracion.upsert({
      where: { tenantId: tenant.id },
      update: {
        nombreInstitucion,
        toleranciaMinutos,
        emailNotificaciones,
        activarNotificaciones,
      },
      create: {
        tenantId: tenant.id,
        nombreInstitucion,
        toleranciaMinutos: toleranciaMinutos || 15,
        emailNotificaciones,
        activarNotificaciones: activarNotificaciones || false,
      }
    });

    // Registrar actividad
    await db.actividad.create({
      data: {
        tenantId: tenant.id,
        accion: 'actualizar',
        entidad: 'configuracion',
        detalles: 'Configuración actualizada',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      }
    });

    return NextResponse.json({
      ...config,
      logoUrl: tenantUpdated.logoUrl,
      colorPrimario: tenantUpdated.colorPrimario,
      colorSecundario: tenantUpdated.colorSecundario,
    });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}
