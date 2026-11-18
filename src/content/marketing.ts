/**
 * All marketing copy in one place (homepage, pricing, hospitals, designs, contact).
 * Rules (DESIGN_BRIEF.md §4): short sentences, no exclamation marks, no
 * superlatives or claims about MediReach either. A test runs every string
 * here through the NMC phrase scanner.
 *
 * Prices are never written here — they come from Settings.
 */

export type Audience = "doctor" | "clinic" | "hospital";

/** Hero (§4.2). The H1 is static (LCP); the audience switcher swaps the rest. */
export const HERO = {
  eyebrow: "Websites for doctors, clinics and small hospitals · Pune",
  title: "Patients search for you on Google. Make sure they find you.",
  /** The tail of `title` the hero sets in the accent style. */
  titleAccent: "Make sure they find you.",
  switcherLabel: "Show me websites for",
  audiences: {
    doctor: {
      label: "Doctor",
      sub: "A professional portfolio website + digital visiting card. Ready in 24 hours.",
      subdomain: "drname",
    },
    clinic: {
      label: "Clinic",
      sub: "A complete clinic website designed for your specialty, with your doctors, timings and location. Ready in 48 hours.",
      subdomain: "yourclinic",
    },
    hospital: {
      label: "Hospital",
      sub: "A full website for hospitals up to 10 beds: departments, doctors, facilities and 24×7 contact.",
      subdomain: "yourhospital",
    },
  } satisfies Record<Audience, { label: string; sub: string; subdomain: string }>,
  /** `{setup}` / `{renewal}` from Settings. */
  price: "{setup} one-time · {renewal}/year from year 2",
  primaryCta: "Get my website on WhatsApp",
  secondaryCta: "See sample designs",
  trust: "Digital visiting card included · Built for NMC advertising guidelines",
  chips: { open: "Open now", directions: "Get directions", save: "Save contact" },
};

/** Specialty marquee (§4.3): theme names come from the theme config. */
export const MARQUEE = { label: "Specialty designs" };

/** "Get found on Google" (§4.4). The illustration carries no search-engine branding. */
export const FOUND = {
  title: "When patients search, your website shows up",
  points: [
    { title: "Your name", text: "Patients who heard about you from a friend find your page, not someone else's listing." },
    { title: "Your area", text: "Each page names your area and city, so local searches can find you." },
    { title: "Your specialty", text: "Your specialty and services are written the way patients search for them." },
  ],
  note: "Results take time and no search position can be promised. We build every page the way search engines prefer.",
  caption: "Illustration",
  searchLabel: "Search",
  /** All fictional. */
  queries: [
    { q: "dr amit kulkarni kothrud", kind: "Doctor", title: "Dr. Amit Kulkarni – General Physician in Kothrud, Pune", url: "dr-amit-kulkarni.medireach.co.in", text: "MBBS, MD (Medicine). Clinic timings, directions and one-tap call." },
    { q: "skin clinic in baner", kind: "Clinic", title: "Sample Skin & Hair Clinic – Skin Clinic in Baner, Pune", url: "sampleskin.medireach.co.in", text: "Dermatology consultations, timings, doctors and directions." },
    { q: "hospital in wakad", kind: "Hospital", title: "Sample Care Hospital – 10-bed Hospital in Wakad, Pune", url: "samplecare.medireach.co.in", text: "Departments, doctors, facilities and 24×7 emergency contact." },
  ],
};

