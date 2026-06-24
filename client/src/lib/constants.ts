/**
 * Shared constants for the MP Dashboard
 */

// All Malaysian states and federal territories
export const MALAYSIAN_STATES = [
  "Perlis",
  "Kedah",
  "Penang",
  "Perak",
  "Selangor",
  "Kuala Lumpur",
  "Putrajaya",
  "Negeri Sembilan",
  "Melaka",
  "Johor",
  "Pahang",
  "Terengganu",
  "Kelantan",
  "Sabah",
  "Sarawak",
  "Labuan",
] as const;

export type MalaysianState = (typeof MALAYSIAN_STATES)[number];

// Malaysian political parties
export const PARTIES = [
  { value: "PH", label: "Pakatan Harapan (PH)" },
  { value: "BN", label: "Barisan Nasional (BN)" },
  { value: "PN", label: "Perikatan Nasional (PN)" },
  { value: "GPS", label: "Gabungan Parti Sarawak (GPS)" },
  { value: "GRS", label: "Gabungan Rakyat Sabah (GRS)" },
  { value: "WARISAN", label: "Warisan" },
  { value: "MUDA", label: "MUDA" },
  { value: "PSB", label: "Parti Sarawak Bersatu (PSB)" },
  { value: "KDM", label: "Parti Kesejahteraan Demokratik Masyarakat (KDM)" },
  { value: "BEBAS", label: "Bebas (Independent)" },
] as const;
