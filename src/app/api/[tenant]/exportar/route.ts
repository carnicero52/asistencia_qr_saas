import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantBySlug } from '@/lib/tenant';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// GET - Exportar reporte
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
    const tipo = searchParams.get('tipo') || 'pdf';
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const grupoId = searchParams.get('grupoId');

    // Construir filtros
    const where: any = {
      persona: { tenantId: tenant.id }
    };

    if (fechaInicio) {
      where.fecha = { ...where.fecha, gte: new Date(fechaInicio) };
    }
    if (fechaFin) {
      where.fecha = { ...where.fecha, lte: new Date(fechaFin + 'T23:59:59') };
    }
    if (grupoId) {
      where.persona.grupoId = grupoId;
    }

    const asistencias = await db.asistencia.findMany({
      where,
      include: {
        persona: { include: { grupo: true } }
      },
      orderBy: { fecha: 'desc' }
    });

    if (tipo === 'excel') {
      return exportExcel(asistencias, tenant.nombre);
    } else {
      return exportPDF(asistencias, tenant.nombre, tenant.logoUrl);
    }

  } catch (error) {
    console.error('Error al exportar:', error);
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 });
  }
}

async function exportPDF(asistencias: any[], nombreTenant: string, logoUrl?: string | null) {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.text(`Reporte de Asistencia - ${nombreTenant}`, 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 14, 28);
  doc.text(`Total registros: ${asistencias.length}`, 14, 34);

  // Tabla
  const headers = [['Fecha', 'Hora', 'Persona', 'Código', 'Grupo', 'Tipo']];
  const data = asistencias.map(a => [
    new Date(a.fecha).toLocaleDateString('es-ES'),
    a.hora,
    `${a.persona.nombre} ${a.persona.apellido}`,
    a.persona.codigo,
    a.persona.grupo?.nombre || '-',
    a.tipo === 'entrada' ? 'Entrada' : 'Salida'
  ]);

  autoTable(doc, {
    head: headers,
    body: data,
    startY: 40,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 185, 129] }
  });

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte_asistencia.pdf"`
    }
  });
}

async function exportExcel(asistencias: any[], nombreTenant: string) {
  const data = asistencias.map(a => ({
    Fecha: new Date(a.fecha).toLocaleDateString('es-ES'),
    Hora: a.hora,
    Nombre: a.persona.nombre,
    Apellido: a.persona.apellido,
    Código: a.persona.codigo,
    Grupo: a.persona.grupo?.nombre || '-',
    Tipo: a.tipo === 'entrada' ? 'Entrada' : 'Salida',
    Método: a.metodo
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asistencias');

  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(excelBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reporte_asistencia.xlsx"`
    }
  });
}
