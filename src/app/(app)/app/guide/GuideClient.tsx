"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/constants";

type Lang = "en" | "mr" | "hi";

interface Section {
  title: string;
  steps: string[];
}

interface GuideContent {
  heading: string;
  roleLabel: string;
  intro: string;
  sections: Section[];
}

const GUIDE: Record<"reception" | "doctor", Record<Lang, GuideContent>> = {
  reception: {
    en: {
      heading: "Reception User Guide",
      roleLabel: "Reception",
      intro:
        "Welcome to MediReach! This guide will help you manage patients at the front desk step by step.",
      sections: [
        {
          title: "Adding a New Patient",
          steps: [
            'On the "Today" screen, tap the "+" button (top right) or the "Register" button.',
            "A registration form will open. Enter the patient's full name (required).",
            "Enter the patient's 10-digit mobile number.",
            "Select the patient's age and gender.",
            "Optionally, enter the reason for the visit or symptoms in the notes field.",
            'Tap "Register Patient" to save.',
            "The patient appears in today's queue with an auto-assigned token number.",
          ],
        },
        {
          title: "Viewing Today's Queue",
          steps: [
            'Tap "Today" in the bottom navigation bar to open the queue.',
            "Each row shows the token number, patient name, and current status.",
            '"Pending" — patient is waiting to be called.',
            '"In Consultation" — doctor is currently seeing this patient.',
            '"Done" — visit is complete for the day.',
            "Pending patients appear at the top; completed ones are listed below.",
          ],
        },
        {
          title: "Searching for a Patient",
          steps: [
            'Use the search box at the top of the "Today" screen to find patients by name or mobile number.',
            'For past patients, tap "Recent" in the bottom navigation bar.',
            "Type the patient name or mobile number in the search box.",
            "Matching patients appear as you type — tap any result to view their details.",
          ],
        },
        {
          title: "Editing a Patient's Details",
          steps: [
            "Only patients with Pending status can be edited.",
            "Find the patient in today's queue and tap their row.",
            'Tap the "Edit" button on the patient detail screen.',
            "Update the required fields (name, mobile, age, gender, or notes).",
            'Tap "Save" to apply changes.',
            "Note: Once a doctor starts the consultation, the patient cannot be edited.",
          ],
        },
        {
          title: "Deleting a Patient from the Queue",
          steps: [
            "Only patients with Pending status can be deleted.",
            "Find the patient in today's queue and tap their row.",
            'Tap the "Delete" button.',
            'A confirmation dialog will appear — tap "Confirm" to permanently remove the patient.',
            "Note: Patients whose consultation has already started cannot be deleted.",
          ],
        },
        {
          title: "Viewing Patient Records (Recent)",
          steps: [
            'Tap "Recent" in the bottom navigation bar.',
            "A list of recently visited patients is shown.",
            "Tap any patient to see their past visit dates.",
            "Note: As a receptionist, you can see visit dates but not clinical notes or prescription details.",
          ],
        },
        {
          title: "Logging Out",
          steps: [
            'Tap "Menu" (☰) in the bottom navigation bar.',
            'Scroll down and tap "Logout".',
            "You will be taken back to the login screen.",
            "Your session automatically expires at midnight — you will need to log in again the next day.",
          ],
        },
      ],
    },

    mr: {
      heading: "रिसेप्शन वापरकर्ता मार्गदर्शक",
      roleLabel: "रिसेप्शन",
      intro:
        "MediReach मध्ये आपले स्वागत आहे! हे मार्गदर्शक आपल्याला फ्रंट डेस्कवर रुग्णांचे व्यवस्थापन टप्प्याटप्प्याने करण्यास मदत करेल.",
      sections: [
        {
          title: "नवीन रुग्ण जोडणे",
          steps: [
            '"आजचे" (Today) स्क्रीनवर वरच्या उजव्या बाजूला "+" बटण किंवा "नोंदणी करा" (Register) बटणावर टॅप करा.',
            "नोंदणी फॉर्म उघडेल. रुग्णाचे पूर्ण नाव (आवश्यक) भरा.",
            "रुग्णाचा 10 अंकी मोबाइल नंबर टाका.",
            "रुग्णाचे वय आणि लिंग निवडा.",
            "इच्छित असल्यास, नोट्स विभागात भेटीचे कारण किंवा लक्षणे लिहा.",
            '"रुग्ण नोंदणी करा" (Register Patient) टॅप करा.',
            "रुग्ण आपोआप टोकन नंबरसह आजच्या रांगेत दिसेल.",
          ],
        },
        {
          title: "आजची रांग पाहणे",
          steps: [
            'रांग उघडण्यासाठी खालील नेव्हिगेशन बारमधील "आजचे" (Today) टॅप करा.',
            "प्रत्येक ओळीत टोकन नंबर, रुग्णाचे नाव आणि सध्याची स्थिती दिसते.",
            '"प्रतीक्षेत" (Pending) — रुग्ण बोलावण्याची वाट पाहत आहे.',
            '"सल्लामसलत होत आहे" (In Consultation) — डॉक्टर सध्या त्यांना तपासत आहे.',
            '"पूर्ण" (Done) — आजची भेट संपली आहे.',
            "प्रतीक्षेत असलेले रुग्ण वरती; पूर्ण झालेले खाली दिसतात.",
          ],
        },
        {
          title: "रुग्ण शोधणे",
          steps: [
            '"आजचे" स्क्रीनच्या वरच्या शोध बॉक्समध्ये नाव किंवा मोबाइल नंबरने रुग्ण शोधा.',
            'मागील रुग्णांसाठी खालील नेव्हिगेशन बारमधील "अलीकडील" (Recent) टॅप करा.',
            "शोध बॉक्समध्ये रुग्णाचे नाव किंवा मोबाइल नंबर टाइप करा.",
            "टाइप करताना जुळणारे रुग्ण दिसतील — तपशील पाहण्यासाठी कोणत्याही निकालावर टॅप करा.",
          ],
        },
        {
          title: "रुग्णाची माहिती संपादित करणे",
          steps: [
            "फक्त 'प्रतीक्षेत' (Pending) स्थितीतील रुग्णांना संपादित करता येते.",
            "आजच्या रांगेत रुग्ण शोधा आणि त्यांच्या ओळीवर टॅप करा.",
            'रुग्ण तपशील स्क्रीनवर "संपादित करा" (Edit) बटण टॅप करा.',
            "आवश्यक माहिती (नाव, मोबाइल, वय, लिंग किंवा नोट्स) अपडेट करा.",
            '"जतन करा" (Save) टॅप करा.',
            "नोंद: डॉक्टरांनी सल्लामसलत सुरू केल्यावर रुग्ण संपादित करता येत नाही.",
          ],
        },
        {
          title: "रुग्णाला रांगेतून हटवणे",
          steps: [
            "फक्त 'प्रतीक्षेत' (Pending) स्थितीतील रुग्णांना हटवता येते.",
            "आजच्या रांगेत रुग्ण शोधा आणि त्यांच्या ओळीवर टॅप करा.",
            '"हटवा" (Delete) बटण टॅप करा.',
            'पुष्टीकरण डायलॉग येईल — कायमचे हटवण्यासाठी "पुष्टी करा" (Confirm) टॅप करा.',
            "नोंद: ज्यांची सल्लामसलत आधीच सुरू झाली आहे त्यांना हटवता येत नाही.",
          ],
        },
        {
          title: "रुग्ण नोंदी पाहणे (अलीकडील)",
          steps: [
            'खालील नेव्हिगेशन बारमधील "अलीकडील" (Recent) टॅप करा.',
            "अलीकडे भेट दिलेल्या रुग्णांची यादी दिसेल.",
            "त्यांच्या मागील भेटींच्या तारखा पाहण्यासाठी कोणत्याही रुग्णावर टॅप करा.",
            "नोंद: रिसेप्शनिस्ट भेटीच्या तारखा पाहू शकतात परंतु वैद्यकीय नोट्स किंवा प्रिस्क्रिप्शनचे तपशील नाही.",
          ],
        },
        {
          title: "लॉगआउट करणे",
          steps: [
            'खालील नेव्हिगेशन बारमधील "मेनू" (☰) टॅप करा.',
            'खाली स्क्रोल करा आणि "लॉगआउट" (Logout) टॅप करा.',
            "आपल्याला लॉगिन स्क्रीनवर परत आणले जाईल.",
            "आपले सत्र (session) मध्यरात्री आपोआप संपते — पुढच्या दिवशी पुन्हा लॉगिन करावे लागेल.",
          ],
        },
      ],
    },

    hi: {
      heading: "रिसेप्शन उपयोगकर्ता मार्गदर्शिका",
      roleLabel: "रिसेप्शन",
      intro:
        "MediReach में आपका स्वागत है! यह मार्गदर्शिका आपको फ्रंट डेस्क पर मरीजों का प्रबंधन चरण-दर-चरण करने में मदद करेगी।",
      sections: [
        {
          title: "नया मरीज जोड़ना",
          steps: [
            '"आज" (Today) स्क्रीन पर ऊपर दाईं ओर "+" बटन या "पंजीकृत करें" (Register) बटन पर टैप करें।',
            "पंजीकरण फॉर्म खुलेगा। मरीज का पूरा नाम (आवश्यक) भरें।",
            "मरीज का 10-अंकीय मोबाइल नंबर डालें।",
            "मरीज की उम्र और लिंग चुनें।",
            "यदि चाहें तो नोट्स में आने का कारण या लक्षण लिखें।",
            '"मरीज पंजीकृत करें" (Register Patient) पर टैप करें।',
            "मरीज स्वतः टोकन नंबर के साथ आज की कतार में दिखेगा।",
          ],
        },
        {
          title: "आज की कतार देखना",
          steps: [
            'कतार खोलने के लिए नीचे नेविगेशन बार में "आज" (Today) टैप करें।',
            "प्रत्येक पंक्ति में टोकन नंबर, मरीज का नाम और वर्तमान स्थिति दिखती है।",
            '"प्रतीक्षा में" (Pending) — मरीज बुलाए जाने का इंतजार कर रहा है।',
            '"परामर्श में" (In Consultation) — डॉक्टर अभी उन्हें देख रहे हैं।',
            '"पूर्ण" (Done) — आज की मुलाकात पूरी हो गई।',
            "प्रतीक्षा में वाले मरीज ऊपर; पूर्ण हो चुके मरीज नीचे दिखते हैं।",
          ],
        },
        {
          title: "मरीज खोजना",
          steps: [
            '"आज" स्क्रीन के ऊपर खोज बॉक्स में नाम या मोबाइल नंबर से मरीज खोजें।',
            'पिछले मरीजों के लिए नीचे नेविगेशन बार में "हाल के" (Recent) टैप करें।',
            "खोज बॉक्स में मरीज का नाम या मोबाइल नंबर टाइप करें।",
            "टाइप करते समय मिलते-जुलते मरीज दिखेंगे — विवरण देखने के लिए किसी भी परिणाम पर टैप करें।",
          ],
        },
        {
          title: "मरीज की जानकारी संपादित करना",
          steps: [
            "केवल 'प्रतीक्षा में' (Pending) स्थिति के मरीजों को संपादित किया जा सकता है।",
            "आज की कतार में मरीज खोजें और उनकी पंक्ति पर टैप करें।",
            'मरीज विवरण स्क्रीन पर "संपादित करें" (Edit) बटन टैप करें।',
            "आवश्यक जानकारी (नाम, मोबाइल, उम्र, लिंग या नोट्स) अपडेट करें।",
            '"सहेजें" (Save) टैप करें।',
            "नोट: एक बार डॉक्टर ने परामर्श शुरू कर दिया तो मरीज को संपादित नहीं किया जा सकता।",
          ],
        },
        {
          title: "मरीज को कतार से हटाना",
          steps: [
            "केवल 'प्रतीक्षा में' (Pending) स्थिति के मरीजों को हटाया जा सकता है।",
            "आज की कतार में मरीज खोजें और उनकी पंक्ति पर टैप करें।",
            '"हटाएं" (Delete) बटन टैप करें।',
            'पुष्टि संवाद आएगा — स्थायी रूप से हटाने के लिए "पुष्टि करें" (Confirm) टैप करें।',
            "नोट: जिन मरीजों का परामर्श पहले ही शुरू हो चुका है उन्हें हटाया नहीं जा सकता।",
          ],
        },
        {
          title: "मरीज के रिकॉर्ड देखना (हाल के)",
          steps: [
            'नीचे नेविगेशन बार में "हाल के" (Recent) टैप करें।',
            "हाल ही में आए मरीजों की सूची दिखेगी।",
            "उनकी पिछली मुलाकात की तारीखें देखने के लिए किसी भी मरीज पर टैप करें।",
            "नोट: रिसेप्शनिस्ट मुलाकात की तारीखें देख सकते हैं लेकिन चिकित्सा नोट्स या नुस्खे का विवरण नहीं।",
          ],
        },
        {
          title: "लॉगआउट करना",
          steps: [
            'नीचे नेविगेशन बार में "मेनू" (☰) टैप करें।',
            'नीचे स्क्रॉल करें और "लॉगआउट" (Logout) टैप करें।',
            "आपको लॉगिन स्क्रीन पर वापस लाया जाएगा।",
            "आपका सत्र (session) आधी रात को स्वतः समाप्त हो जाता है — अगले दिन फिर से लॉगिन करना होगा।",
          ],
        },
      ],
    },
  },

  doctor: {
    en: {
      heading: "Doctor User Guide",
      roleLabel: "Doctor",
      intro:
        "Welcome to MediReach! This guide will help you use the app effectively for your daily clinic workflow.",
      sections: [
        {
          title: "Starting a Patient Consultation",
          steps: [
            'On the "Today" screen, tap a patient with "Pending" status.',
            'Tap "Start Consultation" to begin.',
            'On the Pro plan, tap "🎤 Dictate" and speak naturally — English, Hindi, or Marathi all work — and the AI fills in diagnosis, treatment, and prescription for you.',
            "On the Starter plan, type each field yourself. Keyword shortcuts expand into full text as you type, so entry stays quick.",
            "Review or edit every field — complaints, examination, diagnosis, medicines, advice, and fees.",
            'Tap "Next" to review the prescription, then "Send Prescription".',
            "Share it on WhatsApp and record the fee collected before returning to the queue.",
          ],
        },
        {
          title: "Managing Today's Queue",
          steps: [
            'The "Today" screen shows all patients registered for the current day.',
            "Pending patients appear at the top of the list.",
            "Patients in consultation or already done appear below.",
            "Tap any patient to view their full consultation details.",
            "Your receptionist registers patients — you focus on examining them.",
          ],
        },
        {
          title: "Viewing Patient Records",
          steps: [
            'Tap "Records" in the bottom navigation (or sidebar on desktop).',
            "Search for a patient by name or mobile number.",
            "Tap on a patient to view their complete visit history.",
            "Each visit shows date, diagnosis, and whether a prescription was delivered.",
          ],
        },
        {
          title: "Issuing a Medical Certificate",
          steps: [
            'Open a patient from Records and tap "Certificate" — or register the patient with the "Certificate" purpose to start one straight from the queue.',
            "Choose the type — Unfit / Sick Leave, Fitness to Resume Duty, or Fitness for Employment.",
            "The patient's name, age, and sex fill in automatically; add the diagnosis, dates, and any remarks. Leave days are calculated for you.",
            'Check the live A4 preview, then tap "Send on WhatsApp", "Download PDF", or "Print".',
            "Every certificate is saved under Menu → Certificate Records, searchable by patient, type, and date, and kept for 3 years for legal retrieval.",
            "Certificates work on both Starter and Pro — they never use voice or AI.",
          ],
        },
        {
          title: "Patient Dues (Outstanding Fees)",
          steps: [
            'When you send a prescription, the "Amount paid" box is pre-filled with the full fee — confirm it, or enter a lower amount to leave the balance as a due.',
            "Go to Menu → Patient Dues to see everyone who still owes, newest first, with the total outstanding.",
            "Search by name and tap a patient to open their dues detail, then record a payment to clear or reduce the balance.",
            "Note: This is your clinic's own fee bookkeeping — it is separate from your MediReach subscription billing.",
          ],
        },
        {
          title: "Revenue — Income, Expenses & Tally",
          steps: [
            "Go to Menu → Revenue.",
            "The Income tab totals fees collected — today, this month, and month-by-month; expand a month, then a day, to see each patient and amount. Income comes from the fees you enter when confirming a consultation.",
            "The Expenses tab lets you add clinic costs (rent, electricity, medicine purchase, staff salary, equipment, other) with bill number, vendor, amount paid, and balance due.",
            "The Tally tab shows Income − Expenses = Net for each month and all-time.",
          ],
        },
        {
          title: "Keyword Shortcuts (Edit Keyword)",
          steps: [
            "Go to Menu → Edit Keyword.",
            "Each consultation field (complaints, diagnosis, medicines, advice, and more) has its own shortcut dictionary — tap a field to expand it.",
            "Add a shortcut and the full text it should expand to. For medicines, one shortcut can capture type, contains, dose, frequency, timing, and dispense-from.",
            'On the consultation screen, typing the shortcut fills in the full text automatically — e.g. "p5" becomes "Tab. Paracetamol 500mg".',
            "Edit or delete any shortcut anytime. Shortcuts speed up typing on both Starter and Pro.",
          ],
        },
        {
          title: "Digital Visiting Card",
          steps: [
            'Go to Menu → Digital Visiting Card and tap "Get started" — your profile details are pre-filled.',
            "Add a tagline, services, languages, photos, and a maps link, then save to publish.",
            'Share the public link or QR code with patients, or tap "Open" to view the live page.',
            "Download the QR (PNG) for your prescription pad or clinic door, or download the full card image.",
            "Edit or delete the card anytime; deleting stops the public link from working.",
          ],
        },
        {
          title: "Designing Your Prescription Template",
          steps: [
            "Go to Menu → Design Prescription.",
            "Set your clinic name, address, and consultation timings.",
            "Enter your degree and medical registration number.",
            "Preview the template to see how prescriptions will look.",
            "Save — all future prescriptions use this template automatically.",
          ],
        },
        {
          title: "Managing Receptionists (Staff)",
          steps: [
            "Go to Menu → Staff.",
            'Tap "Add Receptionist" to create a new front-desk account.',
            "Enter the receptionist's name, a unique username, and a password.",
            "Share the username and password with your receptionist to let them log in.",
            "To remove a receptionist, tap their name and select Delete.",
            "Deleting a receptionist immediately ends their active session.",
          ],
        },
        {
          title: "Emergency Contacts (SOS)",
          steps: [
            "Go to Menu → Emergency Contacts.",
            "Search for and add up to 10 trusted doctor contacts by their app ID.",
            "In an emergency, tap the SOS button (top-right corner of the header).",
            "All your emergency contacts receive an instant alert.",
          ],
        },
        {
          title: "Billing & Subscription",
          steps: [
            "Go to Menu → Billing.",
            "Your plan is shown at the top — Starter (typing only, flat ₹499 per cycle) or Pro (voice + AI, billed per patient with a ₹299 monthly minimum).",
            'To change plans, tap "Upgrade to Pro" or "Downgrade". Upgrading unlocks voice and AI immediately; downgrading keeps them until the current cycle ends, then moves you to the flat ₹499 Starter plan.',
            "On Pro, only full consultations and follow-ups are billed — certificates, dressing, BP checks and other quick services don't count toward the per-patient charge.",
            'The current cycle\'s live projected charge is shown at the top; open or pay invoices from the Invoices list ("View invoice up to today" shows a live sample).',
            "Contact support if you have billing queries: admin.medireach@gmail.com",
          ],
        },
        {
          title: "WhatsApp Delivery Default",
          steps: [
            "Go to Menu → WhatsApp delivery default.",
            "Toggle the switch to set whether prescriptions are sent via WhatsApp by default.",
            "You can override this per patient during each consultation.",
          ],
        },
      ],
    },

    mr: {
      heading: "डॉक्टर वापरकर्ता मार्गदर्शक",
      roleLabel: "डॉक्टर",
      intro:
        "MediReach मध्ये आपले स्वागत आहे! हे मार्गदर्शक आपल्याला दैनंदिन क्लिनिक कार्यप्रवाहासाठी अॅप प्रभावीपणे वापरण्यास मदत करेल.",
      sections: [
        {
          title: "रुग्ण सल्लामसलत सुरू करणे",
          steps: [
            '"आजचे" (Today) स्क्रीनवर "प्रतीक्षेत" (Pending) स्थितीतील रुग्णावर टॅप करा.',
            '"सल्लामसलत सुरू करा" (Start Consultation) टॅप करा.',
            'Pro प्लॅनवर "🎤 डिक्टेट" (Dictate) टॅप करा आणि स्वाभाविकपणे बोला — इंग्रजी, हिंदी किंवा मराठी सर्व चालते — AI आपोआप निदान, उपचार आणि प्रिस्क्रिप्शन भरेल.',
            "Starter प्लॅनवर प्रत्येक फील्ड स्वतः टाइप करा. टाइप करताना कीवर्ड शॉर्टकट पूर्ण मजकुरात विस्तारतात, त्यामुळे नोंद जलद होते.",
            "प्रत्येक फील्ड तपासा किंवा संपादित करा — तक्रारी, तपासणी, निदान, औषधे, सल्ला आणि फी.",
            '"पुढे" (Next) टॅप करून प्रिस्क्रिप्शन तपासा, नंतर "प्रिस्क्रिप्शन पाठवा" (Send Prescription) टॅप करा.',
            "रांगेत परत जाण्यापूर्वी WhatsApp वर प्रिस्क्रिप्शन शेअर करा आणि जमा झालेली फी नोंदवा.",
          ],
        },
        {
          title: "आजची रांग व्यवस्थापित करणे",
          steps: [
            '"आजचे" (Today) स्क्रीनवर आजच्या दिवसात नोंदणी केलेले सर्व रुग्ण दिसतात.',
            "प्रतीक्षेत असलेले रुग्ण यादीच्या वरती दिसतात.",
            "सल्लामसलत होत असलेले किंवा आधीच पूर्ण झालेले रुग्ण खाली दिसतात.",
            "संपूर्ण सल्लामसलत तपशील पाहण्यासाठी कोणत्याही रुग्णावर टॅप करा.",
            "आपला रिसेप्शनिस्ट रुग्ण नोंदणी करतो — आपण तपासणीवर लक्ष केंद्रित करा.",
          ],
        },
        {
          title: "रुग्ण नोंदी पाहणे",
          steps: [
            'खालील नेव्हिगेशन (किंवा डेस्कटॉपवर साइडबार) मधील "नोंदी" (Records) टॅप करा.',
            "नाव किंवा मोबाइल नंबरने रुग्ण शोधा.",
            "संपूर्ण भेट इतिहास पाहण्यासाठी रुग्णावर टॅप करा.",
            "प्रत्येक भेटीत तारीख, निदान आणि प्रिस्क्रिप्शन पोहोचले का ते दिसते.",
          ],
        },
        {
          title: "वैद्यकीय प्रमाणपत्र देणे",
          steps: [
            'Records मधून रुग्ण उघडा आणि "Certificate" टॅप करा — किंवा रुग्णाची "Certificate" उद्देशाने नोंदणी करून थेट रांगेतून सुरू करा.',
            "प्रकार निवडा — Unfit / आजारी रजा, कामावर परतण्यास योग्य (Fitness to Resume), किंवा नोकरीसाठी योग्यता (Fitness for Employment).",
            "रुग्णाचे नाव, वय आणि लिंग आपोआप भरले जाते; निदान, तारखा आणि टिप्पणी जोडा. रजेचे दिवस आपोआप मोजले जातात.",
            'थेट A4 प्रीव्ह्यू तपासा, नंतर "Send on WhatsApp", "Download PDF" किंवा "Print" टॅप करा.',
            "प्रत्येक प्रमाणपत्र मेनू → Certificate Records मध्ये जतन होते — रुग्ण, प्रकार आणि तारखेनुसार शोधता येते आणि कायदेशीर गरजेसाठी 3 वर्षे ठेवले जाते.",
            "प्रमाणपत्रे Starter आणि Pro दोन्हीवर चालतात — ती व्हॉइस किंवा AI वापरत नाहीत.",
          ],
        },
        {
          title: "रुग्णाची बाकी (थकीत फी)",
          steps: [
            'प्रिस्क्रिप्शन पाठवताना "Amount paid" बॉक्स पूर्ण फीने आधीच भरलेला असतो — त्याची पुष्टी करा, किंवा कमी रक्कम टाकून उर्वरित बाकी म्हणून ठेवा.',
            "थकबाकी असलेले सर्व रुग्ण पाहण्यासाठी मेनू → Patient Dues मध्ये जा — नवीनतम प्रथम, एकूण थकीत रकमेसह.",
            "नावाने शोधा आणि रुग्णावर टॅप करून त्यांचा बाकी तपशील उघडा, नंतर पेमेंट नोंदवून बाकी संपवा किंवा कमी करा.",
            "नोंद: ही आपल्या क्लिनिकची स्वतःची फी नोंदवही आहे — ती आपल्या MediReach सदस्यता बिलिंगपेक्षा वेगळी आहे.",
          ],
        },
        {
          title: "महसूल — उत्पन्न, खर्च आणि ताळेबंद",
          steps: [
            "मेनू → Revenue मध्ये जा.",
            "Income टॅब जमा झालेली फी दाखवतो — आज, या महिन्यात आणि महिन्यानुसार; महिना, नंतर दिवस विस्तारून प्रत्येक रुग्ण व रक्कम पाहा. उत्पन्न सल्लामसलत पुष्टी करताना टाकलेल्या फीमधून येते.",
            "Expenses टॅबमध्ये क्लिनिकचे खर्च (भाडे, वीज, औषध खरेदी, कर्मचारी पगार, उपकरणे, इतर) बिल क्रमांक, विक्रेता, भरलेली रक्कम आणि उर्वरित बाकीसह जोडा.",
            "Tally टॅब प्रत्येक महिन्यासाठी आणि सर्वकाळासाठी उत्पन्न − खर्च = निव्वळ दाखवतो.",
          ],
        },
        {
          title: "कीवर्ड शॉर्टकट (Edit Keyword)",
          steps: [
            "मेनू → Edit Keyword मध्ये जा.",
            "प्रत्येक सल्लामसलत फील्डला (तक्रारी, निदान, औषधे, सल्ला आणि अधिक) स्वतःची शॉर्टकट डिक्शनरी असते — फील्ड विस्तारण्यासाठी त्यावर टॅप करा.",
            "शॉर्टकट आणि तो कशात विस्तारावा तो पूर्ण मजकूर जोडा. औषधांसाठी एका शॉर्टकटमध्ये प्रकार, घटक, डोस, वारंवारता, वेळ आणि कोठून द्यायचे हे सर्व नोंदवता येते.",
            'सल्लामसलत स्क्रीनवर शॉर्टकट टाइप केल्यास पूर्ण मजकूर आपोआप भरतो — उदा. "p5" चे "Tab. Paracetamol 500mg" होते.',
            "कोणताही शॉर्टकट कधीही संपादित किंवा हटवा. शॉर्टकट Starter आणि Pro दोन्हीवर टायपिंग जलद करतात.",
          ],
        },
        {
          title: "डिजिटल व्हिजिटिंग कार्ड",
          steps: [
            'मेनू → Digital Visiting Card मध्ये जा आणि "Get started" टॅप करा — आपल्या प्रोफाइलचे तपशील आधीच भरलेले असतात.',
            "टॅगलाइन, सेवा, भाषा, फोटो आणि नकाशा लिंक जोडा, नंतर प्रकाशित करण्यासाठी जतन करा.",
            'सार्वजनिक लिंक किंवा QR कोड रुग्णांना शेअर करा, किंवा थेट पान पाहण्यासाठी "Open" टॅप करा.',
            "प्रिस्क्रिप्शन पॅड किंवा क्लिनिकच्या दारासाठी QR (PNG) डाउनलोड करा, किंवा पूर्ण कार्ड इमेज डाउनलोड करा.",
            "कार्ड कधीही संपादित किंवा हटवा; हटवल्यास सार्वजनिक लिंक चालणे थांबते.",
          ],
        },
        {
          title: "प्रिस्क्रिप्शन टेम्प्लेट डिझाइन करणे",
          steps: [
            "मेनू → प्रिस्क्रिप्शन डिझाइन करा (Design Prescription) मध्ये जा.",
            "आपल्या क्लिनिकचे नाव, पत्ता आणि सल्लामसलतीच्या वेळा सेट करा.",
            "आपली पदवी आणि वैद्यकीय नोंदणी क्रमांक टाका.",
            "प्रिस्क्रिप्शन कसे दिसेल ते पाहण्यासाठी टेम्प्लेट प्रीव्यू करा.",
            "जतन करा — सर्व भविष्यातील प्रिस्क्रिप्शन आपोआप हे टेम्प्लेट वापरतील.",
          ],
        },
        {
          title: "रिसेप्शनिस्ट (कर्मचारी) व्यवस्थापित करणे",
          steps: [
            "मेनू → कर्मचारी (Staff) मध्ये जा.",
            '"रिसेप्शनिस्ट जोडा" (Add Receptionist) टॅप करून नवीन फ्रंट-डेस्क खाते तयार करा.',
            "रिसेप्शनिस्टचे नाव, एक अनोखे वापरकर्तानाव आणि पासवर्ड टाका.",
            "रिसेप्शनिस्टला लॉगिन करण्यासाठी वापरकर्तानाव आणि पासवर्ड द्या.",
            "रिसेप्शनिस्ट काढण्यासाठी त्यांच्या नावावर टॅप करा आणि 'हटवा' (Delete) निवडा.",
            "रिसेप्शनिस्ट हटवल्यावर त्यांचे सत्र (session) लगेच संपते.",
          ],
        },
        {
          title: "आपत्कालीन संपर्क (SOS)",
          steps: [
            "मेनू → आपत्कालीन संपर्क (Emergency Contacts) मध्ये जा.",
            "त्यांच्या अॅप आयडीनुसार 10 पर्यंत विश्वासू डॉक्टर संपर्क शोधा आणि जोडा.",
            "आपत्कालीन परिस्थितीत हेडरच्या वरच्या-उजव्या कोपऱ्यातील SOS बटण टॅप करा.",
            "आपल्या सर्व आपत्कालीन संपर्कांना तात्काळ सतर्कता मिळते.",
          ],
        },
        {
          title: "बिलिंग आणि सदस्यता",
          steps: [
            "मेनू → बिलिंग (Billing) मध्ये जा.",
            "आपली योजना वरती दिसते — Starter (फक्त टायपिंग, दर चक्राला सपाट ₹499) किंवा Pro (व्हॉइस + AI, प्रति-रुग्ण शुल्क, दरमहा किमान ₹299).",
            'योजना बदलण्यासाठी "Upgrade to Pro" किंवा "Downgrade" टॅप करा. अपग्रेड केल्यास व्हॉइस आणि AI लगेच सुरू होतात; डाउनग्रेड केल्यास चालू चक्र संपेपर्यंत ते राहतात, नंतर सपाट ₹499 Starter योजनेवर जाता.',
            "Pro वर फक्त पूर्ण सल्लामसलत आणि फॉलो-अप बिल होतात — प्रमाणपत्र, ड्रेसिंग, BP तपासणी व इतर जलद सेवा प्रति-रुग्ण शुल्कात मोजल्या जात नाहीत.",
            "चालू चक्राचे अंदाजित शुल्क वरती थेट दिसते; \"View invoice up to today\" थेट नमुना दाखवते आणि Invoices यादीतून इनव्हॉइस पाहा किंवा भरा.",
            "बिलिंगबद्दल प्रश्न असल्यास संपर्क करा: admin.medireach@gmail.com",
          ],
        },
        {
          title: "WhatsApp डिलिव्हरी डीफॉल्ट",
          steps: [
            "मेनू → WhatsApp डिलिव्हरी डीफॉल्ट मध्ये जा.",
            "डीफॉल्टनुसार प्रिस्क्रिप्शन WhatsApp वर पाठवायचे की नाही ते टॉगल करा.",
            "प्रत्येक सल्लामसलत दरम्यान आपण हे प्रति-रुग्ण बदलू शकता.",
          ],
        },
      ],
    },

    hi: {
      heading: "डॉक्टर उपयोगकर्ता मार्गदर्शिका",
      roleLabel: "डॉक्टर",
      intro:
        "MediReach में आपका स्वागत है! यह मार्गदर्शिका आपको अपने दैनिक क्लिनिक कार्यप्रवाह के लिए ऐप का प्रभावी ढंग से उपयोग करने में मदद करेगी।",
      sections: [
        {
          title: "मरीज परामर्श शुरू करना",
          steps: [
            '"आज" (Today) स्क्रीन पर "प्रतीक्षा में" (Pending) स्थिति के मरीज पर टैप करें।',
            '"परामर्श शुरू करें" (Start Consultation) टैप करें।',
            'Pro प्लान पर "🎤 डिक्टेट" (Dictate) टैप करें और स्वाभाविक रूप से बोलें — अंग्रेजी, हिंदी या मराठी सब काम करते हैं — AI स्वतः निदान, उपचार और नुस्खा भर देगा।',
            "Starter प्लान पर हर फ़ील्ड खुद टाइप करें। टाइप करते समय कीवर्ड शॉर्टकट पूरे पाठ में विस्तृत हो जाते हैं, जिससे प्रविष्टि तेज रहती है।",
            "हर फ़ील्ड की समीक्षा या संपादन करें — शिकायतें, जांच, निदान, दवाएं, सलाह और फीस।",
            '"आगे" (Next) टैप करके नुस्खे की समीक्षा करें, फिर "नुस्खा भेजें" (Send Prescription) टैप करें।',
            "कतार में लौटने से पहले WhatsApp पर नुस्खा साझा करें और वसूली गई फीस दर्ज करें।",
          ],
        },
        {
          title: "आज की कतार प्रबंधित करना",
          steps: [
            '"आज" (Today) स्क्रीन पर आज के दिन पंजीकृत सभी मरीज दिखते हैं।',
            "प्रतीक्षा में वाले मरीज सूची के ऊपर दिखते हैं।",
            "परामर्श में या पहले से पूर्ण हो चुके मरीज नीचे दिखते हैं।",
            "पूर्ण परामर्श विवरण देखने के लिए किसी भी मरीज पर टैप करें।",
            "आपका रिसेप्शनिस्ट मरीज पंजीकृत करता है — आप जांच पर ध्यान केंद्रित करें।",
          ],
        },
        {
          title: "मरीज के रिकॉर्ड देखना",
          steps: [
            'नीचे नेविगेशन (या डेस्कटॉप पर साइडबार) में "रिकॉर्ड" (Records) टैप करें।',
            "नाम या मोबाइल नंबर से मरीज खोजें।",
            "पूर्ण यात्रा इतिहास देखने के लिए मरीज पर टैप करें।",
            "प्रत्येक यात्रा में तारीख, निदान और नुस्खा पहुंचा या नहीं दिखता है।",
          ],
        },
        {
          title: "मेडिकल सर्टिफिकेट जारी करना",
          steps: [
            'Records से मरीज खोलें और "Certificate" टैप करें — या मरीज को "Certificate" उद्देश्य से पंजीकृत करके सीधे कतार से शुरू करें।',
            "प्रकार चुनें — Unfit / बीमारी की छुट्टी, काम पर लौटने की फिटनेस (Fitness to Resume), या नौकरी के लिए फिटनेस (Fitness for Employment)।",
            "मरीज का नाम, उम्र और लिंग स्वतः भर जाता है; निदान, तारीखें और टिप्पणियां जोड़ें। छुट्टी के दिन स्वतः गिने जाते हैं।",
            'लाइव A4 पूर्वावलोकन जांचें, फिर "Send on WhatsApp", "Download PDF" या "Print" टैप करें।',
            "हर सर्टिफिकेट मेनू → Certificate Records में सहेजा जाता है — मरीज, प्रकार और तारीख से खोजा जा सकता है और कानूनी जरूरत के लिए 3 साल रखा जाता है।",
            "सर्टिफिकेट Starter और Pro दोनों पर काम करते हैं — वे कभी वॉइस या AI का उपयोग नहीं करते।",
          ],
        },
        {
          title: "मरीज की बकाया (लंबित फीस)",
          steps: [
            'नुस्खा भेजते समय "Amount paid" बॉक्स पूरी फीस से पहले से भरा होता है — इसकी पुष्टि करें, या कम राशि दर्ज करके शेष को बकाया के रूप में छोड़ दें।',
            "बकाया रखने वाले सभी मरीज देखने के लिए मेनू → Patient Dues में जाएं — नवीनतम पहले, कुल लंबित राशि के साथ।",
            "नाम से खोजें और मरीज पर टैप करके उनका बकाया विवरण खोलें, फिर भुगतान दर्ज करके शेष को साफ करें या घटाएं।",
            "नोट: यह आपके क्लिनिक की अपनी फीस बहीखाता है — यह आपकी MediReach सदस्यता बिलिंग से अलग है।",
          ],
        },
        {
          title: "राजस्व — आय, व्यय और तालमेल",
          steps: [
            "मेनू → Revenue में जाएं।",
            "Income टैब वसूली गई फीस दिखाता है — आज, इस माह और महीने-दर-महीने; महीना, फिर दिन विस्तृत करके हर मरीज और राशि देखें। आय परामर्श की पुष्टि करते समय दर्ज की गई फीस से आती है।",
            "Expenses टैब में क्लिनिक के खर्च (किराया, बिजली, दवा खरीद, स्टाफ वेतन, उपकरण, अन्य) बिल नंबर, विक्रेता, भुगतान की गई राशि और शेष बकाया के साथ जोड़ें।",
            "Tally टैब हर महीने और सर्वकालिक के लिए आय − व्यय = शुद्ध दिखाता है।",
          ],
        },
        {
          title: "कीवर्ड शॉर्टकट (Edit Keyword)",
          steps: [
            "मेनू → Edit Keyword में जाएं।",
            "हर परामर्श फ़ील्ड (शिकायतें, निदान, दवाएं, सलाह और अधिक) की अपनी शॉर्टकट डिक्शनरी होती है — फ़ील्ड विस्तृत करने के लिए उस पर टैप करें।",
            "शॉर्टकट और वह पूरा पाठ जोड़ें जिसमें वह विस्तृत होना चाहिए। दवाओं के लिए एक ही शॉर्टकट में प्रकार, घटक, खुराक, आवृत्ति, समय और कहां से देना है, सब दर्ज किया जा सकता है।",
            'परामर्श स्क्रीन पर शॉर्टकट टाइप करने पर पूरा पाठ स्वतः भर जाता है — जैसे "p5" से "Tab. Paracetamol 500mg" बन जाता है।',
            "किसी भी शॉर्टकट को कभी भी संपादित या हटाएं। शॉर्टकट Starter और Pro दोनों पर टाइपिंग तेज करते हैं।",
          ],
        },
        {
          title: "डिजिटल विजिटिंग कार्ड",
          steps: [
            'मेनू → Digital Visiting Card में जाएं और "Get started" टैप करें — आपके प्रोफ़ाइल विवरण पहले से भरे होते हैं।',
            "एक टैगलाइन, सेवाएं, भाषाएं, फोटो और मैप्स लिंक जोड़ें, फिर प्रकाशित करने के लिए सहेजें।",
            'सार्वजनिक लिंक या QR कोड मरीजों को साझा करें, या लाइव पेज देखने के लिए "Open" टैप करें।',
            "प्रिस्क्रिप्शन पैड या क्लिनिक के दरवाजे के लिए QR (PNG) डाउनलोड करें, या पूरी कार्ड इमेज डाउनलोड करें।",
            "कार्ड को कभी भी संपादित या हटाएं; हटाने पर सार्वजनिक लिंक काम करना बंद कर देता है।",
          ],
        },
        {
          title: "प्रिस्क्रिप्शन टेम्पलेट डिजाइन करना",
          steps: [
            "मेनू → प्रिस्क्रिप्शन डिजाइन करें (Design Prescription) में जाएं।",
            "अपने क्लिनिक का नाम, पता और परामर्श का समय सेट करें।",
            "अपनी डिग्री और चिकित्सा पंजीकरण नंबर डालें।",
            "टेम्पलेट का पूर्वावलोकन करें कि नुस्खे कैसे दिखेंगे।",
            "सहेजें — सभी भविष्य के नुस्खे स्वतः इस टेम्पलेट का उपयोग करेंगे।",
          ],
        },
        {
          title: "रिसेप्शनिस्ट (स्टाफ) प्रबंधित करना",
          steps: [
            "मेनू → स्टाफ (Staff) में जाएं।",
            '"रिसेप्शनिस्ट जोड़ें" (Add Receptionist) टैप करके नया फ्रंट-डेस्क खाता बनाएं।',
            "रिसेप्शनिस्ट का नाम, एक अनूठा उपयोगकर्ता नाम और पासवर्ड डालें।",
            "रिसेप्शनिस्ट को लॉगिन के लिए उपयोगकर्ता नाम और पासवर्ड दें।",
            "रिसेप्शनिस्ट हटाने के लिए उनके नाम पर टैप करें और 'हटाएं' (Delete) चुनें।",
            "रिसेप्शनिस्ट हटाने पर उनका सत्र (session) तुरंत समाप्त हो जाता है।",
          ],
        },
        {
          title: "आपातकालीन संपर्क (SOS)",
          steps: [
            "मेनू → आपातकालीन संपर्क (Emergency Contacts) में जाएं।",
            "उनके ऐप आईडी से 10 तक विश्वसनीय डॉक्टर संपर्क खोजें और जोड़ें।",
            "आपात स्थिति में हेडर के ऊपर-दाईं ओर SOS बटन टैप करें।",
            "आपके सभी आपातकालीन संपर्कों को तुरंत अलर्ट मिलता है।",
          ],
        },
        {
          title: "बिलिंग और सदस्यता",
          steps: [
            "मेनू → बिलिंग (Billing) में जाएं।",
            "आपकी योजना ऊपर दिखती है — Starter (केवल टाइपिंग, प्रति चक्र सपाट ₹499) या Pro (वॉइस + AI, प्रति-मरीज शुल्क, प्रति माह न्यूनतम ₹299)।",
            'योजना बदलने के लिए "Upgrade to Pro" या "Downgrade" टैप करें। अपग्रेड करने पर वॉइस और AI तुरंत चालू हो जाते हैं; डाउनग्रेड करने पर वे चालू चक्र के अंत तक बने रहते हैं, फिर आप सपाट ₹499 Starter योजना पर आ जाते हैं।',
            "Pro पर केवल पूर्ण परामर्श और फॉलो-अप बिल होते हैं — प्रमाणपत्र, ड्रेसिंग, BP जांच और अन्य त्वरित सेवाएं प्रति-मरीज शुल्क में नहीं गिनी जातीं।",
            "चालू चक्र का अनुमानित शुल्क ऊपर सीधे दिखता है; \"View invoice up to today\" एक लाइव नमूना दिखाता है और Invoices सूची से चालान देखें या भुगतान करें।",
            "बिलिंग संबंधी प्रश्नों के लिए संपर्क करें: admin.medireach@gmail.com",
          ],
        },
        {
          title: "WhatsApp डिलीवरी डिफ़ॉल्ट",
          steps: [
            "मेनू → WhatsApp डिलीवरी डिफ़ॉल्ट में जाएं।",
            "डिफ़ॉल्ट रूप से WhatsApp पर नुस्खा भेजना है या नहीं, टॉगल करें।",
            "प्रत्येक परामर्श के दौरान आप इसे प्रति-मरीज बदल सकते हैं।",
          ],
        },
      ],
    },
  },
};

