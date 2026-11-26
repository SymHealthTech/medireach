import type { DemoDoctor } from "./types";

/**
 * Dr. Rhea Sardesai — FICTIONAL gynaecologist and obstetrician in Baner, Pune.
 * Demo doctor for portfolio design 1 ("Serene Care"). Not a real person,
 * clinic or registration. Photos are Pexels stock (public/templates/specialty/CREDITS.md);
 * the name and logo on the stock doctor's coat are blurred.
 */

const IMG = "/demo/rhea-sardesai";
const monToSat = (slots: { open: string; close: string }[]) => [1, 2, 3, 4, 5, 6].map((day) => ({ day, slots }));

export const RHEA_SARDESAI: DemoDoctor = {
  key: "rhea-sardesai",
  subdomain: "drrheasardesai",
  firstName: "Rhea",
  lastName: "Sardesai",
  gender: "female",
  photo: {
    url: `${IMG}/portrait-square.jpg`,
    alt: "Dr. Rhea Sardesai, gynaecologist in Baner, Pune (demo photo)",
  },
  languages: ["English", "Hindi", "Marathi", "Konkani"],
  practiceSinceYear: 2013,
  city: { slug: "pune", name: "Pune", state: "Maharashtra" },
  council: {
    slug: "maharashtra-medical-council",
    name: "Maharashtra Medical Council",
  },
  registration: { number: "DEMO-2009-07834", year: 2009 },
  qualifications: [
    {
      degree: { slug: "mbbs", name: "MBBS" },
      institute: "Grant Government Medical College, Mumbai",
      year: 2008,
    },
    {
      degree: { slug: "ms", name: "MS" },
      specialization: "Obstetrics and Gynaecology",
      institute: "Seth G. S. Medical College and KEM Hospital, Mumbai",
      year: 2012,
    },
    {
      degree: { slug: "dnb", name: "DNB" },
      specialization: "Obstetrics and Gynaecology",
      institute: "National Board of Examinations, New Delhi",
      year: 2013,
    },
  ],
  practitionerType: "consultant",
  primarySpecialty: {
    slug: "gynaecologist",
    name: "Gynaecologist",
    plural: "Gynaecologists",
  },
  secondarySpecialties: [
    { slug: "obstetrician", name: "Obstetrician", plural: "Obstetricians" },
    {
      slug: "infertility-specialist",
      name: "Infertility Specialist",
      plural: "Infertility Specialists",
    },
  ],
  services: [
    {
      name: "Pregnancy care",
      description: "Monthly antenatal check-ups, scans and blood tests planned with you, from the first visit to delivery.",
    },
    {
      name: "High-risk pregnancy care",
      description: "Closer follow-up for diabetes, high blood pressure, thyroid problems or twins in pregnancy.",
    },
    {
      name: "Normal and caesarean delivery",
      description: "Deliveries at Shubhankar Maternity Home, Aundh, with a birth plan discussed well in advance.",
    },
    {
      name: "PCOS and period problems",
      description: "Irregular, heavy or painful periods and PCOS, with tests, treatment and lifestyle guidance.",
    },
    {
      name: "Fertility evaluation",
      description: "Tests for both partners, ovulation tracking and treatment, explained step by step.",
    },
    {
      name: "Keyhole (laparoscopic) surgery",
      description: "Day-care surgery for fibroids, ovarian cysts and endometriosis where it is suitable.",
    },
    {
      name: "Menopause care",
      description: "Hot flushes, sleep, bone health and mood around menopause, with regular reviews.",
    },
    {
      name: "Cervical cancer screening",
      description: "Pap smear and HPV tests, and the HPV vaccine for girls and young women.",
    },
    {
      name: "Teen health and contraception",
      description: "Confidential advice on periods, puberty and contraception choices.",
    },
  ],
  conditionsTreated: [
    "PCOS",
    "Irregular periods",
    "Heavy or painful periods",
    "Fibroids",
    "Ovarian cysts",
    "Endometriosis",
    "Infertility",
    "Gestational diabetes",
    "High BP in pregnancy",
    "Thyroid in pregnancy",
    "Anaemia",
    "Recurrent miscarriage",
    "Menopause symptoms",
    "Vaginal infections",
    "Urinary infections",
    "Pelvic pain",
  ],
  clinics: [
    {
      name: "Sardesai Women's Clinic",
      type: "own_clinic",
      addressLine1: "1st floor, Sai Prasad Arcade, Baner Road",
      addressLine2: "Near Baner Gaon bus stop",
      area: { slug: "baner", name: "Baner" },
      pincode: "411045",
      geo: { lat: 18.559, lng: 73.7868 },
      phone: "9800000111",
      timings: monToSat([
        { open: "10:00", close: "13:30" },
        { open: "17:30", close: "20:30" },
      ]),
      appointmentNote: "By appointment. Please bring your earlier reports and scans.",
      fee: 800,
      showFee: true,
    },
    {
      name: "Shubhankar Maternity Home",
      type: "hospital_visiting",
      addressLine1: "Plot 12, ITI Road",
      area: { slug: "aundh", name: "Aundh" },
      pincode: "411007",
      geo: { lat: 18.5603, lng: 73.8079 },
      phone: "9800000112",
      timings: [2, 4, 6].map((day) => ({
        day,
        slots: [{ open: "14:30", close: "16:30" }],
      })),
      appointmentNote: "Deliveries and surgeries. OPD by appointment only.",
      fee: 1000,
      showFee: true,
    },
  ],
  mobile: "9800000111",
  whatsapp: "9800000111",
  email: "care@sardesaiwomensclinic.example",
  links: {
    googleBusiness: "https://maps.google.com/?q=Sardesai+Womens+Clinic+Baner",
    instagram: "https://www.instagram.com/",
    facebook: "https://www.facebook.com/",
  },
  shortBio: "Gynaecologist and obstetrician in Baner, Pune, caring for women through pregnancy, periods, fertility and menopause since 2013.",
  fullBio:
    "<p>Dr. Rhea Sardesai is a <strong>gynaecologist and obstetrician</strong> who sees women of every age at her clinic on Baner Road. After her MS and DNB in Obstetrics and Gynaecology in Mumbai, she worked in the labour ward and high-risk pregnancy unit of a large teaching hospital before moving to Pune in 2013.</p>" +
    "<p>Her day is split between the clinic, where she sees teenagers with period problems, couples planning a family and women around menopause, and Shubhankar Maternity Home in Aundh, where she delivers babies and operates. She likes to draw diagrams, explain every scan and test result, and write the plan down so nothing is forgotten at home.</p>" +
    "<ul><li>Pregnancy care, including high-risk pregnancies</li><li>PCOS, period problems and fertility</li><li>Day-care keyhole surgery</li><li>Menopause and cervical screening</li></ul>",
  awards: [
    {
      title: "Gold medal in Obstetrics and Gynaecology",
      awardingBody: "Maharashtra University of Health Sciences",
      year: 2008,
    },
    {
      title: "Young Gynaecologist Award",
      awardingBody: "Pune Obstetric and Gynaecological Society",
      year: 2019,
    },
    {
      title: "Anaemia-free pregnancy camp recognition",
      awardingBody: "Pune Municipal Corporation ward office",
      year: 2023,
    },
  ],
  memberships: [
    {
      name: "Federation of Obstetric and Gynaecological Societies of India (FOGSI)",
      since: 2013,
    },
    { name: "Pune Obstetric and Gynaecological Society", since: 2013 },
    { name: "Indian Society for Assisted Reproduction", since: 2017 },
  ],
  interests: ["Bharatanatyam", "Terrace gardening", "Marathi literature", "Morning yoga"],
  interestsPhoto: {
    url: `${IMG}/beyond.jpg`,
    alt: "A Bharatanatyam performance in a temple courtyard (demo photo)",
    caption: "Bharatanatyam evenings, a lifelong love",
  },
  interestsStory: {
    title: "Thirty years of Bharatanatyam",
    body: [
      "My mother took me to my first Bharatanatyam class in Dadar when I was seven, mainly to stop me jumping off the furniture at home. I hated the first month of standing in aramandi with aching knees. By the end of the year I would not miss a single class.",
      "My arangetram, the first solo performance, was in the summer before I started medical college: two and a half hours on stage, a borrowed silk costume and a very nervous family in the front row. My guru still teases me that I spent the week before it reading anatomy between rehearsals.",
      "Residency years left almost no time to dance. I came back to it in Pune, joining an evening class in Aundh twice a week after clinic. In 2024 our group performed a short piece on the life of Savitribai Phule at a temple festival, and I was the oldest dancer on stage by about fifteen years.",
      "At home I look after a small terrace garden of tulsi, curry leaves, chillies and far too many hibiscus plants. Sunday mornings start with yoga on the terrace and end with a Marathi novel and a cup of tea.",
      "Dance taught me patience and practice. Most of what I do in the clinic, from a pregnancy to a long PCOS treatment, works the same way: small steps, repeated, with someone cheering you on.",
    ].join("\n\n"),
  },
  gallery: [
    {
      url: `${IMG}/clinic-2.jpg`,
      alt: "Examination room at Sardesai Women's Clinic (demo photo)",
      caption: "Examination room",
    },
    {
      url: `${IMG}/clinic-1.jpg`,
      alt: "Ultrasound and examination room (demo photo)",
      caption: "Ultrasound room",
    },
    {
      url: `${IMG}/clinic-5.jpg`,
      alt: "Consultation desk (demo photo)",
      caption: "Consultation room",
    },
    {
      url: `${IMG}/clinic-4.jpg`,
      alt: "Day-care recovery room (demo photo)",
      caption: "Day-care recovery room",
    },
    {
      url: `${IMG}/clinic-3.jpg`,
      alt: "Clinic room with a desk and examination bed (demo photo)",
      caption: "Calm, private rooms",
    },
  ],
  showHealthTips: true,
  inquiries: [
    {
      name: "Pooja Deshmukh",
      phone: "9800000211",
      email: "pooja.d@example.com",
      daysAgo: 0,
      preferredInDays: 2,
      preferredTime: "morning",
      clinic: 0,
      message: "I am 8 weeks pregnant (first pregnancy) and would like to start my antenatal check-ups with you. Do I need to come fasting for blood tests?",
      status: "new",
    },
    {
      name: "Nikita Rao",
      phone: "9800000212",
      daysAgo: 1,
      preferredInDays: 4,
      preferredTime: "evening",
      clinic: 0,
      message: "Irregular periods for over a year and some weight gain. My friend suggested a PCOS check. Can I come after office hours?",
      status: "new",
    },
    {
      name: "Smita Kale",
      phone: "9800000213",
      email: "smita.kale@example.com",
      daysAgo: 3,
      preferredTime: "afternoon",
      clinic: 1,
      message: "My doctor advised removal of a fibroid. I would like a second opinion on whether keyhole surgery is possible. Reports are ready.",
      status: "contacted",
    },
    {
      name: "Anita Bhosale",
      phone: "9800000214",
      daysAgo: 5,
      preferredInDays: -1,
      preferredTime: "morning",
      clinic: 0,
      message: "Booking my daughter (14) for the HPV vaccine. Please tell me how many doses are needed.",
      status: "booked",
    },
    {
      name: "Vandana Iyer",
      phone: "9800000215",
      daysAgo: 11,
      preferredTime: "any",
      message: "Hot flushes and poor sleep for six months. I am 51. Would like to discuss menopause treatment options.",
      status: "closed",
    },
  ],
  portfolioTemplateId: "classic",
  cardTemplateId: "classic",
  cardStyle: "DOC-PLUM",
};
