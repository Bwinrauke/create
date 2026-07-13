import React, { useEffect, useState } from "react";
import { configured } from "./lib/supabase";
import { authApi } from "./lib/db";
import SignIn from "./auth/SignIn";
import RentBook from "./components/RentBook";

export default function App() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [membership, setMembership] = useState(null); // { member, role }

  useEffect(() => {
    if (!configured) { setReady(true); return; }
    authApi.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = authApi.onChange((s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) authApi.isMember().then(setMembership);
    else setMembership(null);
  }, [session]);

  if (!configured) return <Setup />;
  if (!ready) return <Splash text="Starting up…" />;
  if (!session) return <SignIn />;
  if (membership === null) return <Splash text="Checking access…" />;
  if (!membership.member) return <NotAMember email={session.user?.email} />;
  return <RentBook session={session} role={membership.role} />;
}

function Splash({ text }) {
  return <div style={splash}>{text}</div>;
}

function NotAMember({ email }) {
  return (
    <div style={splash}>
      <div style={{ maxWidth: 400, textAlign: "center" }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: "#f4f1ea", marginBottom: 10 }}>You're signed in, but not on this rent book yet</div>
        <div style={{ fontSize: 13.5, color: "#aeb6c2", lineHeight: 1.5, marginBottom: 18 }}>
          {email} needs to be added by an owner before any data appears. Send them your email; they add one row in the members table and you're in.
        </div>
        <button onClick={() => authApi.signOut()} style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid rgba(255,255,255,.15)", background: "transparent", color: "#f4d488", fontWeight: 600, cursor: "pointer" }}>Sign out</button>
      </div>
    </div>
  );
}

function Setup() {
  return (
    <div style={splash}>
      <div style={{ maxWidth: 440, textAlign: "left", background: "#161f2b", padding: 24, borderRadius: 14, border: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 17, color: "#f4f1ea", marginBottom: 10 }}>Almost there — add your Supabase keys</div>
        <div style={{ fontSize: 13.5, color: "#aeb6c2", lineHeight: 1.55 }}>
          Create a <code style={code}>.env</code> file in the project root with:
          <pre style={pre}>VITE_SUPABASE_URL=...{"\n"}VITE_SUPABASE_ANON_KEY=...</pre>
          Copy both from Supabase → Project Settings → API, then restart the dev server. Full steps are in the README.
        </div>
      </div>
    </div>
  );
}

const splash = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f1620", color: "#8b93a1", fontFamily: "'Inter',sans-serif", fontSize: 14, padding: 20 };
const code = { background: "rgba(255,255,255,.1)", padding: "1px 5px", borderRadius: 4, color: "#f4d488" };
const pre = { background: "#0f1620", padding: 12, borderRadius: 8, marginTop: 10, color: "#a6e0c2", fontSize: 12.5, overflow: "auto" };
