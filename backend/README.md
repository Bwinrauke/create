# 2137 Rent Book — Backend Foundation (Phase 1)

This turns the prototype into a real platform: hosted database, login, and shared
data for you **and** your bookkeeper, on any device.

## The stack (and why)

- **Supabase** — hosted Postgres + login + row-level security. One service gives you
  the database, user accounts, and access control. No server to run.
- **Vercel** — hosts the React front-end. Free, push-to-deploy.
- **Cost:** $0 to start. Supabase and Vercel free tiers cover two users and this data
  volume comfortably. Move to Supabase Pro ($25/mo) only if/when you want daily backups
  and point-in-time restore — worth it once this is your real record.

## What's in this folder

| File | What it is |
|------|-----------|
| `schema.sql` | The database: tables, auto-computed totals, the paid/partial/owed logic, and security rules. |
| `seed.sql` | Your real 2137 roster + July 2026 collections, preloaded. |
| `db.js` | The auth + data layer that connects the existing React app to the backend. |

## Stand it up (about 30–60 minutes)

1. Create a free project at supabase.com. Pick a strong database password; save it.
2. In the Supabase **SQL Editor**, paste and run `schema.sql`, then `seed.sql`.
3. In **Authentication → Providers**, keep Email on. Turn **off** "Confirm email" for
   now so you and the bookkeeper can sign in immediately (turn it back on later).
4. Add the two of you as members. Each person signs up once in the app (or via
   Authentication → Users → Add user), then run this once per person in the SQL editor:
   ```sql
   insert into members (user_id, email, role)
   values ('<paste their user id>', '<their email>', 'owner');  -- use 'staff' for the bookkeeper
   ```
   Only members can see or touch any data. Everyone else gets nothing.
5. In **Project Settings → API**, copy the Project URL and the `anon` public key into
   the app's `.env`:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

## Phase 2 — wire the app (the front-end work)

The UI is already built. Phase 2 swaps its local storage for `db.js` and adds a sign-in
screen. Scope for whoever does it (your web contractor can knock this out):

1. `npm install @supabase/supabase-js`; add the `.env` above.
2. Replace the `store` object in `RentBook.jsx` with the `db.js` calls (notes are in that file).
3. Add a sign-in screen; gate the app behind a session + members check.
4. Deploy the front-end to Vercel.

**Realistic timeline:** backend live in an afternoon (steps above). Phase 2 wiring +
sign-in + deploy is roughly **2–4 focused days** for a developer, since the interface and
the data model already exist and agree with each other.

## What this deliberately does NOT do yet

- No printable/exportable monthly statements (you flagged backend first — this is the
  natural next add once it's live).
- No arrears balance carried forward month to month (the ledger *shows* who's behind; it
  doesn't yet sum a running balance owed).
- No automated tenant reminders.
- Audit trail is minimal — `payments` records who last edited and when, but there's no
  full change history yet. Easy to add when you want it.

Handled in this order, you get a working shared system fast, then layer the rest on.
