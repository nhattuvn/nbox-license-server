import { NextRequest, NextResponse } from "next/server";
import { deleteLicense } from "@/lib/license-db";

function auth(req: NextRequest) {
  return req.headers.get("x-admin-secret") === (process.env.ADMIN_SECRET || "");
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
  const { key } = await req.json();
  if (!key) return NextResponse.json({ status: "error", message: "Thiếu key" }, { status: 400 });
  await deleteLicense(key);
  return NextResponse.json({ status: "success", message: `Đã xóa ${key}` });
}
