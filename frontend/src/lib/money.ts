const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toPersianDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** Mirrors backend app/money.py — amounts are always Toman-cents (toman * 100). */
export function formatToman(cents: number, opts?: { persianDigits?: boolean }): string {
  const persian = opts?.persianDigits ?? true;
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;

  let wholeStr = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, persian ? "٬" : ",");
  if (persian) wholeStr = toPersianDigits(wholeStr);

  let text = sign + wholeStr;
  if (frac) {
    let fracStr = String(frac).padStart(2, "0");
    if (persian) fracStr = toPersianDigits(fracStr);
    text += (persian ? "٫" : ".") + fracStr;
  }
  return text;
}

export function tomanToCents(toman: number): number {
  return Math.round(toman) * 100;
}
