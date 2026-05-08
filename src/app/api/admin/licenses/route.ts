import { NextRequest, NextResponse } from "next/server";
import { getAllLicenses, createLicense } from "@/lib/license-db";

function auth(req: NextRequest) {
  return req.headers.get("x-admin-secret") === (process.env.ADMIN_SECRET || "");
}

// GET — list all
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
  const licenses = await getAllLicenses();
  return NextResponse.json({ status: "success", licenses });
}

// POST — create new
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

  const { key, expiresAt, isActive } = await req.json();
  if (!key?.trim()) return NextResponse.json({ status: "error", message: "Thiếu key" }, { status: 400 });

  await createLicense({
    key: key.trim(),
    isActive: isActive !== false,
    expiresAt: expiresAt || null,
    config: null,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ status: "success", message: `Đã tạo key ${key}` });
}
