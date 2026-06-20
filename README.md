# MediReach

Voice-first clinic management PWA for solo GPs and small clinics in India.
See [`clinic-software-product-spec.md`](./clinic-software-product-spec.md) for the
full product specification and [`claude-code-build-prompt.md`](./claude-code-build-prompt.md)
for the build approach.

## Stack

- Next.js (App Router) + TypeScript (strict)
- MongoDB Atlas via Mongoose
- Cloudinary (signed/private media), Anthropic Claude (structuring), Whisper (STT)
- Razorpay (usage-based billing), Web Push (SOS + billing notifications; no SMS)
- Tailwind CSS, custom UI primitives, installable PWA

## Getting started

```bash
cp .env.example .env.local   # fill in real values — never commit secrets
npm install
npm run dev
```

Other scripts: `npm run typecheck`, `npm run test`, `npm run build`.

## Build phases

| Phase | Scope |
|------|-------|
| 1 | Foundation: scaffold, DB, all data models, 3-role auth, authorization middleware ✅ |
| 2 | Doctor onboarding (7-step) ✅ |
| 3 | Core clinical workflow (registration, queue, voice consultation) ✅ |
| 4 | Prescriptions (templates, sponsor footer, Web Share) ✅ |
| 5 | Billing (rolling 30-day cycle, scheduled jobs, Razorpay webhooks) ✅ |
| 6 | SOS / safety ✅ |
| 7 | Admin panel ✅ |
| 8 | Public website ✅ |

## Operational setup

- **Scheduled jobs** run via Vercel Cron (`vercel.json`): `/api/cron/billing` (daily — invoices, reminders, grace-end pause, unsubscribe) and `/api/cron/purge` (daily — 1-year retention). Both require `Authorization: Bearer $CRON_SECRET`.
- **Admin bootstrap**: provision the first admin with
  `POST /api/admin-auth/enroll` and header `Authorization: Bearer $ADMIN_ROUTE_SECRET`
  (body `{ email, name, password }`); scan the returned `otpauthUri`, then log in at `/console/login`.
- **Razorpay webhook**: point it at `/api/webhooks/razorpay` with `RAZORPAY_WEBHOOK_SECRET`.
- **Push (SOS)**: generate VAPID keys (`npx web-push generate-vapid-keys`) into the `VAPID_*` envs.

## Tests

`npm run test` — billing math, tenant isolation, IST day boundaries, and prescription text (22 tests). Uses a local `mongod` if present (see project memory).

## Security architecture (Phase 1)

- **Authentication** (`src/lib/auth`): bcrypt password hashing, jose-signed
  session JWTs in httpOnly cookies, trusted-device + OTP model for clinic roles,
  mandatory TOTP MFA for admin.
- **Authorization** (`src/lib/api`): every API route goes through `route()`
  (`guard.ts`), which verifies session + role. Clinic-scoped data access goes
  through `scoped.ts`, which force-merges the trusted `doctorId` into every query
  so no path can cross tenants — admin is the sole, explicit exception (§6.7).
- **Audit** (`audit.ts`): append-only log of access/changes (§15.4).
- Cross-tenant isolation is verified in `test/tenant-isolation.test.ts`.
# medireach
