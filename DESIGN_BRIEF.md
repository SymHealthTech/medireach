# MediReach — Design Brief (Homepage, Dashboard, Classic Templates)

> Used together with `MEDIREACH_BUILD_PROMPT.md`. This file decides how things **look and feel**; the build prompt decides what they **do**.

---

## 1. Brand feeling

**Calm, credible, warm, Indian.** It should feel like a well-run private clinic: clean, unhurried and trustworthy. Avoid the cold blue hospital-SaaS look and generic startup gradients.

Three words for every design decision: **Trust · Clarity · Warmth.**

Audience: Indian doctors aged 28–60, mostly on Android phones, often reading between patients. Large tap targets, short sentences, and nothing that needs instructions.

---

## 2. Design tokens

### Colour
| Token | Hex | Use |
|---|---|---|
| `ink` | `#0E3B3C` | Primary: deep teal-green. Headings, primary buttons, dashboard sidebar |
| `ink-700` | `#155456` | Hover / secondary emphasis |
| `paper` | `#FBF8F3` | Page background (warm off-white, never pure white for large areas) |
| `surface` | `#FFFFFF` | Cards, inputs |
| `marigold` | `#E3A23B` | Accent: highlights, Founding badge, small details. Never for body text |
| `sage` | `#DCE8E2` | Soft section backgrounds, chips |
| `clay` | `#C8664B` | Errors / compliance warnings |
| `leaf` | `#2F8F5B` | Success / published / "open now" |
| `text` | `#1C2526` | Body text |
| `muted` | `#5D6B6C` | Secondary text |
| `line` | `#E6E1D8` | Borders, dividers |

Dark mode (dashboard only for now): background `#0B1F20`, surface `#122B2C`, text `#EAF1EF`, keep marigold accent.

Contrast: all text ≥ WCAG AA. Marigold only on `ink` or as a background behind `ink` text.

### Typography (via `next/font`)
- **Display:** *Fraunces* (soft optical serif, weights 500–700). Hero headlines, section titles, doctor names on profiles.
- **UI/body:** *Plus Jakarta Sans* (400/500/600/700). Everything else.
- **Future Indian languages:** reserve *Noto Sans Devanagari* in the font stack.
- Scale (mobile → desktop): H1 36→60, H2 28→40, H3 20→24, body 16→17, small 14. Line height 1.5 for body, 1.15 for display.

### Shape and space
- Radius: 12 px cards, 10 px inputs/buttons, 999 px chips/badges.
- Spacing on an 8 px grid; sections 72 px vertical padding on mobile, 120 px desktop.
- Shadows: one soft shadow only (`0 1px 2px rgba(14,59,60,.06), 0 8px 24px rgba(14,59,60,.06)`). No heavy drop shadows, no glassmorphism.
- Icons: lucide-react, 1.75 stroke, 20 px default.

### Motion
- Subtle, purposeful: fade-up 12 px on section enter (once), 200 ms ease-out; button press scale .98.
- Respect `prefers-reduced-motion`.
- No auto-playing carousels, no parallax.

---

## 3. Homepage

Mobile-first. Max content width 1160 px. Every section has one job.

1. **Top bar:** logo (wordmark "MediReach" in Fraunces, small marigold dot), links: How it works · Pricing · For hospitals · Login. Right: ink "Get my page" button. Sticky, turns solid on scroll. On mobile: logo + "Get my page" + menu.

2. **Hero** (paper background, sage organic blob shape behind the phone):
   - Eyebrow chip (sage): "For doctors in Pune"
   - H1 (Fraunces): **"Your patients search your name. Make sure they find you."**
   - Sub: "A professional one-page website and digital visiting card. Ready in 24 hours. ₹1,999, one time."
   - Buttons: primary ink "Get my page on WhatsApp" (WhatsApp icon), secondary outline "See a sample page".
   - Small trust line under buttons: "Built for the new NMC advertising guidelines".
   - Right side (below on mobile): a realistic **phone mockup** showing the Classic profile of the sample doctor, with a smaller **visiting card** overlapping it at an angle and a QR code. Gentle float animation (respect reduced motion).

