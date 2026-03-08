import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantBySlug } from '@/lib/tenant';

// GET - Listar asistencias
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
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const personaId = searchParams.get('personaId');

    const where: any = {
      persona: { tenantId: tenant.id }
    };

    if (fechaInicio) {
      where.fecha = { ...where.fecha, gte: new Date(fechaInicio) };
    }
    if (fechaFin) {
      where.fecha = { ...where.fecha, lte: new Date(fechaFin + 'T23:59:59') };
    }
    if (personaId) {
      where.personaId = personaId;
    }

    const asistencias = await db.asistencia.findMany({
      where,
      include: {
        persona: {
          include: { grupo: true }
        },
        registrador: true,
      },
      orderBy: { fecha: 'desc' },
      take: 500,
    });

    return NextResponse.json(asistencias);
  } catch (error) {
    console.error('Error al obtener asistencias:', error);
    return NextResponse.json({ error: 'Error al obtener asistencias' }, { status: 500 });
  }
}

// POST - Registrar asistencia
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
    const { codigoQr, personaId, tipo, metodo, notas } = data;

    let persona;

    if (codigoQr) {
      persona = await db.persona.findFirst({
        where: {
          codigoQr,
          tenantId: tenant.id,
          activo: true,
        },
        include: { grupo: true }
      });
    } else if (personaId) {
      persona = await db.persona.findFirst({
        where: {
          id: personaId,
          tenantId: tenant.id,
          activo: true,
        },
        include: { grupo: true }
      });
    }

    if (!persona) {
      return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
    }

    // Determinar tipo (entrada/salida)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const ultimaAsistencia = await db.asistencia.findFirst({
      where: {
        personaId: persona.id,
        fecha: { gte: hoy }
      },
      orderBy: { fecha: 'desc' }
    });

    const tipoFinal = tipo || (ultimaAsistencia?.tipo === 'entrada' ? 'salida' : 'entrada');

    // Crear asistencia
    const now = new Date();
    const hora = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const asistencia = await db.asistencia.create({
      data: {
        personaId: persona.id,
        tipo: tipoFinal,
        fecha: now,
        hora,
        metodo: metodo || 'qr',
        notas,
      },
      include: {
        persona: { include: { grupo: true } }
      }
    });

    // Registrar actividad
    await db.actividad.create({
      data: {
        tenantId: tenant.id,
        accion: 'registrar',
        entidad: 'asistencia',
        entidadId: asistencia.id,
        detalles: `${tipoFinal}: ${persona.nombre} ${persona.apellido}`,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      }
    });

    return NextResponse.json({
      success: true,
      tipo: tipoFinal,
      persona,
      asistencia,
    });

  } catch (error) {
    console.error('Error al registrar asistencia:', error);
    return NextResponse.json({ error: 'Error al registrar asistencia' }, { status: 500 });
  }
}

// DELETE - Borrar historial
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

    const data = await request.json();
    const { confirmar, fechaInicio, fechaFin } = data;

    if (!confirmar) {
      return NextResponse.json({ error: 'Confirmación requerida' }, { status: 400 });
    }

    const where: any = {
      persona: { tenantId: tenant.id }
    };

    if (fechaInicio || fechaFin) {
      where.fecha = {};
      if (fechaInicio) where.fecha.gte = new Date(fechaInicio);
      if (fechaFin) where.fecha.lte = new Date(fechaFin + 'T23:59:59');
    }

    const result = await db.asistencia.deleteMany({ where });

    return NextResponse.json({ 
      success: true, 
      eliminados: result.count 
    });
  } catch (error) {
    console.error('Error al borrar asistencias:', error);
    return NextResponse.json({ error: 'Error al borrar asistencias' }, { status: 500 });
  }
}