/** Three products (§4.5). `setup` / `renewal` name Settings price keys. */
export const PRODUCTS_COPY = {
  eyebrow: "Three products",
  title: "Pick the website that fits your practice",
  ribbon: "Every plan includes a digital visiting card",
  seeSample: "See sample",
  items: [
    {
      key: "doctor" as const,
      setup: "doctorSetup" as const,
      renewal: "renewalDoctor" as const,
      name: "Doctor portfolio",
      purpose: "A one-page website for an individual doctor.",
      href: "/sample/gp",
      inclusions: ["Profile, qualifications and registration", "Clinics and timings", "Services you offer", "Map and one-tap directions", "Up to 5 photos"],
    },
    {
      key: "clinic" as const,
      setup: "clinicSetup" as const,
      renewal: "renewalClinic" as const,
      name: "Clinic website",
      purpose: "For single or multi-doctor clinics, in a design made for your specialty.",
      href: "/designs",
      inclusions: ["Clinic profile and your doctors", "Services and facilities", "Timings and map", "Specialty design and colours", "Up to 8 photos"],
    },
    {
      key: "hospital" as const,
      setup: "hospitalSetup" as const,
      renewal: "renewalHospital" as const,
      name: "Small hospital website",
      purpose: "For hospitals up to 10 beds.",
      href: "/designs/small-hospital",
      inclusions: ["Departments and doctors by department", "Facilities and beds", "Insurance/TPA list", "24×7 contact bar", "Up to 12 photos"],
    },
  ],
  setupLabel: "setup",
  /** `{renewal}` from Settings. */
  renewal: "then {renewal}/year from year 2",
};

/** Specialty designs on the homepage (§4.6); the theme points come from the theme config. */
export const HOME_DESIGNS = {
  title: "Designs made for your specialty",
  text: "Each one is personalised with your name, logo, colours, photos and details.",
  filterLabel: "Choose a specialty",
  builtFor: "Built for this specialty",
  colours: "Colours",
  view: "View sample",
  all: "See all designs",
  badge: "Sample",
};

/** Visiting card spotlight (§4.7). */
export const CARD_SPOTLIGHT = {
  eyebrow: "Included in every plan",
  title: "A visiting card you never need to reprint",
  points: [
    "Scan to save contact",
    "One-tap call, WhatsApp and directions",
    "Update timings anytime",
    "Share on WhatsApp in one tap",
    "Print-ready version included",
  ],
  flipHint: "Tap the card to flip it",
  back: { scan: "Scan to save contact", sub: "Timings, directions and one-tap call" },
  chat: { message: "Here is my visiting card", sent: "Sent" },
};

export const HOW_IT_WORKS = {
  title: "How it works",
  steps: [
    { title: "Share your details", text: "Send them on WhatsApp, or fill a 10-minute form." },
    { title: "We design it in 24–48 hours", text: "We write and design your website and visiting card. You check everything first." },
    { title: "Approve, share, update", text: "Share your link and QR code. Update timings yourself anytime." },
  ],
};

export const NMC = {
  title: "Built for the NMC Guidelines on Ethical Advertising (6 Oct 2026)",
  points: [
    { title: "Factual information only", text: "Qualifications, registration, services, timings and location. Nothing else." },
    { title: "No testimonials, ratings or before/after photos", text: "Sites never show patient reviews, stars, “success stories” or before/after photos." },
    { title: "No superlative claims", text: "Every line is checked for words the guidelines don't allow before it goes live." },
  ],
  note: "Also suitable for dental, Ayurveda, homeopathy and physiotherapy councils' rules.",
};

/**
 * Three products, every one with a digital visiting card. `setup` / `renewal`
 * name the Settings price keys; prices are never written here.
 */
export const PRICING = {
  title: "Simple pricing: setup once, renewal from year 2",
  ribbon: "Every plan includes a digital visiting card",
  plans: [
    {
      key: "doctor" as const,
      setup: "doctorSetup" as const,
      renewal: "renewalDoctor" as const,
      name: "Doctor portfolio",
      audience: "A one-page website for an individual doctor",
      features: [
        "Profile, qualifications and registration",
        "Clinics, timings, map and directions",
        "Services and conditions you treat",
        "Up to 5 photos",
        "Digital visiting card with QR code",
      ],
    },
    {
      key: "clinic" as const,
      setup: "clinicSetup" as const,
      renewal: "renewalClinic" as const,
      featured: true,
      name: "Clinic website",
      tag: "Specialty designs",
      audience: "For single or multi-doctor clinics",
      features: [
        "Clinic profile and your doctors",
        "Services, facilities and equipment",
        "Timings and map",
        "Design made for your specialty",
        "Up to 8 photos",
        "Digital visiting card with QR code",
      ],
    },
    {
      key: "hospital" as const,
      setup: "hospitalSetup" as const,
      renewal: "renewalHospital" as const,
      name: "Small hospital website",
      audience: "For hospitals up to 10 beds",
      features: [
        "Departments and doctors by department",
        "Facilities, beds and insurance/TPA list",
        "24×7 contact bar",
        "Up to 12 photos",
        "Digital visiting card with QR code",
      ],
    },
  ],
  cta: "Get started",
  setupLabel: "setup",
  /** `{renewal}` = yearly renewal price. */
  renewalLine: "then {renewal}/year from year 2",
  foundingLabel: "Founding offer",
  /** `{total}` = Founding total, `{founding}` / `{foundingHospital}` = lifetime renewal prices. */
  founding: "First {total} customers: renewal at {founding}/year for life ({foundingHospital} for hospitals).",
  foundingLeft: "{n} spots left",
  /** `{addon}`, `{update}` = prices, `{gst}` = incl./excl. GST note. */
  notes: "Add your clinic's doctors: {addon} per doctor portfolio · Own domain at actual cost · Done-for-you updates {update} · {gst}",
};

/** /pricing. Prices come from Settings; `{…}` placeholders are filled on the page. */
export const PRICING_PAGE = {
  eyebrow: "Pricing",
  title: "Setup once. Renewal from year 2.",
  /** `{from}` = lowest setup price. */
  intro: "From {from} setup, with a digital visiting card in every plan. Your content always stays yours.",
  renewalTitle: "What the yearly renewal covers",
  renewalCovers: [
    "Hosting on medireach.co.in, with your own short link and subdomain",
    "Security and software updates",
    "Changes you make yourself after logging in: timings, phone numbers, address and fees",
    "Your listing on the city, area and specialty pages",
    "Your digital visiting card link and QR code",
  ],
  extrasTitle: "Paid separately, only if you want them",
  /** `{update}` = done-for-you update price. */
  extras: [
    "Done-for-you updates: {update} per request",
    "Your own domain (for example drname.in): at what the domain costs",
  ],
  doctorsTitle: "Clinics and hospitals with several doctors",
  /** `{addon}` = per-doctor portfolio price, `{renewal}` = doctor renewal. */
  doctorsText:
    "Your clinic or hospital website lists all your doctors. Each doctor can also get a portfolio page and visiting card for {addon} setup, then {renewal} a year, linked to your site.",
  lapseTitle: "If a renewal is late",
  /** `{days}` = grace period from Settings. */
  lapseText:
    "We remind you 30 days and 7 days before the renewal date, and on the day. Your site stays live for {days} days after it. After that it is not deleted: it shows a short notice with our contact, and paying restores it at once.",
  faqTitle: "Pricing questions",
  formTitle: "Want us to call you?",
};

/** /for-clinics. */
export const FOR_CLINICS = {
  eyebrow: "For clinics",
  title: "A website for your clinic, designed for your specialty",
  text: "Your clinic's doctors, services, timings and location on one site patients can find on Google. Ready in 48 hours, with a digital visiting card for the clinic.",
  /** `{setup}` / `{renewal}` from Settings. */
  price: "{setup} setup · {renewal}/year from year 2",
  primaryCta: "Talk to us on WhatsApp",
  secondaryCta: "See specialty designs",
  includedTitle: "What your clinic website includes",
  included: [
    { title: "Clinic profile", text: "Name, logo, registration, about and the languages you speak." },
    { title: "Your doctors", text: "Every doctor with qualifications and timings, linked to their own portfolio if they have one." },
    { title: "Services and facilities", text: "Grouped the way your specialty works, written in plain words." },
    { title: "Timings and location", text: "Weekly timings with “Open now”, a map and one-tap directions." },
    { title: "Up to 8 photos", text: "Reception, consultation and procedure rooms, equipment. No patient photos." },
    { title: "Digital visiting card", text: "A print-ready card and a phone version with a QR code to your site." },
  ],
  designsTitle: "Pick the design made for your specialty",
  designsText: "Each one is personalised with your name, logo, colours, photos and details.",
  whatsapp: "Hi, I'd like a MediReach website for my clinic.",
  faqTitle: "Questions clinics ask",
  formTitle: "Tell us about your clinic",
};

