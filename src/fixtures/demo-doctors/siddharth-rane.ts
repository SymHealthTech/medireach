import type { DemoDoctor } from "./types";

/**
 * Dr. Siddharth Rane — FICTIONAL orthopaedic surgeon and sports medicine
 * doctor in Viman Nagar, Pune. Demo doctor for portfolio design 3
 * ("Modern Edge"). Not a real person, clinic or registration. Photos are
 * Pexels stock (public/templates/specialty/CREDITS.md).
 */

const IMG = "/demo/siddharth-rane";
const monToSat = (slots: { open: string; close: string }[]) => [1, 2, 3, 4, 5, 6].map((day) => ({ day, slots }));

export const SIDDHARTH_RANE: DemoDoctor = {
  key: "siddharth-rane",
  subdomain: "drsiddharthrane",
  firstName: "Siddharth",
  lastName: "Rane",
  gender: "male",
  photo: {
    url: `${IMG}/portrait-square.jpg`,
    alt: "Dr. Siddharth Rane, orthopaedic surgeon in Viman Nagar, Pune (demo photo)",
  },
  languages: ["English", "Hindi", "Marathi"],
  practiceSinceYear: 2015,
  city: { slug: "pune", name: "Pune", state: "Maharashtra" },
  council: {
    slug: "maharashtra-medical-council",
    name: "Maharashtra Medical Council",
  },
  registration: { number: "DEMO-2010-11492", year: 2010 },
  qualifications: [
    {
      degree: { slug: "mbbs", name: "MBBS" },
      institute: "Government Medical College, Aurangabad",
      year: 2009,
    },
    {
      degree: { slug: "ms", name: "MS" },
      specialization: "Orthopaedics",
      institute: "B. J. Government Medical College, Pune",
      year: 2013,
    },
    {
      degree: { slug: "fnb", name: "Fellowship (FNB)" },
      specialization: "Arthroscopy and Sports Medicine",
      institute: "National Board of Examinations, New Delhi",
      year: 2015,
    },
  ],
  practitionerType: "consultant",
  primarySpecialty: {
    slug: "orthopaedic-surgeon",
    name: "Orthopaedic Surgeon",
    plural: "Orthopaedic Surgeons",
  },
  secondarySpecialties: [
    {
      slug: "sports-medicine-specialist",
      name: "Sports Medicine Specialist",
      plural: "Sports Medicine Specialists",
    },
  ],
  services: [
    {
      name: "Sports injury care",
      description: "Ligament, muscle and tendon injuries from running, cricket, football and the gym, with a return-to-sport plan.",
    },
    {
      name: "Knee and shoulder arthroscopy",
      description: "Keyhole surgery for ACL and meniscus tears, shoulder dislocations and rotator cuff tears.",
    },
    {
      name: "Knee and hip replacement",
      description: "Joint replacement for advanced arthritis, with physiotherapy planned before and after surgery.",
    },
    {
      name: "Fracture care",
      description: "Plaster, splints and surgery for broken bones, with follow-up X-rays until they heal.",
    },
    {
      name: "Back and neck pain",
      description: "Assessment of disc, nerve and posture problems; most patients start with exercises, not surgery.",
    },
    {
      name: "Arthritis care",
      description: "Pain relief, weight and exercise plans, and injections for knee and hip arthritis.",
    },
    {
      name: "Physiotherapy and rehabilitation",
      description: "Week-by-week exercise plans with the clinic physiotherapist after injury or surgery.",
    },
    {
      name: "Bone health and osteoporosis",
      description: "Bone density tests, calcium and vitamin D, and fall prevention for older adults.",
    },
  ],
  conditionsTreated: [
    "ACL tear",
    "Meniscus tear",
    "Knee arthritis",
    "Frozen shoulder",
    "Rotator cuff tear",
    "Shoulder dislocation",
    "Tennis elbow",
    "Back pain",
    "Slipped disc",
    "Neck pain",
    "Fractures",
    "Ankle sprain",
    "Plantar fasciitis",
    "Osteoporosis",
    "Carpal tunnel syndrome",
  ],
  clinics: [
    {
      name: "Rane Bone and Joint Clinic",
      type: "own_clinic",
      addressLine1: "Shop 7, Sky Vista Heights, Datta Mandir Road",
      addressLine2: "Next to Viman Nagar post office",
      area: { slug: "viman-nagar", name: "Viman Nagar" },
      pincode: "411014",
      geo: { lat: 18.5679, lng: 73.9143 },
      phone: "9800000121",
      timings: monToSat([
        { open: "10:00", close: "13:00" },
        { open: "18:00", close: "21:00" },
      ]),
      appointmentNote: "Please bring your X-rays and MRI films or reports.",
      fee: 900,
      showFee: true,
    },
    {
      name: "Eastside Multispeciality Hospital",
      type: "hospital_visiting",
      addressLine1: "Plot 5, Kharadi Bypass Road",
      area: { slug: "kharadi", name: "Kharadi" },
      pincode: "411014",
      geo: { lat: 18.5515, lng: 73.9442 },
      phone: "9800000122",
      timings: [1, 3, 5].map((day) => ({
        day,
        slots: [{ open: "15:00", close: "17:00" }],
      })),
      appointmentNote: "Surgeries and arthroscopy. OPD by appointment only.",
      fee: 1000,
      showFee: true,
    },
  ],
  mobile: "9800000121",
  whatsapp: "9800000121",
  email: "desk@ranebonejoint.example",
  links: {
    googleBusiness: "https://maps.google.com/?q=Rane+Bone+and+Joint+Clinic+Viman+Nagar",
    instagram: "https://www.instagram.com/",
    youtube: "https://www.youtube.com/",
  },
  shortBio: "Orthopaedic surgeon in Viman Nagar, Pune, treating sports injuries, knee and shoulder problems, fractures and arthritis since 2015.",
  fullBio:
    "<p>Dr. Siddharth Rane is an <strong>orthopaedic surgeon</strong> with a fellowship in arthroscopy and sports medicine. He sees runners, cricketers, gym-goers and weekend footballers, as well as older adults with arthritis and back pain, at his clinic in Viman Nagar.</p>" +
    "<p>He believes most bone and joint problems start with the right exercises, so every plan is written out with the clinic physiotherapist. When surgery is needed, he explains the options with models and X-rays first, and operates at Eastside Multispeciality Hospital in Kharadi.</p>" +
    "<ul><li>ACL, meniscus and shoulder injuries</li><li>Keyhole (arthroscopic) surgery</li><li>Knee and hip replacement</li><li>Return-to-sport rehabilitation</li></ul>",
  awards: [
    {
      title: "Gold medal in MS Orthopaedics",
      awardingBody: "Maharashtra University of Health Sciences",
      year: 2013,
    },
    {
      title: "Travelling fellowship in arthroscopy",
      awardingBody: "Indian Arthroscopy Society",
      year: 2017,
    },
    {
      title: "Medical team volunteer, city half marathon",
      awardingBody: "Pune Running Club",
      year: 2024,
    },
  ],
  memberships: [
    { name: "Indian Orthopaedic Association", since: 2013 },
    { name: "Indian Arthroscopy Society", since: 2015 },
    { name: "Pune Orthopaedic Society", since: 2015 },
  ],
  interests: ["Long-distance cycling", "Open-water swimming", "Coaching under-14 football", "Street photography"],
  interestsPhoto: {
    url: `${IMG}/beyond.jpg`,
    alt: "A cyclist on a quiet road below the hills (demo photo)",
    caption: "Weekend rides out of Pune",
  },
  interestsStory: {
    title: "Pune to Goa on two wheels",
    body: [
      "I bought my first proper road bike during my fellowship, after a patient, a 58-year-old retired pilot, told me he rode 40 km every Sunday and asked why I did not. I had no good answer, so I joined him the next weekend and could barely keep up.",
      "Eight years later our Sunday group has fourteen riders. We leave Viman Nagar at 5:30, ride out to Lonikand or up the Dive Ghat, and are back before the clinic opens. The rule is simple: nobody gets left behind, and the slowest rider chooses the breakfast stop.",
      "In December 2025 six of us rode from Pune to Goa over four days, about 470 km through the Western Ghats, via Satara, Kolhapur and the Amboli ghat. It rained on the third day, my knee complained on every climb, and the first sight of the sea at Arambol made all of it worth it.",
      "On Saturday mornings I coach an under-14 football team in Kalyani Nagar. Watching twelve-year-olds learn to warm up, land properly and stretch afterwards is the most useful sports medicine work I do all week.",
      "Cycling reminds me what my patients go through: an injury, a slow return, and the day you realise you are stronger than before. That is the day I work towards with every one of them.",
    ].join("\n\n"),
  },
  gallery: [
    {
      url: `${IMG}/clinic-3.jpg`,
      alt: "Examination at Rane Bone and Joint Clinic (demo photo)",
      caption: "Examination room",
    },
    {
      url: `${IMG}/clinic-4.jpg`,
      alt: "Reviewing an X-ray on a laptop (demo photo)",
      caption: "X-ray and MRI review",
    },
    {
      url: `${IMG}/clinic-5.jpg`,
      alt: "Rehabilitation exercise with a dumbbell (demo photo)",
      caption: "Rehabilitation area",
    },
    {
      url: `${IMG}/clinic-1.jpg`,
      alt: "Operation theatre (demo photo)",
      caption: "Operation theatre, Eastside Hospital",
    },
    {
      url: `${IMG}/clinic-2.jpg`,
      alt: "Recovery room (demo photo)",
      caption: "Recovery room",
    },
  ],
  showHealthTips: true,
  inquiries: [
    {
      name: "Aditya Jadhav",
      phone: "9800000221",
      email: "aditya.j@example.com",
      daysAgo: 0,
      preferredInDays: 1,
      preferredTime: "evening",
      clinic: 0,
      message: "Twisted my knee playing football on Sunday. It is swollen and feels unstable on stairs. MRI not done yet.",
      status: "new",
    },
    {
      name: "Shalini Menon",
      phone: "9800000222",
      daysAgo: 1,
      preferredInDays: 3,
      preferredTime: "morning",
      clinic: 0,
      message: "My mother (67) has severe knee pain and has been told she may need a knee replacement. We would like your opinion.",
      status: "new",
    },
    {
      name: "Karan Mehta",
      phone: "9800000223",
      email: "karan.m@example.com",
      daysAgo: 2,
      preferredTime: "afternoon",
      clinic: 1,
      message: "Shoulder pain while lifting at the gym for two months. Can I see you at Eastside on Wednesday?",
      status: "contacted",
    },
    {
      name: "Farah Shaikh",
      phone: "9800000224",
      daysAgo: 6,
      preferredInDays: -2,
      preferredTime: "evening",
      clinic: 0,
      message: "Follow-up X-ray after wrist fracture, six weeks since the plaster.",
      status: "booked",
    },
    {
      name: "Rohan Gaikwad",
      phone: "9800000225",
      daysAgo: 12,
      preferredTime: "any",
      message: "Lower back pain after long hours at my desk. Do you also give a physiotherapy plan?",
      status: "closed",
    },
  ],
  portfolioTemplateId: "t3",
};
