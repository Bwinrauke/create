import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2, LayoutDashboard, Receipt, Users, Grid3x3, Car,
  Check, Phone, Plus, X, Search, CalendarClock, Banknote, Pencil,
  ChevronRight, ChevronDown, Landmark, Wallet, LogOut, Trash2,
} from "lucide-react";
import { tenantsApi, parkingApi, paymentsApi, rentTermsApi, authApi } from "../lib/db";
import {
  S, MONTHS, STATUS, CURRENT_MONTH, money, reconcile, buildLedger,
  Money, Variance, Stamp, UnitChip, Legend, BigStat,
} from "../lib/ui";

export default function RentBook({ session, role }) {
  const [view, setView] = useState("overview");
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [tenants, setTenants] = useState([]);
  const [rentTerms, setRentTerms] = useState([]);
  const [parking, setParking] = useState([]);
  const [monthStatus, setMonthStatus] = useState([]);
  const [parkingPaid, setParkingPaid] = useState({});
  const [rawPayments, setRawPayments] = useState([]);
  const [editTenant, setEditTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStatic = useCallback(async () => {
    const [t, p, rt] = await Promise.all([tenantsApi.list(), parkingApi.list(), rentTermsApi.list()]);
    setTenants(t.data || []);
    setParking(p.data || []);
    setRentTerms(rt.data || []);
  }, []);

  const loadMonth = useCallback(async (m) => {
    const [st, pp] = await Promise.all([paymentsApi.statusForMonth(m), parkingApi.paidForMonth(m)]);
    setMonthStatus(st.data || []);
    const map = {};
    (pp.data || []).forEach((r) => { map[r.spot_id] = r.paid; });
    setParkingPaid(map);
  }, []);

  const loadLedger = useCallback(async () => {
    const { data } = await paymentsApi.allRaw();
    setRawPayments(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadStatic();
      await loadMonth(month);
      setLoading(false);
    })();
  }, []); // eslint-disable-line

  useEffect(() => { loadMonth(month); }, [month, loadMonth]);
  useEffect(() => { if (view === "ledger") loadLedger(); }, [view, loadLedger]);

  const activeTenants = useMemo(() => tenants.filter((t) => t.active !== false), [tenants]);
  const statusMap = useMemo(() => {
    const m = {};
    monthStatus.forEach((r) => { m[r.tenant_id] = r; });
    return m;
  }, [monthStatus]);

  const setPay = useCallback(async (tenantId, field, value) => {
    const cur = statusMap[tenantId] || {};
    const row = {
      tenant_id: tenantId, month,
      govt: field === "govt" ? value : (cur.govt || 0),
      portion: field === "portion" ? value : (cur.portion || 0),
      assistance: field === "assistance" ? value : (cur.assistance || 0),
      check_num: field === "check_num" ? value : (cur.check_num || ""),
      bank_confirm: field === "bank_confirm" ? value : (cur.bank_confirm || false),
      notes: field === "notes" ? value : (cur.notes || ""),
    };
    await paymentsApi.save(row);
    await loadMonth(month);
  }, [statusMap, month, loadMonth]);

  const roll = useMemo(() => {
    let expected = 0, collected = 0, govtTotal = 0, tenantTotal = 0, paidCt = 0, partialCt = 0, owedCt = 0;
    const rows = activeTenants.map((t) => {
      const s = statusMap[t.id];
      const r = s
        ? { govt: +s.govt, portion: +s.portion, assistance: +s.assistance, total: +s.total, rent: +s.lease_rent, variance: +s.variance, status: s.status }
        : reconcile(null, t);
      const pay = s
        ? { govt: s.govt, portion: s.portion, assistance: s.assistance, check_num: s.check_num, bank_confirm: s.bank_confirm, notes: s.notes }
        : {};
      expected += r.rent; collected += r.total; govtTotal += r.govt; tenantTotal += r.portion + r.assistance;
      if (r.status === "paid") paidCt++; else if (r.status === "partial") partialCt++; else owedCt++;
      return { t, r, pay };
    });
    return { rows, expected, collected, govtTotal, tenantTotal, outstanding: expected - collected, paidCt, partialCt, owedCt };
  }, [activeTenants, statusMap]);

  const leaseAlerts = useMemo(() => {
    const ref = new Date(month + "-01");
    return activeTenants
      .filter((t) => t.lease_end)
      .map((t) => ({ t, end: new Date(t.lease_end), days: Math.round((new Date(t.lease_end) - ref) / 86400000) }))
      .filter((x) => x.days <= 120)
      .sort((a, b) => a.days - b.days);
  }, [activeTenants, month]);

  const saveTenant = async (t) => {
    const payload = { ...t };
    if (!payload.id) delete payload.id;
    const { data } = await tenantsApi.upsert(payload);
    if (!t.id && data) {
      await rentTermsApi.add({
        tenant_id: data.id,
        effective_from: t.lease_start || `${CURRENT_MONTH}-01`,
        lease_rent: t.lease_rent, govt_expected: t.govt_default, tenant_expected: t.portion_default,
        note: "Initial term",
      });
    }
    await loadStatic();
    setEditTenant(null);
  };
  const deleteTenant = async (id) => { await tenantsApi.remove(id); await loadStatic(); setEditTenant(null); };
  const addTerm = async (row) => { await rentTermsApi.add(row); await loadStatic(); };
  const removeTerm = async (id) => { await rentTermsApi.remove(id); await loadStatic(); };
  const toggleParking = async (spotId) => {
    const next = !parkingPaid[spotId];
    setParkingPaid((p) => ({ ...p, [spotId]: next }));
    await parkingApi.setPaid(spotId, month, next);
  };

  const NAV = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "collections", label: "Collections", icon: Receipt },
    { id: "ledger", label: "Arrears ledger", icon: Grid3x3 },
    { id: "tenants", label: "Tenants", icon: Users },
    { id: "parking", label: "Parking", icon: Car },
  ];
  const monthLabel = MONTHS.find((m) => m.key === month)?.label || month;
  const modalTerms = editTenant && editTenant !== "new" ? rentTerms.filter((rt) => rt.tenant_id === editTenant.id) : [];

  return (
    <div style={S.page}>
      <aside style={S.sidebar}>
        <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={S.brassPlaque}><Building2 size={18} color="#1a222e" /></div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: "#f4f1ea" }}>2137 Rent Book</div>
              <div style={{ fontSize: 11, color: "#8b93a1" }}>FDOR · {activeTenants.length} units</div>
            </div>
          </div>
        </div>
        <nav style={{ padding: "14px 12px", flex: 1 }}>
          {NAV.map((n) => {
            const on = view === n.id; const Icon = n.icon;
            return (
              <button key={n.id} onClick={() => setView(n.id)} style={{
                ...S.navBtn, background: on ? "rgba(184,137,43,.16)" : "transparent",
                color: on ? "#f4d488" : "#aeb6c2", borderLeft: on ? "2px solid #b8892b" : "2px solid transparent",
              }}>
                <Icon size={17} /> {n.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ fontSize: 11.5, color: "#8b93a1", marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {session?.user?.email} · {role}
          </div>
          <button onClick={() => authApi.signOut()} style={{ ...S.navBtn, color: "#aeb6c2", padding: "8px 10px" }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <header style={S.topbar}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 20, color: "#1c2836" }}>{NAV.find((n) => n.id === view)?.label}</div>
            <div style={{ fontSize: 12.5, color: "#8a8681", marginTop: 1 }}>Building 2137 · subsidized rent roll</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CalendarClock size={16} color="#8a8681" />
            <select value={month} onChange={(e) => setMonth(e.target.value)} style={S.monthSelect}>
              {MONTHS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
        </header>

        <div style={{ flex: 1, overflow: "auto", padding: "24px 28px 60px" }}>
          {loading ? (
            <div style={{ color: "#8a8681", fontFamily: "'Space Grotesk',sans-serif", padding: 40 }}>Loading the rent book…</div>
          ) : (
            <>
              {view === "overview" && <Overview roll={roll} monthLabel={monthLabel} leaseAlerts={leaseAlerts} go={setView} />}
              {view === "collections" && <Collections roll={roll} monthLabel={monthLabel} setPay={setPay} />}
              {view === "ledger" && <Ledger tenants={activeTenants} terms={rentTerms} rawPayments={rawPayments} />}
              {view === "tenants" && <Tenants tenants={tenants} onEdit={setEditTenant} onAdd={() => setEditTenant("new")} />}
              {view === "parking" && <Parking parking={parking} parkingPaid={parkingPaid} monthLabel={monthLabel} toggle={toggleParking} />}
            </>
          )}
        </div>
      </main>

      {editTenant && (
        <TenantModal
          tenant={editTenant === "new" ? null : editTenant}
          terms={modalTerms}
          onClose={() => setEditTenant(null)}
          onSave={saveTenant}
          onDelete={deleteTenant}
          onAddTerm={addTerm}
          onRemoveTerm={removeTerm}
        />
      )}
    </div>
  );
}

/* ================= OVERVIEW ================= */
function Overview({ roll, monthLabel, leaseAlerts, go }) {
  const rate = roll.expected ? Math.round((roll.collected / roll.expected) * 100) : 0;
  const owedRows = roll.rows.filter((x) => x.r.status !== "paid");
  const n = Math.max(roll.rows.length, 1);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 22 }}>
        <BigStat label={`Expected · ${monthLabel}`} value={money(roll.expected)} sub={`${roll.rows.length} active units`} accent="#1c2836" />
        <BigStat label="Collected" value={money(roll.collected)} sub={`${rate}% of rent roll`} accent="#0f7a54" />
        <BigStat label="Outstanding" value={money(roll.outstanding)} sub={`${roll.owedCt + roll.partialCt} units short`} accent={roll.outstanding > 0.5 ? "#a83232" : "#0f7a54"} />
        <BigStat label="Govt vs tenant" value={money(roll.govtTotal)} sub={`+ ${money(roll.tenantTotal)} tenant share`} accent="#8a6a1e" />
      </div>

      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={S.cardTitle}>Collection progress</div>
          <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#6b6b66" }}>
            <Legend dot="#12a06e" label={`${roll.paidCt} paid`} />
            <Legend dot="#e0a326" label={`${roll.partialCt} partial`} />
            <Legend dot="#d24b4b" label={`${roll.owedCt} owed`} />
          </div>
        </div>
        <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", background: "#eee9df" }}>
          <div style={{ width: `${(roll.paidCt / n) * 100}%`, background: "#12a06e" }} />
          <div style={{ width: `${(roll.partialCt / n) * 100}%`, background: "#e0a326" }} />
          <div style={{ width: `${(roll.owedCt / n) * 100}%`, background: "#d24b4b" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginTop: 16, alignItems: "start" }}>
        <div style={S.card}>
          <div style={{ ...S.cardTitle, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
            <span>Needs attention</span>
            <button onClick={() => go("collections")} style={S.linkBtn}>Open collections <ChevronRight size={13} /></button>
          </div>
          {owedRows.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "#0f7a54", fontSize: 13.5, fontWeight: 600 }}>
              <Check size={16} style={{ verticalAlign: "-2px" }} /> Every unit is fully collected for {monthLabel}.
            </div>
          ) : owedRows.map(({ t, r }) => (
            <div key={t.id} style={S.attnRow}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <UnitChip unit={t.unit} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: "#1c2836", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                  <div style={{ fontSize: 11.5, color: "#8a8681" }}>{t.program}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10.5, color: "#8a8681", textTransform: "uppercase", letterSpacing: ".04em" }}>Short</div>
                  <Money v={r.variance || -r.rent} size={13} bold />
                </div>
                <Stamp status={r.status} />
              </div>
            </div>
          ))}
        </div>

        <div style={S.card}>
          <div style={{ ...S.cardTitle, marginBottom: 12 }}>Lease renewals</div>
          {leaseAlerts.length === 0 ? (
            <div style={{ color: "#8a8681", fontSize: 13, padding: "8px 0" }}>No leases ending in the next 120 days (for units with dates on file).</div>
          ) : leaseAlerts.map(({ t, end, days }) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f0ece3" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <UnitChip unit={t.unit} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1c2836" }}>{t.name}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: days < 0 ? "#a83232" : days <= 45 ? "#9a6511" : "#1c2836", fontFamily: "'IBM Plex Mono',monospace" }}>
                  {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                </div>
                <div style={{ fontSize: 11, color: "#8a8681" }}>{end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= COLLECTIONS ================= */
function Collections({ roll, monthLabel, setPay }) {
  return (
    <div>
      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #eee9df" }}>
          <div style={S.cardTitle}>Reconciliation · {monthLabel}</div>
          <div style={{ display: "flex", gap: 20, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5 }}>
            <span style={{ color: "#8a8681" }}>Collected <b style={{ color: "#0f7a54" }}>{money(roll.collected)}</b></span>
            <span style={{ color: "#8a8681" }}>Outstanding <b style={{ color: roll.outstanding > 0.5 ? "#a83232" : "#0f7a54" }}>{money(roll.outstanding)}</b></span>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr>
                {["Unit", "Tenant", "Lease rent", "Govt", "Tenant portion", "Assistance", "Check #", "Collected", "Variance", "Status"].map((h, i) => (
                  <th key={h} style={{ ...S.th, textAlign: i >= 2 && i <= 8 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roll.rows.map(({ t, r, pay }) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #f2eee5" }}>
                  <td style={S.td}><UnitChip unit={t.unit} /></td>
                  <td style={S.td}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: "#1c2836" }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "#8a8681" }}>{t.program}</div>
                  </td>
                  <td style={{ ...S.td, textAlign: "right" }}><Money v={r.rent} dim /></td>
                  <td style={{ ...S.td, textAlign: "right" }}><NumCell value={pay.govt} onCommit={(v) => setPay(t.id, "govt", v)} /></td>
                  <td style={{ ...S.td, textAlign: "right" }}><NumCell value={pay.portion} onCommit={(v) => setPay(t.id, "portion", v)} /></td>
                  <td style={{ ...S.td, textAlign: "right" }}><NumCell value={pay.assistance} onCommit={(v) => setPay(t.id, "assistance", v)} /></td>
                  <td style={{ ...S.td, textAlign: "right" }}>
                    <TextCell value={pay.check_num} onCommit={(v) => setPay(t.id, "check_num", v)} />
                  </td>
                  <td style={{ ...S.td, textAlign: "right" }}><Money v={r.total} bold /></td>
                  <td style={{ ...S.td, textAlign: "right" }}><Variance v={r.variance} /></td>
                  <td style={{ ...S.td, textAlign: "right" }}><Stamp status={r.status} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#faf8f3" }}>
                <td style={{ ...S.td, fontWeight: 700 }} colSpan={2}>Totals · {roll.rows.length} units</td>
                <td style={{ ...S.td, textAlign: "right" }}><Money v={roll.expected} bold /></td>
                <td style={{ ...S.td, textAlign: "right" }}><Money v={roll.govtTotal} bold /></td>
                <td style={{ ...S.td, textAlign: "right" }} colSpan={2}><Money v={roll.tenantTotal} bold /></td>
                <td style={S.td}></td>
                <td style={{ ...S.td, textAlign: "right" }}><Money v={roll.collected} bold /></td>
                <td style={{ ...S.td, textAlign: "right" }}><Variance v={-roll.outstanding} /></td>
                <td style={S.td}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#8a8681", marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
        <Pencil size={12} /> Edit any govt / portion / assistance figure — the database recomputes the total, variance, and status, and it syncs to everyone on the account.
      </div>
    </div>
  );
}

function NumCell({ value, onCommit }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => { setV(value ?? ""); }, [value]);
  return (
    <input value={v} onChange={(e) => setV(e.target.value)}
      onBlur={() => onCommit(v === "" ? 0 : parseFloat(v) || 0)}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      inputMode="decimal" placeholder="0.00" style={{ ...S.cellInput, width: 84, textAlign: "right" }} />
  );
}
function TextCell({ value, onCommit }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => { setV(value ?? ""); }, [value]);
  return (
    <input value={v} onChange={(e) => setV(e.target.value)} onBlur={() => onCommit(v)}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      placeholder="—" style={{ ...S.cellInput, width: 92, textAlign: "right", fontSize: 12 }} />
  );
}

/* ================= ARREARS LEDGER (running balances) ================= */
function Bal({ v, size = 13 }) {
  if (Math.abs(v) < 0.5) return <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: size, color: "#9a958c" }}>—</span>;
  const owed = v > 0;
  return (
    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, fontSize: size, color: owed ? "#a83232" : "#0f7a54" }}>
      {owed ? money(v) : `(${money(Math.abs(v))})`}
    </span>
  );
}