/** /for-hospitals (was /hospitals). */
export const FOR_HOSPITALS = {
  eyebrow: "For small hospitals",
  title: "A complete website for hospitals up to 10 beds",
  text: "Departments, doctors, facilities, beds and a 24×7 contact bar on one site patients and their families can find quickly.",
  price: "{setup} setup · {renewal}/year from year 2",
  primaryCta: "Talk to us on WhatsApp",
  secondaryCta: "See the hospital design",
  includedTitle: "What your hospital website includes",
  included: [
    { title: "24×7 contact bar", text: "Your emergency number at the top of every screen, with one-tap call." },
    { title: "Departments", text: "Each department with its services and the doctors who work in it." },
    { title: "Doctors by department", text: "Resident doctors and visiting consultants, with their days and timings." },
    { title: "Facilities and beds", text: "Bed types and counts, ICU, OT, lab, pharmacy and other facilities." },
    { title: "Insurance and TPA list", text: "The insurers and TPAs you work with, so families can check before they come." },
    { title: "Up to 12 photos", text: "Building, reception, wards and equipment. No patient photos." },
  ],
  consultantsTitle: "A portfolio for every visiting consultant",
  /** `{addon}` = per-doctor portfolio price. */
  consultantsText:
    "Each consultant can also get a portfolio page and visiting card for {addon}, showing their days at your hospital and linked to your site. Patients find the right doctor, and your front desk gets fewer calls.",
  whatsapp: "Hi, I'd like a MediReach website for our hospital.",
  faqTitle: "Questions hospitals ask",
  faq: [
    {
      q: "We have more than 10 beds. Can we still use this?",
      a: "This plan is made for hospitals up to 10 beds. For larger hospitals, talk to us and we will tell you what we can do.",
    },
    {
      q: "Can we list visiting consultants?",
      a: "Yes. Each doctor appears under their department with their days and timings. Consultants can also get their own portfolio page and visiting card.",
    },
    {
      q: "Who updates the site when schedules change?",
      a: "You can change timings and phone numbers yourself after logging in. For other changes, message us and our team makes them.",
    },
  ],
  formTitle: "Tell us about your hospital",
};


/** Multi-doctor clinics and hospitals band (§4.11). */
export const MULTI_DOCTOR = {
  title: "One website for your clinic, a portfolio for every doctor.",
  text: "Your clinic site lists every doctor. Each doctor can also have a portfolio page and visiting card, linked both ways.",
  clinic: "Your clinic website",
  doctors: ["Dr. A. Sample", "Dr. B. Sample", "Dr. C. Sample"],
  doctorRole: "Portfolio + card",
  cta: "Talk to us",
};

/** Sample sites gallery (§4.12). */
export const GALLERY = {
  title: "Sample sites",
  text: "Every name and detail on these samples is made up.",
  badge: "Sample",
  open: "Open sample",
  doctors: [
    { key: "gp" as const, label: "General physician", href: "/sample/gp" },
    { key: "consultant" as const, label: "Consultant cardiologist", href: "/sample/consultant" },
  ],
  /** Theme keys of the clinic and hospital samples shown (4 clinics, 1 hospital). */
  sites: ["general-opd", "skin", "dental", "eye", "small-hospital"] as const,
};

export const FAQ = {
  title: "Questions doctors and clinics ask",
  items: [
    {
      q: "Is this allowed under NMC rules?",
      a: "Yes. Sites show factual information only: qualifications, registration, services, timings and location. There are no reviews, ratings, testimonials, before/after photos or claims, and every line is checked before it goes live.",
    },
    {
      q: "Do I have to pay every year?",
      a: "You pay the setup price once. From the second year there is a yearly renewal, which covers hosting, security and the updates you make yourself. The first customers get a lower renewal price for life.",
    },
    {
      q: "Can I use my own domain?",
      a: "Yes. We buy and connect it for you, and you pay only what the domain costs. Your MediReach address keeps working too.",
    },
    {
      q: "How do I change timings?",
      a: "Use the login link at the bottom of your site to change timings, phone numbers and fees yourself. For anything else, message us and our team makes the change.",
    },
    {
      q: "Will another clinic have the same design?",
      a: "Other clinics of your specialty may use the same design style, but your site carries your own name, logo, colours, photos, doctors and details. For a fully custom design, talk to us.",
    },
    {
      q: "What's included in the visiting card?",
      a: "A phone version to share on WhatsApp and a print-ready version. Its QR code opens your site, where patients can save your contact, call, message or get directions. When your timings change, the card's link shows the new timings.",
    },
    {
      q: "Who owns my content?",
      a: "You do. Your text and photos stay yours, and you can ask us to remove your site at any time.",
    },
    {
      q: "We have 4 doctors; how does it work?",
      a: "Choose the clinic website: one site lists all four doctors with their timings and services. Each doctor can also get a portfolio page and visiting card at the add-on price, linked to the clinic site.",
    },
  ],
};

