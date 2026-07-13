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

export const EXPENSE_CATEGORIES = [
  "Repairs", "Maintenance", "Utilities", "Water/Sewer", "Insurance",
  "Property tax", "Mortgage", "Legal", "Supplies", "Management", "Other",
];

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

export function reconcile(pay, tenant) {
  const govt = +pay?.govt || 0;
  const portion = +pay?.portion || 0;
  const assistance = +pay?.assistance || 0;
  const total = govt + portion + assistance;
  const rent = +tenant?.lease_rent || 0;
  const variance = total - rent;
  let status =
