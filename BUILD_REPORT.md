# BizListPlace merged build — report (2026-11-06)

**Status: built and verified locally. NOT pushed to GitHub. Awaiting review.**

- Working copy: `~/workspace/bizlistplace-merged/`
- Base: `bizlistplace-official/bizlistplace` @ `1e9048c` (read-only clone at
  `~/workspace/work/bizlistplace-source/`)
- Logic reference: `~/workspace/user/files/PKbizMap.com-main.zip`
  (read-only extract at `~/workspace/work/pkbizmap-source/`)
- Plan: `MERGE_PLAN.md` in this folder.

## Build results (all run locally on 2026-11-06)

| Check | Result |
|---|---|
| `npm install` (root, workspaces) | ✅ 408 packages |
| `npm run build --workspace=backend/shared` (`tsc`) | ✅ pass |
| `npm run build --workspace=backend` (`tsc`) | ✅ pass (after 1 fix: audit-log entity type) |
| `npm run build --workspace=frontend` (`next build`) | ✅ pass — 29 routes, 5 blog posts SSG, `/admin` 27.6 kB, `/add-business` 15.3 kB. Static-gen fetch errors to `127.0.0.1:5000` are expected when the backend is not running. |
| Backend tests (`npm run test --workspace=backend`, vitest) | ✅ **19/19 passed, 2 files**. (The trailing `npm error` about `@bizlistplace/shared` having no `test` script is a pre-existing root-workspace quirk, not a test failure.) |
| Backend smoke (built server, `USE_MEMORY_DB=true`, port 5001) | ✅ `GET /api/v1/health` → `{"status":"ok",...}`; `GET /health` → same |
| CSRF smoke | ✅ `POST /auth/register` without token → 403; with token from `GET /auth/csrf-token` → 201. Note: the token is bound to the session fingerprint, so it must be re-fetched after login — the frontend does this automatically (fetch + one retry on 403). |
| Payment settings smoke | ✅ Public `GET /api/v1/settings/payment` → `isEnabled:false`, fees `0`, methods `[]`. Admin PATCH enables + sets PK fee `100`, POST method adds it, public view then shows it. |
| Payment approval gate smoke | ✅ Pending PK business → admin approve blocked: *"payment receipt must be verified first (fee: Rs.100)"*. Owner adds receipt URL + amount 100 → `pending`. Admin verifies → `verified`. Admin approves → *"approved and published"*. `GET /admin/payments` lists it. |
| Image upload smoke (no Cloudinary) | ✅ PNG upload → **503** *"Image upload is not configured. Set CLOUDINARY_* in the backend .env, or paste an image URL instead."* Non-image file → 400 file-type error. |
| Frontend smoke (`next start`, port 3000, API pointed at smoke backend) | ✅ `/` 200 (Recently Listed renders, incl. the smoke business), `/blog` 200, `/blog/local-seo-guide-pakistan-ranking-google-maps` 200, `/add-business` 200, `/admin` 200, `/search?q=smoke` 200 (finds the smoke business). |
| Branding check | ✅ No `BizPrimeHub` / `PKbizMap` / `bizprimehub.*` strings in code (only "ported from PKbizMap" comments). No other owner's WhatsApp number, backend URL, email or payment account anywhere. Email default is `bizlistplaceofficial@gmail.com` only. |

## Bug found in the original repo and fixed in this build

`backend/src/scripts/seed.ts` created **three** seed users (admin, owner, user)
all with the same email `bizlistplaceofficial@gmail.com`. On any fresh dev
database the auto-seed in `server.ts` crashed the server with
`E11000 duplicate key error … email: "bizlistplaceofficial@gmail.com"`.
Fixed: admin keeps `bizlistplaceofficial@gmail.com`; owner and user now use
`owner@bizlistplace.example` / `user@bizlistplace.example` (clearly fictional
dev addresses). The seed passwords (`AdminPass123!` etc.) are the original
repo's dev-only placeholders — change or disable them before production.

Two other fixes made while building:
- `payment.controller.ts`: audit-log call used an entity type the
  `AuditService` type does not accept; corrected to `'business'`.
- Tests could not run in this environment because the optional rollup
  native binary was missing: added `@rollup/rollup-linux-x64-gnu` to the
  backend's `optionalDependencies` (test tooling only).

Pre-existing noise, not changed: `activity.service.ts` logs
`[ACTIVITY LOG LAZY REQUIRE ERROR]: Cannot find module
'../modules/admin/activityLog.model'` during tests; tests still pass.

## Feature checklist

