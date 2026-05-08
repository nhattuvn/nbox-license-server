import { NextRequest, NextResponse } from "next/server";
import { findLicense, getBoundMachineId, bindMachine } from "@/lib/license-db";

const DEFAULT_CONFIG = {
  selectorOverrides: {
    editorSelector: '[data-slate-editor="true"][contenteditable="true"]',
    sendButtonSelector: ".sc-84e494b2-4",
    menuTriggerSelector: "",
    menuContentSelector: "[data-radix-menu-content]",
  },
  timing: {
    flowMenuRecentWindowMs: 20000,
    waitOpenMenuRootTimeoutMs: 2800,
    collectDeadlineMs: 12000,
  },
  images: {
    scrollContainerSelectors: [
      '[data-testid*="virtuoso"]',
      "[data-virtuoso-scroller]",
    ],
  },
};

function withCors(res: NextResponse): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Api-Key");
  return res;
}

function err(status: number, code: string, message: string) {
  return withCors(NextResponse.json({ status: "error", code, message }, { status }));
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  let body: { key?: string; machineId?: string; extensionVersion?: string; channel?: string };
  try { body = await req.json(); }
  catch { return err(400, "INVALID_PAYLOAD", "Request body phải là JSON hợp lệ."); }

  const key = String(body.key || "").trim();
  const machineId = String(body.machineId || "").trim();

  if (!key || !machineId) return err(400, "INVALID_PAYLOAD", "Thiếu key hoặc machineId.");

  const record = await findLicense(key);
  if (!record) return err(401, "LICENSE_NOT_FOUND", "License key không tồn tại.");
  if (!record.isActive) return err(401, "LICENSE_INACTIVE", "License đã bị khóa.");

  if (record.expiresAt) {
    if (Date.now() > new Date(record.expiresAt).getTime()) {
      return err(401, "LICENSE_EXPIRED", "License đã hết hạn.");
    }
  }

  let boundMachineId: string | null = null;
  try { boundMachineId = await getBoundMachineId(key); }
  catch { return err(500, "INTERNAL_ERROR", "Không thể kết nối database."); }

  if (!boundMachineId) {
    try { await bindMachine(key, machineId); }
    catch { return err(500, "INTERNAL_ERROR", "Không thể lưu kích hoạt."); }
  } else if (boundMachineId !== machineId) {
    return err(403, "MACHINE_MISMATCH", "License đã kích hoạt trên máy khác. Liên hệ admin để reset.");
  }

  const parts = key.split("-");
  const keyMasked = parts.length >= 3 ? [parts[0], "****", ...parts.slice(2)].join("-") : key.slice(0, 4) + "****";
  const config = record.config ?? DEFAULT_CONFIG;

  return withCors(NextResponse.json({
    status: "success",
    license: { keyMasked, isActive: true, expiresAt: record.expiresAt ?? null, machineId: boundMachineId ?? machineId },
    config,
    serverTime: new Date().toISOString(),
  }));
}