function Ledger({ tenants, terms, rawPayments }) {
  const rows = useMemo(() => buildLedger(tenants, terms, rawPayments, CURRENT_MONTH), [tenants, terms, rawPayments]);
  const [open, setOpen] = useState(null);
  const tenantArrears = rows.reduce((s, r) => s + Math.max(r.tenantBal, 0), 0);
  const govtArrears = rows.reduce((s, r) => s + Math.max(r.govtBal, 0), 0);
  const netOutstanding = rows.reduce((s, r) => s + r.totalBal, 0);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 18 }}>
        <BigStat label="Tenant arrears" value={money(tenantArrears)} sub="owed by tenants" accent={tenantArrears > 0.5 ? "#a83232" : "#0f7a54"} />
        <BigStat label="Government behind" value={money(govtArrears)} sub="delayed HAP / FHEPS" accent={govtArrears > 0.5 ? "#a83232" : "#0f7a54"} />
        <BigStat label="Net outstanding" value={money(netOutstanding)} sub="after any credits" accent={netOutstanding > 0.5 ? "#a83232" : "#0f7a54"} />
      </div>

      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #eee9df", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={S.cardTitle}>Balances by tenant</div>
          <div style={{ fontSize: 12, color: "#8a8681" }}>Red = owed to you · (green) = credit / overpaid</div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 34 }}></th>
                <th style={S.th}>Unit / Tenant</th>
                <th style={{ ...S.th, textAlign: "right" }}>Govt balance</th>
                <th style={{ ...S.th, textAlign: "right" }}>Tenant balance</th>
                <th style={{ ...S.th, textAlign: "right" }}>Total owed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ t, govtBal, tenantBal, totalBal, detail }) => {
                const isOpen = open === t.id;
                return (
                  <React.Fragment key={t.id}>
                    <tr onClick={() => setOpen(isOpen ? null : t.id)} style={{ borderBottom: "1px solid #f2eee5", cursor: "pointer", background: isOpen ? "#faf8f3" : "transparent" }}>
                      <td style={{ ...S.td, textAlign: "center", color: "#a8a294" }}>{isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
                      <td style={S.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <UnitChip unit={t.unit} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13.5, color: "#1c2836" }}>{t.name}</div>
                            <div style={{ fontSize: 11, color: "#8a8681" }}>{t.program}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...S.td, textAlign: "right" }}><Bal v={govtBal} /></td>
                      <td style={{ ...S.td, textAlign: "right" }}><Bal v={tenantBal} /></td>
                      <td style={{ ...S.td, textAlign: "right" }}><Bal v={totalBal} size={14} /></td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={5} style={{ padding: 0, background: "#fbfaf6", borderBottom: "1px solid #eee9df" }}>
                          <LedgerDetail detail={detail} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#8a8681", marginTop: 10 }}>
        Balances carry forward from the first month you logged. Govt and tenant shortfalls are tracked separately, so you know whether to chase the agency or the tenant. This is the running record housing court asks for.
      </div>
    </div>
  );
}