export const FINAL_CTA = {
  /** `titleAccent` is underlined when it scrolls into view. */
  title: "Get your website live this week.",
  titleAccent: "this week",
  whatsapp: "Message us on WhatsApp",
  /** `{phone}` from Settings. */
  call: "or call {phone}",
  formTitle: "Or leave your number and we'll call you",
};

export const FOOTER = {
  line: "A Sym HealthTech product, Pune",
  columns: [
    {
      title: "Products",
      links: [
        { href: "/#doctor", label: "Doctors" },
        { href: "/for-clinics", label: "Clinics" },
        { href: "/for-hospitals", label: "Hospitals" },
        { href: "/#visiting-card", label: "Visiting card" },
        { href: "/designs", label: "Specialty designs" },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "/pricing", label: "Pricing" },
        { href: "/contact", label: "Contact" },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: "/terms", label: "Terms" },
        { href: "/privacy", label: "Privacy" },
      ],
    },
  ],
};

/** Top bar (§4.1). "Doctors" opens the homepage hero on the Doctor tab. */
export const NAV = [
  { href: "/#doctor", label: "Doctors" },
  { href: "/for-clinics", label: "Clinics" },
  { href: "/for-hospitals", label: "Hospitals" },
  { href: "/designs", label: "Designs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Login" },
];

/** Header button: opens the call-back dialog. */
export const GET_STARTED = "Get started";
/** The "Request a call back" dialog (header + hero). */
export const CALLBACK = {
  cta: "Request a call back",
  title: "We'll call you back",
  text: "Leave your name and number. Our team will call you within one working day and collect your details.",
};

/** Pre-filled WhatsApp messages, per placement. */
export const WHATSAPP_TEXT = {
  default: "Hi, I'd like a MediReach page for my clinic.",
  hospital: "Hi, I'd like to talk about a MediReach website for our hospital or clinic.",
  pricing: "Hi, I'd like to know more about MediReach pricing.",
};

/** Public specialty design gallery (/designs). Publicly these are "specialty designs", never "templates". */
export const DESIGNS = {
  eyebrow: "Specialty designs",
  title: "Designs made for your specialty",
  text: "Each one is personalised with your name, logo, colours, photos and details. Open a sample to see the full site.",
  view: "View sample",
  sampleBadge: "Sample",
  sampleBar: "Sample site · {theme} design · every name and detail here is made up",
  backToAll: "All designs",
  cta: "Get this design",
  /** `{theme}` = theme name. */
  whatsapp: "Hi, I'd like a MediReach website in the {theme} design.",
  faq: {
    q: "Will another clinic have the same design?",
    a: "Other clinics of your specialty may use the same design style, but your site carries your own name, logo, colours, photos, doctors and details. For a fully custom design, talk to us.",
  },
};

/** Every user-visible string above (for the NMC scanner test). */
export function allMarketingCopy(): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk([HERO, MARQUEE, FOUND, PRODUCTS_COPY, HOME_DESIGNS, CARD_SPOTLIGHT, HOW_IT_WORKS, NMC, PRICING, PRICING_PAGE, FOR_CLINICS, FOR_HOSPITALS, MULTI_DOCTOR, GALLERY, FAQ, FINAL_CTA, FOOTER, NAV, GET_STARTED, CALLBACK, WHATSAPP_TEXT, DESIGNS]);
  return out;
}
