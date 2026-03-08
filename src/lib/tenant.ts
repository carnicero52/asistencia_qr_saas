import { db } from '@/lib/db';

export async function getTenantBySlug(slug: string) {
  return db.tenant.findUnique({
    where: { slug },
  });
}

export async function getTenantById(id: string) {
  return db.tenant.findUnique({
    where: { id },
  });
}

export async function getTenantConfig(tenantId: string) {
  return db.configuracion.findUnique({
    where: { tenantId },
  });
}

export function generateTenantSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await db.tenant.findUnique({
    where: { slug },
    select: { id: true }
  });
  return !existing;
}

export function isValidTenantSlug(slug: string): boolean {
  // Validar formato del slug
  const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
  return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50;
}

export async function logTenantActivity(
  tenantId: string,
  accion: string,
  entidad: string,
  entidadId?: string,
  detalles?: string,
  usuarioId?: string,
  ip?: string | null
): Promise<void> {
  await db.actividad.create({
    data: {
      tenantId,
      accion,
      entidad,
      entidadId,
      detalles,
      usuarioId,
      ip,
    }
  });
}

/**
 * Extraer el slug del tenant de la URL
 * Ejemplo: /demo/dashboard -> "demo"
 */
export function getTenantFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  
  // Rutas especiales que no son tenants
  const specialRoutes = ['api', 'registro', 'super-admin', '_next', 'favicon.ico'];
  
  if (segments.length === 0) return null;
  if (specialRoutes.includes(segments[0])) return null;
  
  // El primer segmento es el tenant slug
  return segments[0];
}
