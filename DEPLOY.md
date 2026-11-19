# Deploying MediReach

This repository holds only the **MediReach portfolio** app (doctor, clinic and
hospital websites with visiting cards). It deploys as one Vercel project:

| Vercel project | Git branch | Domains | Database |
|---|---|---|---|
| **MediReach portfolio** (this app) | `main` | `medireach.co.in`, `www.medireach.co.in`, `*.medireach.co.in` | `medireach_portfolio` |

The **clinic software** lives in its own repository,
[`SymHealthTech/medireach-clinic`](https://github.com/SymHealthTech/medireach-clinic),
and its own Vercel project at `clinicapp.medireach.co.in`, using the `medireach`
database. The two apps never share a database: this app refuses to start if
`MONGODB_DB=medireach`, and `clinicapp` is a reserved subdomain, so no doctor or
clinic can be given it. A domain added to a specific project
(`clinicapp.medireach.co.in` → the clinic project) always wins over the wildcard
(`*.medireach.co.in` → this project).

---

## 1. Before you start

- **MongoDB Atlas.** The existing cluster is fine. Create (or reuse) a database
  user, and under *Network Access* allow `0.0.0.0/0` (Vercel functions don't
  have fixed IPs). The `medireach_portfolio` database is created on first write.
- **Resend.** Add and verify the domain `medireach.co.in` (SPF + DKIM DNS
  records), then use a sender on it, e.g. `MediReach <hello@medireach.co.in>`.
  Without a verified domain Resend only delivers to your own address, so login
  emails and renewal reminders to doctors and clinic owners would not arrive.
- **Cloudinary.** Cloud name, API key and secret from the dashboard.
- **DNS for subdomains.** `*.medireach.co.in` (e.g.
  `dr-amit.medireach.co.in`, `yourclinic.medireach.co.in`) needs a wildcard domain on Vercel, and Vercel only
  issues wildcard certificates when the domain uses **Vercel's nameservers**.
  Move the domain's nameservers to Vercel (re-add any existing MX/TXT records
  in Vercel DNS first), or skip subdomains for now: every site also lives at
  `medireach.co.in/pune/doctor/…`, `/pune/clinic/…` or `/pune/hospital/…`.

## 2. Project A: the portfolio site (`medireach.co.in`)

1. Vercel → *Add New Project* → import the repository.
2. *Settings → Git → Production Branch*: `main`.
3. Framework preset: Next.js, default build (`npm run build`) and install
   (`npm install`) commands.
4. Environment variables (Production, and Preview if you use previews):

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | yes | `https://medireach.co.in` (no trailing slash). Canonicals, sitemap, emails and subdomain routing all use it. |
| `MONGODB_URI` | yes | Atlas connection string. |
| `MONGODB_DB` | yes | `medireach_portfolio`. Never `medireach`. |
| `AUTH_SESSION_SECRET` | yes | 48+ random bytes (`openssl rand -base64 48`). Signs admin sessions. |
| `NEXTAUTH_SECRET` | recommended | Doctor and clinic-owner login. Falls back to `AUTH_SESSION_SECRET`; better to give it its own random value. |
| `NEXTAUTH_URL` | recommended | `https://medireach.co.in`. Falls back to `NEXT_PUBLIC_SITE_URL`. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | for seeding | First superadmin (password 12+ characters). `ADMIN_EMAIL` also gets lead emails when `LEAD_NOTIFY_EMAIL` is empty. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | yes | Photo uploads. |
| `RESEND_API_KEY` | yes | Lead notifications, change requests, login links and renewal emails. No SMS anywhere. |
| `RESEND_FROM` | yes | Verified sender, e.g. `MediReach <hello@medireach.co.in>`. |
| `LEAD_NOTIFY_EMAIL` | optional | Where website leads and doctors' change requests go. |
| `RENEWAL_NOTIFY_EMAIL` | optional | The team's daily renewals digest. Falls back to `LEAD_NOTIFY_EMAIL`, then `ADMIN_EMAIL`. |
| `CRON_SECRET` | yes | Any long random string. Vercel sends it to `/api/cron/renewals` (see `vercel.json`); without it the route refuses to run and no renewal reminders go out. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | yes | International format without `+`: `919890626581`. Used until a number is saved in Settings (the code falls back to the same number). (The spec calls this `WHATSAPP_NUMBER`.) |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | yes | Shown on Contact, Terms and Privacy. |
| `GOOGLE_SITE_VERIFICATION` | optional | Only for the HTML-tag method in Search Console (see §5). |

5. *Settings → Domains*: add `medireach.co.in` (primary), `www.medireach.co.in`
   (redirect to the apex; the app also redirects www itself) and
   `*.medireach.co.in`. `clinicapp.medireach.co.in` belongs to the clinic project; a specific
   subdomain on another project takes precedence over this wildcard.
6. Deploy.

