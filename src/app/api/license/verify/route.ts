import { NextRequest, NextResponse } from "next/server";
import { findLicense, bindMachine } from "@/lib/license-db";

// ─── Types ───────────────────────────────────────────────────────────────────

interface VerifyBody {
  key: string;
  machineId: string;
  extensionVersion?: string;
  channel?: string;
}

// ─── Default config returned to extension ────────────────────────────────────

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

// ─── CORS helper ─────────────────────────────────────────────────────────────

function withCors(res: NextResponse): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Api-Key");
  return res;
}

function err(status: number, code: string, message: string): NextResponse {
  return withCors(
    NextResponse.json({ status: "error", code, message }, { status })
  );
}

// ─── OPTIONS (preflight) ─────────────────────────────────────────────────────

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

// ─── POST /api/license/verify ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Partial<VerifyBody>;
  try {
    body = await req.json();
  } catch {
    return err(400, "INVALID_PAYLOAD", "Request body phải là JSON hợp lệ.");
  }

  const key = String(body.key || "").trim();
  const machineId = String(body.machineId || "").trim();

  // ── Validate payload ──────────────────────────────────────────────────────
  if (!key || !machineId) {
    return err(400, "INVALID_PAYLOAD", "Thiếu key hoặc machineId.");
  }

  // ── Find license ──────────────────────────────────────────────────────────
  const record = findLicense(key);
  if (!record) {
    return err(401, "LICENSE_NOT_FOUND", "License key không tồn tại.");
  }

  if (!record.isActive) {
    return err(401, "LICENSE_INACTIVE", "License đã bị khóa hoặc revoke.");
  }

  if (record.expiresAt) {
    const expiry = new Date(record.expiresAt);
    if (isNaN(expiry.getTime())) {
      return err(500, "INTERNAL_ERROR", "Dữ liệu license không hợp lệ.");
    }
    if (Date.now() > expiry.getTime()) {
      return err(401, "LICENSE_EXPIRED", "License đã hết hạn.");
    }
  }

  // ── Machine binding ────────────────────────────────────────────────────────
  if (!record.machineId) {
    // First activation — bind this machine
    bindMachine(key, machineId);
  } else if (record.machineId !== machineId) {
    return err(403, "MACHINE_MISMATCH", "License đã được kích hoạt trên máy khác.");
  }

  // ── Build masked key ───────────────────────────────────────────────────────
  const parts = key.split("-");
  const keyMasked =
    parts.length >= 3
      ? [parts[0], "****", ...parts.slice(2)].join("-")
      : key.slice(0, 4) + "****";

  // ── Success ────────────────────────────────────────────────────────────────
  const config = record.config ?? DEFAULT_CONFIG;

  return withCors(
    NextResponse.json(
      {
        status: "success",
        license: {
          keyMasked,
          isActive: true,
          expiresAt: record.expiresAt ?? null,
          machineId: record.machineId ?? machineId,
        },
        config,
        serverTime: new Date().toISOString(),
      },
      { status: 200 }
    )
  );
}
