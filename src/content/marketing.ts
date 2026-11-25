/**
 * All marketing copy in one place (homepage, pricing, hospitals, designs, contact).
 * Rules (DESIGN_BRIEF.md §4): short sentences, no exclamation marks, no
 * superlatives or claims about MediReach either. A test runs every string
 * here through the NMC phrase scanner.
 *
 * Prices are never written here — they come from Settings.
 */

export type Audience = "doctor" | "clinic" | "hospital";

/**
 * Hero (§4.2): a static H1, then a three-slide carousel (Doctor · Clinic ·
 * Hospital), each with its own tagline, one line and its price.
 */
export const HERO = {
  h1: "Websites for doctors, clinics and small hospitals in Pune",
  carouselLabel: "Websites for",
  audiences: {
    doctor: {
      label: "Doctor",
      tagline: "Your own website, ready in 24 hours.",
      sub: "A portfolio website and digital visiting card for individual doctors.",
      subdomain: "drname",
    },
    clinic: {
      label: "Clinic",
      tagline: "Your clinic, easy to find on any phone.",
      sub: "A website in a design made for your specialty, with your doctors, timings and map.",
      subdomain: "yourclinic",
    },
    hospital: {
      label: "Hospital",
      tagline: "Every department, one clear website.",
      sub: "Departments, doctors, facilities and 24×7 contact, for hospitals up to 10 beds.",
      subdomain: "yourhospital",
    },
  } satisfies Record<Audience, { label: string; tagline: string; sub: string; subdomain: string }>,
  /** `{setup}` / `{renewal}` from Settings. */
  price: "{setup} one-time · {renewal}/year from year 2",
  primaryCta: "Get my website on WhatsApp",
  secondaryCta: "See sample designs",
  /** Short reassurance row under the buttons. */
  trust: ["Built for NMC guidelines", "Digital visiting card included", "Easy to use on any phone"],
  pause: "Pause slides",
  play: "Play slides",
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

/** Specialty designs on the homepage (§4.6); the theme points come from the theme config. */
export const HOME_DESIGNS = {
  title: "Designs made for your specialty",
  text: "Each one is personalised with your name, logo, colours, photos and details.",
  filterLabel: "Choose a specialty",
  builtFor: "Built for this specialty",
  /** Added to every specialty's list. */
  doctors: "Doctor profiles with qualifications and timings",
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
    "Update everything yourself, anytime",
    "Share on WhatsApp in one tap",
    "Print-ready version included",
  ],
  flipHint: "Tap the card to flip it",
  back: { scan: "Scan to save contact", sub: "Timings, directions and one-tap call" },
  /** Labels on the two previews. */
  digitalLabel: "Digital card: opens on any phone",
  printLabel: "Print card",
  /** Link to /visiting-cards. */
  allStyles: "See all 15 card styles",
};

/** Visiting card gallery (/visiting-cards): five colour styles per audience, each with a code name. */
export const VISITING_CARDS = {
  eyebrow: "Digital visiting cards",
  title: "Pick the visiting card you like",
  text: "Five colour styles each for doctors, clinics and hospitals. Every style has a code name: tell us the code when you ask for your website, and we link the card to it.",
  steps: [
    { title: "Pick a style", text: "Look through the cards below and note the code name, like DOC-AMBER." },
    { title: "Send us the code", text: "Open a card with “View full card” and tap “Choose this card”, or mention the code on WhatsApp with your website request." },
    { title: "We link it to your website", text: "Your card gets your own name, photo or logo and contact details. Its QR code opens your website." },
  ],
  jumpLabel: "Show cards for",
  groups: {
    doctor: { tab: "Doctors", title: "Visiting cards for doctors", text: "With your photo, specialty, qualifications, clinic and timings." },
    clinic: { tab: "Clinics", title: "Visiting cards for clinics", text: "With your logo, clinic type, timings and address." },
    hospital: { tab: "Hospitals", title: "Visiting cards for hospitals", text: "With your logo, emergency number, timings and address." },
  },
  codeLabel: "Code name",
  copy: "Copy code",
  copied: "Copied",
  view: "View full card",
  close: "Close",
  choose: "Choose this card",
  phoneLabel: "Phone card",
  printLabel: "Print card",
  sampleNote: "Sample details. Your card shows your own name, photo or logo and contact details.",
  included: {
    title: "Every card comes with",
    points: ["A card link to share on WhatsApp", "A phone image for WhatsApp status", "A print-ready PDF (85 × 55 mm)", "A QR code that opens your website", "One-tap call and directions"],
  },
  faq: [
    { q: "Is the visiting card extra?", a: "No. A digital visiting card is included in every plan." },
    { q: "Can I change the colours later?", a: "Yes. Send us another code name and we switch it. Your card link and QR code stay the same." },
    { q: "Can a clinic use a hospital style?", a: "Yes. Clinic and hospital cards share the same layout, so either set of styles works." },
  ],
  help: "Not sure which one? Ask us on WhatsApp",
  helpText: "Hi, I need help choosing a MediReach visiting card.",
};

