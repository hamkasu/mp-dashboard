/**
 * Copyright by Calmic Sdn Bhd
 */

/**
 * Malay ordinal words mapped to their numeric values
 */
const MALAY_ORDINALS: Record<string, number> = {
  'pertama': 1,
  'kedua': 2,
  'ketiga': 3,
  'keempat': 4,
  'kelima': 5,
  'keenam': 6,
  'ketujuh': 7,
  'kelapan': 8,
  'kesembilan': 9,
  'kesepuluh': 10,
  'kesebelas': 11,
};

/**
 * Compound Malay ordinals (e.g., "kedua belas" = 12)
 */
const MALAY_COMPOUND_ORDINALS: Record<string, number> = {
  'kedua belas': 12,
  'ketiga belas': 13,
  'keempat belas': 14,
  'kelima belas': 15,
};

/**
 * Roman numerals mapped to numbers (up to 15)
 */
const ROMAN_NUMERALS: Record<string, number> = {
  'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
  'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10,
  'xi': 11, 'xii': 12, 'xiii': 13, 'xiv': 14, 'xv': 15,
};

/**
 * English ordinal suffixes
 */
function toEnglishOrdinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

/**
 * Normalize parliament term to canonical format
 * Converts all parliament variants (Malay/English/Roman numerals) to "{N}th Parliament"
 * Examples:
 *   "Parlimen Kelima Belas (2022 - Sekarang)" -> "15th Parliament"
 *   "Parlimen Keempat Belas (2018 - 2022)" -> "14th Parliament"
 *   "Parlimen Pertama (1959 - 1964)" -> "1st Parliament"
 */
export function normalizeParliamentTerm(parliamentText: string): string {
  const text = parliamentText.toLowerCase();

  // 1. Check compound Malay ordinals first (e.g., "kedua belas" = 12)
  for (const [malay, num] of Object.entries(MALAY_COMPOUND_ORDINALS)) {
    if (text.includes(malay)) {
      return `${toEnglishOrdinal(num)} Parliament`;
    }
  }

  // 2. Check simple Malay ordinals (e.g., "pertama" = 1)
  for (const [malay, num] of Object.entries(MALAY_ORDINALS)) {
    if (text.includes(malay)) {
      return `${toEnglishOrdinal(num)} Parliament`;
    }
  }

  // 3. Check explicit number patterns like "ke-14", "ke 14", "parlimen ke 14"
  const keNumberMatch = text.match(/ke[- ]?(\d+)/);
  if (keNumberMatch) {
    const num = parseInt(keNumberMatch[1]);
    if (num >= 1 && num <= 15) {
      return `${toEnglishOrdinal(num)} Parliament`;
    }
  }

  // 4. Check English ordinal patterns like "15th", "14th"
  const englishOrdinalMatch = text.match(/(\d+)(?:st|nd|rd|th)/);
  if (englishOrdinalMatch) {
    const num = parseInt(englishOrdinalMatch[1]);
    if (num >= 1 && num <= 15) {
      return `${toEnglishOrdinal(num)} Parliament`;
    }
  }

  // 5. Check Roman numerals with word boundaries
  for (const [roman, num] of Object.entries(ROMAN_NUMERALS)) {
    const romanRegex = new RegExp(`\\b${roman}\\b`, 'i');
    if (romanRegex.test(text)) {
      return `${toEnglishOrdinal(num)} Parliament`;
    }
  }

  // Fallback: return as-is
  return parliamentText;
}
