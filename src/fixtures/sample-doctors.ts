/**
 * FICTIONAL SAMPLE DOCTORS — not real people, clinics or registration numbers.
 * Used for template previews, homepage sample pages and local testing.
 * The surname "Sample" and the "SAMPLE-" registration prefix mark them as such.
 *
 * Master-list references are by slug and resolved when seeding.
 */

export interface SampleDoctorInput {
  key: "gp" | "consultant";
  firstName: string;
  lastName: string;
  subdomain: string;
  gender: "male" | "female";
  languages: string[];
  practiceSinceYear: number;
  councilSlug: string;
  registrationNumber: string;
  qualifications: { degreeSlug: string; specialization?: string; institute: string; year: number }[];
  practitionerType: "gp" | "consultant";
  primarySpecialtySlug: string;
  secondarySpecialtySlugs: string[];
  services: string[];
  conditionsTreated: string[];
  clinics: {
    name: string;
    type: "own_clinic" | "hospital_visiting";
    addressLine1: string;
    areaSlug: string;
    pincode: string;
    geo: { lat: number; lng: number };
    phone: string;
    timings: { day: number; slots: { open: string; close: string }[] }[];
    appointmentNote?: string;
    fee?: number;
    showFee: boolean;
  }[];
  mobile: string;
  shortBio: string;
  fullBio: string;
  awards: { title: string; awardingBody: string; year: number }[];
  memberships: { name: string; since?: number }[];
  interests: string[];
}

const weekdays = (slots: { open: string; close: string }[]) => [1, 2, 3, 4, 5, 6].map((day) => ({ day, slots }));

export const SAMPLE_DOCTORS: SampleDoctorInput[] = [
  {
    key: "gp",
    firstName: "Aditi",
    lastName: "Sample",
    subdomain: "sample-gp",
    gender: "female",
    languages: ["English", "Hindi", "Marathi"],
    practiceSinceYear: 2012,
    councilSlug: "maharashtra-medical-council",
    registrationNumber: "SAMPLE-2012-0001",
    qualifications: [
      { degreeSlug: "mbbs", institute: "Sample Medical College, Pune", year: 2010 },
      { degreeSlug: "md", specialization: "Medicine", institute: "Sample Medical College, Pune", year: 2014 },
    ],
    practitionerType: "gp",
    primarySpecialtySlug: "general-physician",
    secondarySpecialtySlugs: ["family-physician"],
    services: ["General consultation", "Diabetes care", "Blood pressure management", "Health check-ups", "Vaccination"],
    conditionsTreated: ["Fever", "Diabetes", "Hypertension", "Thyroid disorders", "Seasonal infections"],
    clinics: [
      {
        name: "Sample Family Clinic",
        type: "own_clinic",
        addressLine1: "12, Sample Lane, near Karishma Society",
        areaSlug: "kothrud",
        pincode: "411038",
        geo: { lat: 18.5074, lng: 73.8077 },
        phone: "9800000001",
        timings: [
          ...weekdays([
            { open: "10:00", close: "13:30" },
            { open: "18:00", close: "21:00" },
          ]),
          { day: 0, slots: [] },
        ],
        appointmentNote: "Walk-ins welcome.",
        fee: 500,
        showFee: true,
      },
    ],
    mobile: "9800000001",
    shortBio: "General physician in Kothrud, Pune, caring for families for over a decade.",
    fullBio:
      "<p>Dr. Aditi Sample is a <strong>general physician</strong> who looks after adults and families in Kothrud.</p><ul><li>Long-term care for diabetes and blood pressure</li><li>Preventive health check-ups</li></ul>",
    awards: [{ title: "Gold medal in Medicine", awardingBody: "Sample University", year: 2010 }],
    memberships: [{ name: "Indian Medical Association, Pune", since: 2012 }],
    interests: ["Marathon runner", "Classical music"],
  },
  {
    key: "consultant",
    firstName: "Rohan",
    lastName: "Sample",
    subdomain: "sample-consultant",
    gender: "male",
    languages: ["English", "Hindi", "Marathi"],
    practiceSinceYear: 2009,
    councilSlug: "maharashtra-medical-council",
    registrationNumber: "SAMPLE-2009-0002",
    qualifications: [
      { degreeSlug: "mbbs", institute: "Sample Medical College, Mumbai", year: 2005 },
      { degreeSlug: "md", specialization: "Medicine", institute: "Sample Medical College, Mumbai", year: 2009 },
      { degreeSlug: "dm", specialization: "Cardiology", institute: "Sample Institute of Cardiology", year: 2013 },
    ],
    practitionerType: "consultant",
    primarySpecialtySlug: "cardiologist",
    secondarySpecialtySlugs: [],
    services: ["Cardiac consultation", "ECG", "2D Echo", "Stress test", "Heart failure clinic"],
    conditionsTreated: ["Chest pain", "High blood pressure", "Heart rhythm problems", "Heart failure"],
    clinics: [
      {
        name: "Sample Heart Clinic",
        type: "own_clinic",
        addressLine1: "3rd floor, Sample Plaza, Baner Road",
        areaSlug: "baner",
        pincode: "411045",
        geo: { lat: 18.559, lng: 73.7868 },
        phone: "9800000002",
        timings: [1, 3, 5].map((day) => ({ day, slots: [{ open: "17:00", close: "20:30" }] })),
        appointmentNote: "By appointment.",
        fee: 1000,
        showFee: true,
      },
      {
        name: "Sample Multispeciality Hospital",
        type: "hospital_visiting",
        addressLine1: "Sample Road",
        areaSlug: "aundh",
        pincode: "411007",
        geo: { lat: 18.5603, lng: 73.8077 },
        phone: "9800000003",
        timings: [2, 4, 6].map((day) => ({ day, slots: [{ open: "11:00", close: "14:00" }] })),
        showFee: false,
      },
    ],
    mobile: "9800000002",
    shortBio: "Cardiologist in Baner and Aundh, Pune. Consultations, ECG and echocardiography.",
    fullBio: "<p>Dr. Rohan Sample is a <strong>cardiologist</strong> who consults at his clinic in Baner and as a visiting consultant in Aundh.</p>",
    awards: [{ title: "Young Investigator Award", awardingBody: "Sample Cardiology Society", year: 2016 }],
    memberships: [
      { name: "Cardiological Society of India", since: 2013 },
      { name: "Indian Medical Association", since: 2009 },
    ],
    interests: ["Cycling", "Photography"],
  },
];
