import { supabase } from "./supabase";

/* ---------------- AUTH ---------------- */
export const authApi = {
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signUp: (email, password) => supabase.auth.signUp({ email, password }),
  signOut: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),
  onChange: (cb) => supabase.auth.onAuthStateChange((_e, s) => cb(s)),
  async isMember() {
    const { data, error } = await supabase.from("members").select("user_id, role").maybeSingle();
    if (error) return { member: false, role: null };
    return { member: !!data, role: data?.role || null };
  },
};

/* ---------------- TENANTS ---------------- */
export const tenantsApi = {
  list: () => supabase.from("tenants").select("*").order("unit"),
  upsert: (t) => supabase.from("tenants").upsert(t).select().single(),
  remove: (id) => supabase.from("tenants").delete().eq("id", id),
};

/* ---------------- RENT TERMS (effective-dated splits) ---------------- */
export const rentTermsApi = {
  list: () => supabase.from("rent_terms").select("*").order("effective_from"),
  add: (row) => supabase.from("rent_terms").insert(row).select().single(),
  remove: (id) => supabase.from("rent_terms").delete().eq("id", id),
};

/* ---------------- PARKING ---------------- */
export const parkingApi = {
  list: () => supabase.from("parking_spots").select("*").order("spot"),
  paidForMonth: (month) => supabase.from("parking_payments").select("*").eq("month", month),
  setPaid: (spot_id, month, paid) =>
    supabase.from("parking_payments").upsert({ spot_id, month, paid }, { onConflict: "spot_id,month" }),
};

/* ---------------- PAYMENTS ---------------- */
export const paymentsApi = {
  statusForMonth: (month) => supabase.from("payment_status").select("*").eq("month", month),
  allStatus: () => supabase.from("payment_status").select("tenant_id, month, status, total"),
  allRaw: () => supabase.from("payments").select("tenant_id, month, govt, portion, assistance"),
  save: (row) =>
    supabase.from("payments").upsert(row, { onConflict: "tenant_id,month" }).select().single(),
};

/* ---------------- EXPENSES ---------------- */
export const expensesApi = {
  list: () => supabase.from("expenses").select("*").order("spent_on", { ascending: false }),
  add: (row) => supabase.from("expenses").insert(row).select().single(),
  remove: (id) => supabase.from("expenses").delete().eq("id", id),
};

/* ---------------- NOTES / LOG ---------------- */
export const notesApi = {
  list: () => supabase.from("notes").select("*").order("created_at", { ascending: false }),
  add: (row) => supabase.from("notes").insert(row).select().single(),
  remove: (id) => supabase.from("notes").delete().eq("id", id),
};

/* ---------------- REALTIME (live sync via Postgres change webhooks) ----------------
   Supabase streams every insert/update/delete on the subscribed tables over a
   websocket. When the bookkeeper edits on their phone, the owner's screen updates
   without a refresh — and vice versa. onChange gets the raw change payload (with
   payload.table); onStatus reports the connection state ("SUBSCRIBED", etc.). */
export const realtime = {
  // Tables the app reads. Each becomes a live channel.
  TABLES: ["tenants", "rent_terms", "parking_spots", "parking_payments", "payments", "expenses", "notes"],
  subscribe(onChange, onStatus) {
    if (!supabase) return () => {};
    const channel = supabase.channel("rentbook-live");
    this.TABLES.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        onChange?.({ ...payload, table });
      });
    });
    channel.subscribe((status) => onStatus?.(status));
    return () => { supabase.removeChannel(channel); };
  },
};