export const HOW_IT_WORKS = {
  title: "How it works",
  steps: [
    { title: "Share your details", text: "Send them on WhatsApp, or fill a 10-minute form." },
    { title: "We design it in 24–48 hours", text: "We write and design your website and visiting card. You check everything first." },
    { title: "Approve, share, update", text: "Share your link and QR code. Update everything on your website yourself, anytime." },
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
  sub: "No monthly fees. Every plan includes a digital visiting card.",
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
  /** `{update}` = price. */
  notes: "Own domain at actual cost · Done-for-you updates {update}",
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
    "Full update access: change everything on your website yourself after logging in, as often as you like",
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

/** /for-doctors. */
export const FOR_DOCTORS = {
  eyebrow: "For doctors",
  title: "Your own website and visiting card, ready in 24 hours",
  text: "A portfolio page with your qualifications, registration, clinics and timings, that patients can find on Google and open on any phone.",
  /** `{setup}` / `{renewal}` from Settings. */
  price: "{setup} setup · {renewal}/year from year 2",
  primaryCta: "Talk to us on WhatsApp",
  secondaryCta: "See portfolio website designs",
  includedTitle: "What your portfolio website includes",
  included: [
    { title: "Profile and qualifications", text: "Your photo, degrees, registration number and the languages you speak." },
    { title: "Clinics and timings", text: "Every clinic or hospital where you consult, with its days, timings and fees." },
    { title: "Map and directions", text: "One-tap call, WhatsApp and directions for each place you see patients." },
    { title: "Services and conditions", text: "What you treat, written in plain words, the way patients search for it." },
    { title: "Up to 5 photos", text: "Your clinic, consultation room and equipment. No patient photos." },
    { title: "Your own address", text: "A short link like drname.medireach.co.in, or your own domain at actual cost." },
  ],
  linkedTitle: "Already at a clinic or hospital?",
  /** `{addon}` = per-doctor portfolio price. */
  linkedText:
    "If your clinic or hospital has a MediReach website, your portfolio links to it and it links back to you. Doctors joining through their clinic or hospital pay the add-on price of {addon}.",
  whatsapp: "Hi, I'd like a MediReach portfolio website for myself.",
  faqTitle: "Questions doctors ask",
  formTitle: "Tell us about your practice",
};

/** /for-clinics. */
export const FOR_CLINICS = {
  eyebrow: "For clinics",
  title: "A website for your clinic, designed for your specialty",
  text: "Your clinic's doctors, services, timings and location on one site patients can find on Google. Ready in 48 hours, with a digital visiting card for the clinic.",
  /** `{setup}` / `{renewal}` from Settings. */
  price: "{setup} setup · {renewal}/year from year 2",
  primaryCta: "Talk to us on WhatsApp",
  secondaryCta: "See clinic website designs",
  includedTitle: "What your clinic website includes",
  included: [
    { title: "Clinic profile", text: "Name, logo, registration, about and the languages you speak." },
    { title: "Your doctors", text: "Every doctor with qualifications and timings, linked to their own portfolio if they have one." },
    { title: "Services and facilities", text: "Grouped the way your specialty works, written in plain words." },
    { title: "Timings and location", text: "Weekly timings with “Open now”, a map and one-tap directions." },
    { title: "Up to 8 photos", text: "Reception, consultation and procedure rooms, equipment. No patient photos." },
    { title: "Digital visiting card", text: "A print-ready card and a phone version with a QR code to your site." },
  ],
  whatsapp: "Hi, I'd like a MediReach website for my clinic.",
  faqTitle: "Questions clinics ask",
  formTitle: "Tell us about your clinic",
};

/**
 * "Pick your designs" on the three product pages (#designs): the website
 * designs and visiting cards of that audience, each with View and Select (the
 * same pickers as the website form), then start the form with them filled in.
 */
export const PICK_DESIGNS = {
  title: {
    doctor: "Pick your website design and visiting card",
    clinic: "Pick your clinic's website design and visiting card",
    hospital: "Pick your hospital's website design and visiting card",
  },
  text: {
    doctor: "Open a design to see a full sample portfolio website on a computer or a phone. Pick one of each and your form starts with them filled in.",
    clinic: "Choose your type of clinic to see the designs made for it, then open one to see a full sample website. Pick one of each and your form starts with them filled in.",
    hospital: "Choose your type of hospital to see the designs made for it, then open one to see a full sample website. Pick one of each and your form starts with them filled in.",
  },
  website: { doctor: "Portfolio website design", clinic: "Clinic website design", hospital: "Hospital website design" },
  websiteText: "Personalised with your own name, photo or logo, colours and details.",
  card: "Visiting card",
  cardText: "Share it on WhatsApp or print it. The QR code opens your website, so patients always see your current timings.",
  yourPicks: "Your picks",
  yourPick: "Your pick",
  designLabel: "Website",
  cardLabel: "Card",
  notPicked: "Not picked yet",
  start: "Start my form with these",
  startDesign: "Start my form with this design",
  startEmpty: "Start my website form",
  whatsapp: "Send my picks on WhatsApp",
  whatsappDesign: "Send it on WhatsApp",
  /** `{what}` = the product; `{design}` / `{card}` = the picks. */
  whatsappText: "Hi, I'd like a MediReach {what}. Website design: {design}. Visiting card: {card}.",
  whatsappTextDesign: "Hi, I'd like a MediReach {what}. Website design: {design}.",
  whatsappWhat: { doctor: "portfolio website", clinic: "website for my clinic", hospital: "website for our hospital" },
  undecided: "not decided yet",
  note: "Not sure yet? Leave it for now. You can pick in the form, or we'll help you choose.",
  allCards: "All visiting card styles",
};

/** /for-hospitals (was /hospitals). */
export const FOR_HOSPITALS = {
  eyebrow: "For small hospitals",
  title: "A complete website for hospitals up to 10 beds",
  text: "Departments, doctors, facilities, beds and a 24×7 contact bar on one site patients and their families can find quickly.",
  price: "{setup} setup · {renewal}/year from year 2",
  primaryCta: "Talk to us on WhatsApp",
  secondaryCta: "See hospital website designs",
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
      a: "You do. Doctors, clinics and hospitals get full update access: log in and change anything on your website yourself, from timings and phone numbers to photos, services, doctors and design. Prefer us to do it? Message us and our team makes the change.",
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

export const FAQ = {
  title: "Questions doctors and clinics ask",
  items: [
    {
      q: "Is this allowed under NMC rules?",
      a: "Yes. Sites show factual information only: qualifications, registration, services, timings and location. There are no reviews, ratings, testimonials, before/after photos or claims, and every line is checked before it goes live.",
    },
    {
      q: "Do I have to pay every year?",
      a: "You pay the setup price once. From the second year there is a yearly renewal, which covers hosting, security and the updates you make yourself.",
    },
    {
      q: "Can I use my own domain?",
      a: "Yes. We buy and connect it for you, and you pay only what the domain costs. Your MediReach address keeps working too.",
    },
    {
      q: "How do I change my website?",
      a: "Use the login link at the bottom of your site. You get full update access: details, photos, services, clinics or doctors, timings, fees and design. Only your page address and website UID stay fixed. Prefer us to do it? Message us and our team makes the change.",
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
  /** Links to the number from Settings; the number itself is never printed. */
  call: "or call us",
  formTitle: "Or leave your number and we'll call you",
};

export const FOOTER = {
  line: "A Sym HealthTech product, Pune",
  columns: [
    {
      title: "Products",
      links: [
        { href: "/for-doctors", label: "Doctors" },
        { href: "/for-clinics", label: "Clinics" },
        { href: "/for-hospitals", label: "Hospitals" },
        { href: "/visiting-cards", label: "Visiting cards" },
        { href: "/designs", label: "Website designs" },
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

/** Top bar (§4.1). */
export const NAV = [
  { href: "/for-doctors", label: "Doctors" },
  { href: "/for-clinics", label: "Clinics" },
  { href: "/for-hospitals", label: "Hospitals" },
  { href: "/visiting-cards", label: "Visiting cards" },
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Login" },
];

/** Header button: opens the "Get started" options dialog. */
export const GET_STARTED = "Get started";
/** The "Request a call back" dialog (header + hero). */
export const CALLBACK = {
  cta: "Request a call back",
  title: "We'll call you back",
  text: "Leave your name and number. Our team will call you within one working day and collect your details.",
};

/**
 * "Get started" (header): choose a self-fill website form or a WhatsApp
 * enquiry. The forms live at /get-started/{doctor|clinic|hospital}.
 */
export const GET_STARTED_DIALOG = {
  title: "How would you like to start?",
  text: "Busy right now? Fill in your details in your own time, or send us a message on WhatsApp.",
  options: {
    doctor: { title: "Doctor website", text: "For an individual doctor: portfolio website and visiting card." },
    clinic: { title: "Clinic website", text: "For single or multi-doctor clinics." },
    hospital: { title: "Hospital website", text: "For small hospitals up to 10 beds." },
    whatsapp: { title: "WhatsApp enquiry", text: "Ask us anything. We reply on WhatsApp." },
  },
  formNote: "About 10 minutes. Save anytime and finish later with the same email.",
  continue: "Already started a form?",
  continueLink: "Continue with your email",
  whatsappText: "Hi, I have a question about a MediReach website.",
};

/** Pre-filled WhatsApp messages, per placement. */
export const WHATSAPP_TEXT = {
  default: "Hi, I'd like a MediReach page for my clinic.",
  hospital: "Hi, I'd like to talk about a MediReach website for our hospital or clinic.",
  pricing: "Hi, I'd like to know more about MediReach pricing.",
};

/**
 * Public design gallery (/designs): doctors, clinics or hospitals (tabs), then
 * the type and its designs, as in the website form. Publicly these are
 * "designs", never "templates".
 */
export const DESIGNS = {
  eyebrow: "Website designs",
  title: "Designs made for your specialty",
  text: "Choose who the website is for and your specialty, then open a design to see a full sample website. Each one is personalised with your own name, logo, colours, photos and details.",
  tabsLabel: "Designs for",
  tabs: { doctor: "Doctors", clinic: "Clinics", hospital: "Hospitals" },
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
  walk([HERO, MARQUEE, FOUND, HOME_DESIGNS, CARD_SPOTLIGHT, HOW_IT_WORKS, NMC, PRICING, PRICING_PAGE, FOR_DOCTORS, FOR_CLINICS, FOR_HOSPITALS, MULTI_DOCTOR, FAQ, FINAL_CTA, FOOTER, NAV, GET_STARTED, GET_STARTED_DIALOG, CALLBACK, WHATSAPP_TEXT, DESIGNS, VISITING_CARDS]);
  return out;
}
