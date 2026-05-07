# NBOX License Server

Backend license verification server cho **NBOX Flow Render Automation** extension.  
Stack: **Next.js 14 App Router** — deploy miễn phí lên **Vercel**.

---

## 🚀 Deploy lên Vercel (miễn phí, ~5 phút)

### Bước 1: Push lên GitHub

```bash
git init
git add .
git commit -m "init: nbox license server"
git remote add origin https://github.com/YOUR_USERNAME/nbox-license-server.git
git push -u origin main
```

### Bước 2: Connect Vercel

1. Vào [vercel.com](https://vercel.com) → **Add New Project**
2. Import repo `nbox-license-server`
3. Framework: **Next.js** (tự detect)
4. Chưa cần điền gì — click **Deploy**

### Bước 3: Thêm Environment Variable

Sau khi deploy xong, vào **Settings → Environment Variables**:

| Key | Value |
|-----|-------|
| `LICENSES_JSON` | *(xem format bên dưới)* |

Click **Save** → **Redeploy** để áp dụng.

### Bước 4: Lấy URL dán vào popup.js

Vercel sẽ cấp URL dạng `https://nbox-license-server-xxx.vercel.app`.

Mở `popup.js` của extension, tìm dòng:
```js
const LICENSE_API_BASE_DEFAULT = "https://nbox-be-logic-636765202142.europe-west1.run.app";
```

Thay bằng:
```js
const LICENSE_API_BASE_DEFAULT = "https://nbox-license-server-xxx.vercel.app";
```

---

## 📋 Format LICENSES_JSON

```json
[
  {
    "key": "NBOX-ABCD-1234-EFGH",
    "isActive": true,
    "expiresAt": "2027-12-31T23:59:59.000Z",
    "machineId": null,
    "activatedAt": null,
    "config": null
  },
  {
    "key": "NBOX-LIFE-TIME-0001",
    "isActive": true,
    "expiresAt": null,
    "machineId": null,
    "activatedAt": null,
    "config": null
  }
]
```

**Fields:**
- `key` — license key người dùng sẽ nhập
- `isActive` — `true` cho phép dùng, `false` để khóa
- `expiresAt` — ISO datetime hoặc `null` (không hết hạn)
- `machineId` — để `null`, server tự điền khi user kích hoạt lần đầu
- `activatedAt` — để `null`
- `config` — `null` để dùng config mặc định, hoặc override cho từng key

---

## ⚠️ Lưu ý về machineId persistence

Vì Vercel serverless function là **stateless**, `machineId` sau khi bind sẽ:
- **Tồn tại trong memory** của function instance đó
- **Mất sau cold start / redeploy**

**→ Ý nghĩa thực tế:** mỗi lần Vercel cold start, user có thể activate lại trên máy mới. Đây là trade-off của free tier không có database.

### Để có persistence thật sự (optional):

1. **Vercel KV** (free 256MB): thêm `@vercel/kv` và lưu machineId
2. **Supabase** (free tier): PostgreSQL hosted
3. **PlanetScale** (free tier): MySQL hosted

Xem file `docs/persistence-upgrade.md` nếu cần.

---

## 🔌 API Contract

### `POST /api/license/verify`

**Request:**
```json
{
  "key": "NBOX-XXXX-YYYY-ZZZZ",
  "machineId": "uuid-v4-generated-by-extension",
  "extensionVersion": "1.0.0",
  "channel": "production"
}
```

**Success `200`:**
```json
{
  "status": "success",
  "license": {
    "keyMasked": "NBOX-****-YYYY-ZZZZ",
    "isActive": true,
    "expiresAt": "2027-12-31T23:59:59.000Z",
    "machineId": "uuid-v4"
  },
  "config": { ... },
  "serverTime": "2026-05-07T..."
}
```

**Error codes:**

| HTTP | code | Meaning |
|------|------|---------|
| 401 | `LICENSE_NOT_FOUND` | Key không tồn tại |
| 401 | `LICENSE_INACTIVE` | Key bị khóa |
| 401 | `LICENSE_EXPIRED` | Hết hạn |
| 403 | `MACHINE_MISMATCH` | Máy khác (khi có persistence) |
| 400 | `INVALID_PAYLOAD` | Thiếu field |
| 500 | `INTERNAL_ERROR` | Lỗi server |

---

## 🧪 Test nhanh

```bash
curl -X POST https://YOUR-VERCEL-URL.vercel.app/api/license/verify \
  -H "Content-Type: application/json" \
  -d '{"key":"NBOX-TEST-0001-AAAA","machineId":"test-machine-001"}'
```

---

## 📁 Cấu trúc project

```
nbox-license-server/
├── src/
│   ├── app/
│   │   ├── api/license/verify/
│   │   │   └── route.ts        ← API endpoint chính
│   │   ├── layout.tsx
│   │   └── page.tsx            ← Status page
│   └── lib/
│       └── license-db.ts       ← License data store
├── .env.example                ← Copy thành .env.local
├── .gitignore
├── next.config.js
├── package.json
└── tsconfig.json
```
