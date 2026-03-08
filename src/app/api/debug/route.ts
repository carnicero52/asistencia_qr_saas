import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Solo verificar variables de entorno primero
  const hasDb = !!process.env.DATABASE_URL;
  const hasDirect = !!process.env.DIRECT_URL;

  if (!hasDb) {
    return NextResponse.json({
      status: 'error',
      message: 'DATABASE_URL no está configurada',
      env: { hasDatabaseUrl: false, hasDirectUrl: hasDirect }
    }, { status: 500 });
  }

  // Intentar conectar a la base de datos
  try {
    const { db } = await import('@/lib/db');
    const count = await db.tenant.count();

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      tenants: count,
      env: {
        hasDatabaseUrl: true,
        hasDirectUrl: hasDirect,
        urlStart: process.env.DATABASE_URL?.substring(0, 30) + '...'
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      env: { hasDatabaseUrl: true, hasDirectUrl: hasDirect }
    }, { status: 500 });
  }
}
