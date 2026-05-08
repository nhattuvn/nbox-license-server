/**
 * License Database — Upstash Redis (toàn bộ)
 *
 * Redis key schema:
 *   license_keys              → SET chứa tất cả license keys
 *   license:{key}             → JSON string của LicenseRecord
 *   machine:{key}             → machineId string
 *   activated_at:{key}        → ISO datetime string
 */

import {
  redisGet, redisSet, redisDel,
  redisSadd, redisSrem, redisSmembers,
} from "./redis-client";

export interface LicenseRecord {
  key: string;
  isActive: boolean;
  expiresAt: string | null;
  config?: Record<string, unknown> | null;
  createdAt: string;
}

export interface LicenseWithMachine extends LicenseRecord {
  machineId: string | null;
  activatedAt: string | null;
  expired: boolean;
  status: "activated" | "unused" | "inactive" | "expired";
}

const KEYS_SET = "license_keys";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getAllLicenses(): Promise<LicenseWithMachine[]> {
  const keys = await redisSmembers(KEYS_SET);
  if (!keys.length) return [];

  const records = await Promise.all(
    keys.map(async (k) => {
      const raw = await redisGet(`license:${k}`);
      if (!raw) return null;
      const rec: LicenseRecord = JSON.parse(raw);
      const machineId = await redisGet(`machine:${k}`);
      const activatedAt = await redisGet(`activated_at:${k}`);
      const now = Date.now();
      const expired = rec.expiresAt ? now > new Date(rec.expiresAt).getTime() : false;
      const status: LicenseWithMachine["status"] =
        !rec.isActive ? "inactive"
        : expired ? "expired"
        : machineId ? "activated"
        : "unused";

      return {
        ...rec,
        machineId: machineId || null,
        activatedAt: activatedAt || null,
        expired,
        status,
      } as LicenseWithMachine;
    })
  );

  return records
    .filter(Boolean)
    .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime()) as LicenseWithMachine[];
}

export async function findLicense(key: string): Promise<LicenseRecord | null> {
  const raw = await redisGet(`license:${key}`);
  if (!raw) return null;
  return JSON.parse(raw) as LicenseRecord;
}

export async function getBoundMachineId(key: string): Promise<string | null> {
  return await redisGet(`machine:${key}`);
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createLicense(record: LicenseRecord): Promise<void> {
  await redisSet(`license:${record.key}`, JSON.stringify(record));
  await redisSadd(KEYS_SET, record.key);
}

export async function updateLicense(key: string, patch: Partial<LicenseRecord>): Promise<void> {
  const existing = await findLicense(key);
  if (!existing) throw new Error("License not found");
  const updated = { ...existing, ...patch };
  await redisSet(`license:${key}`, JSON.stringify(updated));
}

export async function deleteLicense(key: string): Promise<void> {
  await redisDel(`license:${key}`);
  await redisDel(`machine:${key}`);
  await redisDel(`activated_at:${key}`);
  await redisSrem(KEYS_SET, key);
}

export async function bindMachine(key: string, machineId: string): Promise<void> {
  await redisSet(`machine:${key}`, machineId);
  await redisSet(`activated_at:${key}`, new Date().toISOString());
}

export async function resetMachine(key: string): Promise<string | null> {
  const old = await redisGet(`machine:${key}`);
  await redisDel(`machine:${key}`);
  await redisDel(`activated_at:${key}`);
  return old || null;
}

// ─── Migrate từ LICENSES_JSON (chạy 1 lần) ───────────────────────────────────

export async function migrateFromEnv(): Promise<number> {
  const raw = process.env.LICENSES_JSON;
  if (!raw) return 0;

  let list: Array<{
    key: string; isActive: boolean; expiresAt: string | null; config?: unknown;
  }> = [];

  try { list = JSON.parse(raw); } catch { return 0; }

  let count = 0;
  for (const item of list) {
    const exists = await findLicense(item.key);
    if (!exists) {
      await createLicense({
        key: item.key,
        isActive: item.isActive,
        expiresAt: item.expiresAt ?? null,
        config: (item.config as Record<string, unknown>) ?? null,
        createdAt: new Date().toISOString(),
      });
      count++;
    }
  }
  return count;
}
