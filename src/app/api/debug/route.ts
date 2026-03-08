import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Probar conexión a la base de datos
    const tenantCount = await db.tenant.count();
    const userCount = await db.usuario.count();

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      tenants: tenantCount,
      users: userCount,
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DIRECT_URL,
        databaseUrlStart: process.env.DATABASE_URL?.substring(0, 30) + '...',
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DIRECT_URL,
      }
    }, { status: 500 });
  }
}
