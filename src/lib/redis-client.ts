/**
 * Upstash Redis REST API client
 * Dùng KV_REST_API_URL + KV_REST_API_TOKEN (tự động inject bởi Vercel khi connect Redis)
 */

function getConfig() {
  const url = process.env.KV_REST_API_URL || "";
  const token = process.env.KV_REST_API_TOKEN || "";

  if (!url || !token) {
    throw new Error(
      "Thiếu KV_REST_API_URL hoặc KV_REST_API_TOKEN. Kiểm tra Environment Variables trên Vercel."
    );
  }

  return { url: url.replace(/\/$/, ""), token };
}

async function upstashFetch(command: string, body: unknown): Promise<unknown> {
  const { url, token } = getConfig();

  const res = await fetch(`${url}/${command}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
  const result = await upstashFetch("get", [key]);
  return (result as string | null) ?? null;
}

export async function redisSet(key: string, value: string): Promise<void> {
  await upstashFetch("set", [key, value]);
}

export async function redisDel(key: string): Promise<void> {
  await upstashFetch("del", [key]);
}
