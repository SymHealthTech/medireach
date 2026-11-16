# Deploying MediReach

Two separate Vercel projects from the same GitHub repository:

| Vercel project | Git branch | Domains | Database |
|---|---|---|---|
| **A: MediReach portfolio** (this app) | `portfolio-v1` | `medireach.co.in`, `www.medireach.co.in`, `*.medireach.co.in` | `medireach_portfolio` |
| **B: MediReach clinic software** (parked) | `clinic-software` | `app.medireach.co.in` | `medireach` |

The clinic code is also frozen at tag `clinic-v1`. The two apps never share a
database: the portfolio app refuses to start if `MONGODB_DB=medireach`.

---

## 1. Before you start

- **MongoDB Atlas.** The existing cluster is fine. Create (or reuse) a database
  user, and under *Network Access* allow `0.0.0.0/0` (Vercel functions don't
  have fixed IPs). The `medireach_portfolio` database is created on first write.
- **Resend.** Add and verify the domain `medireach.co.in` (SPF + DKIM DNS
  records), then use a sender on it, e.g. `MediReach <hello@medireach.co.in>`.
  Without a verified domain Resend only delivers to your own address, so doctor
  login emails would not arrive.
- **Cloudinary.** Cloud name, API key and secret from the dashboard.
- **DNS for doctor subdomains.** `*.medireach.co.in` (e.g.
  `dr-amit.medireach.co.in`) needs a wildcard domain on Vercel, and Vercel only
  issues wildcard certificates when the domain uses **Vercel's nameservers**.
  Move the domain's nameservers to Vercel (re-add any existing MX/TXT records
  in Vercel DNS first), or skip subdomains for now: every page also lives at
  `medireach.co.in/pune/doctor/…` and on its short link.

## 2. Project A: the portfolio site (`medireach.co.in`)

1. Vercel → *Add New Project* → import the repository.
2. *Settings → Git → Production Branch*: `portfolio-v1` (or `main` once you
   merge `portfolio-v1` into it; `main` still holds the clinic code today).
3. Framework preset: Next.js, default build (`npm run build`) and install
   (`npm install`) commands.
4. Environment variables (Production, and Preview if you use previews):

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | yes | `https://medireach.co.in` (no trailing slash). Canonicals, sitemap, emails and subdomain routing all use it. |
| `MONGODB_URI` | yes | Atlas connection string. |
| `MONGODB_DB` | yes | `medireach_portfolio`. Never `medireach`. |
| `AUTH_SESSION_SECRET` | yes | 48+ random bytes (`openssl rand -base64 48`). Signs admin sessions. |
| `NEXTAUTH_SECRET` | recommended | Doctor login. Falls back to `AUTH_SESSION_SECRET`; better to give it its own random value. |
| `NEXTAUTH_URL` | recommended | `https://medireach.co.in`. Falls back to `NEXT_PUBLIC_SITE_URL`. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | for seeding | First superadmin (password 12+ characters). `ADMIN_EMAIL` also gets lead emails when `LEAD_NOTIFY_EMAIL` is empty. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | yes | Photo uploads. |
| `RESEND_API_KEY` | yes | Lead notifications, change requests and doctor login links. No SMS anywhere. |
| `RESEND_FROM` | yes | Verified sender, e.g. `MediReach <hello@medireach.co.in>`. |
| `LEAD_NOTIFY_EMAIL` | optional | Where website leads and doctors' change requests go. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | yes | International format without `+`, e.g. `9198XXXXXXXX`. Used until a number is saved in Settings. (The spec calls this `WHATSAPP_NUMBER`.) |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | yes | Shown on Contact, Terms and Privacy. |
| `GOOGLE_SITE_VERIFICATION` | optional | Only for the HTML-tag method in Search Console (see §5). |

5. *Settings → Domains*: add `medireach.co.in` (primary), `www.medireach.co.in`
   (redirect to the apex; the app also redirects www itself) and
   `*.medireach.co.in`. `app.medireach.co.in` belongs to project B; a specific
   subdomain on another project takes precedence over this wildcard.
