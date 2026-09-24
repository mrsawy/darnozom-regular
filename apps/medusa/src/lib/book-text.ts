// Arabic diacritics (harakat, tanween, shadda, sukun, Quranic marks) and tatweel.
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;

/**
 * Normalizes text for search so common Arabic spelling variants match:
 * alef forms (أ إ آ ٱ → ا), taa marbuta (ة → ه), alef maqsura (ى → ي),
 * hamza carriers (ؤ → و, ئ → ي), no diacritics or tatweel. Latin text is
 * lower-cased. Anything that isn't a letter or digit becomes a space.
 */
export function normalizeSearchText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(DIACRITICS, "")
    .replace(TATWEEL, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function searchTokens(q: string | null | undefined): string[] {
  return normalizeSearchText(q).split(" ").filter(Boolean);
}

/** Digits (and a final X) only, upper-cased; null when nothing is left. */
export function normalizeIsbn(raw: string | null | undefined): string | null {
  const s = (raw ?? "").toUpperCase().replace(/[^0-9X]/g, "");
  return s || null;
}

export function isValidIsbn(raw: string | null | undefined): boolean {
  const s = normalizeIsbn(raw);
  if (!s) return false;
  if (s.length === 10) {
    if (!/^\d{9}[\dX]$/.test(s)) return false;
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += (s[i] === "X" ? 10 : Number(s[i])) * (10 - i);
    return sum % 11 === 0;
  }
  if (s.length === 13) {
    if (!/^\d{13}$/.test(s)) return false;
    let sum = 0;
    for (let i = 0; i < 13; i++) sum += Number(s[i]) * (i % 2 === 0 ? 1 : 3);
    return sum % 10 === 0;
  }
  return false;
}
