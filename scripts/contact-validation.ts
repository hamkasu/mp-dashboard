/**
 * Copyright by Calmic Sdn Bhd
 * 
 * Shared validation utilities for MP contact data parsing and updating
 * This module ensures consistent data validation across all contact scraping/updating scripts
 */

/**
 * List of keywords that indicate a section header (not an actual address)
 * Values containing these words (case-insensitive) will be rejected as addresses
 */
const HEADER_KEYWORDS = [
  'maklumat',        // "Information" in Malay
  'information',
  'contact address',
  'alamat pejabat',  // "Office address" as a label
  'ahli parlimen',   // "Member of Parliament"
  'profil',          // "Profile"
  'hubungi',         // "Contact"
  'butiran',         // "Details"
  'senarai',         // "List"
];

/**
 * List of exact values that should be rejected (case-insensitive)
 */
const INVALID_EXACT_VALUES = [
  '-',
  'n/a',
  'tiada',           // "None" in Malay
  'kosong',          // "Empty" in Malay
  'tidak ada',       // "Not available" in Malay
  'na',
  'null',
  'undefined',
  '',
];

/**
 * Clean and validate an address string
 * Returns null if the value is a section header, placeholder, or otherwise invalid
 */
export function cleanAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  
  const trimmed = value.trim();
  const lowerValue = trimmed.toLowerCase();
  
  // Check against exact invalid values
  if (INVALID_EXACT_VALUES.includes(lowerValue)) {
    console.log(`  ⚠ Skipping invalid address (exact match): "${trimmed}"`);
    return null;
  }
  
  // Check if value contains header keywords - these should never be addresses
  for (const keyword of HEADER_KEYWORDS) {
    if (lowerValue.includes(keyword)) {
      console.log(`  ⚠ Skipping address containing header keyword "${keyword}": "${trimmed.substring(0, 50)}..."`);
      return null;
    }
  }
  
  // Check if value is too short to be a valid address (less than 15 chars)
  if (trimmed.length < 15) {
    console.log(`  ⚠ Skipping too-short address: "${trimmed}"`);
    return null;
  }
  
  // Check if value looks like a section header (all caps, no numbers, no commas)
  if (trimmed === trimmed.toUpperCase() && !/\d/.test(trimmed) && !trimmed.includes(',')) {
    console.log(`  ⚠ Skipping possible section header: "${trimmed}"`);
    return null;
  }
  
  // A valid Malaysian address should typically contain:
  // - Numbers (for postal code or street number) 
  // - OR contain common address terms
  const hasNumbers = /\d/.test(trimmed);
  const hasAddressTerms = /jalan|lorong|taman|kampung|bandar|negeri|blok|aras|tingkat|lot|presint/i.test(trimmed);
  
  if (!hasNumbers && !hasAddressTerms) {
    console.log(`  ⚠ Address doesn't look valid (no numbers or address terms): "${trimmed.substring(0, 50)}..."`);
    return null;
  }
  
  // Clean up extra whitespace
  const cleaned = trimmed.replace(/\s+/g, ' ');
  
  return cleaned;
}

/**
 * Clean and validate an email address
 */
export function cleanEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  
  const trimmed = value.trim().toLowerCase();
  
  // Check against exact invalid values
  if (INVALID_EXACT_VALUES.includes(trimmed)) {
    return null;
  }
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // If it's already a valid email, return it
  if (emailRegex.test(trimmed)) {
    return trimmed;
  }
  
  // Try to extract email from a string containing other text
  // Common pattern: "Email: john@example.com" or "john@example.com (Office)"
  const emailMatch = trimmed.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  if (emailMatch) {
    return emailMatch[0].toLowerCase();
  }
  
  console.log(`  ⚠ Skipping invalid email: "${trimmed.substring(0, 50)}..."`);
  return null;
}

/**
 * Clean and validate a phone number
 */
export function cleanPhoneNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  
  const trimmed = value.trim();
  const lowerValue = trimmed.toLowerCase();
  
  // Check against exact invalid values
  if (INVALID_EXACT_VALUES.includes(lowerValue)) {
    return null;
  }
  
  // Must contain at least some digits (Malaysian phone numbers start with 0)
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8) {
    console.log(`  ⚠ Skipping invalid phone (too few digits): "${trimmed}"`);
    return null;
  }
  
  // Validate Malaysian phone number patterns
  // Landline: 0X-XXXXXXX or 0XX-XXXXXXX (7-8 digits after area code)
  // Mobile: 01X-XXXXXXX (9-10 digits after 01X prefix)
  const malaysianPhonePattern = /^0\d{1,2}[\s-]?\d{3,4}[\s-]?\d{4}$/;
  
  // Clean up the phone number format
  const cleaned = trimmed.replace(/\s+/g, ' ').trim();
  
  // If it looks like a valid phone, accept it
  if (/\d/.test(cleaned)) {
    return cleaned;
  }
  
  console.log(`  ⚠ Skipping invalid phone: "${trimmed}"`);
  return null;
}

/**
 * Clean and validate a URL (for social media links)
 */
export function cleanUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  
  const trimmed = value.trim();
  
  // Check against exact invalid values
  if (INVALID_EXACT_VALUES.includes(trimmed.toLowerCase())) {
    return null;
  }
  
  // Must start with http:// or https://
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    // Try to fix common issues
    if (trimmed.startsWith('www.')) {
      return `https://${trimmed}`;
    }
    return null;
  }
  
  // Basic URL validation
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    console.log(`  ⚠ Skipping invalid URL: "${trimmed.substring(0, 50)}..."`);
    return null;
  }
}
