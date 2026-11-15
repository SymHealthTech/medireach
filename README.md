# MediReach

One-page portfolio websites and digital visiting cards for Indian doctors, at
`medireach.co.in`. Admin builds and publishes every doctor's page from a
dashboard; doctors can later log in to edit a few fields.

The build spec is [`MEDIREACH_BUILD_PROMPT.md`](./MEDIREACH_BUILD_PROMPT.md);
look and feel is in [`DESIGN_BRIEF.md`](./DESIGN_BRIEF.md).

> The previous clinic software is preserved at tag `clinic-v1` and branch
> `clinic-software` (future `app.medireach.co.in`). It uses the `medireach`
> database; this app uses `medireach_portfolio` (see `MONGODB_DB`).

## Stack

- Next.js (App Router) + TypeScript (strict)
- MongoDB Atlas via Mongoose
- Cloudinary (images), Resend (email)
- Tailwind CSS

## Getting started

```bash
cp .env.example .env.local   # fill in real values — never commit secrets
npm install
npm run seed:masters         # cities, areas, specialties, degrees, councils, template slots
npm run dev
```

For local testing with sample pages, point at a dev database and publish the
two fictional sample doctors (refuses to run against `medireach_portfolio`):

```bash
MONGODB_DB=medireach_dev npm run seed:masters
MONGODB_DB=medireach_dev npm run seed:samples
# → /pune/doctor/dr-aditi-sample-general-physician, http://sample-gp.localhost:3000
```

Other scripts: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`,
`npx tsx scripts/make-favicon.tsx` (regenerates `public/favicon.ico`).

## Build phases

| Phase | Scope |
|------|-------|
| 0 | Audit, preserve clinic code, remove clinic-only files ✅ |
| 1 | Data model and master lists ✅ |
| 2 | Public pages and SEO ✅ |
| 3 | Admin auth and dashboard shell |
| 4 | Dashboard features |
| 5 | Template registry and visiting cards |
| 6 | Homepage and marketing pages |
| 7 | Doctor self-edit login |
| 8 | QA and deploy checklist |