| Feature | Status |
|---|---|
| BizListPlace UI (home, search, categories, countries/cities, business detail, dashboard, admin, auth, contact, help, privacy, terms) | ✅ working (unchanged base, rebranded) |
| Auth: register/login JWT + cookie, email OTP verify/resend, forgot/reset OTP, change password | ✅ working (base) + OTP throttling added (5/email/hr, 10/IP/hr, Mongo-backed) |
| Businesses CRUD/search/featured/recent/locations, claims OTP verify, reviews, reports, contact | ✅ working (base) |
| Admin: stats, approve/reject/suspend/feature/verify, users incl. spam, claims, reports, audit/activity logs, email stats/log/send/test, backup export, settings | ✅ working (base) |
| **Payments (new, ported from PKbizMap)**: `PaymentSetting` model, per-country fees, payment methods CRUD/toggle, QR field, public settings endpoint, receipt upload, approval gate, real `/admin/payments` list, add-business fee display, admin payment-methods manager | ✅ working (API smoke-tested end-to-end, see above) |
| **CSRF (new)**: double-submit cookie, `GET /auth/csrf-token`, frontend fetch + retry on 403 | ✅ working (smoke-tested) |
| **Sanitising (new)**: `express-mongo-sanitize` + `sanitize-html` body sanitiser | ✅ built (no live attack test run) |
| **Image upload (partial)**: multer + Cloudinary when configured; 503 + URL fallback otherwise | ⚠️ partial — 503 path verified; a real Cloudinary upload was NOT tested (no account/keys) |
| **Blog (new)**: `/blog` + `/blog/[slug]`, 5 posts rewritten for BizListPlace | ✅ working (build + HTTP 200) |
| Recently Listed home section, FloatingWhatsApp (env-gated) | ✅ working (home renders it; WhatsApp button hidden while `NEXT_PUBLIC_WHATSAPP_NUMBER` is empty) |
| Rebrand: `BizListPlace`, `@bizlistplace/*`, DB `bizlistplace`, cookie `bizlistplace_session`, site `https://bizlistplace.vercel.app` | ✅ done |
| Referral system | ❌ dropped (already dropped in the user's earlier BizPrimeHub prompts) |
| Upstash Redis rate limiting | ❌ not ported — OTP throttling uses Mongo instead, no extra service needed |

## What is NOT yet verified

- Real SMTP email delivery (smoke run had no `SMTP_PASS`; the backend
  logs "EMAIL SIMULATED").
- Real Cloudinary upload (needs the user's own keys).
- Admin panel / add-business payment UI clicked through in a browser
  (code builds and the APIs it calls were smoke-tested, but no browser
  session was run).
- Deploying this merged code to Vercel / Render (not attempted — see
  push recommendation below).

## Env vars the user must fill (nothing invented — see `.env.example` files)

Backend (`backend/.env.example`): `MONGODB_URI`, `JWT_SECRET`,
`COOKIE_SECRET`, `SMTP_PASS` (Gmail app password for
`bizlistplaceofficial@gmail.com`). Optional: `CLOUDINARY_CLOUD_NAME` /
`CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`, `PAYMENTS_ENABLED` /
`PAYMENT_FEE_PKR|AED|USD` (defaults only — the admin panel overrides them),
`WHATSAPP_NUMBER`.
Frontend (`frontend/.env.example`, new): `NEXT_PUBLIC_API_URL` (Render URL
after deploy), `INTERNAL_API_URL`, `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_WHATSAPP_NUMBER` (empty = button hidden).

Payment accounts: **none exist in this build**. The admin must add them in
Admin → Settings → Payment Methods (JazzCash / Easypaisa / bank / IBAN —
name, account title, account number). Do not paste account numbers in chat.

## Push recommendation

**Push to a new branch, not to `main`:**
`bizlistplace-official/bizlistplace`, branch `merge/pkbizmap-logic`, then
open a pull request for review. Rationale: `main` is what Vercel deploys
(`bizlistplace.vercel.app`), so pushing straight to `main` would replace
the live site with unreviewed merged code, and would also replace the
live backend expectations (new env vars, CSRF, payment settings).
A branch lets the user review the diff, then merge when ready; Vercel
will redeploy `main` on merge, and the backend still needs its Render
deploy (login still pending in the separate browser task).

Do NOT push to a brand-new repo: this is the same BizListPlace project,
same monorepo structure, same Vercel project — a new repo would orphan
the live deployment.

## New / changed files (main ones)

- `MERGE_PLAN.md`, `BUILD_REPORT.md` (this file), `README.md` (merged-build note), `frontend/.env.example` (new)
- Backend (new): `backend/src/modules/payments/{payment.model,payment.controller,payment.routes}.ts`,
  `backend/src/middleware/{csrf,sanitize}.ts`, `backend/src/services/{otpThrottle,upload.service}.ts`
- Backend (changed): `backend/src/app.ts`, `backend/src/config/index.ts`,
  `backend/src/modules/{admin/admin.controller,businesses/business.{model,controller,routes},auth/auth.controller}.ts`,
  `backend/src/modules/payments` wiring, `backend/shared/src/{types,schemas}/index.ts`,
  `backend/package.json` (cloudinary/multer/sanitize deps), `backend/src/scripts/seed.ts` (seed-email fix)
- Frontend (new): `frontend/src/data/blogPosts.ts`, `frontend/src/app/blog/{page,[slug]/page}.tsx`,
  `frontend/src/components/{home/RecentlyListed,ui/FloatingWhatsApp,admin/PaymentSettingsManager}.tsx`
- Frontend (changed): `frontend/src/lib/api.ts` (CSRF), `frontend/src/app/{layout,add-business/page,admin/page}.tsx`,
  `frontend/src/components/{home/HomeContent,layout/Footer}.tsx`,
  `frontend/src/shared/{types,schemas}/index.ts` (mirrored from `backend/shared`)
- Rebrand across the tree: `@bizlistplace/*`, `BizListPlace`, DB `bizlistplace`,
  site URL `https://bizlistplace.vercel.app`.
