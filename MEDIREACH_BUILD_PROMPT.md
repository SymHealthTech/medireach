# MediReach Portfolio — Claude Code Build Prompt

> **How to use:** put this file and `DESIGN_BRIEF.md` in the root of the MediReach repo. In Claude Code, say:
> "Read MEDIREACH_BUILD_PROMPT.md and DESIGN_BRIEF.md, then start Phase 0."
> Work phase by phase. After every phase, summarise what changed, list anything you couldn't do, and wait for me to say "continue".

---

## 0. Context

I'm Satish, founder of Sym HealthTech (Pune). This repo currently contains **MediReach clinic software** (Next.js App Router, MongoDB Atlas, NextAuth, Cloudinary, Resend, deployed on Vercel). It is being **parked**: preserved untouched for a future launch at `app.medireach.co.in`.

`medireach.co.in` becomes a new product: **one-page portfolio websites and digital visiting cards for Indian doctors**, starting in Pune. Admin (me) creates and publishes every doctor's page from a dashboard. Doctors can later log in to edit a few fields themselves.

Main goals of Phase 1:
1. A beautiful, fast, doctor-facing **homepage**.
2. **Practo/Justdial-style SEO**: a doctor's page must rank on Google for their name, name + area, and name + area + specialty.
3. A beautiful, **fully responsive admin dashboard** with every field needed to build portfolios and visiting cards.
4. **One default ("Classic") design** for the portfolio page and visiting card, plus **5 named template slots each**, so 5 portfolio designs and 5 card designs can be built in Phase 2 without touching data.

Visual direction for the homepage, dashboard and Classic templates is in `DESIGN_BRIEF.md`. Follow it.

### Hard rules (apply to everything)
- **Never delete or rewrite the clinic code on `main` before Phase 0 is approved.** Everything clinic-related is preserved via tag + branch.
- **NMC compliance (Guidelines on Ethical Advertising, 6 Oct 2026):**
  - No patient reviews, ratings, testimonials or "success stories". Don't create fields, components or schema for them. No `aggregateRating` / `Review` in JSON-LD.
  - Block superlatives and claims in every free-text field: e.g. "best", "no.1", "no. 1", "number one", "top doctor", "#1", "guaranteed", "guarantee", "100%", "miracle", "permanent cure", "cure guaranteed", "most trusted", "leading", "renowned", "expert in curing", patient counts / success-rate phrases ("treated 10,000 patients", "99% success"). Keep the list in one editable config file; check case-insensitively, including Hindi/Marathi transliterations later.
  - Registration council + registration number is **required to publish**, and is displayed on the page.
  - Awards require title + awarding body + year.
  - No patient photos or before/after images. Gallery captions are checked by the same scanner.
  - Hub/listing pages must use **neutral ordering** (alphabetical or by name), never paid or "featured" ranking.
- **Reuse what exists:** inspect the repo first and reuse its DB connection, Mongoose/driver patterns, NextAuth config, Cloudinary and Resend helpers, Tailwind setup and UI library. If there's no component library, add **shadcn/ui** (Radix-based) and **lucide-react** icons.
- TypeScript strict, **zod** validation on every server action / route handler, server-side role checks (never trust the client).
- Mobile-first everything. Doctors and I will use this on phones.

---

## Phase 0 — Audit and preserve (STOP after this phase)

