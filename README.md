# 2137 Rent Book — full app

A real, deployable rent-management platform: hosted database, login, and shared
data for you and a bookkeeper, on any device. This is the complete front-end
wired to a Supabase backend.

## What's inside

```
rentbook/
├── backend/              SQL to stand up the database
│   ├── schema.sql        tables, computed totals, paid/partial/owed logic, security
│   └── seed.sql          your real 2137 roster + July 2026 collections
├── src/
│   ├── App.jsx           login gating + membership check
│   ├── auth/SignIn.jsx   sign-in / sign-up screen
│   ├── components/RentBook.jsx   the app: overview, collections, ledger, tenants, parking
│   └── lib/              supabase client, data API, shared UI
├── .env.example          the two keys you need to fill in
├── vercel.json           one-click Vercel deploy config
└── package.json
```

## Get it running (about an hour, start to finish)

### 1. Database (Supabase)
1. Create a free project at **supabase.com**.
2. In the SQL editor, run **`backend/schema.sql`**, then **`backend/seed.sql`**.
3. In **Authentication → Providers**, keep Email on. Turn **off** "Confirm email"
   for now so you and the bookkeeper can sign in immediately.

### 2. Connect the app
1. `npm install`
2. Copy `.env.example` to `.env` and paste your Project URL + anon key
   (Supabase → Project Settings → API).
3. `npm run dev` → open the local URL. You'll see the sign-in screen.

### 3. Add the two of you
1. Sign up once each (in the app, or Supabase → Authentication → Users).
2. For each person, run once in the SQL editor:
   ```sql
   insert into members (user_id, email, role)
   values ('<their user id>', '<their email>', 'owner');  -- use 'staff' for the bookkeeper
   ```
   Only members can see or change anything. Everyone else gets an empty screen.

### 4. Put it online (Vercel)
1. Push this folder to a GitHub repo.
2. Import it at **vercel.com** → add the same two env vars in project settings → deploy.
3. You get a URL that works on any device, for both of you, always in sync.

## How the money logic lives in the database now

- `total` is a computed column: `govt + portion + assistance`. The app never
  calculates it — the database does, so it can't drift.
- The `payment_status` view derives `variance` (`total − lease_rent`) and the
  `paid / partial / owed` status. Edit a figure in Collections and it re-derives
  server-side, then syncs to the other signed-in user.
- Row-level security means an account that isn't on the members list sees nothing,
  even though it can technically sign in.

## Deliberately not built yet (your next choices)

- **Printable/exported monthly statements** — natural next add now that it's live.
- **Running arrears balance** — the ledger *shows* who's behind; it doesn't yet
  carry a cumulative dollar balance forward.
- **Tenant reminders** (text/email).
- **Full audit history** — payments record who last edited and when; a complete
  change log is a later add.

Everything above is a clean addition on top of this foundation, not a rewrite.