3. **The problem:** three cards in a row (stack on mobile), each with an icon + one line:
   - Google search shows nothing (or someone else's listing).
   - Patients keep calling for your timings.
   - Your printed card can't be updated.
   A thin marigold underline on the section title.

4. **What you get:** 2-column layout: left, a list of features with check icons (page, QR card, map + directions, timings per clinic, services, 5 photos, awards and memberships, self-editing); right, a "browser" mockup showing the URL bar `medireach.co.in/pune/doctor/dr-…` with the page below it.

5. **How it works:** 3 numbered steps on a horizontal line with a dotted connector (vertical on mobile): Share details → We build in 24 hours → Approve, share, update anytime.

6. **NMC section:** ink background, paper text. Shield icon. Title "Built for the new NMC rules". Three short points: factual information only · no testimonials or ratings · no superlative claims. A small note: "Guidelines on Ethical Advertising, 6 Oct 2026".

7. **Pricing:** two cards side by side (GP / Consultant), prices from Settings, feature lists, button "Get started". Above them, a marigold **Founding Doctor** banner: "First 100 doctors get free hosting forever. **{n} spots left**", with a slim progress bar. Under the cards: "Own domain at actual cost · Done-for-you updates ₹299 · Prices {incl./excl.} GST".

8. **For hospitals:** sage band; left text "Give every visiting consultant a professional page"; right, a small grid of 4 mini doctor cards (sample). Button "Talk to us".

9. **Sample pages:** two phone mockups (GP and consultant), each labelled "Sample", with "Open sample" links.

10. **FAQ:** accordion, 6–8 questions, one open at a time.

11. **Final CTA:** large Fraunces line "Get your page live this week." + WhatsApp button + "or call {phone}".

12. **Footer:** ink background. Logo, short line "A Sym HealthTech product, Pune", links (Pricing, Hospitals, Terms, Privacy, Contact), © year.

Floating WhatsApp button bottom-right on mobile (hidden when the hero CTA is visible).

Copy rules: short sentences, no exclamation marks, no "best/leading/#1" about MediReach either.

---

## 4. Admin dashboard

Goal: it should feel as good as Linear or Notion, but warmer. Calm, fast, never cluttered. It must work fully on a phone during field visits.

### Layout
- **Desktop (≥1024 px):** left sidebar 248 px, ink background, paper text, marigold indicator bar on active item; collapsible to 72 px icons. Top bar on paper: page title, global search (⌘K), "+ New doctor" button, avatar menu.
- **Tablet:** collapsed icon sidebar.
- **Mobile:** top bar (title + search icon + avatar) and a **bottom tab bar** with 5 items: Overview, Doctors, + (new doctor, raised ink circle), Leads, More (drawer with the rest).
- Content max width 1280 px, 24 px gutters (16 px mobile).

### Components
- **Stat cards:** white surface, small muted label, big number in Fraunces, tiny trend chip. Founding spots card uses a marigold progress ring.
- **Tables:** sticky header, 52 px rows, zebra off, hover sage; on mobile each row becomes a card (photo, name, specialty · area, status badge, chevron).
- **Status badges:** Draft (muted grey), In review (marigold), Published (leaf), Suspended (clay). Founding = small marigold star badge.
- **Multi-step doctor form:** left vertical stepper on desktop with completion ticks; on mobile, a top progress bar with "Step 3 of 10" and swipeable steps; sticky bottom bar with Back / Save draft / Next. Autosave indicator ("Saved 2s ago").
- **Inputs:** 44 px height, 10 px radius, labels above, helper text below, clear error messages in clay.
- **Compliance scanner:** offending phrase highlighted with clay wavy underline; side panel lists issues with "Fix" jump links. Publish button disabled with a tooltip explaining why.
- **Timing editor:** 7 day rows, toggle open/closed, add slot (+), "Copy to all weekdays".
- **Photo upload:** drag/drop or camera on mobile, square crop for profile photo, reorder gallery by drag.
- **Google snippet preview:** realistic SERP preview (title in blue, URL in green-grey, description), updates live.
- **Design templates page:** 2 rows (Portfolio, Visiting card) × 5 slot cards; "Coming soon" slots show a soft dashed border, a sage placeholder illustration and the slot name; Ready slots show the thumbnail.
- **Empty states:** small line illustration + one sentence + primary action.
- **Toasts:** bottom-centre on mobile, top-right on desktop.
- **Charts:** simple bars in ink with marigold for the current month; no 3D, no gradients.

---

## 5. Classic portfolio template (the default doctor page)

Mobile-first, one page, loads fast.

1. **Header card:** paper background; circular photo (120 px mobile / 160 px desktop) with thin marigold ring; name in Fraunces H1; specialty · area, city; degrees line; registration line in muted small text. Action row: Call · WhatsApp · Directions · Save contact (icon buttons with labels; sticky at the bottom on mobile).
2. **Intro sentence** (auto-generated, factual) + short bio.
3. **Clinics:** one card per clinic: name, type chip ("Own clinic" / "Visiting consultant"), address, map button, today's timings highlighted with an "Open now / Closed" badge (leaf / muted), expandable full week, fee if shown.
4. **Services and conditions:** chips in sage.
5. **Qualifications:** a simple timeline (degree, institute, year).
6. **Awards and memberships:** list with awarding body and year; award photos in the gallery.
7. **Gallery:** up to 5 photos, 2-column grid on mobile, lightbox on tap, captions shown.
8. **Beyond medicine:** interests as chips (e.g. "Marathon runner", "Classical music").
9. **Quick facts:** Q&A block.
10. **Other doctors nearby:** small cards.
11. **Footer strip:** "Information provided by the doctor. Registration: {council} {number}" · "Page by MediReach" link.

No ratings, stars, review counts or testimonials anywhere.

## 6. Classic visiting card

- **Print version** (85 × 55 mm, landscape): left two-thirds: name (Fraunces), specialty, degrees, primary clinic name + area, phone; right third: QR code on paper with "Scan for timings and directions" in small text; thin ink bar along the bottom with the short URL.
- **Phone-share version** (1080 × 1920): photo top, name, specialty, clinic + area, today's-style timing summary, large QR, Call/WhatsApp hints, short URL, small "medireach.co.in" footer.
- Colours: paper background, ink text, marigold hairline accent. Must print well in black and white.

---

## 7. Template slots for Phase 2 (just names and moods to reserve now)

Portfolio: 1 Classic (built) · 2 "Clinic Modern" (bold photo header) · 3 "Minimal Mono" (typographic, black and white) · 4 "Warm Heritage" (serif, cream, subtle Indian border motif) · 5 "Specialist Pro" (for consultants: multi-hospital schedule focus).

Card: 1 Classic (built) · 2 Ink Bold · 3 Minimal · 4 Heritage · 5 Photo Card.

Only Classic is built now; the other slots show as "Coming soon" in the dashboard.
