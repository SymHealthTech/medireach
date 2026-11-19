# MediReach — Design Brief (Homepage, Dashboard, Site Designs)

> Used together with `MEDIREACH_BUILD_PROMPT.md`. This file decides how things **look, move and feel**; the build prompt decides what they **do**.

MediReach sells three products, and **every plan includes a digital visiting card**:
1. **Doctor portfolio**: one-page site for an individual doctor.
2. **Clinic website**: for single or multi-doctor clinics (general OPD, skin, dental, eye, ENT, cardiology, Ayurveda, homeopathy, physiotherapy, etc.).
3. **Small hospital website**: for hospitals up to 10 beds.

---

## 1. Brand feeling

**Calm, credible, warm, Indian.** It should feel like a well-run private clinic: clean, unhurried and trustworthy. Avoid the cold blue hospital-SaaS look, stock photos of smiling patients, and generic startup gradients.

Three words for every design decision: **Trust · Clarity · Warmth.**

Audience: Indian doctors and clinic owners aged 28–60, mostly on Android phones, often reading between patients. Large tap targets, short sentences, nothing that needs instructions.

---

## 2. Design tokens

### Colour
The website uses the same branding as the MediReach clinic app: **teal** is the brand colour, **amber** is the primary action colour. Token names are historical (`lagoon` = brand teal, `marigold` = amber, `clay` = red, `leaf` = success green).

| Token | Hex | Use |
|---|---|---|
| `lagoon` | `#0E7C7B` | Brand teal: logo, links, icons, accent text (4.8:1 on paper) |
| `lagoon-700` | `#0B6564` | Teal hover |
| `ink` | `#0A3F3F` | Deep teal shade: headings, dark bands (NMC, footer, final CTA, featured price card), secondary buttons, dashboard sidebar |
| `ink-700` | `#0E5655` | Hover / secondary emphasis |
| `marigold` | `#F2994A` | Amber: primary action buttons ("Get started", WhatsApp CTAs), badges, small highlights. **White text on amber.** Never body text |
| `marigold-700` | `#DA8A43` | Amber hover |
| `paper` | `#F7F9FA` | Page background |
| `surface` | `#FFFFFF` | Cards, inputs |
| `sage` / `mint` / `mist` | `#E0F2F1` / `#ECF6F5` / `#F2F9F8` | Pale teal washes: section backgrounds, chips |
| `clay` | `#E63946` (text `#C62F3B`) | Red: emergency labels and errors / compliance warnings only. Nowhere else |
| `leaf` | `#27AE60` (text `#1C7442`) | Success / published / "open now" |
| `text` | `#1F2933` | Body text |
| `muted` | `#5B6573` | Secondary text |
| `line` | `#E5E7EB` | Borders, dividers |

The public website is **light mode only**. The admin dashboard keeps an opt-in dark toggle (clinic app dark values): background `#121417`, surface `#1E2328`, text `#E8EAED`, teal `#3FA8A6`, keep amber.
All body text ≥ WCAG AA. Exception by choice: amber buttons and badges use white text (about 2.2:1), kept bold/semibold.

### Logo
Shared with the clinic app: a rounded teal square badge holding a white speech bubble with a teal pulse line and a small amber dot at the tail tip, followed by the wordmark **"Medi"** in teal and **"Reach"** in amber (bold, UI sans). On dark bands "Medi" turns white. The badge alone is the favicon / app icon / small mark.

### Typography (via `next/font`)
- **Display:** *Fraunces* (500–700): hero, section titles, doctor/clinic names.
- **UI/body:** *Plus Jakarta Sans* (400–700): everything else.
- Reserve *Noto Sans Devanagari* in the stack for Marathi/Hindi later.
- Scale (mobile → desktop): H1 38→64, H2 28→42, H3 20→24, body 16→17, small 14. Body line height 1.55, display 1.1.

### Shape and space
- Radius: 16 px large cards, 12 px cards, 10 px inputs/buttons, 999 px chips.
- 8 px grid; sections 80 px vertical padding on mobile, 128 px on desktop.
- One soft shadow: `0 1px 2px rgba(10,63,63,.06), 0 8px 24px rgba(10,63,63,.06)`. No glassmorphism, no heavy shadows.
- Icons: lucide-react, 1.75 stroke. Illustrations: simple single-colour line illustrations (ink lines, sage/marigold fills). No patient photos anywhere.

---

## 3. Motion system (homepage)

Library: **`motion`** (Framer Motion), loaded with `LazyMotion` + `domAnimation` to keep the bundle small. Pure CSS for loops (marquee, float, scan line).

| Pattern | Spec |
|---|---|
| Section reveal | Fade-up 16 px, 450 ms, `easeOut`, once, when 20% in view; children stagger 70 ms |
| Hero entrance | Eyebrow → headline words → subline → buttons, stagger 60 ms. **The H1 text itself must render immediately** (animate opacity from 0.001 only on non-LCP elements; never hide the LCP element) |
| Device swap | Crossfade + 12 px slide + slight scale (0.98 → 1), 350 ms, when the audience switcher or specialty chip changes |
| Float | Phone/card mockups drift ±6 px vertically, 6 s loop, CSS |
| Card tilt | Visiting card tilts up to 8° following the pointer (only on `pointer: fine` devices) |
| Card flip | Front ↔ back, 600 ms, `rotateY`, auto every 4 s while in view; tap to flip on mobile |
| QR scan | A thin amber line sweeps over the QR, 2.4 s loop |
| Typing search | Search-box text types at 45 ms per character, pauses 1.2 s, result card slides up 300 ms |
| Line draw | "How it works" connector draws with `pathLength` 0 → 1 as you scroll through the section |
| Hover | Cards lift 4 px + shadow deepens, 180 ms; buttons press scale 0.98 |
| Marquee | Specialty chips scroll slowly (40 s per loop), pause on hover/touch |

Rules:
- **`prefers-reduced-motion`**: no loops, no tilt, no typing (show final state), reveals become simple fades.
- Animate only `transform` and `opacity`. No layout shift (CLS < 0.05).
- Pause off-screen loops (IntersectionObserver).
- Heavy effects (tilt, typing) only load on the client after hydration; the page must look complete without JS.
- Performance budget: homepage initial JS < 160 KB gzipped; mobile Lighthouse Performance ≥ 90.

---

## 4. Homepage: structure and content

Max content width 1200 px. Mobile-first. Every section has one job.

### 4.1 Top bar
Logo (teal badge + two-tone "MediReach" wordmark, see §2). Links: Doctors · Clinics · Hospitals · Designs · Pricing · Login. Right: amber button "Get started" (white text). Sticky; transparent over the hero, turns solid paper with a hairline on scroll. Mobile: logo + "Get started" + menu sheet.

### 4.2 Hero (with audience switcher)
- Eyebrow chip (sage): "Websites for doctors, clinics and small hospitals · Pune"
- **H1 (static, LCP):** "Patients search for you on Google. Make sure they find you."
- **Audience switcher** (one white segmented control, ink pill on the active tab, amber progress bar while auto-advancing): **Doctor · Clinic · Hospital**. Default = Doctor. Changing it swaps:
  - Subline:
    - Doctor: "A professional portfolio website + digital visiting card. Ready in 24 hours."
    - Clinic: "A complete clinic website designed for your specialty, with your doctors, timings and location. Ready in 48 hours."
    - Hospital: "A full website for hospitals up to 10 beds: departments, doctors, facilities and 24×7 contact."
  - Price line in a sage chip: "₹1,999 one-time · ₹999/year from year 2" / "₹2,999 · ₹999/year" / "₹4,999 · ₹1,499/year"
  - Device stage (crossfade): phone with doctor profile / laptop + phone with clinic site / laptop with hospital site.
- Buttons: primary amber "Get my website on WhatsApp" (WhatsApp icon, white text), secondary white outline "See sample designs".
- Trust row (small green ticks): "Built for NMC guidelines · Digital visiting card included · Easy to use on any phone".
- Floating mini-chips around the device (float animation): "Open now", "Get directions", "Save contact", "{name}.medireach.co.in". The visiting card overlaps the device at an angle with the QR scan line.
- Background: white easing into pale teal, a soft teal glow top-right and a faint amber glow bottom-left (as in the clinic app). Behind the device: a pale teal disc with a thin dashed ring, one amber dot and one teal dot. Keep it simple: no blobs, no dot grid.

### 4.3 Specialty marquee
A slim band of chips with small icons, scrolling slowly: General OPD · Skin & Hair · Dental · Eye · ENT · Cardiology · Ayurveda · Homeopathy · Physiotherapy · Paediatrics · Gynaecology · Orthopaedics · Small hospitals. Each chip links to that design in section 4.6.

### 4.4 "Get found on Google" (the core promise)
- Left: title "When patients search, your website shows up" + 3 points (your name, your area, your specialty) + small note "Results take time and are not guaranteed; we build every page the way search engines prefer."
- Right: an **animated search illustration** (generic search UI, **no Google logo or branding**, small caption "Illustration"): the query types itself and a MediReach-style result slides up. Cycles through 3 queries:
  1. "dr amit kulkarni kothrud" → doctor result
  2. "skin clinic in baner" → clinic result
  3. "hospital in wakad" → hospital result
  All names fictional.

### 4.5 Three products
Three large cards (stack on mobile), each with icon, name, one-line purpose, 5 key inclusions, price + renewal, and "See sample" link. A marigold ribbon across all three: **"Every plan includes a digital visiting card"**.
- Doctor portfolio: profile, qualifications and registration, clinics + timings, services, up to 5 photos.
- Clinic website: clinic profile, doctors team, services, facilities, timings, map, up to 8 photos.
- Small hospital: departments, doctors by department, facilities, beds, insurance/TPA list, 24×7 contact bar, up to 12 photos.

### 4.6 "Designs made for your specialty"
- Title: "Designs made for your specialty" · sub: "Each one is personalised with your name, logo, colours, photos and details."
- Chip filter row (scrollable on mobile): General OPD, Skin & Hair, Dental, Eye, ENT, Cardiology, Ayurveda, Homeopathy, Physiotherapy, Paediatrics, Gynaecology, Orthopaedics, Small hospital.
- Selecting a chip crossfades a **laptop + phone preview** of that specialty design (sample, fictional clinic) and shows: colour swatches, 3 "built for this specialty" points (e.g. Eye: "Services grouped by condition · Equipment and diagnostics section · Spectacle/lens counter timings"), and a "View sample" button.
- Every preview carries a small "Sample" badge.
- Public wording: **"specialty designs"**, never "templates" (see section 9).

### 4.7 Digital visiting card spotlight
- Left: a large 3D visiting card (tilt on pointer, auto-flip front/back, QR scan line). Below it, a small phone showing a WhatsApp-style chat bubble with the card link (generic chat UI, no WhatsApp logo inside the illustration).
- Right: title "A visiting card you never need to reprint" + points: scan to save contact · one-tap call, WhatsApp and directions · update timings anytime · share on WhatsApp in one tap · print-ready version included.

### 4.8 How it works
Three steps on a line that draws itself as you scroll (vertical on mobile):
1. Share your details on WhatsApp or a 10-minute form.
2. We design your website and visiting card in 24–48 hours.
3. Approve, share your link, and update timings yourself anytime.

### 4.9 Built for the new NMC rules
Ink band, paper text, shield icon. "Built for the NMC Guidelines on Ethical Advertising (6 Oct 2026)". Three points: factual information only · no patient testimonials, ratings or before/after photos · no superlative claims. Small line: "Also suitable for dental, Ayurveda, homeopathy and physiotherapy councils' rules."

### 4.10 Pricing
- Three cards (Doctor / Clinic / Small hospital) with setup price, renewal, inclusions and "Get started". Clinic card gets a subtle "Most popular" marigold tag.
- Under the cards: "Add your clinic's doctors: ₹1,499 per doctor portfolio · Own domain at actual cost · Done-for-you updates ₹299 · Prices {incl./excl.} GST".
- No Founding banner and no GST note on the public site (removed 19 Nov 2026). Founding renewals stay an admin-only setting.

### 4.11 For multi-doctor clinics and hospitals
Sage band: "One website for your clinic, a portfolio for every doctor." Small diagram: clinic site in the centre linked to 3 doctor cards. Button "Talk to us".

### 4.12 Sample sites gallery
Horizontally scrollable cards (snap) with real renders of sample sites: 2 doctors, 4 clinics, 1 hospital. Each labelled "Sample".

### 4.13 FAQ (accordion)
- Is this allowed under NMC rules?
- Do I have to pay every year? (setup once, renewal from year 2 covers hosting, security and updates you make yourself)
- Can I use my own domain?
- How do I change timings?
- Will another clinic have the same design? (honest answer, see section 9)
- What's included in the visiting card?
- Who owns my content? (you do)
- We have 4 doctors; how does it work?

### 4.14 Final CTA
Large Fraunces line "Get your website live this week." + WhatsApp button + "or call {phone}". A marigold underline draws under "this week" when in view.

### 4.15 Footer
Ink background. Logo, "A Sym HealthTech product, Pune". Columns: Products (Doctors, Clinics, Hospitals, Visiting card) · Company (Pricing, Contact) · Legal (Terms, Privacy). © year.

Mobile: floating WhatsApp button bottom-right (appears after the hero scrolls out).

Copy rules: short sentences, no exclamation marks, no "best/leading/#1/top" about MediReach or anyone else.

---

## 5. Specialty design themes

One clinic layout + one hospital layout in Phase 1, each skinned by a **specialty theme**. A theme is configuration, not separate code:

```
{ key, name, icon, palette: { primary, accent, soft }, heroIllustration,
  suggestedServices: [...], sectionOrder: [...], sectionLabels: {...}, emphasis }
```

| Theme | Primary | Accent | Soft | Emphasis |
|---|---|---|---|---|
| General OPD | `#0A3F3F` | `#F2994A` | `#E0F2F1` | Timings, walk-in info, services |
| Skin & Hair | `#5B3A4A` | `#D9A38B` | `#F4E6E0` | Treatments by concern, equipment (no before/after) |
| Dental | `#1F4E6B` | `#7FC8D6` | `#E3F2F5` | Procedures list, chairs/equipment, fees |
| Eye | `#203A5C` | `#6BA6D6` | `#E4EEF7` | Conditions, diagnostics, optical counter |
| ENT | `#2E4A3F` | `#C9A34A` | `#E9EFE6` | Procedures, audiology/diagnostics |
| Cardiology | `#5A1F2B` | `#E07A6B` | `#F6E5E3` | Tests (ECG, Echo, TMT), consultation hours |
| Ayurveda | `#4A5A23` | `#C88A2C` | `#F1EEDC` | Therapies (Panchakarma etc.), consultation |
| Homeopathy | `#2F5D50` | `#9DBF7A` | `#EAF2E3` | Consultation process, conditions treated |
| Physiotherapy | `#174A5C` | `#F08A4B` | `#E2EFF2` | Therapy types, equipment, home visits |
| Paediatrics | `#2B4C7E` | `#F2B84B` | `#EAF0FA` | Vaccination schedule info, timings |
| Gynaecology | `#5C2E55` | `#E39AB1` | `#F6E8EF` | Services, antenatal care info |
| Orthopaedics | `#2C3E50` | `#E3A23B` | `#E8ECEF` | Procedures, physiotherapy link |
| Small hospital | `#0E5655` | `#C8664B` | `#E0F0EF` | 24×7 bar, departments, beds, insurance |

Illustrations: simple line icons per specialty (tooth, eye, leaf, spine, heart outline, etc.). No body imagery, no patient photos.

---

## 6. Admin dashboard

Goal: as good as Linear or Notion, but warmer. Calm, fast, never cluttered, fully usable on a phone during field visits.

### Layout
- **Desktop (≥1024 px):** left sidebar 248 px, ink background, paper text, amber indicator on active item; collapsible to 72 px. Top bar on paper: page title, global search (⌘K), "+ New" split button (Doctor / Clinic / Hospital), avatar menu.
- **Tablet:** collapsed icon sidebar.
- **Mobile:** top bar + **bottom tab bar**: Overview · Doctors · + (raised ink circle → choose Doctor / Clinic / Hospital) · Clinics · More (drawer).
- Content max width 1280 px, 24 px gutters (16 px on mobile).

### Components
- **Stat cards:** small muted label, large Fraunces number, trend chip. Breakdown by product (doctor / clinic / hospital). Founding spots card uses a marigold progress ring. Renewals due in 30 days card.
- **Tables:** sticky header, 52 px rows, hover sage; on mobile each row becomes a card (logo/photo, name, type · area, status badge).
- **Status badges:** Draft (grey), In review (marigold), Published (leaf), Suspended (clay). Founding = marigold star. Renewal due = clay dot.
- **Multi-step forms** (doctor and clinic/hospital): left vertical stepper with ticks on desktop; top progress bar "Step 3 of 10" on mobile; sticky bottom bar Back / Save draft / Next; autosave indicator.
- **Inputs:** 44 px, 10 px radius, labels above, helper text below, errors in clay.
- **Compliance scanner:** clay wavy underline on offending phrases, side panel listing issues with jump links; Publish disabled with an explanatory tooltip.
- **Timing editor:** 7 day rows, open/closed toggle, multiple slots, "Copy to all weekdays", "24×7" toggle for hospitals.
- **Photo upload:** drag/drop or camera, square crop for profile/logo, drag to reorder gallery.
- **Theme picker** (clinic/hospital): grid of specialty theme swatches with live mini-preview.
- **Google snippet preview:** realistic search-result preview, updates live.
- **Designs page:** rows for Doctor portfolio, Clinic site, Hospital site, Visiting card; 5 slot cards per row ("Coming soon" slots: dashed border + sage placeholder) + the specialty themes grid.
- **Empty states, skeletons, toasts** (bottom-centre mobile, top-right desktop).
- **Charts:** simple ink bars, marigold for the current month.

---

## 7. Classic doctor portfolio (default)

1. **Header:** circular photo with thin marigold ring; name (Fraunces H1); specialty · area, city; degrees; registration line (muted). Action row: Call · WhatsApp · Directions · Save contact (sticky bottom bar on mobile).
2. Intro sentence (factual, auto-generated) + short bio.
3. **Clinics:** card per clinic with type chip, address, map button, today's timings with Open now / Closed badge, expandable week, fee if shown. Clinic name links to the clinic's MediReach site if it has one.
4. Services and conditions as sage chips.
5. Qualifications timeline.
6. Awards and memberships (with awarding body and year).
7. Gallery (max 5), lightbox, captions.
8. Beyond medicine: interests chips.
9. Quick facts Q&A.
10. Other doctors nearby.
11. Footer strip: "Information provided by the doctor. Registration: {council} {number}" · "Website by MediReach".

## 8. Classic clinic and hospital sites (default layouts + themes)

**Clinic site (one long page with anchor nav):**
1. Header: logo or name, specialty category chip, area · city, primary actions (Call, WhatsApp, Directions); "Open now" badge.
2. Hero band in theme colours with the specialty line illustration and a one-line factual description.
3. About the clinic (factual).
4. Services (grouped as the theme defines) with short descriptions.
5. Our doctors: cards linking to each doctor's portfolio (or name + qualifications if no portfolio).
6. Timings (per day, multiple slots) + appointment note.
7. Facilities and equipment (factual list, no superiority claims).
8. Gallery (up to 8 photos of premises/equipment; no patients).
9. Location: map embed (lazy), address, landmarks, parking note.
10. Quick facts Q&A.
11. Footer: registration/licence line if provided, "Website by MediReach".

**Small hospital site** adds: sticky **24×7 emergency/contact bar**, departments grid, doctors by department, beds (number and types, factual), insurance/TPA and cashless list, facilities (lab, pharmacy, X-ray, OT, ICU if present), visiting hours, up to 12 photos.

## 9. Should we call them "templates"?

No. Publicly they are **"specialty designs"**: "Designs made for your specialty, personalised with your name, logo, colours, photos and details." That's accurate and not misleading, because each site *is* personalised. Two honesty rules:
- Never claim "custom-designed from scratch" or "unique design".
- The FAQ answers plainly: *"Will another clinic have the same design? Other clinics of your specialty may use the same design style, but your site carries your own name, logo, colours, photos, doctors and details. For a fully custom design, talk to us."*

Internally (code, dashboard), "template" and "theme" are fine.

## 10. Visiting cards (Classic)

- **Doctor card:** print 85 × 55 mm: name (Fraunces), specialty, degrees, primary clinic + area, phone; QR on the right with "Scan for timings and directions"; thin ink bar with the short URL/subdomain.
- **Clinic/hospital card:** logo, name, category, address, timings summary (or "24×7"), phone, QR; colours from the specialty theme.
- **Phone-share version** (1080 × 1920) for each: photo/logo top, name, details, large QR, short URL.
- Must print well in black and white.

## 11. Slots reserved for Phase 2 designs

- Doctor portfolio: 1 Classic (built) · 2 Clinic Modern · 3 Minimal Mono · 4 Warm Heritage · 5 Specialist Pro.
- Clinic site: 1 Classic (built) · 2 Bold Photo · 3 Calm Minimal · 4 Heritage (Ayurveda/Homeopathy friendly) · 5 Multi-doctor Grid.
- Hospital site: 1 Classic (built) · 2–5 reserved.
- Visiting card: 1 Classic (built) · 2 Ink Bold · 3 Minimal · 4 Heritage · 5 Photo Card.
