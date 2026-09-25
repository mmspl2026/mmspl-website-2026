import { writeClient } from "./sanity/client";

interface AuditLogEntry {
  action: string;
  performedByUid: string;
  performedByName: string;
  seasonYear?: number;
  summary: string;
  ip?: string;
  success?: boolean;
}

/**
 * Records a sensitive admin action. Mirrors logAttempt() in
 * /api/admin/login/route.ts: fire-and-forget, must never block or break the
 * real action it's logging alongside.
 */
export async function logAdminAction(entry: AuditLogEntry) {
  await writeClient
    .create({
      _type: "adminAuditLog",
      ...entry,
      createdAt: new Date().toISOString(),
    })
    .catch(() => {
      // Audit logging must never block or break the action it's logging.
    });
}

export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
