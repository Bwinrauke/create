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
  none:    { label: "Owed",    fg:
