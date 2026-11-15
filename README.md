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
- Tailwind CSS v4, shadcn/ui (Radix), lucide-react

## Getting started

```bash
cp .env.example .env.local   # fill in real values — never commit secrets
npm install
npm run seed:masters         # cities, areas, specialties, degrees, councils, template slots
npm run seed:admin           # first superadmin from ADMIN_EMAIL / ADMIN_PASSWORD (12+ chars)
npm run dev                  # dashboard: http://localhost:3000/admin
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
| 3 | Admin auth and dashboard shell ✅ |
| 4 | Dashboard features ✅ |
| 5 | Template registry and visiting cards ✅ |
| 6 | Homepage and marketing pages |
| 7 | Doctor self-edit login |
| 8 | QA and deploy checklist |

## Adding a new design (template slots)

Every doctor stores a portfolio design and a card design by **slot key**
(`classic`, `t2` … `t5`). Slots `t2`–`t5` currently render Classic with a
dev-only "TODO" banner, so adding a design never touches doctor data:

1. **Build the component** in the slot's folder:
   - portfolio page → `src/templates/portfolio/t2/index.tsx` (props:
     `PortfolioTemplateProps`; place `seo.heading` and `seo.intro` in your
     layout — metadata, JSON-LD, breadcrumbs, quick facts and nearby doctors
     are added by the shared wrapper, so SEO stays identical across designs);
   - visiting card → `src/templates/card/t2/index.tsx` (props:
     `CardTemplateProps`; render both `variant="print"` (1004 × 650) and
     `variant="phone"` (1080 × 1920)). Cards are also rendered to PNG/PDF by
     Satori, so use **inline styles and flexbox only** (every element with
     several children needs `display: "flex"`), `<img>` and inline `<svg>`,
     and the `fonts` prop for font families.
2. **Preview it** with the fictional sample doctors: Dashboard → Design
   templates → Preview (`/admin/templates/preview/t2` or `?type=card`).
3. **Mark the slot Ready** in Dashboard → Design templates (and upload a
   preview thumbnail). Ready slots become selectable in the doctor form; pages
   already using the slot switch from Classic on their next render.