6. Deploy.

## 3. Project B: clinic software (`app.medireach.co.in`)

1. Import the same repository as a second project.
2. Production branch: `clinic-software`.
3. Environment variables: the clinic software's own set (see `.env.example` on
   that branch), with its database `medireach`. Don't reuse project A's secrets.
4. Domain: `app.medireach.co.in`.

Keep it private (Vercel password protection, or no domain yet) until it launches.

## 4. Seed the production database (once, in this order)

Run from your machine with project A's production values:

```bash
export MONGODB_URI="mongodb+srv://…"        # production cluster
export MONGODB_DB=medireach_portfolio
export ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a long password' ADMIN_NAME='Satish'

npm run seed:masters   # 1. cities, areas, specialties, degrees, councils, template slots (safe to re-run)
npm run seed:admin     # 2. first superadmin (re-run with --reset-password to change it)
```

**Never run `npm run seed:samples` against production.** It publishes the two
fictional sample doctors (and refuses to unless forced). The public sample
pages (`/sample/gp`, `/sample/consultant`) don't need the database.

Then log in at `https://medireach.co.in/admin`:

3. **Settings:** prices (GP, Consultant, update), GST mode, WhatsApp number,
   Founding Doctor total; review the banned-phrase list.
4. **Settings → admins:** add your team (sales accounts can't publish).
5. Add the first real doctor, publish, and run the checks in §6.

## 5. Google Search Console

1. Add a **Domain property** for `medireach.co.in`, verified with the DNS TXT
   record. It covers the apex, www and every doctor subdomain.
   *Alternative:* a URL-prefix property for `https://medireach.co.in/`,
   verified by putting the HTML-tag code in `GOOGLE_SITE_VERIFICATION` and
   redeploying.
2. *Sitemaps* → submit `https://medireach.co.in/sitemap_index.xml`. It points
   to the paged sitemaps (marketing pages, city/specialty/area hubs, published
   doctors; noindex pages are left out).
3. Once the first doctors are live, use *URL Inspection → Request indexing*
   for a few profiles and hubs.
4. Optional: Bing Webmaster Tools (it can import from Search Console).

## 6. After each deploy: smoke test

- `/`, `/pricing`, `/hospitals`, `/contact`, `/terms`, `/privacy` load.
- `/robots.txt` disallows `/admin`, `/account`, `/api` and lists the sitemap.
- `/sitemap_index.xml` and `/sitemap/0.xml` list `https://medireach.co.in` URLs.
- For a published doctor: `/pune/doctor/<slug>`, the short link, the subdomain,
  `/card` and its downloads, `contact.vcf`, and the WhatsApp link preview
  (Open Graph image).
- Paste the doctor URL into Google's **Rich Results Test**
  (https://search.google.com/test/rich-results) and the **Schema Markup
  Validator** (https://validator.schema.org): expect Physician, MedicalClinic
  and BreadcrumbList with no errors, and no review or rating markup.
- Submit the homepage lead form and tap a WhatsApp button: both show under
  Dashboard → Leads (taps as a count), and the lead email arrives.
- Doctor login: enable self-edit for a test doctor whose inbox you can read,
  send the login email, log in, change a timing, check the live page, log out.
- `app.medireach.co.in` still serves the clinic project, not this app.

## 7. Notes

- **Caching.** Profiles are statically generated and refreshed on publish and
  on every edit. Settings changes (prices, WhatsApp number, Founding spots)
  refresh public pages on save; anything else within 10 minutes.
- **Rate limits** live in the `ratelimits` collection (auto-expiring). To
  unlock an admin who tripped the login limit, delete their `admin-login:*`
  entries.
- **Backups.** Turn on Atlas backups (continuous or scheduled snapshots) for
  `medireach_portfolio`.
- **Rolling back.** Vercel → Deployments → *Promote to Production* on the
  previous deployment. Database changes are not rolled back.
