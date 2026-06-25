export interface BrandEntry {
  name: string;
  generic: string;
}

// Common Indian brand names with their generic compositions.
// Used as a static fallback for brand-name autocomplete in the medicine editor.
// Doctor's personal DB (per /api/medicines) takes priority and supplements this list.
export const INDIA_BRANDS: BrandEntry[] = [
  // Analgesics / Antipyretics
  { name: "Dolo 650", generic: "Paracetamol 650mg" },
  { name: "Crocin 650", generic: "Paracetamol 650mg" },
  { name: "Crocin 500", generic: "Paracetamol 500mg" },
  { name: "Combiflam", generic: "Ibuprofen 400mg + Paracetamol 325mg" },
  { name: "Brufen 400", generic: "Ibuprofen 400mg" },
  { name: "Nise 100", generic: "Nimesulide 100mg" },
  { name: "Nimulid 100", generic: "Nimesulide 100mg" },
  { name: "Meftal Spas", generic: "Mefenamic Acid 250mg + Dicyclomine 10mg" },
  { name: "Meftal P", generic: "Mefenamic Acid 250mg + Paracetamol 325mg" },
  { name: "Voveran 50", generic: "Diclofenac Sodium 50mg" },
  { name: "Dynapar 50", generic: "Diclofenac Sodium 50mg" },
  { name: "Emflam 50", generic: "Diclofenac 50mg + Paracetamol 325mg" },
  { name: "Naprosyn 250", generic: "Naproxen 250mg" },
  { name: "Ketorol 10", generic: "Ketorolac Tromethamine 10mg" },
  { name: "Aceclo Plus", generic: "Aceclofenac 100mg + Paracetamol 325mg" },
  { name: "Hifenac P", generic: "Aceclofenac 100mg + Paracetamol 325mg" },
  { name: "Zerodol P", generic: "Aceclofenac 100mg + Paracetamol 325mg" },
  { name: "Serratiopeptidase 10", generic: "Serratiopeptidase 10mg" },

  // Antibiotics — Penicillins / Cephalosporins
  { name: "Amoxil 500", generic: "Amoxicillin 500mg" },
  { name: "Moxikind CV 625", generic: "Amoxicillin 500mg + Clavulanate 125mg" },
  { name: "Augmentin 625", generic: "Amoxicillin 500mg + Clavulanate 125mg" },
  { name: "Taxim O 200", generic: "Cefixime 200mg" },
  { name: "Zifi 200", generic: "Cefixime 200mg" },
  { name: "Ceftas 200", generic: "Cefixime 200mg" },
  { name: "Odoxil 500", generic: "Cefadroxil 500mg" },
  { name: "Cepodem 200", generic: "Cefpodoxime 200mg" },

  // Antibiotics — Macrolides / Fluoroquinolones
  { name: "Azithral 500", generic: "Azithromycin 500mg" },
  { name: "Azee 500", generic: "Azithromycin 500mg" },
  { name: "Zithromax 500", generic: "Azithromycin 500mg" },
  { name: "Cifran 500", generic: "Ciprofloxacin 500mg" },
  { name: "Ciplox 500", generic: "Ciprofloxacin 500mg" },
  { name: "Oflox 200", generic: "Ofloxacin 200mg" },
  { name: "Norflox 400", generic: "Norfloxacin 400mg" },
  { name: "Moxicip 400", generic: "Moxifloxacin 400mg" },
  { name: "Doxycycline 100", generic: "Doxycycline 100mg" },

  // Antibiotics — Metronidazole / Ornidazole
  { name: "Metrogyl 400", generic: "Metronidazole 400mg" },
  { name: "Flagyl 400", generic: "Metronidazole 400mg" },
  { name: "Ornof", generic: "Ofloxacin 200mg + Ornidazole 500mg" },
  { name: "Ornidazole 500", generic: "Ornidazole 500mg" },

  // GI — PPIs / H2 Blockers / Antacids
  { name: "Omez 20", generic: "Omeprazole 20mg" },
  { name: "Pantop 40", generic: "Pantoprazole 40mg" },
  { name: "Pan 40", generic: "Pantoprazole 40mg" },
  { name: "Razo 20", generic: "Rabeprazole 20mg" },
  { name: "Nexpro 40", generic: "Esomeprazole 40mg" },
  { name: "Neksium 40", generic: "Esomeprazole 40mg" },
  { name: "Digene", generic: "Aluminium Hydroxide + Magnesium Hydroxide + Simethicone" },
  { name: "Gelusil", generic: "Aluminium Hydroxide + Magnesium Trisilicate" },
  { name: "Mucaine", generic: "Oxethazaine + Aluminium Hydroxide" },
  { name: "Sucrafil 1g", generic: "Sucralfate 1g" },

  // GI — Prokinetics / Antispasmodics / Antidiarrheals
  { name: "Domperidone 10", generic: "Domperidone 10mg" },
  { name: "Dompan 10", generic: "Domperidone 10mg" },
  { name: "Ganaton 50", generic: "Itopride 50mg" },
  { name: "Mebeverine 135", generic: "Mebeverine Hydrochloride 135mg" },
  { name: "Buscopan 10", generic: "Hyoscine Butylbromide 10mg" },
  { name: "Eldoper 2", generic: "Loperamide 2mg" },
  { name: "Racecadotril 100", generic: "Racecadotril 100mg" },
  { name: "Enterogermina", generic: "Bacillus clausii 2 billion spores/5ml" },
  { name: "Sporlac", generic: "Lactobacillus sporogenes 2.5 cr spores" },

  // Laxatives
  { name: "Dulcoflex 5", generic: "Bisacodyl 5mg" },
  { name: "Cremaffin", generic: "Liquid Paraffin + Milk of Magnesia" },
  { name: "Lactulose 10g", generic: "Lactulose 10g/15ml" },
  { name: "Isabgol", generic: "Psyllium Husk 3.5g" },

  // Antiemetics
  { name: "Ondem 4", generic: "Ondansetron 4mg" },
  { name: "Emeset 4", generic: "Ondansetron 4mg" },
  { name: "Stemetil 5", generic: "Prochlorperazine 5mg" },
  { name: "Gravol 50", generic: "Dimenhydrinate 50mg" },

  // Cardiovascular — Antihypertensives
  { name: "Aten 50", generic: "Atenolol 50mg" },
  { name: "Metpure XL 25", generic: "Metoprolol Succinate 25mg" },
  { name: "Metpure XL 50", generic: "Metoprolol Succinate 50mg" },
  { name: "Amlodac 5", generic: "Amlodipine 5mg" },
  { name: "Stamlo 5", generic: "Amlodipine 5mg" },
  { name: "Cilacar 10", generic: "Cilnidipine 10mg" },
  { name: "Telma 40", generic: "Telmisartan 40mg" },
  { name: "Telma 80", generic: "Telmisartan 80mg" },
  { name: "Olsar 20", generic: "Olmesartan 20mg" },
  { name: "Olmesar 40", generic: "Olmesartan 40mg" },
  { name: "Frusemide 40", generic: "Furosemide 40mg" },
  { name: "Lasix 40", generic: "Furosemide 40mg" },
  { name: "Aldactone 25", generic: "Spironolactone 25mg" },

  // Cardiovascular — Antiplatelet / Statins / Nitrates
  { name: "Ecosprin 75", generic: "Aspirin 75mg" },
  { name: "Ecosprin AV 75/10", generic: "Aspirin 75mg + Atorvastatin 10mg" },
  { name: "Novastat 10", generic: "Atorvastatin 10mg" },
  { name: "Lipitor 10", generic: "Atorvastatin 10mg" },
  { name: "Rosuvas 10", generic: "Rosuvastatin 10mg" },
  { name: "Rozavel 10", generic: "Rosuvastatin 10mg" },
  { name: "Sorbitrate 5", generic: "Isosorbide Dinitrate 5mg" },

  // Antidiabetic
  { name: "Glycomet 500", generic: "Metformin 500mg" },
  { name: "Glycomet 850", generic: "Metformin 850mg" },
  { name: "Glycomet GP 1", generic: "Glimepiride 1mg + Metformin 500mg" },
  { name: "Amaryl 1", generic: "Glimepiride 1mg" },
  { name: "Amaryl 2", generic: "Glimepiride 2mg" },
  { name: "Januvia 100", generic: "Sitagliptin 100mg" },
  { name: "Trajenta 5", generic: "Linagliptin 5mg" },
  { name: "Jardiance 10", generic: "Empagliflozin 10mg" },
  { name: "Forxiga 10", generic: "Dapagliflozin 10mg" },

  // Antiallergic / Respiratory
  { name: "Cetirizine 10", generic: "Cetirizine Hydrochloride 10mg" },
  { name: "Levocet 5", generic: "Levocetirizine 5mg" },
  { name: "Xyzal 5", generic: "Levocetirizine 5mg" },
  { name: "Allegra 120", generic: "Fexofenadine 120mg" },
  { name: "Allegra 180", generic: "Fexofenadine 180mg" },
  { name: "Montair 10", generic: "Montelukast 10mg" },
  { name: "Montek 10", generic: "Montelukast 10mg" },
  { name: "Asthalin 4", generic: "Salbutamol 4mg" },
  { name: "Deriphyllin", generic: "Theophylline 100mg + Etofylline 200mg" },
  { name: "Asthalin Inhaler", generic: "Salbutamol 100mcg/puff" },
  { name: "Budecort 200", generic: "Budesonide 200mcg/puff" },
  { name: "Foracort 200", generic: "Formoterol 6mcg + Budesonide 200mcg/puff" },

  // Steroids
  { name: "Wysolone 5", generic: "Prednisolone 5mg" },
  { name: "Wysolone 10", generic: "Prednisolone 10mg" },
  { name: "Omnacortil 5", generic: "Prednisolone 5mg" },
  { name: "Deflazacort 6", generic: "Deflazacort 6mg" },
  { name: "Decdan 0.5", generic: "Dexamethasone 0.5mg" },
  { name: "Medrol 4", generic: "Methylprednisolone 4mg" },

  // Cough / Cold / Mucolytics
  { name: "Alex Syrup", generic: "Chlorpheniramine + Dextromethorphan + Phenylephrine" },
  { name: "Ascoril LS", generic: "Levosalbutamol + Bromhexine + Guaifenesin" },
  { name: "Ambrolite 30", generic: "Ambroxol 30mg" },
  { name: "Mucinac 600", generic: "N-Acetylcysteine 600mg" },
  { name: "Solvin 8", generic: "Bromhexine 8mg" },
  { name: "Wikoryl", generic: "Chlorpheniramine + Paracetamol + Phenylephrine" },
  { name: "Benadryl Cough", generic: "Diphenhydrinate + Ammonium Chloride + Sodium Citrate" },

  // Vitamins / Supplements
  { name: "Becosules", generic: "Vitamin B-Complex" },
  { name: "Neurobion Forte", generic: "Vitamin B1 + B6 + B12" },
  { name: "Mecobalamin 500", generic: "Methylcobalamin 500mcg" },
  { name: "Shelcal 500", generic: "Calcium Carbonate 1250mg (Ca 500mg) + Vitamin D3 250IU" },
  { name: "Calcimax 500", generic: "Calcium 500mg + Vitamin D3" },
  { name: "Caldikind", generic: "Cholecalciferol 60000IU" },
  { name: "D-Rise 60K", generic: "Cholecalciferol 60000IU" },
  { name: "Livogen", generic: "Ferrous Fumarate 150mg + Folic Acid 0.5mg" },
  { name: "Orofer S", generic: "Sucroferric Oxyhydroxide" },
  { name: "Tonoferon", generic: "Ferrous Gluconate + Folic Acid + Vitamin B12" },
  { name: "Zincovit", generic: "Zinc + Multivitamin" },
  { name: "Zinconia 20", generic: "Zinc Sulphate 20mg" },

  // Thyroid
  { name: "Thyronorm 50", generic: "Levothyroxine Sodium 50mcg" },
  { name: "Thyronorm 100", generic: "Levothyroxine Sodium 100mcg" },
  { name: "Eltroxin 50", generic: "Levothyroxine Sodium 50mcg" },
  { name: "Neomercazole 5", generic: "Carbimazole 5mg" },

  // Neurological / Pain
  { name: "Pregabid 75", generic: "Pregabalin 75mg" },
  { name: "Pregabid 150", generic: "Pregabalin 150mg" },
  { name: "Nortriptyline 10", generic: "Nortriptyline 10mg" },
  { name: "Amitriptyline 10", generic: "Amitriptyline 10mg" },
  { name: "Clonazepam 0.5", generic: "Clonazepam 0.5mg" },
  { name: "Alprazolam 0.25", generic: "Alprazolam 0.25mg" },
  { name: "Pacitane 2", generic: "Trihexyphenidyl 2mg" },

  // Psychiatry
  { name: "Nexito 10", generic: "Escitalopram 10mg" },
  { name: "Escitalopram 10", generic: "Escitalopram 10mg" },
  { name: "Sertraline 50", generic: "Sertraline 50mg" },
  { name: "Olanzapine 5", generic: "Olanzapine 5mg" },
  { name: "Quetiapine 25", generic: "Quetiapine 25mg" },

  // Antifungal / Antiviral
  { name: "Zocon 150", generic: "Fluconazole 150mg" },
  { name: "Forcan 200", generic: "Fluconazole 200mg" },
  { name: "Itraconazole 100", generic: "Itraconazole 100mg" },
  { name: "Acivir 400", generic: "Acyclovir 400mg" },
  { name: "Valacyclovir 500", generic: "Valacyclovir 500mg" },

  // Gout
  { name: "Zyloric 100", generic: "Allopurinol 100mg" },
  { name: "Allopurinol 300", generic: "Allopurinol 300mg" },
  { name: "Colchicine 0.5", generic: "Colchicine 0.5mg" },

  // Gynaecology
  { name: "Duphaston 10", generic: "Dydrogesterone 10mg" },
  { name: "Susten 200", generic: "Micronized Progesterone 200mg" },
  { name: "Utrogestan 100", generic: "Micronized Progesterone 100mg" },
  { name: "Primolut N 5", generic: "Norethisterone 5mg" },

  // Urology
  { name: "Urimax 0.4", generic: "Tamsulosin 0.4mg" },
  { name: "Veltam 0.4", generic: "Tamsulosin 0.4mg" },
  { name: "Zoxan 4", generic: "Doxazosin 4mg" },

  // Topicals
  { name: "Betnovate C", generic: "Betamethasone 0.1% + Clioquinol 3% cream" },
  { name: "Tenovate", generic: "Clobetasol 0.05% cream" },
  { name: "Fucidin Cream", generic: "Fusidic Acid 2% cream" },
  { name: "Neosporin Oint", generic: "Neomycin + Polymyxin B + Bacitracin ointment" },
  { name: "Volini Gel", generic: "Diclofenac 1% + Methyl Salicylate gel" },

  // Eye / Ear Drops
  { name: "Ciplox Eye Drops", generic: "Ciprofloxacin 0.3% eye drops" },
  { name: "Moxicip Eye Drops", generic: "Moxifloxacin 0.5% eye drops" },
  { name: "Tobramycin Eye Drops", generic: "Tobramycin 0.3% eye drops" },
  { name: "Sofradex Drops", generic: "Dexamethasone + Framycetin + Gramicidin" },
  { name: "Genteal Eye Drops", generic: "Hydroxypropyl Methylcellulose 0.3%" },
];
