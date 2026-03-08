import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantBySlug } from '@/lib/tenant';

// GET - Estadísticas del dashboard
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

    // Total personas
    const totalPersonas = await db.persona.count({
      where: { tenantId: tenant.id, activo: true }
    });

    // Total grupos
    const totalGrupos = await db.grupo.count({
      where: { tenantId: tenant.id, activo: true }
    });

    // Asistencias hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyFin = new Date(hoy);
    hoyFin.setHours(23, 59, 59, 999);

    const asistenciasHoy = await db.asistencia.count({
      where: {
        persona: { tenantId: tenant.id },
        fecha: { gte: hoy, lte: hoyFin }
      }
    });

    const entradasHoy = await db.asistencia.count({
      where: {
        persona: { tenantId: tenant.id },
        fecha: { gte: hoy, lte: hoyFin },
        tipo: 'entrada'
      }
    });

    const salidasHoy = await db.asistencia.count({
      where: {
        persona: { tenantId: tenant.id },
        fecha: { gte: hoy, lte: hoyFin },
        tipo: 'salida'
      }
    });

    // Últimos 7 días para gráfico
    const datosGrafico = [];
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      fecha.setHours(0, 0, 0, 0);
      const fechaFin = new Date(fecha);
      fechaFin.setHours(23, 59, 59, 999);

      const total = await db.asistencia.count({
        where: {
          persona: { tenantId: tenant.id },
          fecha: { gte: fecha, lte: fechaFin }
        }
      });

      datosGrafico.push({
        dia: fecha.toLocaleDateString('es-ES', { weekday: 'short' }),
        fecha: fecha.toLocaleDateString('es-ES'),
        total
      });
    }

    // Últimos movimientos
    const ultimosMovimientos = await db.asistencia.findMany({
      where: {
        persona: { tenantId: tenant.id }
      },
      include: {
        persona: { include: { grupo: true } }
      },
      orderBy: { fecha: 'desc' },
      take: 10,
    });

    // Porcentaje de asistencia
    const porcentajeAsistencia = totalPersonas > 0 
      ? Math.round((asistenciasHoy / totalPersonas) * 100) 
      : 0;

    return NextResponse.json({
      totalPersonas,
      totalGrupos,
      asistenciasHoy,
      entradasHoy,
      salidasHoy,
      porcentajeAsistencia,
      datosGrafico,
      ultimosMovimientos,
      tenant: {
        nombre: tenant.nombre,
        plan: tenant.plan,
        maxPersonas: tenant.maxPersonas,
        maxGrupos: tenant.maxGrupos,
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
