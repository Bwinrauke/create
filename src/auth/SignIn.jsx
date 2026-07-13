import React, { useState } from "react";
import { Building2, LogIn } from "lucide-react";
import { authApi } from "../lib/db";

export default function SignIn() {
  const [mode, setMode] = useState("in"); // 'in' | 'up'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await authApi.signIn(email.trim(), password);
        if (error) setMsg({ type: "err", text: error.message });
        // success => App's auth listener swaps the screen
      } else {
        const { error } = await authApi.signUp(email.trim(), password);
        if (error) setMsg({ type: "err", text: error.message });
        else setMsg({ type: "ok", text: "Account created. An owner still needs to add you to the rent book before you can see any data." });
      }
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
    setBusy(false);
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <div style={plaque}><Building2 size={22} color="#1a222e" /></div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 19, color: "#f4f1ea" }}>2137 Rent Book</div>
            <div style={{ fontSize: 12.5, color: "#8b93a1" }}>Sign in to the rent roll</div>
          </div>
        </div>

        <label style={lbl}>Email</label>
        <input style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="you@example.com" />

        <label style={lbl}>Password</label>
        <input style={inp} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••••" />

        {msg && (
          <div style={{ ...note, background: msg.type === "err" ? "#3a2626" : "#26332b", color: msg.type === "err" ? "#f0b4ac" : "#a6e0c2" }}>
            {msg.text}
          </div>
        )}

        <button onClick={submit} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>
          <LogIn size={16} /> {busy ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
        </button>

        <div style={{ textAlign: "center", marginTop: 14, fontSize: 12.5, color: "#8b93a1" }}>
          {mode === "in" ? "Need an account?" : "Already have one?"}{" "}
          <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }} style={switchBtn}>
            {mode === "in" ? "Sign up" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

const wrap = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f1620", padding: 20 };
const card = { width: 380, maxWidth: "100%", background: "#161f2b", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 28, boxShadow: "0 24px 70px rgba(0,0,0,.4)" };
const plaque = { width: 42, height: 42, borderRadius: 10, background: "linear-gradient(150deg,#e7c56b,#b8892b)", display: "flex", alignItems: "center", justifyContent: "center" };
const lbl = { display: "block", fontSize: 11.5, color: "#8b93a1", fontWeight: 600, margin: "12px 0 5px" };
const inp = { width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid rgba(255,255,255,.12)", background: "#0f1620", color: "#f4f1ea", fontSize: 14, fontFamily: "'Inter',sans-serif" };
const btn = { width: "100%", marginTop: 18, padding: "11px", borderRadius: 9, border: "none", background: "linear-gradient(150deg,#e7c56b,#b8892b)", color: "#1a222e", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 };
const switchBtn = { border: "none", background: "transparent", color: "#f4d488", fontWeight: 700, cursor: "pointer", fontSize: 12.5 };
const note = { marginTop: 14, padding: "10px 12px", borderRadius: 9, fontSize: 12.5, lineHeight: 1.45 };
