/**
 * License Database
 * ----------------
 * Lưu trữ licenses dưới dạng JSON trong biến môi trường LICENSES_JSON.
 * Format:
 * [
 *   {
 *     "key": "NBOX-XXXX-YYYY-ZZZZ",
 *     "isActive": true,
 *     "expiresAt": "2027-12-31T23:59:59.000Z",
 *     "machineId": null,
 *     "activatedAt": null,
 *     "config": null
 *   }
 * ]
 *
 * Để thêm license: cập nhật biến môi trường LICENSES_JSON trên Vercel.
 * Lưu ý: machineId sẽ được persist vào env thông qua Vercel API (nếu cấu hình),
 * hoặc chỉ in-memory (reset khi redeploy). Dùng LICENSES_JSON_MUTABLE=true để
 * enable Vercel env write-back qua VERCEL_TOKEN + VERCEL_PROJECT_ID.
 */

export interface LicenseRecord {
  key: string;
  isActive: boolean;
  expiresAt: string | null;
  machineId: string | null;
  activatedAt: string | null;
  config?: Record<string, unknown> | null;
}

// In-memory cache (sẽ reset khi serverless function cold start)
let _cache: LicenseRecord[] | null = null;

function loadLicenses(): LicenseRecord[] {
  if (_cache !== null) return _cache;

  const raw = process.env.LICENSES_JSON;
  if (!raw) {
    console.warn("[nbox-license] LICENSES_JSON env not set. No licenses available.");
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

export function findLicense(key: string): LicenseRecord | undefined {
  const licenses = loadLicenses();
  return licenses.find((l) => l.key === key);
}

/**
 * Bind machineId vào license (in-memory only).
 * Với Vercel serverless, state này KHÔNG persist giữa các invocations.
 * Để persist: dùng Vercel KV, PlanetScale, hoặc Supabase (xem README).
 */
export function bindMachine(key: string, machineId: string): void {
  const licenses = loadLicenses();
  const record = licenses.find((l) => l.key === key);
  if (record) {
    record.machineId = machineId;
    record.activatedAt = new Date().toISOString();
  }
}

export function invalidateCache(): void {
  _cache = null;
}
