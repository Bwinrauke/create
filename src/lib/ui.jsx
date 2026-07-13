import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

/* ---------------- constants ---------------- */
export const CURRENT_MONTH = "2026-07";

export const MONTHS = (() => {
  const out = [];
  let y = 2025, m = 7;
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = 0; i < 20; i++) {
    out.push({ key: `${y}-${String(m + 1).padStart(2, "0")}`, label: `${names[m]} ${y}` });
    m++; if (m > 11) { m = 0; y++; }
  }
  return out;
})();

export const STATUS = {
  paid:    { label: "Paid",    fg: "#0f7a54", bg: "#e3f3ec", dot: "#12a06e" },
  partial: { label: "Partial", fg: "#9a6511", bg: "#fbf0d9", dot: "#e0a326" },
  owed:    { label: "Owed",    fg: "#a83232", bg: "#f8e5e2", dot: "#d24b4b" },
  none:    { label: "Owed",    fg: "#a83232", bg: "#f8e5e2", dot: "#d24b4b" },
  future:  { label: "—",       fg: "#8a8681", bg: "#efece5", dot: "#cfc9bd" },
};

/* ---------------- helpers ---------------- */
export const money = (n) =>
  (n < 0 ? "-" : "") + "$" + Math.abs(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Client-side reconcile — used to synthesize rows for tenants with no
// payment yet this month, and for optimistic display. Mirrors the SQL view.
export function reconcile(pay, tenant) {
  const govt = +pay?.govt || 0;
  const portion = +pay?.portion || 0;
  const assistance = +pay?.assistance || 0;
  const total = govt + portion + assistance;
  const rent = +tenant?.lease_rent || 0;
  const variance = total - rent;
  let status = "owed";
  if (total > 0.001) status = variance >= -0.5 ? "paid" : "partial";
  return { govt, portion, assistance, total, rent, variance, status };
}

/* ---------------- atoms ---------------- */
export function Money({ v, bold, size = 14, dim }) {
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono',monospace", fontSize: size,
      fontWeight: bold ? 600 : 500, fontVariantNumeric: "tabular-nums",
      color: dim ? "#9a958c" : "#1c2836", whiteSpace: "nowrap",
    }}>{money(v)}</span>
  );
}

export function Variance({ v }) {
  if (Math.abs(v) < 0.5) return <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: "#9a958c" }}>—</span>;
  const up = v > 0;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600, color: up ? "#0f7a54" : "#a83232" }}>
      {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {money(Math.abs(v))}
    </span>
  );
}

export function Stamp({ status }) {
  const s = STATUS[status] || STATUS.owed;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px",
      borderRadius: 6, background: s.bg, color: s.fg, fontSize: 11.5, fontWeight: 700,
      letterSpacing: ".04em", textTransform: "uppercase", fontFamily: "'Space Grotesk',sans-serif",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {s.label}
    </span>
  );
}

export function UnitChip({ unit, big }) {
  return (
    <span style={{
      fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: big ? 13 : 11.5,
      color: "#7a5c17", background: "#f6ecd2", border: "1px solid #e6d3a4",
      padding: big ? "6px 9px" : "3px 7px", borderRadius: 6, whiteSpace: "nowrap",
    }}>{unit}</span>
  );
}

export function Legend({ dot, label }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: dot }} />{label}</span>;
}

export function BigStat({ label, value, sub, accent }) {
  return (
    <div style={{ ...S.card, padding: "16px 18px" }}>
      <div style={{ fontSize: 11.5, color: "#8a8681", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 25, fontWeight: 600, color: accent, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#a29d92", marginTop: 3 }}>{sub}</div>
    </div>
  );
}

/* ---------------- style constants ---------------- */
export const S = {
  page: { display: "flex", height: "100vh", width: "100%", background: "#f4f1ea", fontFamily: "'Inter',sans-serif", color: "#1c2836", overflow: "hidden" },
  sidebar: { width: 234, background: "#161f2b", display: "flex", flexDirection: "column", flexShrink: 0 },
  brassPlaque: { width: 34, height: 34, borderRadius: 8, background: "linear-gradient(150deg,#e7c56b,#b8892b)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  navBtn: { display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "10px 12px", marginBottom: 3, borderRadius: 8, border: "none", background: "transparent", fontSize: 13.5, fontWeight: 500, textAlign: "left" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 28px", background: "#fff", borderBottom: "1px solid #e8e3d8", flexShrink: 0 },
  monthSelect: { padding: "8px 12px", borderRadius: 8, border: "1px solid #e2ddd0", background: "#faf8f3", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 13.5, color: "#1c2836", cursor: "pointer" },
  card: { background: "#fff", border: "1px solid #ece7dc", borderRadius: 12, padding: 18, boxShadow: "0 1px 2px rgba(30,24,10,.03)" },
  cardTitle: { fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14.5, color: "#1c2836" },
  th: { textAlign: "left", padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "#8a8681", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid #ece7dc", background: "#faf8f3", whiteSpace: "nowrap" },
  td: { padding: "11px 14px", fontSize: 13, verticalAlign: "middle" },
  cellInput: { border: "1px solid #e2ddd0", borderRadius: 7, padding: "7px 9px", fontSize: 13, fontFamily: "'IBM Plex Mono',monospace", color: "#1c2836", background: "#fdfcf9" },
  attnRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f0ece3" },
  pill: { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 13px", borderRadius: 7, fontSize: 12.5, fontWeight: 600 },
  primaryBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: "none", background: "#161f2b", color: "#f4d488", fontWeight: 600, fontSize: 13.5 },
  ghostBtn: { padding: "9px 16px", borderRadius: 8, border: "1px solid #e2ddd0", background: "#fff", color: "#5a5850", fontWeight: 600, fontSize: 13.5 },
  linkBtn: { display: "inline-flex", alignItems: "center", gap: 3, border: "none", background: "transparent", color: "#b8892b", fontWeight: 600, fontSize: 12.5 },
  iconBtn: { border: "none", background: "transparent", color: "#8a8681", display: "flex", padding: 4 },
  overlay: { position: "fixed", inset: 0, background: "rgba(22,31,43,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 },
  modal: { background: "#fff", borderRadius: 14, padding: 24, width: 560, maxWidth: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.3)" },
  field: { width: "100%", border: "1px solid #e2ddd0", borderRadius: 8, padding: "9px 11px", fontSize: 13.5, fontFamily: "'Inter',sans-serif", color: "#1c2836", background: "#fdfcf9" },
};
