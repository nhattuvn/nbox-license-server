/**
 * Upstash Redis REST API client
 * Dùng HTTP thuần — không cần TCP, không timeout, hoạt động 100% trên Vercel Serverless
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

async function call(command: string[]): Promise<unknown> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error("Thiếu UPSTASH_REDIS_REST_URL hoặc UPSTASH_REDIS_REST_TOKEN.");
  }

  const res = await fetch(`${UPSTASH_URL}/${command.map(encodeURIComponent).join("/")}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash error ${res.status}: ${text}`);
  }

  const json = await res.json();
  return json.result;
}

export async function redisGet(key: string): Promise<string | null> {
  const result = await call(["GET", key]);
  return (result as string | null) ?? null;
}

export async function redisSet(key: string, value: string): Promise<void> {
  await call(["SET", key, value]);
}

export async function redisDel(key: string): Promise<void> {
  await call(["DEL", key]);
}
