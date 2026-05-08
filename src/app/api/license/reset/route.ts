import { NextRequest, NextResponse } from "next/server";
import { findLicenseDefinition } from "@/lib/license-db";
import { redisSet, redisGet } from "@/lib/redis-client";

function withCors(res: NextResponse): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Api-Key");
  return res;
}

function err(status: number, code: string, message: string): NextResponse {
  return withCors(NextResponse.json({ status: "error", code, message }, { status }));
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

/**
 * POST /api/license/reset
 * Admin endpoint để reset machineId binding (cho phép user đổi máy).
 * Yêu cầu ADMIN_SECRET trong header X-Admin-Secret.
 */
export async function POST(req: NextRequest) {
  // Check admin secret
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return err(500, "NOT_CONFIGURED", "ADMIN_SECRET chưa được cấu hình.");
  }

  const headerSecret = req.headers.get("x-admin-secret");
  if (headerSecret !== adminSecret) {
    return err(401, "UNAUTHORIZED", "Admin secret không đúng.");
  }

  let body: { key?: string };
  try {
    body = await req.json();
  } catch {
    return err(400, "INVALID_PAYLOAD", "Request body phải là JSON.");
  }

  const key = String(body.key || "").trim();
  if (!key) {
    return err(400, "INVALID_PAYLOAD", "Thiếu license key.");
  }

  // Check key tồn tại
  const record = findLicenseDefinition(key);
  if (!record) {
    return err(404, "LICENSE_NOT_FOUND", "License key không tồn tại.");
  }

  // Lấy machineId cũ để log
  const oldMachineId = await redisGet(`machine:${key}`);

  // Reset: xóa binding
  await redisSet(`machine:${key}`, "");
  await redisSet(`activated_at:${key}`, "");

  return withCors(
    NextResponse.json({
      status: "success",
      message: `Đã reset machineId cho key ${key}.`,
      previousMachineId: oldMachineId || null,
    })
  );
}
