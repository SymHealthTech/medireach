/**
 * Health tips library: short, general health articles shown in the "Health
 * tips" section of doctor websites (portfolio design 2 onwards). They are for
 * information only and carry no author: they are not written by, or
 * attributed to, the doctor whose page shows them.
 *
 * Each tip lists the specialty slugs it suits (master-list slugs, e.g.
 * "general-physician"), or "all". lib/health-tips.ts picks two per doctor from
 * their specialties, varied per doctor, so neighbouring websites differ.
 *
 * Rules: plain language, no claims of cure, no superlatives, no numbers of
 * patients, always "see a doctor" for warning signs. The NMC wording test in
 * test/clinic-modern.test.ts scans every tip. Covers: public/templates/health-tips
 * (Pexels, see public/templates/clinic-modern/CREDITS.md).
 */

export interface HealthTip {
  slug: string;
  title: string;
  excerpt: string;
  /** File name in public/templates/health-tips (without .jpg) and its alt text. */
  cover: { file: string; alt: string };
  topic: string;
  specialties: readonly string[] | "all";
  /** Paragraphs. */
  body: readonly string[];
}

const GP = ["general-physician", "family-physician", "consultant-physician", "geriatrician"];

export const HEALTH_TIPS: readonly HealthTip[] = [
  {
    slug: "monsoon-fevers-when-to-see-a-doctor",
    title: "Monsoon fevers: when to see a doctor",
    excerpt: "Most fevers settle in a few days, but dengue, malaria and typhoid need timely care. Know the warning signs.",
    cover: { file: "monsoon", alt: "Green hills during the monsoon" },
    topic: "Monsoon",
    specialties: [...GP, "paediatrician"],
    body: [
      "From June to September, fever is one of the most common reasons people visit a clinic. Many are simple viral fevers that settle in three to five days with rest and fluids. The monsoon also brings dengue, malaria and typhoid, which need timely attention.",
      "See a doctor the same day if a fever lasts more than two days, or comes with severe body ache, pain behind the eyes, a rash, vomiting, loose motions or much less urine than usual. Older people, pregnant women, young children and people with diabetes should be seen early.",
      "Go to a hospital straight away for bleeding from the gums or nose, black stools, severe stomach pain, breathlessness, confusion or fainting. In dengue, the risky phase often comes as the fever settles, around day four to six.",
      "Avoid painkillers such as ibuprofen, diclofenac or aspirin when dengue is possible, and do not start leftover antibiotics. Empty standing water from coolers, pots and trays every week: the mosquitoes that spread dengue breed in clean, still water.",
    ],
  },
  {
    slug: "checking-blood-pressure-at-home",
    title: "Checking your blood pressure at home",
    excerpt: "Home readings help your doctor adjust treatment. How to measure correctly, and which numbers mean you should call.",
    cover: { file: "bp", alt: "A blood pressure check with a cuff on the upper arm" },
    topic: "Blood pressure",
    specialties: [...GP, "cardiologist", "nephrologist", "diabetologist"],
    body: [
      "Many people feel anxious in a clinic and their blood pressure reads higher than usual. Home readings, taken correctly, give a truer picture.",
      "Use an automatic machine with an upper-arm cuff that fits your arm. Avoid tea, coffee, smoking and exercise for 30 minutes before measuring. Sit quietly for five minutes with your back supported, feet flat and arm resting at heart level, and do not talk during the reading.",
      "Take two readings a minute apart, morning and evening, for a week before your appointment, and write them down with the date and time.",
      "Call your doctor if readings are repeatedly above 160/100. Seek urgent care for a reading above 180/120 with headache, chest pain, breathlessness, weakness on one side or difficulty speaking. Never stop blood pressure medicines on your own.",
    ],
  },
  {
    slug: "a-balanced-indian-plate-for-diabetes",
    title: "A balanced Indian plate for diabetes",
    excerpt: "You do not need to give up roti or rice. A simple plate method that works in an everyday Indian kitchen.",
    cover: { file: "thali", alt: "An Indian thali with roti, dal, sabzi and rice" },
    topic: "Diabetes",
    specialties: [...GP, "diabetologist", "endocrinologist"],
    body: [
      "After a diabetes diagnosis, small steady changes to the food you already cook make a real difference to blood sugar.",
      "Fill half the plate with vegetables: sabzi, salad or a vegetable-rich dal. Fill a quarter with protein: dal, usal, paneer, curd, eggs, fish or chicken. Keep the last quarter for grains: one or two phulkas, a small bowl of rice or a bhakri.",
      "Choose grains with more fibre, such as jowar, bajra, nachni and whole wheat. Eat at regular times, and watch hidden sugar in tea, juices, biscuits and sweetened drinks.",
      "Food works together with daily walking, enough sleep and taking medicines on time. Bring your sugar readings to each visit so your doctor can adjust the plan.",
    ],
  },
  {
    slug: "using-your-glucometer-well",
    title: "Using your glucometer well",
    excerpt: "Clean hands, the right finger and a simple log turn home sugar checks into useful information for your doctor.",
    cover: { file: "glucometer", alt: "A glucometer with an apple and almonds" },
    topic: "Diabetes",
    specialties: ["diabetologist", "endocrinologist", ...GP],
    body: [
      "Wash and dry your hands before checking: traces of fruit or sweets on the fingers can give a falsely high reading.",
      "Prick the side of the fingertip rather than the pad, and change fingers each time. Use a fresh lancet and check that the strips are within their expiry date.",
      "Note the time, the reading and whether it was fasting or after a meal. Your doctor will tell you how often to check; many people need only a few checks a week.",
      "If readings are repeatedly above 300 or below 70, or you feel shaky, sweaty or confused, contact your doctor. Keep glucose tablets or sugar handy if you take insulin or sugar-lowering tablets.",
    ],
  },
  {
    slug: "drinking-enough-water-in-summer",
    title: "Drinking enough water in the summer",
    excerpt: "Heat, work and travel can leave you dehydrated before you feel thirsty. Simple habits that help.",
    cover: { file: "water", alt: "Water being poured into a glass" },
    topic: "Summer",
    specialties: "all",
    body: [
      "In hot weather the body loses water through sweat, often faster than we notice. Headache, tiredness, dark urine and dizziness are early signs of dehydration.",
      "Carry a water bottle and sip through the day. Buttermilk, lemon water, coconut water and ORS also help, especially after heavy sweating or loose motions.",
      "Older people and children may not feel thirsty, so remind them to drink. Avoid going out in the hottest hours when you can, and wear light, loose clothes.",
      "Seek medical help for confusion, fainting, very little urine or a high body temperature after time in the heat. If you have heart or kidney disease, ask your doctor how much fluid is right for you.",
    ],
  },
  {
    slug: "a-daily-walk-for-your-heart",
    title: "A daily walk for your heart",
    excerpt: "Thirty minutes of brisk walking on most days supports blood pressure, sugar, weight and mood.",
    cover: { file: "walk", alt: "People on a morning walk on a misty path" },
    topic: "Healthy living",
    specialties: "all",
    body: [
      "Regular walking is one of the simplest things you can do for your health. Aim for 30 minutes of brisk walking on most days, at a pace where you can talk but not sing.",
      "Start where you are. Ten minutes after breakfast and after dinner is a good beginning, and you can add a few minutes each week.",
      "Wear comfortable shoes, walk on even ground, and carry water. People with diabetes should check their feet for blisters after walking.",
      "Stop and seek help if you feel chest pain, unusual breathlessness, dizziness or palpitations while walking. If you have a heart condition, ask your doctor how much activity is right for you.",
    ],
  },
  {
    slug: "good-sleep-habits",
    title: "Simple habits for better sleep",
    excerpt: "Regular timings, a dark room and less screen time at night help most people sleep better.",
    cover: { file: "sleep", alt: "A person sleeping in a quiet bedroom" },
    topic: "Sleep",
    specialties: [...GP, "psychiatrist", "neurologist", "pulmonologist"],
    body: [
      "Most adults need seven to eight hours of sleep. Going to bed and waking at the same time every day, even on holidays, keeps the body clock steady.",
      "Keep the bedroom dark, quiet and cool. Put the phone away an hour before bed, and avoid tea, coffee and heavy meals late in the evening.",
      "If you cannot sleep after 20 minutes, get up and do something calm until you feel sleepy, then return to bed.",
      "Loud snoring with pauses in breathing, daytime sleepiness, or poor sleep that lasts for weeks are worth discussing with a doctor. Avoid taking sleeping pills without advice.",
    ],
  },
  {
    slug: "adult-vaccines-to-ask-about",
    title: "Vaccines adults should ask about",
    excerpt: "Vaccines are not only for children. Flu, tetanus, hepatitis B and others protect adults too.",
    cover: { file: "vaccine", alt: "A vaccine being given in the upper arm" },
    topic: "Vaccination",
    specialties: [...GP, "gynaecologist"],
    body: [
      "Many adults have not had all the vaccines that could protect them. A short conversation with your doctor can bring your vaccination record up to date.",
      "Commonly discussed vaccines include a yearly flu vaccine, a tetanus booster every ten years, hepatitis B, typhoid, HPV for young adults, and pneumococcal and shingles vaccines for older adults.",
      "Which vaccines you need depends on your age, health conditions, pregnancy plans, work and travel. People with diabetes, heart, lung or kidney disease often benefit most.",
      "Keep a written record of every vaccine with the date. Mild soreness or fever for a day is common; contact your doctor for anything more.",
    ],
  },
  {
    slug: "thyroid-tests-explained",
    title: "Thyroid tests, explained simply",
    excerpt: "What TSH, T3 and T4 mean, and why thyroid tablets are taken on an empty stomach.",
    cover: { file: "thyroid", alt: "A stethoscope beside a phone" },
    topic: "Thyroid",
    specialties: [...GP, "endocrinologist", "gynaecologist"],
    body: [
      "The thyroid gland controls how fast the body uses energy. An underactive thyroid can cause tiredness, weight gain, constipation and feeling cold; an overactive one can cause weight loss, palpitations and anxiety.",
      "The main blood test is TSH. A high TSH usually means the thyroid is underactive, and a low TSH that it is overactive. Your doctor may also check T3 and T4.",
      "Thyroid tablets work well when taken every morning on an empty stomach with water, at least 30 minutes before tea or breakfast, and away from calcium or iron tablets.",
      "Repeat the test as advised, usually six to eight weeks after a dose change. Tell your doctor if you are planning a pregnancy, as the dose often needs adjusting.",
    ],
  },
  {
    slug: "using-antibiotics-wisely",
    title: "Using antibiotics wisely",
    excerpt: "Antibiotics do not help colds and most coughs. When they are needed, and how to take them.",
    cover: { file: "medicines", alt: "Tablets and capsules in blister packs" },
    topic: "Medicines",
    specialties: "all",
    body: [
      "Most colds, sore throats and coughs are caused by viruses. Antibiotics do not work on viruses, and taking them unnecessarily can cause side effects and resistance.",
      "When your doctor prescribes an antibiotic, take the full course at the times advised, even if you feel better early.",
      "Do not use leftover antibiotics or share them with family members, and avoid buying them without a prescription.",
      "Tell your doctor about any allergy to medicines, and report rashes, swelling, breathlessness or severe loose motions while taking an antibiotic.",
    ],
  },
  {
    slug: "fever-in-children-what-parents-can-do",
    title: "Fever in children: what parents can do",
    excerpt: "How to check temperature, keep your child comfortable, and recognise the signs that need a doctor.",
    cover: { file: "child-fever", alt: "A mother checking her child's temperature" },
    topic: "Child health",
    specialties: ["paediatrician", "neonatologist", "family-physician", "general-physician"],
    body: [
      "Fever is the body's response to infection, and most childhood fevers are caused by viruses that settle in a few days.",
      "Use a digital thermometer. Dress your child lightly, offer plenty of fluids, and give paracetamol in the dose your doctor advises for your child's weight. Sponging with lukewarm, not cold, water can help comfort.",
      "See a doctor for a fever in a baby under three months, fever lasting more than two days, a rash, fast breathing, repeated vomiting, fewer wet nappies, or unusual drowsiness.",
      "Go to a hospital straight away for a fit, difficulty breathing, a child who is very hard to wake, or a rash that does not fade when pressed with a glass.",
    ],
  },
  {
    slug: "keeping-childrens-vaccines-on-time",
    title: "Keeping your child's vaccines on time",
    excerpt: "A simple way to stay on schedule, and what to expect after a vaccine.",
    cover: { file: "family", alt: "A family sharing a meal at home" },
    topic: "Child health",
    specialties: ["paediatrician", "neonatologist", "family-physician"],
    body: [
      "Vaccines protect children against serious illnesses such as measles, whooping cough and hepatitis. They work well when given at the recommended ages.",
      "Keep the vaccination card safe and bring it to every visit. Set phone reminders for the next due date.",
      "Mild fever, fussiness and a sore spot are common for a day or two after some vaccines. Your doctor can advise on paracetamol.",
      "If a dose is missed, it can usually be given later without restarting the schedule. Ask your doctor about catch-up doses.",
    ],
  },
  {
    slug: "eating-well-in-pregnancy",
    title: "Eating well during pregnancy",
    excerpt: "Iron, folic acid, protein and calcium matter most. Simple food choices for an Indian kitchen.",
    cover: { file: "pregnancy", alt: "A smiling pregnant woman in a saree" },
    topic: "Pregnancy",
    specialties: ["gynaecologist", "obstetrician", "infertility-specialist", "family-physician"],
    body: [
      "Pregnancy needs more iron, folic acid, protein and calcium. You do not need to eat for two, but every meal counts.",
      "Include dal, sprouts, eggs or paneer for protein, green leafy vegetables and jaggery for iron, and milk, curd or ragi for calcium. Take the supplements your doctor prescribes.",
      "Eat small, frequent meals if you feel nauseous. Avoid raw or undercooked meat and eggs, unpasteurised milk, and alcohol.",
      "Contact your doctor straight away for bleeding, severe headache, blurred vision, swelling of the face or hands, reduced baby movements, or leaking fluid.",
    ],
  },
  {
    slug: "pcos-and-everyday-habits",
    title: "PCOS and everyday habits",
    excerpt: "Irregular periods, acne and weight changes are common with PCOS. Daily habits that help along with treatment.",
    cover: { file: "walk", alt: "A misty path for a morning walk" },
    topic: "Women's health",
    specialties: ["gynaecologist", "endocrinologist", "dermatologist"],
    body: [
      "Polycystic ovary syndrome (PCOS) is common and can cause irregular periods, acne, extra hair growth and difficulty with weight.",
      "Regular activity and a balanced diet with plenty of vegetables, protein and whole grains help the body use insulin better. Even a small weight change can make periods more regular.",
      "Treatment depends on your symptoms and whether you are planning a pregnancy, so discuss your goals with your doctor.",
      "Keep a note of your period dates. Very heavy bleeding, no periods for three months, or difficulty conceiving after a year of trying are reasons to see a doctor.",
    ],
  },
  {
    slug: "sunscreen-in-indian-weather",
    title: "Sunscreen in Indian weather",
    excerpt: "Sun protection matters for every skin tone. How much to apply, and when to reapply.",
    cover: { file: "sunscreen", alt: "Two bottles of SPF 50 sunscreen" },
    topic: "Skin care",
    specialties: ["dermatologist", "cosmetologist", "plastic-surgeon"],
    body: [
      "Sun exposure can cause tanning, dark patches and early ageing on all skin tones. A broad-spectrum sunscreen of SPF 30 or more helps.",
      "Apply about two finger-lengths for the face and neck, 15 minutes before going out. Reapply every two to three hours outdoors, and after sweating or washing your face.",
      "Choose a gel or matte sunscreen for oily skin and a cream for dry skin. Add a cap, umbrella or long sleeves on very sunny days.",
      "See a doctor for a mole that changes in size, shape or colour, or a sore that does not heal in a few weeks.",
    ],
  },
  {
    slug: "a-gentle-skin-routine-for-acne",
    title: "A gentle skin routine for acne",
    excerpt: "Scrubbing harder does not clear acne. A simple routine that is kind to the skin.",
    cover: { file: "skin", alt: "A woman applying cream to her face" },
    topic: "Skin care",
    specialties: ["dermatologist", "cosmetologist"],
    body: [
      "Acne is common in teenagers and adults. Harsh scrubs, frequent face washing and squeezing pimples often make it worse and can leave marks.",
      "Wash your face twice a day with a mild cleanser, use a light, non-greasy moisturiser and wear sunscreen. Change pillow covers regularly.",
      "Avoid applying home remedies, steroid creams or products a friend recommends without advice. Treatments take six to eight weeks to show results.",
      "See a doctor for painful lumps, acne that leaves scars or dark marks, or acne that affects your confidence.",
    ],
  },
  {
    slug: "heart-attack-warning-signs",
    title: "Heart attack warning signs",
    excerpt: "Chest discomfort is not the only sign. Know the symptoms and what to do in the first minutes.",
    cover: { file: "heart", alt: "A stethoscope and a red paper heart" },
    topic: "Heart health",
    specialties: ["cardiologist", "interventional-cardiologist", "cardiothoracic-surgeon", ...GP],
    body: [
      "A heart attack may feel like pressure, heaviness or squeezing in the chest, which can spread to the arm, jaw, neck or back.",
      "Other signs include breathlessness, sweating, nausea and sudden tiredness. Women, older people and people with diabetes may have milder or unusual symptoms.",
      "If you suspect a heart attack, call 108 or go to the nearest hospital with emergency care at once. Do not drive yourself, and do not wait to see if it passes.",
      "Keeping blood pressure, sugar and cholesterol in check, not smoking and staying active all lower the risk. Ask your doctor how often to have a check-up.",
    ],
  },
  {
    slug: "understanding-your-cholesterol-report",
    title: "Understanding your cholesterol report",
    excerpt: "LDL, HDL and triglycerides explained, and the everyday changes that help.",
    cover: { file: "thali", alt: "A home-cooked Indian meal" },
    topic: "Heart health",
    specialties: ["cardiologist", ...GP, "endocrinologist"],
    body: [
      "A lipid profile measures fats in the blood. LDL is the cholesterol that can build up in blood vessels, HDL helps remove it, and triglycerides rise with sugar, refined flour and alcohol.",
      "Your target depends on your overall heart risk, which your doctor works out from your age, blood pressure, sugar, smoking and family history.",
      "Cut down on fried snacks, ghee-heavy sweets and packaged foods, eat more vegetables, fruits, dals and whole grains, and walk regularly.",
      "If medicines are prescribed, take them daily and repeat the test as advised. Do not stop them because the report looks normal: the medicine is often the reason.",
    ],
  },
  {
    slug: "looking-after-your-back",
    title: "Looking after your back",
    excerpt: "Most back pain improves with movement, not bed rest. Everyday posture and lifting tips.",
    cover: { file: "back-pain", alt: "A man holding his lower back" },
    topic: "Bones and joints",
    specialties: ["orthopaedic-surgeon", "spine-surgeon", "physiotherapist", "pain-management-specialist", ...GP],
    body: [
      "Most episodes of lower back pain get better within a few weeks. Gentle movement and walking usually help more than lying in bed.",
      "When sitting for long, keep your feet flat and back supported, and get up every 30 to 45 minutes. Lift heavy things by bending your knees and keeping the load close to your body.",
      "Regular exercise that strengthens the back and stomach muscles helps prevent pain from returning.",
      "See a doctor promptly for back pain with fever, weight loss, numbness or weakness in the legs, or difficulty passing urine or controlling the bowels.",
    ],
  },
  {
    slug: "caring-for-your-knees",
    title: "Caring for your knees",
    excerpt: "Strong muscles and a healthy weight take load off the knees. Simple ways to protect them.",
    cover: { file: "knee", alt: "A physiotherapist examining a knee" },
    topic: "Bones and joints",
    specialties: ["orthopaedic-surgeon", "rheumatologist", "sports-medicine-specialist", "physiotherapist", "geriatrician"],
    body: [
      "Knee pain is common with age, after injuries, and with extra body weight. Every kilogram of weight lost takes several kilograms of load off the knees when walking.",
      "Strengthening the thigh muscles with simple exercises supports the knee. A physiotherapist can show you a safe routine.",
      "Walking on level ground, cycling and swimming are gentle on the knees. Avoid sitting cross-legged or squatting for long if it causes pain.",
      "See a doctor for a swollen, hot or red knee, a knee that locks or gives way, or pain after a fall or twist.",
    ],
  },
  {
    slug: "screen-time-and-tired-eyes",
    title: "Screen time and tired eyes",
    excerpt: "Dry, tired eyes after long hours on a screen are common. The 20-20-20 habit and other tips.",
    cover: { file: "screen-eyes", alt: "A woman with tired eyes at a laptop" },
    topic: "Eye care",
    specialties: ["ophthalmologist", "optometrist", ...GP],
    body: [
      "Long hours on phones and laptops can cause dry, tired eyes, headaches and blurred vision because we blink less while staring at screens.",
      "Follow the 20-20-20 habit: every 20 minutes, look at something 20 feet away for 20 seconds. Remember to blink.",
      "Keep the screen an arm's length away and slightly below eye level, reduce glare, and use enough room light.",
      "Get your eyes tested if blurred vision or headaches continue. Children who hold books or phones very close should have an eye check too.",
    ],
  },
  {
    slug: "eye-checks-for-people-with-diabetes",
    title: "Eye checks for people with diabetes",
    excerpt: "Diabetes can affect the eyes without early symptoms. Why a yearly eye check matters.",
    cover: { file: "glucometer", alt: "A glucometer on a notebook" },
    topic: "Eye care",
    specialties: ["ophthalmologist", "diabetologist", "endocrinologist"],
    body: [
      "Diabetes can damage the small blood vessels at the back of the eye, a condition called diabetic retinopathy. In the early stages there may be no symptoms at all.",
      "A dilated eye examination once a year helps find changes early, when treatment can protect vision.",
      "Keeping blood sugar, blood pressure and cholesterol in range lowers the risk.",
      "See an eye doctor promptly for sudden blurred vision, floating spots, flashes of light or a curtain over part of your vision.",
    ],
  },
  {
    slug: "brushing-and-flossing-the-right-way",
    title: "Brushing and flossing the right way",
    excerpt: "Two minutes, twice a day, with a soft brush. Small habits that protect teeth and gums.",
    cover: { file: "teeth", alt: "Toothbrushes in a cup" },
    topic: "Dental care",
    specialties: ["dentist", "orthodontist", "endodontist", "periodontist", "prosthodontist", "paediatric-dentist"],
    body: [
      "Brush twice a day for two minutes with a soft brush and fluoride toothpaste. Use gentle circular movements and reach the gum line and back teeth.",
      "Clean between teeth once a day with floss or interdental brushes, where a toothbrush cannot reach.",
      "Cut down on sugary snacks and drinks between meals. Change your toothbrush every three months or when the bristles splay.",
      "See a dentist every six months, and sooner for tooth pain, bleeding gums, sensitivity or a broken filling.",
    ],
  },
  {
    slug: "bleeding-gums-what-they-mean",
    title: "Bleeding gums: what they mean",
    excerpt: "Gums that bleed while brushing are an early sign of gum disease, and it can be reversed early.",
    cover: { file: "toothpaste", alt: "A toothbrush with toothpaste" },
    topic: "Dental care",
    specialties: ["dentist", "periodontist"],
    body: [
      "Bleeding while brushing is often the first sign of gingivitis, an inflammation of the gums caused by plaque.",
      "Keep brushing gently and clean between teeth daily: stopping brushing makes it worse.",
      "A professional cleaning removes hardened deposits (tartar) that brushing cannot. Smoking and diabetes increase the risk of gum disease.",
      "See a dentist if bleeding continues for more than two weeks, or for loose teeth, bad breath that does not go away, or swollen gums.",
    ],
  },
  {
    slug: "using-an-inhaler-correctly",
    title: "Using an inhaler correctly",
    excerpt: "Many people with asthma do not get the full dose from their inhaler. A quick check of your technique.",
    cover: { file: "inhaler", alt: "A man using an inhaler" },
    topic: "Breathing",
    specialties: ["pulmonologist", "paediatrician", ...GP],
    body: [
      "Inhalers deliver medicine straight to the lungs, but only when used correctly. Ask your doctor to watch you use it at your next visit.",
      "For a metered-dose inhaler: shake it, breathe out fully, seal your lips around the mouthpiece, press once as you start a slow deep breath, then hold your breath for about ten seconds. A spacer helps many children and adults.",
      "Rinse your mouth after steroid inhalers. Keep using preventer inhalers daily even when you feel well.",
      "Seek urgent help if your reliever inhaler is not helping, you are too breathless to speak, or your lips turn blue.",
    ],
  },
  {
    slug: "acidity-everyday-tips",
    title: "Acidity and heartburn: everyday tips",
    excerpt: "Late dinners, spicy food and lying down after meals often trigger acidity. Simple changes that help.",
    cover: { file: "stomach", alt: "A man holding his stomach" },
    topic: "Digestion",
    specialties: ["gastroenterologist", ...GP],
    body: [
      "Acidity and heartburn happen when stomach acid comes up into the food pipe, causing a burning feeling in the chest or a sour taste.",
      "Eat smaller meals, finish dinner two to three hours before bed, and avoid lying down right after eating. Raising the head end of the bed can help at night.",
      "Common triggers include very spicy or fried food, tea and coffee on an empty stomach, smoking, alcohol and tight clothing.",
      "See a doctor for difficulty swallowing, vomiting blood, black stools, weight loss, or heartburn that continues despite these changes.",
    ],
  },
  {
    slug: "managing-everyday-stress",
    title: "Managing everyday stress",
    excerpt: "Short breathing breaks, regular sleep and talking to someone you trust make a difference.",
    cover: { file: "calm", alt: "A group practising meditation outdoors" },
    topic: "Mental wellbeing",
    specialties: ["psychiatrist", "psychologist", ...GP],
    body: [
      "Some stress is a normal part of life, but long-lasting stress can affect sleep, appetite, blood pressure and relationships.",
      "Try slow breathing for a few minutes: breathe in for four counts, hold for four, and breathe out for six. Regular activity, daylight and fixed sleep times help too.",
      "Talk to someone you trust, and take breaks from news and social media.",
      "Please see a doctor if low mood, worry or poor sleep last more than two weeks or affect daily life. If you have thoughts of harming yourself, seek help immediately: call a helpline or go to the nearest hospital.",
    ],
  },
];