function LedgerDetail({ detail }) {
  if (!detail.length) return <div style={{ padding: 16, fontSize: 12.5, color: "#8a8681" }}>No months due yet for this tenant.</div>;
  return (
    <div style={{ overflowX: "auto", padding: "6px 0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
        <thead>
          <tr>
            {["Month", "Govt exp", "Govt in", "Govt Δ", "Tenant exp", "Tenant in", "Tenant Δ", "Govt bal", "Tenant bal"].map((h, i) => (
              <th key={h} style={{ ...S.th, background: "transparent", textAlign: i === 0 ? "left" : "right", fontSize: 10, padding: "7px 12px" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {detail.map((d) => (
            <tr key={d.month} style={{ borderBottom: "1px solid #f2eee5" }}>
              <td style={{ ...S.td, padding: "7px 12px", fontWeight: 600, fontSize: 12.5 }}>{d.label}</td>
              <td style={{ ...S.td, padding: "7px 12px", textAlign: "right" }}><Money v={d.govtExpected} size={12} dim /></td>
              <td style={{ ...S.td, padding: "7px 12px", textAlign: "right" }}><Money v={d.govtRec} size={12} /></td>
              <td style={{ ...S.td, padding: "7px 12px", textAlign: "right" }}><Bal v={d.govtShort} size={12} /></td>
              <td style={{ ...S.td, padding: "7px 12px", textAlign: "right" }}><Money v={d.tenantExpected} size={12} dim /></td>
              <td style={{ ...S.td, padding: "7px 12px", textAlign: "right" }}><Money v={d.tenRec} size={12} /></td>
              <td style={{ ...S.td, padding: "7px 12px", textAlign: "right" }}><Bal v={d.tenShort} size={12} /></td>
              <td style={{ ...S.td, padding: "7px 12px", textAlign: "right" }}><Bal v={d.govtBal} size={12} /></td>
              <td style={{ ...S.td, padding: "7px 12px", textAlign: "right" }}><Bal v={d.tenantBal} size={12} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================= TENANTS ================= */
function Tenants({ tenants, onEdit, onAdd }) {
  const [q, setQ] = useState("");
  const list = tenants.filter((t) => (t.name + t.unit + t.program).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={15} color="#a8a294" style={{ position: "absolute", left: 12, top: 11 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tenants, units, programs"
            style={{ ...S.cellInput, width: "100%", padding: "9px 12px 9px 34px", fontFamily: "'Inter',sans-serif" }} />
        </div>
        <button onClick={onAdd} style={S.primaryBtn}><Plus size={16} /> Add tenant</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
        {list.map((t) => (
          <div key={t.id} style={{ ...S.card, padding: 16, cursor: "pointer" }} onClick={() => onEdit(t)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 11, alignItems: "center", minWidth: 0 }}>
                <UnitChip unit={t.unit} big />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1c2836", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                  <div style={{ fontSize: 11.5, color: "#8a8681" }}>{t.beds} · {t.program}</div>
                </div>
              </div>
              <Pencil size={14} color="#b3ada1" />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #f2eee5" }}>
              <MiniStat icon={Landmark} label="Govt" v={t.govt_default} />
              <MiniStat icon={Wallet} label="Tenant" v={t.portion_default} />
              <MiniStat icon={Banknote} label="Lease" v={t.lease_rent} strong />
            </div>
            {(t.phone || t.lease_end) && (
              <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: 11.5, color: "#8a8681" }}>
                {t.phone && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={11} /> {t.phone}</span>}
                {t.lease_end && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><CalendarClock size={11} /> ends {t.lease_end}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, v, strong }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: 10, color: "#a8a294", textTransform: "uppercase", letterSpacing: ".04em", display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginBottom: 2 }}>
        <Icon size={10} /> {label}
      </div>
      <Money v={v} size={13} bold={strong} />
    </div>
  );
}

function TenantModal({ tenant, terms, onClose, onSave, onDelete, onAddTerm, onRemoveTerm }) {
  const [f, setF] = useState(tenant || {
    name: "", unit: "", beds: "2BR", lease_rent: 0, deposit: 0, lease_start: "", lease_end: "",
    program: "Section 8", govt_default: 0, portion_default: 0, phone: "", active: true,
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const num = (k, v) => set(k, v === "" ? 0 : parseFloat(v) || 0);
  const clean = () => {
    const out = { ...f };
    ["lease_start", "lease_end"].forEach((k) => { if (!out[k]) out[k] = null; });
    return out;
  };
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: "#1c2836" }}>{tenant ? "Edit tenant" : "New tenant"}</div>
          <button onClick={onClose} style={S.iconBtn}><X size={18} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tenant name" span={2}><input style={S.field} value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Unit"><input style={S.field} value={f.unit} onChange={(e) => set("unit", e.target.value)} /></Field>
          <Field label="Bedrooms"><input style={S.field} value={f.beds} onChange={(e) => set("beds", e.target.value)} /></Field>
          <Field label="Program"><input style={S.field} value={f.program} onChange={(e) => set("program", e.target.value)} /></Field>
          <Field label="Phone"><input style={S.field} value={f.phone || ""} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Lease rent"><input style={S.field} inputMode="decimal" value={f.lease_rent} onChange={(e) => num("lease_rent", e.target.value)} /></Field>
          <Field label="Security deposit"><input style={S.field} inputMode="decimal" value={f.deposit} onChange={(e) => num("deposit", e.target.value)} /></Field>
          <Field label="Govt share (current)"><input style={S.field} inputMode="decimal" value={f.govt_default} onChange={(e) => num("govt_default", e.target.value)} /></Field>
          <Field label="Tenant share (current)"><input style={S.field} inputMode="decimal" value={f.portion_default} onChange={(e) => num("portion_default", e.target.value)} /></Field>
          <Field label="Lease start"><input style={S.field} type="date" value={f.lease_start || ""} onChange={(e) => set("lease_start", e.target.value)} /></Field>
          <Field label="Lease end"><input style={S.field} type="date" value={f.lease_end || ""} onChange={(e) => set("lease_end", e.target.value)} /></Field>
        </div>

        <RentSchedule tenant={tenant} terms={terms} onAddTerm={onAddTerm} onRemoveTerm={onRemoveTerm} />

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
          {tenant ? <button onClick={() => onDelete(f.id)} style={{ ...S.ghostBtn, color: "#a83232" }}>Remove</button> : <span />}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={S.ghostBtn}>Cancel</button>
            <button onClick={() => onSave(clean())} style={S.primaryBtn}>Save tenant</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RentSchedule({ tenant, terms, onAddTerm, onRemoveTerm }) {
  const [nt, setNt] = useState({ effective_from: "", lease_rent: "", govt_expected: "", tenant_expected: "", note: "" });
  const set = (k, v) => setNt((p) => ({ ...p, [k]: v }));
  const add = () => {
    if (!tenant || !nt.effective_from) return;
    onAddTerm({
      tenant_id: tenant.id,
      effective_from: nt.effective_from,
      lease_rent: parseFloat(nt.lease_rent) || 0,
      govt_expected: parseFloat(nt.govt_expected) || 0,
      tenant_expected: parseFloat(nt.tenant_expected) || 0,
      note: nt.note || "Recertification",
    });
    setNt({ effective_from: "", lease_rent: "", govt_expected: "", tenant_expected: "", note: "" });
  };

  return (
    <div style={{ marginTop: 18, borderTop: "1px solid #eee9df", paddingTop: 16 }}>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13.5, color: "#1c2836", marginBottom: 4 }}>Rent schedule (recertifications)</div>
      <div style={{ fontSize: 11.5, color: "#8a8681", marginBottom: 12 }}>Each dated term sets the govt/tenant split from that date forward. Past months keep the split that was in effect then.</div>

      {!tenant ? (
        <div style={{ fontSize: 12.5, color: "#8a8681", background: "#faf8f3", padding: 12, borderRadius: 8 }}>Save the tenant first, then reopen to add recert terms. A starting term is created automatically.</div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {(terms || []).length === 0 && <div style={{ fontSize: 12.5, color: "#8a8681" }}>No terms yet.</div>}
            {(terms || []).map((tm) => (
              <div key={tm.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#faf8f3", padding: "8px 12px", borderRadius: 8 }}>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 600, color: "#7a5c17", minWidth: 84 }}>{tm.effective_from}</span>
                <span style={{ fontSize: 12, color: "#5a5850" }}>rent {money(tm.lease_rent)} · govt {money(tm.govt_expected)} · tenant {money(tm.tenant_expected)}</span>
                <span style={{ flex: 1 }} />
                <button onClick={() => onRemoveTerm(tm.id)} style={{ ...S.iconBtn, color: "#b3ada1" }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
            <Field label="Effective from"><input style={S.field} type="date" value={nt.effective_from} onChange={(e) => set("effective_from", e.target.value)} /></Field>
            <Field label="Rent"><input style={S.field} inputMode="decimal" placeholder="0" value={nt.lease_rent} onChange={(e) => set("lease_rent", e.target.value)} /></Field>
            <Field label="Govt"><input style={S.field} inputMode="decimal" placeholder="0" value={nt.govt_expected} onChange={(e) => set("govt_expected", e.target.value)} /></Field>
            <Field label="Tenant"><input style={S.field} inputMode="decimal" placeholder="0" value={nt.tenant_expected} onChange={(e) => set("tenant_expected", e.target.value)} /></Field>
            <button onClick={add} style={{ ...S.primaryBtn, padding: "9px 14px" }}><Plus size={15} /></button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, span, children }) {
  return (
    <label style={{ gridColumn: span === 2 ? "1 / -1" : "auto" }}>
      <div style={{ fontSize: 11.5, color: "#8a8681", marginBottom: 5, fontWeight: 600 }}>{label}</div>
      {children}
    </label>
  );
}

/* ================= PARKING ================= */
function Parking({ parking, parkingPaid, monthLabel, toggle }) {
  const total = parking.reduce((s, p) => s + (+p.amount || 0), 0);
  const collected = parking.reduce((s, p) => s + (parkingPaid[p.id] ? +p.amount : 0), 0);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 18 }}>
        <BigStat label={`Parking roll · ${monthLabel}`} value={money(total)} sub={`${parking.length} spots`} accent="#1c2836" />
        <BigStat label="Collected" value={money(collected)} sub={`${money(total - collected)} outstanding`} accent="#0f7a54" />
      </div>
      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        {parking.map((p, i) => {
          const paid = !!parkingPaid[p.id];
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", borderBottom: i < parking.length - 1 ? "1px solid #f2eee5" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ ...S.brassPlaque, background: "#eef1f4", width: 34, height: 34 }}><Car size={16} color="#5a6472" /></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#1c2836" }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: "#8a8681" }}>{p.spot} · {p.method}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Money v={p.amount} bold />
                <button onClick={() => toggle(p.id)} style={{
                  ...S.pill, background: paid ? "#e3f3ec" : "#f3f0e9", color: paid ? "#0f7a54" : "#8a8681",
                  border: `1px solid ${paid ? "#12a06e44" : "#ddd7cb"}`,
                }}>
                  {paid ? <><Check size={13} /> Paid</> : "Mark paid"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
