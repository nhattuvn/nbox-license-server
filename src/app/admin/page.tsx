"use client";

import { useState, useEffect, useCallback } from "react";

const ADMIN_SECRET_KEY = "nbox_admin_secret";

interface License {
  key: string;
  isActive: boolean;
  expiresAt: string | null;
  machineId: string | null;
  activatedAt: string | null;
  expired: boolean;
  status: "activated" | "unused" | "inactive" | "expired";
}

const STATUS_CONFIG = {
  activated: { label: "Đang dùng", color: "#34d399", bg: "#052e16" },
  unused:    { label: "Chưa kích hoạt", color: "#60a5fa", bg: "#0c1a2e" },
  inactive:  { label: "Bị khóa", color: "#f87171", bg: "#2e0c0c" },
  expired:   { label: "Hết hạn", color: "#fbbf24", bg: "#2e1a00" },
};

function generateKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `NBOX-${seg()}-${seg()}-${seg()}`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function maskMachine(id: string | null) {
  if (!id) return "—";
  return id.slice(0, 8) + "..." + id.slice(-4);
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [inputSecret, setInputSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // New license form
  const [newKey, setNewKey] = useState(generateKey());
  const [newExpiry, setNewExpiry] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLicenses = useCallback(async (s: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/licenses", {
        headers: { "x-admin-secret": s },
      });
      const data = await res.json();
      if (data.status === "success") {
        setLicenses(data.licenses);
      } else {
        showToast("Lỗi tải danh sách", false);
      }
    } catch {
      showToast("Không thể kết nối server", false);
    }
    setLoading(false);
  }, []);

  const handleLogin = () => {
    if (!inputSecret.trim()) return;
    setSecret(inputSecret.trim());
    setAuthed(true);
    sessionStorage.setItem(ADMIN_SECRET_KEY, inputSecret.trim());
    fetchLicenses(inputSecret.trim());
  };

  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_SECRET_KEY);
    if (saved) {
      setSecret(saved);
      setInputSecret(saved);
      setAuthed(true);
      fetchLicenses(saved);
    }
  }, [fetchLicenses]);

  const handleReset = async (key: string) => {
    if (!confirm(`Reset machineId cho key:\n${key}\n\nUser sẽ có thể kích hoạt lại trên máy mới.`)) return;
    try {
      const res = await fetch("/api/admin/licenses/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.status === "success") {
        showToast(`✅ Đã reset machine cho ${key.slice(0, 12)}...`);
        fetchLicenses(secret);
      } else {
        showToast(data.message || "Lỗi reset", false);
      }
    } catch {
      showToast("Lỗi kết nối", false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("📋 Đã copy key!");
  };

  const handleAddLicense = async () => {
    if (!newKey.trim()) return;
    setAdding(true);

    const raw = licenses.map((l) => ({
      key: l.key,
      isActive: l.isActive,
      expiresAt: l.expiresAt,
      machineId: null,
      activatedAt: null,
      config: null,
    }));

    const newEntry = {
      key: newKey.trim(),
      isActive: true,
      expiresAt: newExpiry ? new Date(newExpiry).toISOString() : null,
      machineId: null,
      activatedAt: null,
      config: null,
    };

    const updated = JSON.stringify([...raw, newEntry]);

    showToast(
      `✅ Key tạo xong! Vào Vercel → Environment Variables → cập nhật LICENSES_JSON:\n${updated}`,
      true
    );

    // Copy JSON to clipboard automatically
    navigator.clipboard.writeText(updated).catch(() => {});
    setNewKey(generateKey());
    setNewExpiry("");
    setShowAdd(false);
    setAdding(false);
  };

  const filtered = licenses.filter((l) => {
    const matchSearch = l.key.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: licenses.length,
    activated: licenses.filter((l) => l.status === "activated").length,
    unused: licenses.filter((l) => l.status === "unused").length,
    inactive: licenses.filter((l) => l.status === "inactive").length,
    expired: licenses.filter((l) => l.status === "expired").length,
  };

  // ─── Login Screen ───────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ width: 360, background: "#1a1a1f", border: "1px solid #2a2a32", borderRadius: 16, padding: "2rem" }}>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
            <h1 style={{ margin: 0, fontSize: "1.3rem", color: "#f1f1f3" }}>NBOX Admin</h1>
            <p style={{ margin: "4px 0 0", color: "#666", fontSize: "0.85rem" }}>Nhập admin secret để đăng nhập</p>
          </div>
          <input
            type="password"
            value={inputSecret}
            onChange={(e) => setInputSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Admin secret..."
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 8,
              border: "1px solid #333", background: "#111115",
              color: "#e8e8ea", fontSize: "0.9rem", boxSizing: "border-box",
              outline: "none", marginBottom: "0.75rem",
            }}
          />
          <button
            onClick={handleLogin}
            style={{
              width: "100%", padding: "10px", borderRadius: 8,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              border: "none", color: "#fff", fontWeight: 600,
              fontSize: "0.9rem", cursor: "pointer",
            }}
          >
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Dashboard ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 999,
          background: toast.ok ? "#052e16" : "#2e0c0c",
          border: `1px solid ${toast.ok ? "#34d399" : "#f87171"}`,
          color: toast.ok ? "#34d399" : "#f87171",
          padding: "10px 16px", borderRadius: 10,
          fontSize: "0.85rem", maxWidth: 320,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem", color: "#f1f1f3" }}>🔑 NBOX License Manager</h1>
          <p style={{ margin: "2px 0 0", color: "#555", fontSize: "0.8rem" }}>nbox-license-server.vercel.app</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => fetchLicenses(secret)}
            style={{ padding: "7px 14px", borderRadius: 8, background: "#1a1a1f", border: "1px solid #333", color: "#aaa", cursor: "pointer", fontSize: "0.85rem" }}
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => { sessionStorage.removeItem(ADMIN_SECRET_KEY); setAuthed(false); setLicenses([]); }}
            style={{ padding: "7px 14px", borderRadius: 8, background: "#1a1a1f", border: "1px solid #333", color: "#f87171", cursor: "pointer", fontSize: "0.85rem" }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: "1.5rem" }}>
        {[
          { label: "Tổng", value: stats.total, color: "#a78bfa" },
          { label: "Đang dùng", value: stats.activated, color: "#34d399" },
          { label: "Chưa kích hoạt", value: stats.unused, color: "#60a5fa" },
          { label: "Khóa / Hết hạn", value: stats.inactive + stats.expired, color: "#f87171" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#1a1a1f", border: "1px solid #2a2a32", borderRadius: 12, padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.75rem", color: "#666", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Tìm key..."
          style={{
            flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8,
            border: "1px solid #2a2a32", background: "#111115",
            color: "#e8e8ea", fontSize: "0.85rem", outline: "none",
          }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: "8px 12px", borderRadius: 8,
            border: "1px solid #2a2a32", background: "#111115",
            color: "#e8e8ea", fontSize: "0.85rem", cursor: "pointer",
          }}
        >
          <option value="all">Tất cả</option>
          <option value="activated">Đang dùng</option>
          <option value="unused">Chưa kích hoạt</option>
          <option value="inactive">Bị khóa</option>
          <option value="expired">Hết hạn</option>
        </select>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            padding: "8px 16px", borderRadius: 8,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            border: "none", color: "#fff", fontWeight: 600,
            fontSize: "0.85rem", cursor: "pointer",
          }}
        >
          + Tạo key mới
        </button>
      </div>

      {/* Add License Form */}
      {showAdd && (
        <div style={{
          background: "#1a1a1f", border: "1px solid #6366f1",
          borderRadius: 12, padding: "1.25rem", marginBottom: "1rem",
        }}>
          <h3 style={{ margin: "0 0 1rem", color: "#a78bfa", fontSize: "0.95rem" }}>✨ Tạo License Key Mới</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label style={{ color: "#888", fontSize: "0.75rem", display: "block", marginBottom: 4 }}>License Key</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8,
                    border: "1px solid #333", background: "#111115",
                    color: "#e8e8ea", fontSize: "0.85rem", outline: "none",
                    fontFamily: "monospace",
                  }}
                />
                <button
                  onClick={() => setNewKey(generateKey())}
                  title="Tạo key ngẫu nhiên"
                  style={{ padding: "8px 10px", borderRadius: 8, background: "#2a2a32", border: "1px solid #333", color: "#aaa", cursor: "pointer" }}
                >
                  🎲
                </button>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ color: "#888", fontSize: "0.75rem", display: "block", marginBottom: 4 }}>Hạn dùng (để trống = vĩnh viễn)</label>
              <input
                type="date"
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8,
                  border: "1px solid #333", background: "#111115",
                  color: "#e8e8ea", fontSize: "0.85rem", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
          <div style={{ marginTop: "0.75rem", display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={handleAddLicense}
              disabled={adding}
              style={{
                padding: "8px 20px", borderRadius: 8,
                background: "#6366f1", border: "none",
                color: "#fff", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
              }}
            >
              {adding ? "Đang tạo..." : "✅ Tạo & Copy JSON"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #333", color: "#888", cursor: "pointer", fontSize: "0.85rem" }}
            >
              Huỷ
            </button>
            <span style={{ color: "#555", fontSize: "0.75rem" }}>
              ⚠️ Sau khi tạo, cập nhật LICENSES_JSON trên Vercel và Redeploy
            </span>
          </div>
        </div>
      )}

      {/* License Table */}
      <div style={{ background: "#1a1a1f", border: "1px solid #2a2a32", borderRadius: 12, overflow: "hidden" }}>
        {/* Table Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 100px 120px 140px 120px 100px",
          padding: "10px 16px", background: "#111115",
          borderBottom: "1px solid #2a2a32",
          color: "#555", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          <span>License Key</span>
          <span>Trạng thái</span>
          <span>Hết hạn</span>
          <span>Machine ID</span>
          <span>Kích hoạt lúc</span>
          <span style={{ textAlign: "right" }}>Thao tác</span>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#555" }}>Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#555" }}>Không có license nào</div>
        ) : (
          filtered.map((l, i) => {
            const sc = STATUS_CONFIG[l.status];
            return (
              <div
                key={l.key}
                style={{
                  display: "grid", gridTemplateColumns: "2fr 100px 120px 140px 120px 100px",
                  padding: "12px 16px", alignItems: "center",
                  borderBottom: i < filtered.length - 1 ? "1px solid #1e1e24" : "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#111115")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {/* Key */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <code style={{ color: "#c4b5fd", fontSize: "0.82rem", fontFamily: "monospace" }}>{l.key}</code>
                  <button
                    onClick={() => handleCopy(l.key)}
                    title="Copy key"
                    style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "0.8rem", padding: "2px 4px" }}
                  >
                    📋
                  </button>
                </div>

                {/* Status */}
                <div>
                  <span style={{
                    display: "inline-block", padding: "2px 8px", borderRadius: 6,
                    background: sc.bg, color: sc.color,
                    fontSize: "0.72rem", fontWeight: 600,
                  }}>
                    {sc.label}
                  </span>
                </div>

                {/* Expiry */}
                <div style={{ color: l.expired ? "#f87171" : "#888", fontSize: "0.8rem" }}>
                  {l.expiresAt ? formatDate(l.expiresAt) : "♾ Vĩnh viễn"}
                </div>

                {/* Machine */}
                <div style={{ color: "#666", fontSize: "0.78rem", fontFamily: "monospace" }} title={l.machineId || ""}>
                  {maskMachine(l.machineId)}
                </div>

                {/* Activated At */}
                <div style={{ color: "#666", fontSize: "0.78rem" }}>
                  {formatDate(l.activatedAt)}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                  {l.machineId && (
                    <button
                      onClick={() => handleReset(l.key)}
                      title="Reset machine binding"
                      style={{
                        padding: "4px 10px", borderRadius: 6,
                        background: "#2e1a00", border: "1px solid #78350f",
                        color: "#fbbf24", cursor: "pointer", fontSize: "0.75rem",
                      }}
                    >
                      🔓 Reset
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <p style={{ marginTop: "1rem", color: "#333", fontSize: "0.75rem", textAlign: "center" }}>
        NBOX License Manager · {licenses.length} keys · Upstash Redis
      </p>
    </div>
  );
}
