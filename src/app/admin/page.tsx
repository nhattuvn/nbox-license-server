"use client";

import { useState, useEffect, useCallback } from "react";

const SESSION_KEY = "nbox_admin_secret";

interface License {
  key: string;
  isActive: boolean;
  expiresAt: string | null;
  machineId: string | null;
  activatedAt: string | null;
  createdAt: string;
  expired: boolean;
  status: "activated" | "unused" | "inactive" | "expired";
}

const STATUS_CFG = {
  activated: { label: "Đang dùng",       color: "#34d399", bg: "#052e16" },
  unused:    { label: "Chưa kích hoạt",  color: "#60a5fa", bg: "#0c1a2e" },
  inactive:  { label: "Bị khóa",         color: "#f87171", bg: "#2e0c0c" },
  expired:   { label: "Hết hạn",         color: "#fbbf24", bg: "#2e1a00" },
};

function genKey() {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const s = () => Array.from({ length: 4 }, () => c[Math.floor(Math.random() * c.length)]).join("");
  return `NBOX-${s()}-${s()}-${s()}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtDateTime(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const btn = (extra: object = {}) => ({
  border: "none", borderRadius: 7, cursor: "pointer",
  fontWeight: 600, fontSize: "0.78rem", padding: "5px 11px",
  ...extra,
});

export default function AdminPage() {
  const [secret, setSecret]       = useState("");
  const [inputSec, setInputSec]   = useState("");
  const [authed, setAuthed]       = useState(false);
  const [licenses, setLicenses]   = useState<License[]>([]);
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilter] = useState("all");
  const [migrating, setMigrating] = useState(false);

  // New key form
  const [showAdd, setShowAdd]   = useState(false);
  const [newKey, setNewKey]     = useState(genKey());
  const [newExpiry, setNewExp]  = useState("");
  const [adding, setAdding]     = useState(false);

  // Edit modal
  const [editLic, setEditLic]   = useState<License | null>(null);
  const [editExp, setEditExp]   = useState("");

  const flash = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const apiFetch = useCallback(async (path: string, opts: RequestInit = {}) => {
    const res = await fetch(path, {
      ...opts,
      headers: { "x-admin-secret": secret, "Content-Type": "application/json", ...(opts.headers || {}) },
    });
    return res.json();
  }, [secret]);

  const load = useCallback(async (sec?: string) => {
    const s = sec ?? secret;
    if (!s) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/licenses", { headers: { "x-admin-secret": s } });
      const data = await res.json();
      if (data.status === "success") setLicenses(data.licenses);
      else flash("Lỗi tải danh sách", false);
    } catch { flash("Không kết nối được server", false); }
    setLoading(false);
  }, [secret]);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) { setSecret(saved); setInputSec(saved); setAuthed(true); load(saved); }
  }, [load]);

  const handleLogin = () => {
    if (!inputSec.trim()) return;
    setSecret(inputSec.trim());
    sessionStorage.setItem(SESSION_KEY, inputSec.trim());
    setAuthed(true);
    load(inputSec.trim());
  };

  const handleAdd = async () => {
    if (!newKey.trim()) return;
    setAdding(true);
    const data = await apiFetch("/api/admin/licenses", {
      method: "POST",
      body: JSON.stringify({ key: newKey.trim(), expiresAt: newExpiry ? new Date(newExpiry).toISOString() : null }),
    });
    if (data.status === "success") {
      flash(`✅ Đã tạo key ${newKey}`);
      setNewKey(genKey()); setNewExp(""); setShowAdd(false);
      load();
    } else { flash(data.message || "Lỗi tạo key", false); }
    setAdding(false);
  };

  const handleReset = async (key: string) => {
    if (!confirm(`Reset machineId cho:\n${key}\n\nUser có thể kích hoạt lại trên máy mới.`)) return;
    const data = await apiFetch("/api/admin/licenses/reset", { method: "POST", body: JSON.stringify({ key }) });
    if (data.status === "success") { flash(`🔓 Đã reset machine cho ${key.slice(0, 12)}...`); load(); }
    else flash(data.message || "Lỗi reset", false);
  };

  const handleToggleActive = async (lic: License) => {
    const data = await apiFetch("/api/admin/licenses/update", {
      method: "POST",
      body: JSON.stringify({ key: lic.key, isActive: !lic.isActive }),
    });
    if (data.status === "success") { flash(`${!lic.isActive ? "🔓 Đã mở" : "🔒 Đã khóa"} key`); load(); }
    else flash(data.message || "Lỗi", false);
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`XÓA VĨNH VIỄN key:\n${key}\n\nKhông thể hoàn tác!`)) return;
    const data = await apiFetch("/api/admin/licenses/delete", { method: "POST", body: JSON.stringify({ key }) });
    if (data.status === "success") { flash(`🗑 Đã xóa ${key}`); load(); }
    else flash(data.message || "Lỗi xóa", false);
  };

  const handleEditSave = async () => {
    if (!editLic) return;
    const data = await apiFetch("/api/admin/licenses/update", {
      method: "POST",
      body: JSON.stringify({ key: editLic.key, expiresAt: editExp ? new Date(editExp).toISOString() : null }),
    });
    if (data.status === "success") { flash("✅ Đã cập nhật hạn dùng"); setEditLic(null); load(); }
    else flash(data.message || "Lỗi", false);
  };

  const handleMigrate = async () => {
    if (!confirm("Migrate tất cả licenses từ LICENSES_JSON env var vào Redis?\n(Chỉ cần chạy 1 lần)")) return;
    setMigrating(true);
    const data = await apiFetch("/api/admin/migrate", { method: "POST" });
    if (data.status === "success") { flash(`✅ ${data.message}`); load(); }
    else flash(data.message || "Lỗi migrate", false);
    setMigrating(false);
  };

  const filtered = licenses.filter((l) => {
    const ms = l.key.toLowerCase().includes(search.toLowerCase());
    const fs = filterStatus === "all" || l.status === filterStatus;
    return ms && fs;
  });

  const stats = {
    total: licenses.length,
    activated: licenses.filter((l) => l.status === "activated").length,
    unused: licenses.filter((l) => l.status === "unused").length,
    locked: licenses.filter((l) => l.status === "inactive" || l.status === "expired").length,
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 340, background: "#1a1a1f", border: "1px solid #2a2a32", borderRadius: 16, padding: "2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 44 }}>🔐</div>
          <h1 style={{ margin: "8px 0 4px", fontSize: "1.2rem", color: "#f1f1f3" }}>NBOX Admin</h1>
          <p style={{ margin: 0, color: "#555", fontSize: "0.82rem" }}>Nhập admin secret để đăng nhập</p>
        </div>
        <input type="password" value={inputSec} onChange={(e) => setInputSec(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="Admin secret..."
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #333",
            background: "#111115", color: "#e8e8ea", fontSize: "0.9rem", boxSizing: "border-box", outline: "none", marginBottom: 10 }} />
        <button onClick={handleLogin}
          style={{ width: "100%", padding: 10, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            border: "none", color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>
          Đăng nhập
        </button>
      </div>
    </div>
  );

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", padding: "1.5rem", maxWidth: 1140, margin: "0 auto" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999, maxWidth: 340,
          background: toast.ok ? "#052e16" : "#2e0c0c", border: `1px solid ${toast.ok ? "#34d399" : "#f87171"}`,
          color: toast.ok ? "#34d399" : "#f87171", padding: "10px 16px", borderRadius: 10,
          fontSize: "0.83rem", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
          {toast.msg}
        </div>
      )}

      {/* Edit Modal */}
      {editLic && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#1a1a1f", border: "1px solid #6366f1", borderRadius: 14, padding: "1.5rem", width: 360 }}>
            <h3 style={{ margin: "0 0 1rem", color: "#a78bfa", fontSize: "1rem" }}>✏️ Chỉnh hạn dùng</h3>
            <code style={{ color: "#c4b5fd", fontSize: "0.8rem", display: "block", marginBottom: "1rem" }}>{editLic.key}</code>
            <label style={{ color: "#888", fontSize: "0.75rem", display: "block", marginBottom: 4 }}>
              Ngày hết hạn (để trống = vĩnh viễn)
            </label>
            <input type="date" value={editExp} onChange={(e) => setEditExp(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #333",
                background: "#111115", color: "#e8e8ea", fontSize: "0.85rem", boxSizing: "border-box", outline: "none", marginBottom: "1rem" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleEditSave} style={{ ...btn({ background: "#6366f1", color: "#fff", padding: "8px 20px" }) }}>Lưu</button>
              <button onClick={() => setEditLic(null)} style={{ ...btn({ background: "#2a2a32", color: "#aaa", padding: "8px 14px" }) }}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.3rem", color: "#f1f1f3" }}>🔑 NBOX License Manager</h1>
          <p style={{ margin: "2px 0 0", color: "#444", fontSize: "0.75rem" }}>Powered by Upstash Redis · Vercel</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleMigrate} disabled={migrating}
            style={{ ...btn({ background: "#1a1a1f", border: "1px solid #444", color: "#888", padding: "7px 12px" }) }}>
            {migrating ? "Migrating..." : "📥 Migrate từ Env"}
          </button>
          <button onClick={() => load()}
            style={{ ...btn({ background: "#1a1a1f", border: "1px solid #333", color: "#aaa", padding: "7px 12px" }) }}>
            ↻ Refresh
          </button>
          <button onClick={() => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false); setLicenses([]); }}
            style={{ ...btn({ background: "#1a1a1f", border: "1px solid #333", color: "#f87171", padding: "7px 12px" }) }}>
            Logout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: "1.25rem" }}>
        {[
          { label: "Tổng keys", value: stats.total, color: "#a78bfa" },
          { label: "Đang dùng", value: stats.activated, color: "#34d399" },
          { label: "Chưa kích hoạt", value: stats.unused, color: "#60a5fa" },
          { label: "Khóa / Hết hạn", value: stats.locked, color: "#f87171" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#1a1a1f", border: "1px solid #2a2a32", borderRadius: 12, padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.9rem", fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.72rem", color: "#555", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Tìm key..."
          style={{ flex: 1, minWidth: 180, padding: "8px 12px", borderRadius: 8, border: "1px solid #2a2a32",
            background: "#111115", color: "#e8e8ea", fontSize: "0.85rem", outline: "none" }} />
        <select value={filterStatus} onChange={(e) => setFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #2a2a32",
            background: "#111115", color: "#e8e8ea", fontSize: "0.85rem", cursor: "pointer" }}>
          <option value="all">Tất cả</option>
          <option value="activated">Đang dùng</option>
          <option value="unused">Chưa kích hoạt</option>
          <option value="inactive">Bị khóa</option>
          <option value="expired">Hết hạn</option>
        </select>
        <button onClick={() => setShowAdd(!showAdd)}
          style={{ ...btn({ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", padding: "8px 16px", fontSize: "0.85rem" }) }}>
          + Tạo key mới
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div style={{ background: "#1a1a1f", border: "1px solid #6366f1", borderRadius: 12, padding: "1.25rem", marginBottom: "0.75rem" }}>
          <h3 style={{ margin: "0 0 0.75rem", color: "#a78bfa", fontSize: "0.9rem" }}>✨ Tạo License Key Mới</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label style={{ color: "#666", fontSize: "0.72rem", display: "block", marginBottom: 4 }}>License Key</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={newKey} onChange={(e) => setNewKey(e.target.value)}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #333",
                    background: "#111115", color: "#e8e8ea", fontSize: "0.82rem", outline: "none", fontFamily: "monospace" }} />
                <button onClick={() => setNewKey(genKey())} title="Random"
                  style={{ ...btn({ background: "#2a2a32", border: "1px solid #333", color: "#aaa" }) }}>🎲</button>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ color: "#666", fontSize: "0.72rem", display: "block", marginBottom: 4 }}>Hạn dùng (trống = vĩnh viễn)</label>
              <input type="date" value={newExpiry} onChange={(e) => setNewExp(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #333",
                  background: "#111115", color: "#e8e8ea", fontSize: "0.82rem", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ marginTop: "0.75rem", display: "flex", gap: 8 }}>
            <button onClick={handleAdd} disabled={adding}
              style={{ ...btn({ background: "#6366f1", color: "#fff", padding: "8px 20px" }) }}>
              {adding ? "Đang tạo..." : "✅ Tạo ngay"}
            </button>
            <button onClick={() => setShowAdd(false)}
              style={{ ...btn({ background: "transparent", border: "1px solid #333", color: "#888", padding: "8px 14px" }) }}>
              Huỷ
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "#1a1a1f", border: "1px solid #2a2a32", borderRadius: 12, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 110px 110px 160px 130px 160px",
          padding: "9px 16px", background: "#111115", borderBottom: "1px solid #2a2a32",
          color: "#444", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <span>License Key</span><span>Trạng thái</span><span>Hết hạn</span>
          <span>Machine ID</span><span>Kích hoạt</span><span style={{ textAlign: "right" }}>Thao tác</span>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#444" }}>⏳ Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#444" }}>
            {licenses.length === 0 ? "Chưa có license nào. Tạo key mới hoặc Migrate từ Env." : "Không tìm thấy."}
          </div>
        ) : filtered.map((l, i) => {
          const sc = STATUS_CFG[l.status];
          return (
            <div key={l.key}
              style={{ display: "grid", gridTemplateColumns: "2fr 110px 110px 160px 130px 160px",
                padding: "11px 16px", alignItems: "center",
                borderBottom: i < filtered.length - 1 ? "1px solid #1a1a20" : "none",
                transition: "background 0.1s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#111115")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>

              {/* Key */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <code style={{ color: "#c4b5fd", fontSize: "0.8rem", fontFamily: "monospace" }}>{l.key}</code>
                <button onClick={() => { navigator.clipboard.writeText(l.key); flash("📋 Đã copy!"); }}
                  style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: "0.75rem", padding: "1px 4px" }}>📋</button>
              </div>

              {/* Status */}
              <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6,
                background: sc.bg, color: sc.color, fontSize: "0.7rem", fontWeight: 600 }}>
                {sc.label}
              </span>

              {/* Expiry */}
              <span style={{ color: l.expired ? "#f87171" : "#666", fontSize: "0.78rem" }}>
                {l.expiresAt ? fmtDate(l.expiresAt) : "♾ Vĩnh viễn"}
              </span>

              {/* Machine */}
              <span style={{ color: "#555", fontSize: "0.75rem", fontFamily: "monospace" }} title={l.machineId || ""}>
                {l.machineId ? l.machineId.slice(0, 8) + "…" + l.machineId.slice(-4) : "—"}
              </span>

              {/* Activated At */}
              <span style={{ color: "#555", fontSize: "0.75rem" }}>{fmtDateTime(l.activatedAt)}</span>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 5, flexWrap: "wrap" }}>
                {l.machineId && (
                  <button onClick={() => handleReset(l.key)}
                    style={{ ...btn({ background: "#2e1a00", border: "1px solid #78350f", color: "#fbbf24" }) }}>
                    🔓 Reset
                  </button>
                )}
                <button onClick={() => { setEditLic(l); setEditExp(l.expiresAt ? l.expiresAt.slice(0, 10) : ""); }}
                  style={{ ...btn({ background: "#1a1a2e", border: "1px solid #3730a3", color: "#818cf8" }) }}>
                  ✏️
                </button>
                <button onClick={() => handleToggleActive(l)}
                  style={{ ...btn({ background: l.isActive ? "#2e0c0c" : "#052e16", border: `1px solid ${l.isActive ? "#7f1d1d" : "#14532d"}`, color: l.isActive ? "#f87171" : "#34d399" }) }}>
                  {l.isActive ? "🔒" : "🔓"}
                </button>
                <button onClick={() => handleDelete(l.key)}
                  style={{ ...btn({ background: "#1a0a0a", border: "1px solid #450a0a", color: "#ef4444" }) }}>
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: "0.75rem", color: "#2a2a32", fontSize: "0.72rem", textAlign: "center" }}>
        NBOX License Manager v2 · {licenses.length} keys · Upstash Redis
      </p>
    </div>
  );
}
