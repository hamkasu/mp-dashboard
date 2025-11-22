/**
 * Copyright by Calmic Sdn Bhd
 */

/**
 * Normalize parliament term to canonical format
 * Converts all 15th Parliament variants (Malay/English) to "15th Parliament"
 */
export function normalizeParliamentTerm(parliamentText: string): string {
  const text = parliamentText.toLowerCase();
  
  // Check if it's 15th Parliament in any variant
  // Use word boundaries to avoid matching "XVI" (16th) when looking for "XV" (15th)
  const is15thParliament = 
    text.includes('kelima belas') || 
    text.includes('ke lima belas') ||
    text.includes('ke-15') || 
    text.includes('ke 15') ||
    text.includes('15th') ||
    /\bxv\b/.test(text) ||  // Word boundary to match "XV" but not "XVI"
    text.includes('parlimen ke 15');
  
  if (is15thParliament) {
    return '15th Parliament';
  }
  
  // For other parliament terms, return as-is
  return parliamentText;
}
