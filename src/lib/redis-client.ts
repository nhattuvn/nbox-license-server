/**
 * Redis Cloud client - dùng package "redis" v4
 * Compatible với Vercel Serverless (Node.js runtime)
 */

import { createClient, RedisClientType } from "redis";

const REDIS_URL = process.env.REDIS_URL || "";

let _client: RedisClientType | null = null;
let _connecting = false;
let _connectPromise: Promise<RedisClientType> | null = null;

async function getClient(): Promise<RedisClientType> {
  if (_client && _client.isOpen) return _client;

  if (_connectPromise) return _connectPromise;

  _connectPromise = (async () => {
    if (!REDIS_URL) throw new Error("REDIS_URL not set in environment variables.");

    const client = createClient({
      url: REDIS_URL,
      socket: {
        tls: REDIS_URL.startsWith("rediss://"),
        rejectUnauthorized: false,
        connectTimeout: 8000,
      },
    }) as RedisClientType;

    client.on("error", (err) => {
      console.error("[nbox-redis] Connection error:", err.message);
    });

    await client.connect();
    _client = client;
    _connectPromise = null;
    return client;
  })();

  return _connectPromise;
}

export async function redisGet(key: string): Promise<string | null> {
  const client = await getClient();
  return await client.get(key);
}

export async function redisSet(key: string, value: string): Promise<void> {
  const client = await getClient();
  await client.set(key, value);
}

export async function redisDel(key: string): Promise<void> {
  const client = await getClient();
  await client.del(key);
}
