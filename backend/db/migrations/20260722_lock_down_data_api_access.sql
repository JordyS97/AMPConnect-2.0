-- =======================================================
-- Close the Supabase PostgREST Data API surface
-- Applied to production (AMPConnect2.0) on 2026-07-22.
-- =======================================================
--
-- WHY
-- The project had RLS disabled on all 10 public tables while `anon` and
-- `authenticated` held SELECT/INSERT/UPDATE/DELETE/TRUNCATE on every one of
-- them. The Supabase anon key is public by design, so this was directly
-- exploitable over HTTPS with no authentication:
--
--   GET /rest/v1/admins?select=*    -> 200, rows including password_hash
--   GET /rest/v1/customers          -> 200, all 155 records
--   GET /rest/v1/otp_codes          -> 200, live OTP codes in plaintext
--   GET /rest/v1/transactions       -> 200, all 2468 rows
--
-- Write access was granted too, so the same key could DELETE or TRUNCATE.
--
-- WHY THIS IS SAFE FOR THE APP
-- AMPConnect does not use the Data API at all. The Express backend connects
-- directly to Postgres as the `postgres` role, and there is no supabase-js
-- client and no edge function anywhere in the repo. `postgres` both owns these
-- tables and has BYPASSRLS, so enabling RLS does not affect it.
--
-- FORCE ROW LEVEL SECURITY is deliberately NOT used: it would apply policies to
-- the table owner as well and take the whole application down.
--
-- No policies are created on purpose. RLS with zero policies denies every row
-- to any role that does not bypass RLS, which is exactly the intent here: the
-- Data API should expose nothing. If a Supabase client is ever introduced,
-- policies must be written per table before it will see anything.

-- 1. Deny-all at the row level for anon/authenticated.
ALTER TABLE public.admins            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions       ENABLE ROW LEVEL SECURITY;

-- 2. Defence in depth: drop the grants, so a future permissive policy added by
--    mistake cannot reopen the hole on its own.
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;

-- 3. Supabase's default privileges grant every newly created table in `public`
--    to anon/authenticated automatically. Without this, the next CREATE TABLE
--    would be exposed the moment it exists.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- VERIFIED AFTER APPLYING
--   anon + publishable key, read and write, every table -> HTTP 401
--     {"code":"42501","message":"permission denied for table ..."}
--   backend role `postgres` -> unchanged:
--     admins 2, customers 155, parts 92, transaction_items join 5984,
--     INSERT + UPDATE both succeed (tested in a rolled-back transaction)
--   Supabase security advisors: 10 ERROR lints -> 0.
--     The 10 remaining INFO "RLS enabled, no policy" notices are the intended
--     end state for this architecture, not outstanding work.
--
-- TO ROLL BACK (not recommended -- this reopens public read/write):
--   ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;
--   GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
