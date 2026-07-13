// ============================================================
//  db.js — data layer for 2137 Rent Book
//  Drop this into the React app. It replaces the artifact's
//  window.storage layer with real, shared, multi-device data.
//
//  Install:  npm install @supabase/supabase-js
//  Env:      VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY  (in .env)
// ============================================================
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ---------------- AUTH ---------------- */
export const auth = {
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signUp: (email, password) => supabase.auth.signUp({ email, password }),
  signOut: () => supabase.auth.signOut(),
  session: () => supabase.auth.getSession(),
  onChange: (cb) => supabase.auth.onAuthStateChange((_e, s) => cb(s)),
  // true only if the signed-in user is on the members allow-list
  async isMember() {
    const { data } = await supabase.from("members").select("user_id").maybeSingle();
    return !!data;
  },
};

/* ---------------- TENANTS ---------------- */
export const tenantsApi = {
  list: () => supabase.from("tenants").select("*").order("unit"),
  upsert: (t) => supabase.from("tenants").upsert(t).select().single(),
  remove: (id) => supabase.from("tenants").delete().eq("id", id),
};

/* ---------------- PARKING ---------------- */
export const parkingApi = {
  list: () => supabase.from("parking_spots").select("*"),
  paidForMonth: (month) => supabase.from("parking_payments").select("*").eq("month", month),
  setPaid: (spot_id, month, paid) =>
    supabase.from("parking_payments").upsert({ spot_id, month, paid }, { onConflict: "spot_id,month" }),
};

/* ---------------- PAYMENTS ---------------- */
export const paymentsApi = {
  // full reconciliation for a month, straight from the status view
  statusForMonth: (month) => supabase.from("payment_status").select("*").eq("month", month),
  // whole history for the arrears ledger
  allStatus: () => supabase.from("payment_status").select("tenant_id, month, status, total"),
  // create/update one tenant's payment for one month
  save: (row) =>
    supabase.from("payments").upsert(row, { onConflict: "tenant_id,month" }).select().single(),
};

/* ----------------------------------------------------------------
   Wiring notes for whoever integrates this:
   - Replace the `store` object in RentBook.jsx with calls above.
   - On load: tenantsApi.list(), paymentsApi.statusForMonth(month),
     parkingApi.list()/paidForMonth(month).
   - On edit of a collections cell: paymentsApi.save({ tenant_id, month,
     govt, portion, assistance, check_num, bank_confirm, notes }).
     The DB computes total; the payment_status view returns variance
     and paid/partial/owed, so the UI stops doing that math itself.
   - Gate the whole app behind a session + auth.isMember() check;
     show a sign-in screen otherwise.
------------------------------------------------------------------- */
