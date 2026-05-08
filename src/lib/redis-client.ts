/**
 * Redis client dùng Upstash REST API
 * Không cần install package — dùng fetch thuần để tương thích Vercel Edge/Serverless
 */

const REDIS_URL = process.env.REDIS_URL || "";

// Parse redis://default:PASSWORD@HOST:PORT
function parseRedisUrl(url: string) {
  try {
    const u = new URL(url);
    const password = u.password;
    const host = u.hostname;
    const port = u.port || "12805";
    return { password, host, port };
  } catch {
    return null;
  }
}

async function redisCommand(args: (string | number)[]): Promise<unknown> {
  if (!REDIS_URL) throw new Error("REDIS_URL not set");

  const parsed = parseRedisUrl(REDIS_URL);
  if (!parsed) throw new Error("Invalid REDIS_URL format");

  // Upstash REST API endpoint
  const restUrl = `https://${parsed.host}:${parsed.port}`;

  const res = await fetch(`${restUrl}/${args.map(encodeURIComponent).join("/")}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${parsed.password}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Redis error ${res.status}: ${text}`);
  }

  const json = await res.json();
  return json.result;
}

export async function redisGet(key: string): Promise<string | null> {
  const result = await redisCommand(["GET", key]);
  return result as string | null;
}

export async function redisSet(key: string, value: string): Promise<void> {
  await redisCommand(["SET", key, value]);
}
