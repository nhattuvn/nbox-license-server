import { NextRequest, NextResponse } from "next/server";
import { migrateFromEnv } from "@/lib/license-db";

function auth(req: NextRequest) {
  return req.headers.get("x-admin-secret") === (process.env.ADMIN_SECRET || "");
}

// POST /api/admin/migrate — migrate LICENSES_JSON env var vào Redis (chạy 1 lần)
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
  const count = await migrateFromEnv();
  return NextResponse.json({ status: "success", message: `Đã migrate ${count} licenses vào Redis.`, count });
}
