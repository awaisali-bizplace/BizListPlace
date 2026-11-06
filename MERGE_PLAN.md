# BizListPlace — merged build plan (PKbizMap logic adapted)

Source of this build: **BizListPlace repo** `bizlistplace-official/bizlistplace` @ `1e9048c`
(base, UI and TypeScript monorepo) + **PKbizMap.com-main.zip** (BizPrimeHub, owner
`aliahsansarwar786`, backend `package.json` says MIT) as the logic reference.
The zip is **not** copied wholesale. Its features were re-implemented / adapted
into the BizListPlace TypeScript structure, with BizPrimeHub branding, its
emails, its WhatsApp number, its payment accounts and its domains removed.

> Status: built locally, NOT pushed to GitHub. See `BUILD_REPORT.md`.

## 1. What PKbizMap had (zip, JS)

| Feature | Backend (JS) | Frontend |
|---|---|---|
| Auth: register/login JWT + HttpOnly cookie, email OTP verify, resend OTP, forgot/reset password OTP, change password, update profile/avatar | `authController.js` (1514 lines), `otpManager.js`, `OtpEmailThrottle` / `OtpIpAttempt` models, Upstash Redis rate-limit store | Login/Register/Forgot/Reset/VerifyEmail forms, `AuthContext` |
| Businesses: CRUD, search (keyword/category/city), featured, recent, my listings, images (Cloudinary), locations/branches, slugs | `businessController.js` (1118), `Business.js` incl. `paymentReceipt`, `paymentStatus`, `paymentAmount`, `images[]` | `BusinessDirectory`, `BusinessCard`, `BusinessDetail`, `BusinessForm` (93 KB, incl. receipt upload), `BrowseSection`, `HomeFeatured`, `RecentlyListed`, `TopListingsMarquee` |
| Categories & cities: category pages, city pages, locations data | `categories.js`, `locations.js`, `data/locations.json`, migrate scripts | `/categories/[slug]`, `/categories/[slug]/[city]`, `/cities/[country]/[city]` |
| Reviews (1–5 stars) | `reviewController.js` | review section on business detail |
| Claims: claim a listing, 6-digit code emailed to business email, salted-hash verify, 5-attempt lock, 30-min expiry | `claimController.js` (646), `ClaimRequest.js` | `/claim/verify` |
| Admin: dashboard stats, approve/reject/suspend, users (role, spam/unspam, delete), reviews moderation, reports, email stats/log/send, activity log, backup export, quota | `adminController.js` (2537), `settingController.js` (818) | `AdminDashboardClient.jsx` (310 KB), sidebar, bottom nav, quota cards |
| Payments (the big PK-only piece): per-country fees (PK/UAE/USA), payment methods (kind `iban`/`number`, account title/value, card image), QR code, receipt upload, approval blocked until receipt verified & amount ≥ fee | `PaymentSetting.js` (306), `settingController.js`, admin approve gate | payment settings UI in admin, receipt field in `BusinessForm` |
| Email: SMTP (Gmail), verification / welcome / reset / claim / admin-notice templates | `sendEmail.js`, `emailTemplates.js` (1182) | — |
| Security: CSRF double-submit cookie (`XSRF-TOKEN`, HMAC with JWT secret), `express-mongo-sanitize`, `sanitize-html` body sanitiser, per-route rate limits | `csrfProtection.js`, `sanitize.js`, `upstashStore.js` | `lib/api.js` fetches CSRF token, retries once on 403 |
| Blog (static content) | — | `/blog`, `/blog/[slug]`, `data/blogPosts.ts` (5 posts) |
| Misc | `seedAdmin.js`, backfill-slugs, migrate categories/locations | `FloatingWhatsApp`, `SplashScreen`, `SearchableCombobox` |

PK-only literals that were **dropped, never copied**: brand `BizPrimeHub` /
`PKbizMap` / `bizprimehub.com` / `bizprimehub.vercel.app`, WhatsApp number
`923106131361`, backend URL `pkbizmap-backend.vercel.app`, any payment
account title/number/IBAN/QR in the zip (none were carried over — see §4),
`ADMIN_EMAIL=admin@yourdomain.com`.

## 2. What BizListPlace already had (and kept as the base)

- TypeScript monorepo: `frontend/` (Next.js 15, `@bizlistplace/web` after
  rebrand), `backend/` (Express + Mongoose, `@bizlistplace/api`), `backend/shared`
  (`@bizlistplace/shared`: types, schemas, constants).
- Frontend routes: home, search, categories, countries/cities, business
  `[slug]` + locations, add-business, dashboard, admin, claim-business,
  claim-verify, auth (login/register/forgot/reset), about, contact, help,
  privacy, terms, sitemap. Components: Navbar, Footer, SearchHero,
  FeaturedBusinesses, FAQ, BusinessCard, ReviewSection, ClaimBusinessModal.
- Backend modules: auth (incl. email OTP verify + resend + reset OTP),
  businesses (list/featured/recent/get-by-slug/create/update/delete/locations),
  categories, locations, reviews, claims (submit + OTP verify + resend +
  1-click link), reports, contact, admin (stats, businesses approve/reject/
  suspend/feature/verify, claims, reports, audit-logs, users incl. spam,
  reviews, emails stats/log/send/test, activity-log, backup export, settings),
  mock fallback router (used when DB is offline), email service (762 lines),
  search service, activity/audit services.
