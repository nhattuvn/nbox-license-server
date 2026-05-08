import { NextRequest, NextResponse } from "next/server";
import { redisDel, redisGet } from "@/lib/redis-client";

function authCheck(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET || "";
  return req.headers.get("x-admin-secret") === secret;
}

// POST /api/admin/licenses/reset
export async function POST(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
  }

  const { key } = await req.json();
  if (!key) {
    return NextResponse.json({ status: "error", message: "Missing key" }, { status: 400 });
  }

  const oldMachineId = await redisGet(`machine:${key}`).catch(() => null);
  await redisDel(`machine:${key}`).catch(() => null);
  await redisDel(`activated_at:${key}`).catch(() => null);

  return NextResponse.json({
    status: "success",
    message: `Reset thành công key ${key}`,
    previousMachineId: oldMachineId,
  });
}
