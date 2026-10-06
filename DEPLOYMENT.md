# Hosting and database

## Supabase (configured)

- Organization: DaRealest
- Project: IT415 Campus Kiosk
- Project reference: `jgcwnzrsdkosxtfrbzks`
- Region: Singapore (`ap-southeast-1`)
- Dashboard: https://supabase.com/dashboard/project/jgcwnzrsdkosxtfrbzks
- Endpoint: `https://jgcwnzrsdkosxtfrbzks.supabase.co/functions/v1/kiosk-checkout`

The project was created under the reported $0/month tier. Usage limits still apply. The live schema and Edge Function have been deployed and tested. `supabase/schema.sql` records the exact schema for reproduction in a fresh project; do not rerun table creation on this already-configured database.

### Data model

`kiosk_products` holds the six trusted prices. `kiosk_transactions` holds reference UUID, request UUID, timestamp, method, totals, amount paid, change, item count and a mandatory simulation flag. `kiosk_transaction_items` stores product name/price snapshots, quantities and computed subtotals.

All tables have row-level security enabled, with no public access policies and explicit public-role privilege revocation. This deliberately denies all direct anon/authenticated access. The Supabase advisor reports “RLS Enabled No Policy” as informational for this intentional server-only design; [advisor documentation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

The `kiosk_checkout` function is SECURITY INVOKER and executable only by the service role. It validates product IDs, quantities and payment, derives trusted prices, and writes receipt plus items atomically. Request UUIDs and a database lock make retries idempotent.

The Edge Function has gateway JWT verification enabled. The browser contains only the legacy low-privilege anon JWT because that gateway requires a JWT. It does not have a secret or service-role key. The service-role credential is available only in Supabase's managed function environment. No secret needs to be entered in Vercel.

This is a public simulated checkout, not a real payment authorization service. Visitors can create demo transactions through its validated endpoint. Do not use it as proof of payment for real sales. The frontend has no public transaction-history endpoint, and no customer identity/card data is collected.

## Vercel

Import `Computer-Takashi/IT415_midterm_examination` from GitHub. Use:

- Framework: Other
- Root directory: repository root
- Output directory: `public`
- Build command: empty
- Install command: empty

`vercel.json` supplies these settings. No environment variables or paid add-ons are required. The static frontend calls the already-deployed Supabase function directly. Once the GitHub project is connected, main-branch commits can deploy automatically.

## Verification

Run `node --test tests/model.test.mjs` for local unit tests. Run `node scripts/verify-backend.mjs` for live integration checks; it creates three simulated records. Check those receipts in the Supabase Table Editor using your project-owner account. Anonymous visitors cannot read the tables.

The local development server still uses `node server.mjs`, but completing a payment now requires internet access. Database failures show a retry screen and cannot produce a false success.
