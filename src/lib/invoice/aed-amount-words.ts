/** Indian-style grouping (lakh / crore) + AED fils — matches typical UAE invoice wording. */

const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function num0to99(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${tens[t]} ${ones[o]}` : tens[t];
}

function num0to999(n: number): string {
  if (n === 0) return "";
  if (n < 100) return num0to99(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  const rest = r ? ` ${num0to99(r)}` : "";
  return `${ones[h]} Hundred${rest}`.replace(/\s+/g, " ").trim();
}

function integerToIndianWords(n: number): string {
  if (n === 0) return "Zero";
  let x = Math.floor(Math.abs(n));
  const neg = n < 0;
  const parts: string[] = [];
  const crores = Math.floor(x / 10000000);
  x %= 10000000;
  const lakhs = Math.floor(x / 100000);
  x %= 100000;
  const thousands = Math.floor(x / 1000);
  x %= 1000;
  if (crores) parts.push(`${num0to99(crores)} Crore`);
  if (lakhs) parts.push(`${num0to99(lakhs)} Lakh`);
  if (thousands) parts.push(`${num0to999(thousands)} Thousand`);
  if (x) parts.push(num0to999(x));
  const s = parts.join(" ").replace(/\s+/g, " ").trim();
  return neg ? `Negative ${s}` : s;
}

export function amountInWords(amount: number, currencyCode: string = "AED"): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const whole = Math.floor(Math.abs(safe) + 1e-9);
  const frac = Math.min(
    99,
    Math.round((Math.abs(safe) - whole + 1e-9) * 100)
  );
  const wordsWhole = integerToIndianWords(safe < 0 ? -whole : whole);
  const wordsFrac = frac === 0 ? "Zero" : num0to99(frac);

  const c = currencyCode.toUpperCase();
  if (c === "INR") {
    return `${wordsWhole} Rupees and ${wordsFrac} Paise.`;
  } else if (c === "USD") {
    return `${wordsWhole} Dollars and ${wordsFrac} Cents.`;
  } else if (c === "EUR") {
    return `${wordsWhole} Euros and ${wordsFrac} Cents.`;
  } else if (c === "GBP") {
    return `${wordsWhole} Pounds and ${wordsFrac} Pence.`;
  } else {
    return `${wordsWhole} Dirhams and ${wordsFrac} Fils.`;
  }
}

export function aedAmountInWords(amount: number): string {
  return amountInWords(amount, "AED");
}
