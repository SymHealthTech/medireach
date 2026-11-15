/** "919800000002" → "+91 98000 00002" (Indian mobiles); other numbers get a leading "+". */
export function formatPhone(digits: string): string {
  const m = /^91(\d{5})(\d{5})$/.exec(digits);
  return m ? `+91 ${m[1]} ${m[2]}` : `+${digits}`;
}
