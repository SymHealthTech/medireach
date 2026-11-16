/**
 * All marketing copy in one place (homepage, pricing, hospitals, contact).
 * Rules (DESIGN_BRIEF.md §3): short sentences, no exclamation marks, no
 * superlatives or claims about MediReach either. A test runs every string
 * here through the NMC phrase scanner.
 *
 * Prices are never written here — they come from Settings.
 */

export const HERO = {
  eyebrow: "For doctors in Pune",
  title: "Your patients search your name. Make sure they find you.",
  /** The tail of `title` the hero sets in the accent style. */
  titleAccent: "Make sure they find you.",
  /** `{price}` is replaced with the GP plan price from Settings. */
  sub: "A professional one-page website and digital visiting card. Ready in 24 hours. {price}, one time.",
  primaryCta: "Request a call back",
  secondaryCta: "See a sample page",
  trust: "Built for the new NMC advertising guidelines",
};

export const PROBLEMS = {
  eyebrow: "Sound familiar?",
  title: "The problem",
  items: [
    { icon: "search", text: "Google search shows nothing, or someone else's listing." },
    { icon: "phone", text: "Patients keep calling to ask for your timings." },
    { icon: "card", text: "Your printed card can't be updated." },
  ],
} as const;

export const WHAT_YOU_GET = {
  title: "What you get",
  items: [
    "Your own page that shows up when patients search your name",
    "Visiting card with a QR code, ready to print and share",
    "Map and one-tap directions to every clinic",
    "Timings for each clinic, with “Open now”",
    "Services and conditions you treat",
    "Up to 5 photos of your clinic and team",
    "Awards and memberships",
    "Update timings, phone and fees yourself",
  ],
  urlExample: "medireach.co.in/pune/doctor/dr-…",
};

export const HOW_IT_WORKS = {
  title: "How it works",
  steps: [
    { title: "Share details", text: "Send your details and photo on WhatsApp, or meet our team at your clinic." },
    { title: "We build in 24 hours", text: "We write and design your page and card. You check everything before it goes live." },
    { title: "Approve, share, update anytime", text: "Share your link and QR code. Change timings and fees whenever you need." },
  ],
};

export const NMC = {
  title: "Built for the new NMC rules",
  points: [
    { title: "Factual information only", text: "Qualifications, registration, clinics, timings and services. Nothing else." },
    { title: "No testimonials or ratings", text: "Your page never shows patient reviews, stars or “success stories”." },
    { title: "No superlative claims", text: "Every line is checked for words the guidelines don't allow before it goes live." },
  ],
  note: "Guidelines on Ethical Advertising, 6 Oct 2026",
};

export const PRICING = {
  title: "Simple, one-time pricing",
  plans: [
    {
      key: "gp" as const,
      name: "GP",
      audience: "For family doctors and general physicians",
      features: [
        "One-page website with your own address",
        "Visiting card with QR code (print and phone)",
        "Clinics, timings, map and directions",
        "Services, photos, awards and memberships",
        "Listed on your area and specialty pages",
        "Your first update free",
      ],
    },
    {
      key: "consultant" as const,
      name: "Consultant",
      tag: "For specialists",
      audience: "For specialists who visit more than one hospital",
      features: [
        "Everything in GP",
        "Separate schedules for each hospital you visit",
        "Qualifications, fellowships and publications",
        "Listed under each of your specialties",
        "Your first update free",
      ],
    },
  ],
  cta: "Get started",
  /** `{n}` = spots left, `{total}` = Founding total. */
  founding: "First {total} doctors get free hosting forever.",
  foundingLeft: "{n} spots left",
  /** `{update}` = update price, `{gst}` = incl./excl. GST note. */
  notes: "Own domain at actual cost · Done-for-you updates {update} · {gst}",
};

export const HOSPITALS = {
  title: "Give every visiting consultant a professional page",
  text: "One page for each consultant, with their days at your hospital. Patients find the right doctor, and your front desk gets fewer calls.",
  cta: "Talk to us",
  points: [
    "A page and visiting card for every consultant",
    "Each doctor's days and timings at your hospital",
    "One bulk price for the hospital",
    "We handle updates when schedules change",
  ],
};

export const SAMPLES = {
  title: "See a sample page",
  text: "Two example doctors. The names and details are made up.",
  items: [
    { key: "gp" as const, label: "General physician", href: "/sample/gp" },
    { key: "consultant" as const, label: "Consultant cardiologist", href: "/sample/consultant" },
  ],
  badge: "Sample",
  open: "Open sample",
};

export const FAQ = {
  title: "Questions doctors ask",
  items: [
    {
      q: "How long does it take?",
      a: "Your page and card are ready within 24 hours of getting your details. We send you a preview to approve before it goes live.",
    },
    {
      q: "Will my page show up on Google?",
      a: "Each page is built to be found when patients search your name, your name and area, or your name and specialty. Google decides rankings, so we can't promise a position, but we follow its guidelines closely.",
    },
    {
      q: "Is this allowed under the NMC rules?",
      a: "Yes. The page shows factual information only: qualifications, registration, clinics, timings and services. There are no reviews, ratings or claims, and every line is checked before it goes live.",
    },
    {
      q: "Can I change my timings later?",
      a: "Yes. Use the “Doctor login” link at the bottom of your page to change timings, phone numbers, address and fees yourself. For anything else, our team makes the change for you.",
    },
    {
      q: "What does “free hosting forever” mean?",
      a: "For the first Founding Doctors, we never charge a yearly hosting fee for your page. It applies to the page and card on medireach.co.in.",
    },
    {
      q: "Can I use my own domain, like drname.in?",
      a: "Yes. We buy and connect it for you, and you pay only what the domain costs.",
    },
    {
      q: "Who owns the content?",
      a: "You do. Your text and photos stay yours, and you can ask us to remove your page at any time.",
    },
    {
      q: "Do you work with hospitals?",
      a: "Yes. We make pages for all the visiting consultants at a hospital, with one bulk price.",
    },
  ],
};

export const FINAL_CTA = {
  title: "Get your page live this week.",
  whatsapp: "Message us on WhatsApp",
  /** `{phone}` from Settings. */
  call: "or call {phone}",
  formTitle: "Or leave your number and we'll call you",
};

export const FOOTER = {
  line: "A Sym HealthTech product, Pune",
  links: [
    { href: "/pricing", label: "Pricing" },
    { href: "/hospitals", label: "Hospitals" },
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
    { href: "/contact", label: "Contact" },
  ],
};

export const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/hospitals", label: "For hospitals" },
];

/** The "Request a call back" dialog (header + hero). */
export const CALLBACK = {
  cta: "Request a call back",
  title: "We'll call you back",
  text: "Leave your name and number. Our team will call you within one working day and collect your details.",
};

/** Pre-filled WhatsApp messages, per placement. */
export const WHATSAPP_TEXT = {
  default: "Hi, I'd like a MediReach page for my clinic.",
  hospital: "Hi, I'd like to talk about MediReach pages for our hospital's consultants.",
  pricing: "Hi, I'd like to know more about MediReach pricing.",
};

/** Every user-visible string above (for the NMC scanner test). */
export function allMarketingCopy(): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk([HERO, PROBLEMS, WHAT_YOU_GET, HOW_IT_WORKS, NMC, PRICING, HOSPITALS, SAMPLES, FAQ, FINAL_CTA, FOOTER, NAV, CALLBACK, WHATSAPP_TEXT]);
  return out;
}
