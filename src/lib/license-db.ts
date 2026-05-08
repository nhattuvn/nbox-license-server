/**
 * License Database
 * ----------------
 * - License definitions (key, isActive, expiresAt, config) đọc từ LICENSES_JSON env var
 * - machineId binding được persist vào Redis (Upstash) → không bị mất khi cold start
 *
 * Redis key format: "machine:{licenseKey}" → machineId string
 */

import { redisGet, redisSet } from "./redis-client";

export interface LicenseRecord {
  key: string;
  isActive: boolean;
  expiresAt: string | null;
  machineId: string | null;
  activatedAt: string | null;
  config?: Record<string, unknown> | null;
}

// In-memory cache cho license definitions (chỉ reset khi redeploy — OK vì LICENSES_JSON không đổi thường xuyên)
let _cache: LicenseRecord[] | null = null;

function loadLicenses(): LicenseRecord[] {
  if (_cache !== null) return _cache;

  const raw = process.env.LICENSES_JSON;
  if (!raw) {
    console.warn("[nbox-license] LICENSES_JSON env not set.");
    _cache = [];
    return _cache;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Expected array");
    _cache = parsed as LicenseRecord[];
    return _cache;
  } catch (e) {
    console.error("[nbox-license] Failed to parse LICENSES_JSON:", e);
    _cache = [];
    return _cache;
  }
}

export function findLicenseDefinition(key: string): LicenseRecord | undefined {
  const licenses = loadLicenses();
  return licenses.find((l) => l.key === key);
}

/**
 * Lấy machineId đã bind từ Redis.
 * Trả về null nếu chưa bind.
 */
export async function getBoundMachineId(licenseKey: string): Promise<string | null> {
  try {
    const val = await redisGet(`machine:${licenseKey}`);
    return val ?? null;
  } catch (e) {
    console.error("[nbox-license] Redis GET error:", e);
    return null;
  }
}

/**
 * Persist machineId binding vào Redis — tồn tại vĩnh viễn.
 */
export async function bindMachine(licenseKey: string, machineId: string): Promise<void> {
  try {
    await redisSet(`machine:${licenseKey}`, machineId);
    await redisSet(`activated_at:${licenseKey}`, new Date().toISOString());
  } catch (e) {
    console.error("[nbox-license] Redis SET error:", e);
    throw e;
  }
}

export function invalidateCache(): void {
  _cache = null;
}
