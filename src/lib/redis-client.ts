/**
 * Upstash Redis REST API client
 * POST + JSON body — đúng chuẩn Upstash
 */

const UPSTASH_URL = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

async function call(command: unknown[]): Promise<unknown> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error("Thiếu UPSTASH_REDIS_REST_URL hoặc UPSTASH_REDIS_REST_TOKEN.");
  }

  const res = await fetch(UPSTASH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Upstash error: ${json.error || res.status}`);
  }
  return json.result;
}

export async function redisGet(key: string): Promise<string | null> {
  return (await call(["GET", key])) as string | null;
}

export async function redisSet(key: string, value: string): Promise<void> {
  await call(["SET", key, value]);
}

export async function redisDel(key: string): Promise<void> {
  await call(["DEL", key]);
}

export async function redisSadd(setKey: string, member: string): Promise<void> {
  await call(["SADD", setKey, member]);
}

export async function redisSrem(setKey: string, member: string): Promise<void> {
  await call(["SREM", setKey, member]);
}

export async function redisSmembers(setKey: string): Promise<string[]> {
  const result = await call(["SMEMBERS", setKey]);
  return (result as string[]) ?? [];
}
