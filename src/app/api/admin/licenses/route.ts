import { NextRequest, NextResponse } from "next/server";
import { findLicenseDefinition } from "@/lib/license-db";
import { redisGet } from "@/lib/redis-client";

function authCheck(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET || "";
  return req.headers.get("x-admin-secret") === secret;
}

function err(status: number, message: string) {
  return NextResponse.json({ status: "error", message }, { status });
}

// GET /api/admin/licenses — list all licenses
export async function GET(req: NextRequest) {
  if (!authCheck(req)) return err(401, "Unauthorized");

  const raw = process.env.LICENSES_JSON || "[]";
  let licenses: {
    key: string;
    isActive: boolean;
    expiresAt: string | null;
    machineId?: string | null;
    activatedAt?: string | null;
    config?: unknown;
  }[] = [];

  try {
    licenses = JSON.parse(raw);
  } catch {
    return err(500, "LICENSES_JSON parse error");
  }

  // Enrich với machineId từ Redis
  const enriched = await Promise.all(
    licenses.map(async (l) => {
      const machineId = await redisGet(`machine:${l.key}`).catch(() => null);
      const activatedAt = await redisGet(`activated_at:${l.key}`).catch(() => null);
      const now = new Date();
      const expired = l.expiresAt ? now > new Date(l.expiresAt) : false;

      return {
        key: l.key,
        isActive: l.isActive,
        expiresAt: l.expiresAt,
        machineId: machineId || null,
        activatedAt: activatedAt || null,
        expired,
        status: !l.isActive
          ? "inactive"
          : expired
          ? "expired"
          : machineId
          ? "activated"
          : "unused",
      };
    })
  );

  return NextResponse.json({ status: "success", licenses: enriched });
}