## 3. Clinic software (separate repository)

The clinic software is no longer in this repository. Its code, `.env.example`,
crons and deploy notes are in
[`SymHealthTech/medireach-clinic`](https://github.com/SymHealthTech/medireach-clinic).
The only things this app needs to know about it are the reserved `clinicapp`
subdomain and that `medireach` is the clinic's database, never this app's.

## 4. Seed the production database (once, in this order)

Run from your machine with project A's production values:

```bash
export MONGODB_URI="mongodb+srv://…"        # production cluster
export MONGODB_DB=medireach_portfolio
export ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a long password' ADMIN_NAME='Satish'

npm run seed:masters   # 1. cities, areas, specialties, clinic categories, degrees, councils, design slots (safe to re-run)
npm run seed:admin     # 2. first superadmin (re-run with --reset-password to change it)
```

**Never run `npm run seed:samples` against production.** It publishes the two
fictional sample doctors (and refuses to unless forced). The public sample
pages (`/sample/gp`, `/sample/consultant`) don't need the database.

Then log in at `https://medireach.co.in/admin`:

3. **Settings:** prices for the three products (setup, yearly renewal, founding
   renewal, per-doctor add-on, update), GST mode, WhatsApp number and contact
   phone, Founding total, renewal grace period; review the banned-phrase list.
4. **Settings → admins:** add your team (sales accounts can't publish).
5. Add the first real doctor, clinic or hospital, publish, and run the checks in §7.

## 5. Upgrading an existing production database to v2

Production already has v1 data (doctor portfolios with GP/Consultant plans and
the old Hospitals list). Do this once, in this order, when the v2 code goes live:

1. **Back up.** Take an Atlas snapshot (or `mongodump`) of `medireach_portfolio`.
2. **Set the new env vars** in Vercel: `CRON_SECRET` (required) and, if you
   like, `RENEWAL_NOTIFY_EMAIL`. Make sure `RESEND_FROM` uses the verified
   domain (§1), or owners won't receive reminders.
3. **Deploy** the v2 code. It reads both old and new fields, so the site keeps
   working before the migration runs.
4. **Seed the new master data** (adds clinic categories, incl. `small-hospital`,
   and the clinic/hospital design slots; existing data is left alone):
   `npm run seed:masters` with the production `MONGODB_URI` / `MONGODB_DB`.
   This must come **before** the migration, which links migrated hospitals to the
   `small-hospital` category.
5. **Dry run** the migration and read the output, especially the warnings:
   `npm run migrate:v2`. It lists every change (first 20; add `-- --verbose`
   for all) and writes nothing.
6. **Apply** it: `npm run migrate:v2 -- --apply`. It is safe to re-run; a second
   run reports 0 changes. It moves prices into the v2 Settings shape, turns each
   old hospital into a draft clinic/hospital site with the same id, sets every
   doctor's plan, founding flag, setup date and renewal due date, and links
   payments to sites.
7. **Fix what the warnings list.** In particular, a published doctor with no
   setup payment gets **no renewal due date**, so no reminders and no lapse:
   set the date on the doctor's Business step (or record the setup payment).
   Old hospitals become **drafts**: review and publish them from Clinics &
   hospitals.
8. **Check Settings** (prices, grace period, Founding total) and the
   Payments & renewals page.
9. **Check the cron:** Vercel → Settings → Cron Jobs shows
   `/api/cron/renewals` daily at 03:30 UTC (09:00 IST). Try a dry run:
   `curl -H "Authorization: Bearer $CRON_SECRET" "https://medireach.co.in/api/cron/renewals?dryRun=1"`
   (or `npm run renewals` locally against production, which is also a dry run
   by default).
10. **A week or so later**, once everything looks right, remove the old fields:
    `npm run migrate:v2 -- --apply --drop-legacy`. The legacy `hospitals`
    collection is left in place; drop it by hand when you're happy.

Founding customers from v1 were promised "free hosting"; v2 gives them the
lifetime founding renewal price instead. Tell them before their first renewal
reminder goes out (30 days before the due date).

## 6. Google Search Console

1. Add a **Domain property** for `medireach.co.in`, verified with the DNS TXT
   record. It covers the apex, www and every doctor subdomain.
   *Alternative:* a URL-prefix property for `https://medireach.co.in/`,
   verified by putting the HTML-tag code in `GOOGLE_SITE_VERIFICATION` and
   redeploying.
2. *Sitemaps* → submit `https://medireach.co.in/sitemap_index.xml`. It points
   to the paged sitemaps (marketing pages, city/specialty/area/category hubs,
   published doctors, clinics and hospitals; noindex and lapsed sites are left out).
3. Once the first doctors are live, use *URL Inspection → Request indexing*
   for a few profiles and hubs.
4. Optional: Bing Webmaster Tools (it can import from Search Console).

## 7. After each deploy: smoke test

- `/`, `/pricing`, `/for-clinics`, `/for-hospitals`, `/designs`, `/contact`,
  `/terms`, `/privacy` load; `/hospitals` redirects (301) to `/for-hospitals`;
  `/#clinic` opens the homepage on the Clinic tab.
- `/robots.txt` disallows `/admin`, `/account`, `/api` and lists the sitemap.
- `/sitemap_index.xml` and `/sitemap/0.xml` list `https://medireach.co.in` URLs.
- For a published doctor: `/pune/doctor/<slug>`, the short link, the subdomain,
  `/card` and its downloads, `contact.vcf`, and the WhatsApp link preview
  (Open Graph image).
- For a published clinic and hospital: the page, its subdomain, `/card` and
  its downloads, and the city, category, area and hospitals hubs list it.
- Paste the doctor URL into Google's **Rich Results Test**
  (https://search.google.com/test/rich-results) and the **Schema Markup
  Validator** (https://validator.schema.org): expect Physician, MedicalClinic
  and BreadcrumbList with no errors, and no review or rating markup.
- Submit the homepage lead form and tap a WhatsApp button: both show under
  Dashboard → Leads (taps as a count), and the lead email arrives.
- Doctor login: enable self-edit for a test doctor whose inbox you can read,
  send the login email, log in, change a timing, check the live page, log out.
- Clinic-owner login: set a test owner email on a clinic, use **Send login
  email** on its Business step, log in, change the appointment note, check the
  live site.
- Renewals: the cron dry run (§5 step 9) returns JSON with `"dryRun":true`.
- `clinicapp.medireach.co.in` still serves the clinic project, not this app.

## 8. Notes

- **Caching.** Doctor, clinic and hospital pages are statically generated and
  refreshed on publish, on every edit, on a lapse and on a restoring payment. Settings changes (prices, WhatsApp number, Founding spots)
  refresh public pages on save; anything else within 10 minutes.
- **Rate limits** live in the `ratelimits` collection (auto-expiring). To
  unlock an admin who tripped the login limit, delete their `admin-login:*`
  entries.
- **Backups.** Turn on Atlas backups (continuous or scheduled snapshots) for
  `medireach_portfolio`.
- **Renewals.** The daily job never deletes anything; a lapsed site shows a
  "temporarily unavailable" notice until its renewal payment is recorded.
  `npm run renewals` (dry run) shows what the next run will do.
- **Builds.** Don't run `next build` while `next dev` is running in the same
  folder; they share `.next`.
- **Rolling back (deploys).** Vercel → Deployments → *Promote to Production* on the
  previous deployment. Database changes are not rolled back (the v2 migration
  keeps the old fields until `--drop-legacy`, so v1 code still works after it).

## 9. Moving to a new Vercel account and Atlas cluster

Set everything up on a `*.vercel.app` address first, then switch the domain,
so the downtime is only the DNS switch. (The clinic software moves with its
own repository; see its deploy notes.)

1. **New Atlas.** Create the cluster; *Network Access* `0.0.0.0/0`; a database
   user with access to `medireach_portfolio` only.
2. **Copy the data** if the old cluster's `medireach_portfolio` has real data:
   ```bash
   mongodump    --uri="<old cluster>/medireach_portfolio" --out=portfolio-dump
   mongorestore --uri="<new cluster>" portfolio-dump
   ```
   Check the collection counts match and keep the dump as a backup. Otherwise
   the site starts empty.
3. **New Vercel account: connect GitHub.** Add New → Project → Import → *Adjust
   GitHub App Permissions* → install the Vercel app on the **SymHealthTech**
   organisation for the `medireach` repo (an org owner approves it).
4. **Create the project** as in §2, production branch `main`, with the new
   Atlas `MONGODB_URI` and `MONGODB_DB=medireach_portfolio`. Deploy, then from
   your machine against the new cluster run `npm run seed:masters` and
   `npm run seed:admin` (§4) if the database is new. Test on its `*.vercel.app`
   address.
5. **Switch the domain** (the only moment the live site changes):
   - Old account: remove `medireach.co.in`, `www` and `*.medireach.co.in` from
     the old project.
   - New account: add `medireach.co.in`, `www.medireach.co.in` and
     `*.medireach.co.in` to this project (`clinicapp.medireach.co.in` goes to
     the clinic project).
   - Do what Vercel's Domains page asks: a `TXT` record to prove ownership
     (the domain was in another account), and the `A`/`CNAME` records, or move
     the nameservers. The wildcard needs the domain on **Vercel nameservers in
     the new account**; if the old account held the DNS zone, move it there.
6. **Check** the portfolio smoke test (§7) and the renewals cron (Vercel →
   Settings → Cron Jobs).
7. **Remove the old project** from the old account (Settings → Advanced →
   Delete Project). Keep the old Atlas cluster until you're sure, then pause
   or delete it.