const LANG_LABELS: Record<Lang, string> = { en: "EN", mr: "MR", hi: "HI" };

export function GuideClient({ role }: { role: Role }) {
  const [lang, setLang] = useState<Lang>("en");

  const guideKey = role === "receptionist" ? "reception" : "doctor";
  const content = GUIDE[guideKey][lang];

  return (
    <div className="space-y-6">
      {/* Header row: title + language toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-muted">
            {content.roleLabel}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{content.heading}</h1>
        </div>

        {/* Language toggle */}
        <div className="flex shrink-0 overflow-hidden rounded-xl border border-line bg-surface">
          {(["en", "mr", "hi"] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={cn(
                "px-3 py-1.5 text-sm font-semibold transition-colors",
                lang === l
                  ? "bg-brand text-white"
                  : "text-ink-muted hover:bg-surface-raised hover:text-ink",
              )}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Intro */}
      <p className="text-ink-muted">{content.intro}</p>

      {/* Sections */}
      <div className="space-y-4">
        {content.sections.map((section, si) => (
          <Card key={si} className="p-5">
            <h2 className="mb-3 text-base font-bold text-ink">
              {si + 1}. {section.title}
            </h2>
            <ol className="space-y-2">
              {section.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-ink-muted">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>

      <p className="text-center text-sm text-ink-muted">
        Need help?{" "}
        <a href="mailto:admin.medireach@gmail.com" className="text-brand">
          admin.medireach@gmail.com
        </a>
      </p>
    </div>
  );
}