1. Report: framework versions, folder structure, existing models/collections, auth setup, env vars used, UI libraries, and which routes belong to the clinic software.
2. Preserve:
   ```bash
   git checkout main && git pull
   git tag clinic-v1
   git checkout -b clinic-software
   git push origin clinic-software --tags
   git checkout main
   git checkout -b portfolio-v1
   ```
   (If the default branch isn't `main`, adapt and tell me.)
3. Propose (don't execute yet) exactly which clinic files/routes will be removed from `portfolio-v1` and which shared pieces (db, auth, cloudinary, resend, ui components) stay.
4. **Stop. Wait for my approval.**

After approval: on `portfolio-v1`, remove clinic-only routes/components, keep the shared infrastructure, and confirm the app still builds.

---

## Phase 1 — Data model and master lists

Create models (Mongoose or the repo's existing pattern). New collections only, never touch clinic collections.

### `DoctorProfile`
```
_id
status: 'draft' | 'review' | 'published' | 'suspended'
slug                // canonical: dr-{first}-{last}-{primary-specialty-slug}, unique per city
shortSlug           // dr-{first}-{last} (+ -area / -2 on clash), globally unique
citySlug            // denormalised from primary clinic, used in URL
// Identity
title ('Dr.'), firstName, middleName?, lastName, displayName
gender? ('male' | 'female' | 'other' | 'prefer_not')
photo { publicId, url, alt }
languages: string[]
practiceSinceYear?   // optional; shown as factual "In practice since 2009"
// Registration
systemOfMedicine: 'allopathy' | 'ayurveda' | 'homeopathy' | 'unani' | 'siddha' | 'dental' | 'other'
registration { councilId, number, year?, nmrId? }   // number required to publish
// Qualifications (repeatable)
qualifications: [{ degreeId, specialization?, institute, year? }]
// Practice
practitionerType: 'gp' | 'consultant'
primarySpecialtyId, secondarySpecialtyIds: []
services: [{ name, description? }]
conditionsTreated?: string[]
// Clinics (repeatable; first = primary)
clinics: [{
  _id, name, type: 'own_clinic' | 'hospital_visiting' | 'other',
  addressLine1, addressLine2?, areaId, cityId, state, pincode,
  mapsUrl?, geo { lat, lng }?, phone?,
  timings: [{ day: 0-6, slots: [{ open: 'HH:mm', close: 'HH:mm' }] }],
  appointmentNote?, fee?: number, showFee: boolean,
  hospitalId?  // link to Hospital if visiting
}]
// Contact
mobile, whatsapp?, email?
links { googleBusiness?, practo?, instagram?, facebook?, linkedin?, youtube?, website? }
// About
shortBio (max 160 chars), fullBio (rich text: bold/italic/lists only, sanitised)
// Recognition
awards: [{ title, awardingBody, year, photo? }]
memberships: [{ name, since? }]
publications?: [{ title, journal?, year?, url? }]
interests: string[]          // extra-curricular
gallery: [{ publicId, url, caption, alt }]   // max 5 (awards photos count toward this)
// Templates
portfolioTemplateId (default 'classic'), cardTemplateId (default 'classic')
// SEO
seo { titleOverride?, descriptionOverride?, noindex: boolean }
// Business
plan: 'gp' | 'consultant' | 'hospital'
foundingDoctor: boolean, foundingNumber?: number
hostingFreeUntil?: Date      // null = forever (founding)
freeUpdateUsed: boolean
ownDomain? { name, status: 'requested'|'active'|'expired', cost, renewalDate }
hospitalAccountId?, salesExecutive?, source: 'field'|'referral'|'hospital'|'inbound'
internalNotes?
// Compliance
compliance { lastScanAt, issues: [{ field, phrase }], doctorApprovedAt?, approvedVia?: 'whatsapp'|'email'|'in_person' }
// Doctor login
ownerEmail?   // enables self-edit login
createdAt, updatedAt, publishedAt
```

### Other models
- `City { name, slug, state }`
- `Area { name, slug, cityId }` (slug unique within city)
- `Specialty { name, slug, plural (e.g. "General Physicians"), description? }` (names used in titles: "General Physician", "Paediatrician", "Dermatologist"…)
- `Degree { name (MBBS, MD, MS, DNB, BAMS, BHMS, BDS, MDS, DM, MCh, DGO, DCH, …), slug }`
- `Council { name (Maharashtra Medical Council, …), slug }`
- `Hospital { name, cityId, areaId, address, contactPerson, phone, email, pricePerDoctor, notes }`
- `Payment { doctorId?, hospitalId?, amount, gstIncluded: boolean, mode: 'upi'|'cash'|'bank'|'card', date, purpose: 'setup'|'update'|'domain'|'renewal'|'hospital_bulk', invoiceNo, notes }`
- `UpdateRequest { doctorId, description, status: 'new'|'in_progress'|'done', price (default 299), paid: boolean, completedAt }`
- `Lead { name, phone, city?, specialty?, message?, source: 'homepage_form'|'whatsapp_click'|'pricing'|'hospitals', status: 'new'|'contacted'|'won'|'lost', createdAt }`
- `TemplateSlot { type: 'portfolio'|'card', key ('classic','t2'…'t5'), name, status: 'coming_soon'|'in_design'|'ready', previewImage?, isDefault }`
- `Setting` singleton: prices, foundingTotal (100), contact phone, WhatsApp number, GST mode, banned-word list override.
- `AuditLog { actor, action, entity, entityId, at, diff? }`

### Seeds (script: `npm run seed:masters`)
- City: Pune (start); structure supports all of India.
- Pune areas (at least): Kothrud, Karve Nagar, Warje, Erandwane, Deccan, Shivajinagar, Sadashiv Peth, Narayan Peth, Swargate, Bibwewadi, Katraj, Kondhwa, NIBM, Undri, Hadapsar, Magarpatta, Kharadi, Viman Nagar, Koregaon Park, Camp, Yerawada, Vishrantwadi, Dhanori, Wagholi, Aundh, Baner, Balewadi, Pashan, Bavdhan, Sus, Hinjewadi, Wakad, Pimple Saudagar, Pimple Nilakh, Ravet, Pimpri, Chinchwad, Nigdi, Akurdi, Bhosari, Moshi, Sinhagad Road, Dhayari, Sahakar Nagar, Parvati, Kalyani Nagar, Wanowrie, Fatima Nagar, Model Colony, Chandan Nagar.
- 40+ common specialties with singular + plural names, 30+ degrees, all state medical councils + AYUSH boards.
- 5 portfolio + 5 card `TemplateSlot`s (`classic` = ready + default; `t2`–`t5` = coming_soon with placeholder names "Design 2"…).

Indexes: `{citySlug, slug}` unique, `shortSlug` unique, `status`, `primarySpecialtyId`, `clinics.areaId`, text index on names.

---

## Phase 2 — Public pages and SEO (most important)

### Routes (App Router)
| Route | Purpose |
|---|---|
| `/` | Homepage (Phase 6) |
| `/[city]/doctor/[slug]` | **Canonical doctor profile** |
| `/[shortSlug]` (only if it starts with `dr-`) | 301 redirect to canonical; otherwise `notFound()` |
| `/[city]` | City hub: specialties + areas with doctors |
| `/[city]/[specialty]` | Specialty hub |
| `/[city]/[specialty]/[area]` | Specialty + area hub |
| `/[city]/area/[area]` | Area hub |
| `/pricing`, `/hospitals`, `/terms`, `/privacy`, `/contact` | Marketing pages |
| `/admin/**` | Dashboard |
| `/login`, `/account/**` | Doctor self-edit (Phase 7) |

Keep a `RESERVED_SLUGS` list (admin, api, login, account, pricing, hospitals, terms, privacy, contact, sitemap, robots, etc.) and validate city/specialty/area slugs against it and against each other, so `/[city]/[specialty]` never collides with `/[city]/area` or `/[city]/doctor`.

### Profile page requirements
- Static generation (`generateStaticParams` for published) + **on-demand revalidation** (`revalidatePath`/`revalidateTag`) on publish, edit and unpublish. Unpublished → 404 (or 410 if previously published).
- `generateMetadata`:
  - title: `Dr. {First} {Last} – {Primary Specialty} in {Area}, {City} | MediReach` (trim to ~60 chars intelligently: drop "| MediReach" first)
  - description: `{shortBio}` or auto: `Dr. {Name} ({Degrees}), {Specialty} at {Clinic}, {Area}, {City}. Timings, address, contact and services.` (≤155 chars)
  - canonical URL, Open Graph + Twitter tags, `robots` honouring `seo.noindex`.
- **Dynamic OG image** (`opengraph-image.tsx`): name, specialty, area, photo, MediReach mark. This is the WhatsApp preview, so make it look good.
- Visible content, server-rendered (no client-only text):
  - H1 = full name with "Dr."; subheading = "{Specialty} · {Area}, {City}"
  - auto-generated factual intro sentence (template in code): "Dr. {Name} ({Degrees}) is a {specialty} practising at {Clinic}, {Area}, {City}."
  - qualifications, registration (council + number), clinics with address, map link, per-day timings (open-now badge computed client-side), fees if shown, services, conditions, languages, awards, memberships, publications, interests, gallery, contact buttons (Call, WhatsApp, Directions, Save contact (.vcf)).
  - "Quick facts" Q&A block (visible): "Where does Dr. X practise?", "What are Dr. X's timings?", "Which languages does Dr. X speak?", answered from data.
  - Breadcrumbs: Home › Pune › General Physicians › Kothrud › Dr. Name
  - "Other {specialty plural} in {Area}" (up to 6, alphabetical, published only).
  - Footer note: "Information provided by the doctor. Verified registration: {council} {number}."
- JSON-LD (`<script type="application/ld+json">`):
  - `Physician` (name, image, medicalSpecialty, url, telephone, address, geo, openingHoursSpecification, availableService, memberOf, alumniOf from institutes, sameAs from links, identifier = registration number)
  - `MedicalClinic` per clinic, `BreadcrumbList`
  - **No** `aggregateRating`, `review`.
- Images via `next/image` + Cloudinary loader, explicit sizes, alt text including doctor name.
- Lighthouse targets on mobile: Performance ≥ 90, SEO 100, Accessibility ≥ 95. LCP < 2.5s on 4G.

### Hub pages
- H1 like "General Physicians in Kothrud, Pune"; a short factual intro; doctor cards (alphabetical); links to sibling areas/specialties; `ItemList` + `BreadcrumbList` JSON-LD.
- **`noindex` when fewer than 1 published doctor**; don't list empty hubs in the sitemap.

### Doctor subdomains (amit.medireach.co.in), same page, SEO on the folder URL
Every doctor can also be reached at `{subdomain}.medireach.co.in`. The address bar keeps the subdomain (no redirect), but **Google indexes only the folder URL**.
- Add `subdomain` to `DoctorProfile` (lowercase, a–z 0–9 and hyphens, 3–40 chars, unique, default suggestion = first name or first-last). Admin form: field with live availability check in the SEO step; show it as the doctor's "website address" in the dashboard and on the visiting card.
- `RESERVED_SUBDOMAINS`: www, app, admin, api, mail, email, blog, cdn, static, assets, help, support, status, dev, staging, test, m, ftp, ns1, ns2, medireach.
- `middleware.ts`: read the host; if it is `{sub}.medireach.co.in` (and not reserved), look up the doctor by subdomain (cache the lookup with a short TTL / edge config or a lightweight API route) and **rewrite** (not redirect) to `/[city]/doctor/[slug]`. Unknown or unpublished subdomain → rewrite to a friendly 404 that links to medireach.co.in. `www` → redirect to apex. `app` is served by the separate clinic-software Vercel project, so it never reaches this app.
- On the subdomain version: `<link rel="canonical">` = the folder URL on medireach.co.in; JSON-LD `url` = folder URL; all internal links (hubs, breadcrumbs, other doctors) use absolute `https://medireach.co.in/...` URLs. Do **not** add `noindex` (canonical alone is the right signal).
- Sitemap lists only folder URLs. `robots.txt` on subdomains: allow (so Google can read the canonical).
- QR codes and visiting cards use the subdomain URL when set, otherwise the short link.
- Admin/auth routes are never served on subdomains (middleware returns 404 for `/admin`, `/account`, `/api` on any subdomain).
- `DEPLOY.md`: move medireach.co.in nameservers to Vercel; add `medireach.co.in` and `*.medireach.co.in` to the portfolio project; add `app.medireach.co.in` to the clinic project (explicit subdomain takes priority over the wildcard).
- Local dev: support `amit.localhost:3000` for testing.

### How the page looks in Google results (site name, favicon, breadcrumb, thumbnail)
- Root layout: `WebSite` JSON-LD (`name: "MediReach"`, `alternateName: "medireach.co.in"`, `url`) and `Organization` JSON-LD (name, url, logo, contact). This makes Google show "MediReach" as the site name above results.
- Favicon set via App Router file conventions: `app/icon.png` (512×512, simple mark, readable at 16 px, solid background), `app/apple-icon.png`, `favicon.ico` at 48×48 multiples. Must be crawlable (not blocked in robots).
- `BreadcrumbList` on every profile and hub, so the result shows `medireach.co.in › pune › doctor` style breadcrumbs.
- Profile photo: rendered near the top as a real `<img>` (next/image, not CSS background), at least 1200 px on the long side in the source asset, alt = "Dr. {Name}, {Specialty} in {Area}, {City}"; same URL used in `Physician.image` and as an `og:image` fallback. This gives Google a usable thumbnail (Google still decides whether to show it).
- Title + meta description exactly as specified above; never empty, never duplicated across doctors.

### Sitemap and robots
- `app/sitemap.ts` with `generateSitemaps` chunking (e.g. 5,000 URLs per file); includes profiles (lastModified = updatedAt), non-empty hubs, marketing pages.
- `app/robots.ts`: allow all, disallow `/admin`, `/account`, `/api`; point to sitemap.
- Add a Search Console verification meta tag via env var `GOOGLE_SITE_VERIFICATION`.

### Classic portfolio template
Build `templates/portfolio/classic` following `DESIGN_BRIEF.md`. See Phase 5 for the registry. The SEO layer (metadata, JSON-LD, H1, intro, Q&A, breadcrumbs) lives **outside** templates in a shared wrapper, so every future design renders identical SEO markup.

---

## Phase 3 — Admin auth and dashboard shell

- NextAuth: **admin** via credentials (email + bcrypt password) with roles `superadmin | admin | sales`. `sales` can create drafts and leads but cannot publish or see payments totals. Seed the first superadmin from env vars (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) via `npm run seed:admin`.
- Middleware protects `/admin/**`; every server action re-checks the role.
- Rate-limit the login (e.g. 5 tries / 15 min per IP).
- Shell: collapsible sidebar on desktop, bottom tab bar + drawer on mobile, top bar with global search (doctors, leads, hospitals), user menu. Light theme by default with a dark mode toggle. Follow `DESIGN_BRIEF.md`.

---

## Phase 4 — Dashboard features

Navigation: **Overview · Doctors · Portfolio pages · Visiting cards · Design templates · Hospitals · Payments · Update requests · Leads · Master lists · SEO · Settings**

1. **Overview:** stat cards (total doctors, published, drafts, in review; Founding spots left = foundingTotal − founding count; this month's sales count + revenue; open update requests; new leads), a 6-month sales bar chart, recent activity from AuditLog, quick actions (New doctor, New lead, Record payment).
2. **Doctors:**
   - Table/card list (cards on mobile) with search, filters (city, area, specialty, status, plan, founding, source), sort, pagination.
   - **Create/Edit = multi-step form with progress and autosave as draft:**
     1. Basics (identity, photo upload with crop)
     2. Registration and qualifications
     3. Practice and services
     4. Clinics and timings (repeatable; timing editor with "copy Monday to all weekdays")
     5. Contact and links
     6. About, awards, memberships, interests, gallery (max 5 photos, drag to reorder)
     7. SEO (auto slug + short slug with live availability check; Google snippet preview; overrides)
     8. Business (plan, founding toggle with auto-number, payments link, hosting date, own domain, source, notes)
     9. Templates (pick portfolio + card design; "coming soon" ones are disabled with tooltip)
     10. Review and publish: live compliance scan results (highlight offending phrases inline), missing-required checklist, "doctor approved on [date] via [channel]" fields, Preview, Publish button.
   - Publishing is blocked if: registration number missing, compliance issues present, or doctor approval not recorded.
   - Actions: Preview, Publish/Unpublish, Duplicate, Open live page, Copy share link, Download card, Suspend.
3. **Portfolio pages:** list of all pages: status, canonical URL, short link, template, last updated, SEO health (missing photo/bio/geo/timings), "view live".
4. **Visiting cards:** per doctor: render card with chosen template, QR (to short link) as SVG, download PNG (2x) and PDF, `.vcf` download, copy WhatsApp share message (pre-written, editable in Settings).
5. **Design templates:** grid of 5 portfolio + 5 card slots: name, preview thumbnail (upload), status (Coming soon / In design / Ready), doctors using it, "Preview with sample doctor", set default. Only `ready` templates are selectable on doctors.
6. **Hospitals:** CRUD; linked doctors; bulk price; "add consultant" shortcut that pre-fills the clinic as hospital_visiting.
7. **Payments:** record/list/filter; monthly totals; GST mode; CSV export.
8. **Update requests:** kanban (New / In progress / Done) or list on mobile; mark paid; first request per doctor auto-marked free if `freeUpdateUsed` is false.
9. **Leads:** list + status pipeline; click-to-call and WhatsApp links; convert lead → doctor draft.
10. **Master lists:** CRUD for cities, areas, specialties, degrees, councils with slug validation (reserved words, uniqueness).
11. **SEO:** sitemap URL count per chunk, list of published pages missing recommended fields, button to revalidate all, link to Search Console.
12. **Settings:** prices, founding total, contact phone/WhatsApp, GST mode, WhatsApp share message template, banned-word list editor (with defaults), admin users (superadmin only).

All mutations write to `AuditLog`. Every list has empty states, loading skeletons and error toasts.

---

## Phase 5 — Template registry and visiting cards

```
src/templates/
  types.ts            // PortfolioTemplateProps { doctor: PublicDoctor }, CardTemplateProps
  registry.ts         // { portfolio: { classic, t2, t3, t4, t5 }, card: { classic, t2, … } }
  portfolio/classic/  // built now
  portfolio/t2..t5/   // index.tsx returns <ClassicPortfolio {...props}/> with a TODO banner in dev only
  card/classic/
  card/t2..t5/
```
- `PublicDoctor` = a sanitised, serialisable view of DoctorProfile (no business/internal fields).
- Renderer resolves slot → component; if slot status ≠ ready, falls back to classic.
- Visiting card: standard 85 × 55 mm ratio for print + a vertical phone-share version (1080 × 1920); QR via `qrcode` (SVG); PNG export via `@vercel/og`/satori or `html-to-image`; PDF via `@react-pdf/renderer` or print CSS. `.vcf` generated server-side at `/[city]/doctor/[slug]/contact.vcf`.
- A public card page `/[city]/doctor/[slug]/card` (noindex) to share as a link.
- A sample doctor fixture (`fixtures/sample-doctor.ts`, fictional, clearly marked) for template previews.

---

## Phase 6 — Homepage and marketing pages

Follow `DESIGN_BRIEF.md` exactly for look and section order. Content requirements:
- Hero, problem, what you get, how it works, NMC section, pricing (from Settings, not hard-coded), founding banner with **live** count from DB, hospitals, sample pages (render Classic with sample fixtures, labelled "Sample"), FAQ (with `FAQPage` JSON-LD optional), final CTA, footer.
- Lead form (name, phone, city, specialty, message): zod-validated, honeypot + rate limit, saves `Lead`, sends me an email via Resend.
- WhatsApp CTA links use `https://wa.me/<number>?text=<encoded>` from Settings; log a `whatsapp_click` lead event via a tiny beacon endpoint (no personal data).
- `/pricing`, `/hospitals`, `/terms` (hosting term, founding "forever" scope, domain at actual cost, content ownership by doctor, GST), `/privacy` (DPDP Act 2023 friendly: what we collect, purpose, contact for deletion), `/contact`.
- No unverifiable claims about MediReach itself ("India's best", "#1"…).

---

## Phase 7 — Doctor self-edit login

- **Email-only login for doctors. No mobile/SMS OTP** (no paid SMS services anywhere in this project).
- NextAuth Email provider (magic link sent via Resend) using `ownerEmail`; role `doctor`. Uses the MongoDB adapter for verification tokens.
- `/login`: one email field, "Send login link" button, then a "Check your email" screen with the address shown and a "Resend link" option (rate-limited: max 3 links per email per 15 minutes). Link expires in 24 hours. Session lasts 30 days so doctors rarely need to log in again.
- Only emails that match a doctor's `ownerEmail` can log in; any other email gets the same neutral "If this email is registered, a link has been sent" message (no account enumeration).
- Branded login email (MediReach logo, doctor's name, one big "Log in to MediReach" button, plain-text fallback link, "Didn't request this? Ignore this email").
- Admin dashboard: on the doctor's Contact step, an "Enable self-edit login" toggle that requires `ownerEmail`, plus a "Send welcome/login email" button.
- `/account`: view own page link, card download, and edit **only**: clinic timings, clinic phone, address fields, fees + show/hide, mobile/WhatsApp, appointment note. Changes run the compliance scan, revalidate the page, and write AuditLog.
- "Request a change (₹299)" button creates an `UpdateRequest`.

---

## Phase 8 — QA and deploy checklist

- `npm run build` clean, no TS errors, ESLint clean.
- Validate a sample profile with Google's Rich Results Test / schema.org validator (paste JSON-LD output in the report).
- Mobile check at 360 px, 390 px, 768 px for homepage, profile, every dashboard screen.
- Lighthouse mobile numbers for `/` and one profile.
- Write `DEPLOY.md`:
  - Vercel project A: this branch → `medireach.co.in`
  - Vercel project B: `clinic-software` branch → `app.medireach.co.in`
  - Env vars list (MONGODB_URI, NEXTAUTH_SECRET, NEXTAUTH_URL, CLOUDINARY_*, RESEND_API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD, GOOGLE_SITE_VERIFICATION, NEXT_PUBLIC_SITE_URL, WHATSAPP_NUMBER)
  - Search Console: verify domain, submit sitemap.
  - Seed commands order.
- Write `README.md` section: how to add a new template design in Phase 2 (create component, register, set slot to ready).

---

## Out of scope for now (don't build)
- The 4 extra portfolio designs and 4 extra card designs (slots only).
- Custom-domain hosting for doctors (keep `ownDomain` data only).
- Patient-facing doctor search / directory UI on the homepage.
- Online payments (payments are recorded manually for now).
- Any reviews/ratings feature, ever.
