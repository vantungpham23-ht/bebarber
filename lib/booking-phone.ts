/**
 * Slovak mobile numbers only: +421 9XX XXX XXX, 09XX…, 9XX…, 00421…
 * Returns E.164 "+421XXXXXXXXX" or null.
 */
export function normalizeSkMobilePhone(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  let digits = raw.replace(/[\s().\-/]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.startsWith("421")) {
    const national = digits.slice(3);
    return /^9\d{8}$/.test(national) ? `+421${national}` : null;
  }

  if (digits.startsWith("0")) digits = digits.slice(1);
  return /^9\d{8}$/.test(digits) ? `+421${digits}` : null;
}
