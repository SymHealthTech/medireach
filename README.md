# MediReach

Websites and digital visiting cards for doctors, clinics and small hospitals,
at `medireach.co.in`. Three products, each with a visiting card:

| Product | What it is | Public address |
|---|---|---|
| **Doctor portfolio** | One-page site for an individual doctor | `/pune/doctor/<slug>`, short link, `<subdomain>.medireach.co.in` |
| **Clinic website** | Single or multi-doctor clinic, in a design made for its specialty | `/pune/clinic/<slug>`, subdomain |
| **Small hospital website** | Hospitals up to 10 beds: departments, beds, insurance, 24×7 bar | `/pune/hospital/<slug>`, subdomain |

The team builds and publishes every site from the dashboard (`/admin`).
Doctors and clinic/hospital owners can then log in at `/login` to change
timings, phones and address themselves. Pricing is a one-time setup plus a
yearly renewal from year 2; prices always come from **Settings**.

- Build spec: [`MEDIREACH_BUILD_PROMPT.md`](./MEDIREACH_BUILD_PROMPT.md)
- Look, motion and section order: [`DESIGN_BRIEF.md`](./DESIGN_BRIEF.md)
- Deploying and the v2 upgrade: [`DEPLOY.md`](./DEPLOY.md)

> The clinic software is a separate project: repository
> [`SymHealthTech/medireach-clinic`](https://github.com/SymHealthTech/medireach-clinic),
> deployed at `clinicapp.medireach.co.in`. It uses the `medireach` database;
> this app uses `medireach_portfolio` (see `MONGODB_DB`).

## Stack

- Next.js 15 (App Router) + TypeScript (strict), deployed on Vercel
- MongoDB Atlas via Mongoose
- Cloudinary (images), Resend (email; no SMS anywhere)
- Tailwind CSS v4, shadcn/ui (Radix), lucide-react, `motion` (homepage only, lazy-loaded)
- Satori / `next/og` + pdf-lib for visiting card PNGs and PDFs
- Vitest + mongodb-memory-server for tests

## Getting started

```bash
cp .env.example .env.local   # fill in real values — never commit secrets
npm install
npm run seed:masters         # cities, areas, specialties, clinic categories, degrees, councils, design slots
npm run seed:admin           # first superadmin from ADMIN_EMAIL / ADMIN_PASSWORD (12+ chars)
npm run dev                  # dashboard: http://localhost:3000/admin
```

For local testing with sample pages, point at a **dev database** and publish
the two fictional sample doctors (the script refuses to run against
`medireach_portfolio`):

```bash
MONGODB_DB=medireach_dev npm run seed:masters
MONGODB_DB=medireach_dev npm run seed:samples
# → /pune/doctor/dr-aditi-sample-general-physician, http://sample-gp.localhost:3000
```

The specialty design gallery (`/designs`, `/designs/<theme>`) and the sample
doctor pages (`/sample/gp`, `/sample/consultant`) use fictional fixtures and
need no database.

> `npm run dev` and `npm run build` share the `.next` folder. Stop the dev
> server before a production build, or the build can take many minutes and the
> dev server can end up serving stale files.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` / `test` | `tsc`, ESLint, Vitest (needs a local MongoDB binary; see `test/setup.ts`) |
| `npm run seed:masters` | Master lists and design slots. Safe to re-run. |
| `npm run seed:admin` | First superadmin (`--reset-password` to change it) |
| `npm run seed:samples` | Publishes the fictional sample doctors. **Dev databases only.** |
| `npm run migrate:v2` | Moves v1 data to the three-product model. Dry run by default; `-- --apply` writes; `-- --apply --drop-legacy` removes old fields. Re-runnable. See [`DEPLOY.md`](./DEPLOY.md). |
| `npm run renewals` | Runs the daily renewals job by hand. Dry run by default; `-- --apply` sends and writes. |

All scripts read `.env.local`; variables already set in your shell win, so
`MONGODB_DB=medireach_dev npm run …` targets a dev database.

## Where things are

| Area | Code |
|---|---|
| Homepage and marketing pages | `src/app/(marketing)`, `src/components/home`, `src/components/marketing` |
| All marketing copy (NMC-scanned by a test) | `src/content/marketing.ts` |
| Doctor portfolio pages | `src/app/[city]/doctor/[slug]`, `src/components/public/ProfileView.tsx` |
| Clinic / hospital sites | `src/app/[city]/{clinic,hospital}/[slug]`, `src/lib/public/site-route.tsx`, `src/components/public/SiteView.tsx` |
| City, area, specialty, category and hospital hubs | `src/app/[city]/…`, `src/lib/public/hubs.ts` |
| Specialty themes (13) | `src/themes/specialty.ts` |
| Designs (template slots) | `src/templates/{portfolio,clinic,hospital,card}/{classic,t2…t5}`, `src/templates/registry.ts` |
| Dashboard | `src/app/admin/(dash)`, `src/components/admin` |
| Renewals (status rules, daily job, emails) | `src/lib/renewals.ts`, `src/lib/renewals-job.ts`, `src/lib/renewals-email.ts`, `src/app/api/cron/renewals` |
| Logins and `/account` | `src/lib/auth/*`, `src/app/account` |
| v2 data migration | `src/lib/migrations/v2.ts`, `scripts/migrate-v2.ts` |

## Renewals

Every site has a renewal due date (one year after the setup payment, then
yearly). Recording a payment in **Payments & renewals** moves it on.

- **Statuses:** active, due (within 30 days), overdue (past due, still live),
  lapsed (grace period over; Settings, default 30 days).
- **Daily job** (`vercel.json`, 09:00 IST → `/api/cron/renewals`, secured by
  `CRON_SECRET`): emails the owner 30 days, 7 days and on the due date (if an
  owner email is set), keeps statuses in step, lapses sites after the grace
  period, and sends the team one digest (`RENEWAL_NOTIFY_EMAIL`). Each reminder
  is sent once; a failed email is retried the next day.
- **Lapsed sites** are never deleted. The page shows a short "temporarily
  unavailable" notice with MediReach's contact details (noindex), drops out of
  hubs, sitemaps and links, and its card, contact file and preview image return
  404. Recording the renewal payment restores it at once.
- Sites without an owner email are flagged in the digest; use **Copy renewal
  reminder** on the renewals page to send it on WhatsApp.

## Logins for doctors and site owners

People log in at `/login` with an emailed link (NextAuth Email provider,
MongoDB adapter, 30-day session; no passwords, no SMS). An email can log in if
it is a doctor's login email (doctor editor → Contact → "Enable self-edit
login") or the owner email of one or more clinic/hospital sites (site editor →
Business). Use **Send login email** in either editor. Other emails get the same
"check your email" screen. Links work once, expire in 24 hours and are limited
to 3 per email per 15 minutes; the link opens `/login/verify`, which needs one
tap, so mail scanners can't use it up.

`/account` lists everything the email owns, with each site's renewal date and
status:

- **Doctors** change clinic timings, clinic phone, address, maps link, fees
  (and whether to show them), appointment note, mobile / WhatsApp and the
  "Beyond medicine" photo and story. Anything else goes through "Request a
  change" (first one free, then the update price from Settings).
- **Clinic and hospital owners** change timings (or Open 24×7), phones,
  WhatsApp, the 24×7 emergency number, appointment note, visiting hours
  (hospitals) and address fields. Anything else: "Message us on WhatsApp".

Every change is NMC-scanned, audit-logged and goes live at once. Changing or
clearing a login email in the dashboard ends that access immediately.

## NMC rules (built in)

Factual information only. No reviews, ratings, testimonials, patient photos,
before/after images or superlatives anywhere; hubs list sites in neutral
alphabetical order. Free text is scanned against the banned-phrase list
(Settings) before publishing and on every self-edit, and a test scans all
marketing copy. Publicly, designs are called **specialty designs**, never
"templates".

## Marketing copy and leads

All homepage and marketing text lives in `src/content/marketing.ts`. Prices,
GST mode and the WhatsApp number come from **Settings**
(cached 10 minutes, refreshed on save). Form leads (homepage, pricing, for
clinics, for hospitals) are emailed to `LEAD_NOTIFY_EMAIL` (or `ADMIN_EMAIL`);
WhatsApp button taps are counted as `whatsapp_click` leads with no personal
data and are hidden from the Leads list by default. The homepage hero tab is
in the URL hash (`/#clinic`, `/#hospital`) for sales links.

The homepage has a JavaScript budget of **160 KB first load** (DESIGN_BRIEF.md
§3); it is at 159 KB. Check `npm run build` output for `/` before adding to it.

## Colours and contrast

Brand colours live as tokens in `src/app/globals.css`. For small text use
`text-leaf-text` and `text-clay-text`, not `text-leaf` / `text-clay`: the
brand green and clay are fine for icons, borders and fills but are below the
4.5:1 WCAG AA contrast for body-size text. Both have dark-mode values.

## Adding a new design (template slots)

Every doctor and site stores its designs by **slot key** (`classic`, `t2` …
`t5`), separately for portfolio, clinic, hospital and card designs. Slots
`t2`–`t5` currently render Classic with a dev-only "TODO" banner, so adding a
design never touches customer data:

1. **Build the component** in the slot's folder, e.g.
   `src/templates/portfolio/t2/index.tsx` (`PortfolioTemplateProps`),
   `src/templates/clinic/t2/index.tsx` or `src/templates/hospital/t2/index.tsx`
   (`SiteTemplateProps`), or `src/templates/card/t2/index.tsx`
   (`CardTemplateProps`; render both `variant="print"` (1004 × 650) and
   `variant="phone"` (1080 × 1920)). A doctor's card is always the card slot
   with the same key as their website design (there is no separate card
   choice); clinic and hospital cards take the site's design colours. Phone
   and print cards draw the one-tap buttons with `ActionDock` at a fixed
   `PHONE_DOCK` / `PRINT_DOCK` (`templates/card/actions.tsx`), so the PDFs can
   put working links over them; export both from the card module (the registry
   reads them for `cardDocks`). Place `seo.heading` and `seo.intro` in your
   layout: metadata, JSON-LD, breadcrumbs and quick facts are added by the
   shared wrapper, so SEO stays identical across designs. Clinic and hospital
   designs read the specialty theme's colours from the `--theme-primary`,
   `--theme-accent` and `--theme-soft` CSS variables. Cards are also rendered
   to PNG/PDF by Satori: **inline styles and flexbox only**, `<img>` and inline
   `<svg>`, and the `fonts` prop for font families.
2. **Preview it** with the fictional samples: Dashboard → Designs & themes →
   Preview.
3. **Mark the slot Ready** there (and upload a preview thumbnail). Ready slots
   become selectable in the editors; sites already using the slot switch from
   Classic on their next render.