- Branding already BizListPlace, admin email already
  `bizlistplaceofficial@gmail.com` in `backend/.env.example` and config.

## 3. What was ported from PKbizMap into BizListPlace (this build)

1. **Payments — full** (`backend/src/modules/payments/`): `PaymentSetting`
   model (singleton; `isEnabled` default `false`, per-country fees
   Pakistan/UAE/USA default `0`, `paymentMethods[]`, QR code), public
   `GET /api/v1/settings/payment` (only enabled methods for non-admins),
   admin `GET/PATCH /admin/settings/payment`, method CRUD + toggle,
   `DELETE /admin/settings/payment/qr`, `PATCH /admin/businesses/:id/payment`,
   `DELETE /admin/businesses/:id/receipt`, real `GET /admin/payments`
   (replaces the old stub that always returned `[]`). Business model gains
   `images[]`, `paymentStatus` (`none|pending|verified`),
   `paymentAmount`, `paymentReceipt {url, publicId}`.
   Admin approve is now gated: when payments are enabled and the fee for the
   business country is > 0, approval requires a verified receipt and
   `paymentAmount >= fee` (PKbizMap rule, adapted).
2. **CSRF — full**: double-submit cookie middleware (HMAC, JWT secret,
   `XSRF-TOKEN`), `GET /api/v1/auth/csrf-token`, frontend `lib/api.ts`
   fetches the token before state-changing calls and retries once on 403.
3. **OTP throttling — full**: Mongo-backed `OtpThrottle` model
   (per-email + per-IP windows) checked in resend-verification and
   forgot-password. No Upstash/Redis dependency was added.
4. **Image upload — partial**: Cloudinary is optional via env
   (`CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`). `POST /api/v1/businesses/:id/images`
   and receipt upload accept a file only when Cloudinary is configured;
   otherwise the API returns a clear 503 and the UI accepts an image URL.
   No Cloudinary account was created or copied.
5. **Security sanitising — full**: `express-mongo-sanitize` +
   `sanitize-html` body sanitiser middleware, ported from PKbizMap.
6. **Blog — full, rewritten**: `/blog` + `/blog/[slug]` with 5 new
   BizListPlace posts (Google Business Profile, reviews, local SEO,
   WhatsApp Business, growing a local shop) — same topics as the zip's
   posts, text rewritten for BizListPlace, no PKbizMap branding.
7. **Frontend payment UI — full**: add-business page fetches public
   payment settings, shows the fee + enabled methods + receipt field;
   admin page gains a payment-methods manager (fees, methods, QR) wired
   to the new endpoints.
8. **FloatingWhatsApp + RecentlyListed — full**: WhatsApp button renders
   only when `NEXT_PUBLIC_WHATSAPP_NUMBER` is set (empty by default —
   the zip's number was NOT copied); home page shows recently listed
   businesses from `/businesses/recent`.
9. **Rebrand — full**: `BizListPlace` → `BizListPlace` everywhere,
   `@bizlistplace/*` → `@bizlistplace/*`, DB `bizlistplace` →
   `bizlistplace`, cookie `bizlistplace_session` → `bizlistplace_session`,
   default site URL `bizlistplace.com` → `https://bizlistplace.vercel.app`,
   docs updated to the Render API placeholder URL.

## 4. What was dropped / left out, and why

- **Payment account values**: no JazzCash/Easypaisa/bank/IBAN/QR values
  exist anywhere in this build. The user never supplied any. Payment
  methods are empty by default; the admin must add them in the admin
  panel (or via env, see `backend/.env.example`).
- **PKbizMap's own payment fee defaults** (PK Rs. 50): not copied as a
  business rule — fees default to `0` (free) until the admin sets them.
- **Upstash Redis**: not ported; OTP throttling uses Mongo instead, so
  no extra service is needed.
- **PKbizMap referral system**: dropped (it was already dropped in the
  BizPrimeHub prompts the user shared earlier).
- **Demo/fictional listings**: not seeded. `backend/src/scripts/seed.ts`
  (BizListPlace's own seed) is unchanged; do not run it on production.
- **PKbizMap frontend components copied verbatim**: none. Its UI was
  not used — the user said to use *his* BizListPlace UI. Only behaviour
  (endpoints, rules, pages) was ported.
- **Claim 1-click link**: kept as-is from BizListPlace (PKbizMap had
  removed it; BizListPlace's OTP flow already covers verification).

## 5. Env vars the user must still fill (nothing invented)

See `backend/.env.example` and `frontend/.env.example` in this build.
Required for a live backend: `MONGODB_URI`, `JWT_SECRET`,
`COOKIE_SECRET`, `SMTP_PASS` (Gmail app password for
`bizlistplaceofficial@gmail.com`). Optional: Cloudinary keys, payment
defaults (`PAYMENT_FEE_PKR` etc. are only defaults — the admin panel
overrides them), `NEXT_PUBLIC_WHATSAPP_NUMBER`.
