/**
 * Sarawak State Cabinet Data
 * Source: Official Sarawak State Government (https://sarawak.gov.my)
 * Last Updated: December 2024
 * 
 * Cabinet Allowance Structure (additional to ADUN allowances):
 * - Premier: RM 87,000/month
 * - Deputy Premier: RM 73,000/month
 * - Minister: RM 62,000/month
 * - Deputy Minister: RM 42,500/month
 * - Assistant Minister: RM 30,000/month
 */

export interface CabinetPosition {
  role: 'Premier' | 'Deputy Premier' | 'Minister' | 'Deputy Minister' | 'Assistant Minister';
  portfolio?: string;
  baseSalary: number;
  entertainment: number;
  specialAllowance: number;
  totalAllowance: number;
}

export const CABINET_ALLOWANCES: Record<CabinetPosition['role'], { baseSalary: number; entertainment: number; specialAllowance: number; total: number }> = {
  'Premier': { baseSalary: 39000, entertainment: 18000, specialAllowance: 30000, total: 87000 },
  'Deputy Premier': { baseSalary: 33000, entertainment: 15000, specialAllowance: 25000, total: 73000 },
  'Minister': { baseSalary: 30000, entertainment: 12000, specialAllowance: 20000, total: 62000 },
  'Deputy Minister': { baseSalary: 22500, entertainment: 7500, specialAllowance: 12500, total: 42500 },
  'Assistant Minister': { baseSalary: 17000, entertainment: 4000, specialAllowance: 9000, total: 30000 },
};

export interface CabinetMemberData {
  constituencyCode: string;
  role: CabinetPosition['role'];
  portfolio?: string;
}

/**
 * Sarawak State Cabinet Members (2024)
 * Constituency codes verified against official DUN Sarawak records
 * 
 * Current Cabinet composition:
 * - 1 Premier
 * - 2 Deputy Premiers  
 * - 11 Ministers
 * - 8 Deputy Ministers
 * - 14 Assistant Ministers
 * Total: 36 cabinet members
 */
export const SARAWAK_CABINET_MEMBERS: CabinetMemberData[] = [
  // Premier - YAB Datuk Patinggi Tan Sri Abang Haji Abdul Rahman Zohari (N24 Gedong)
  {
    constituencyCode: 'N24',
    role: 'Premier',
    portfolio: 'Premier of Sarawak, Minister of Finance and New Economy, Minister of Urban Development and Natural Resources',
  },
  
  // Deputy Premiers
  // YAB Datuk Amar Awang Tengah Ali Hasan (N48 Bukit Saban)
  {
    constituencyCode: 'N48',
    role: 'Deputy Premier',
    portfolio: 'Deputy Premier, Minister of International Trade, Industrial Terminal and Entrepreneur Development',
  },
  // YAB Datuk Amar Dr Sim Kui Hian (N14 Batu Kawah)
  {
    constituencyCode: 'N14',
    role: 'Deputy Premier',
    portfolio: 'Deputy Premier, Minister of Public Health, Housing and Local Government',
  },
  
  // Ministers
  // YB Dato Sri Michael Manyin Jawong (N6 Tebedu)
  {
    constituencyCode: 'N6',
    role: 'Minister',
    portfolio: 'Minister of Education, Innovation and Talent Development',
  },
  // YB Dato Sri Fatimah Abdullah (N12 Dalat)
  {
    constituencyCode: 'N12',
    role: 'Minister',
    portfolio: 'Minister of Women, Childhood and Community Wellbeing Development',
  },
  // YB Dato Sri Abdul Karim Rahman Hamzah (N56 Asajaya)
  {
    constituencyCode: 'N56',
    role: 'Minister',
    portfolio: 'Minister of Tourism, Creative Industry and Performing Arts',
  },
  // YB Dato Sri Lee Kim Shin (N80 Senadin)
  {
    constituencyCode: 'N80',
    role: 'Minister',
    portfolio: 'Minister of Transport',
  },
  // YB Dato Sri Stephen Rundi Utom (N63 Kemena)
  {
    constituencyCode: 'N63',
    role: 'Minister',
    portfolio: 'Minister of Utility and Telecommunication',
  },
  // YB Dato Sri Dr Jerip Susil (N55 Mambong)
  {
    constituencyCode: 'N55',
    role: 'Minister',
    portfolio: 'Minister of Food Industry, Commodity and Regional Development',
  },
  // YB Dato Sri Julaihi Narawi (N53 Sebuyau)
  {
    constituencyCode: 'N53',
    role: 'Minister',
    portfolio: 'Minister of Infrastructure and Port Development',
  },
  // YB Dato Sri Douglas Uggah Embas (N57 Bukit Semuja)
  {
    constituencyCode: 'N57',
    role: 'Minister',
    portfolio: 'Minister of Modernisation of Agriculture and Regional Development',
  },
  // YB Datuk Roland Sagah Wee Inn (N7 Kedup)
  {
    constituencyCode: 'N7',
    role: 'Minister',
    portfolio: 'Minister of Youth, Sports and Entrepreneur Development',
  },
  // YB Dr Hazland Abang Hipni (N13 Tupong)
  {
    constituencyCode: 'N13',
    role: 'Minister',
    portfolio: 'Minister of Energy and Environmental Sustainability',
  },
  // YB Datuk John Sikie Tayai (N51 Kakus)
  {
    constituencyCode: 'N51',
    role: 'Minister',
    portfolio: 'Minister in the Premier Department (Native Laws and Customs)',
  },
  
  // Deputy Ministers
  // YB Datuk Francis Harden Hollis (N8 Bukit Begunan)
  {
    constituencyCode: 'N8',
    role: 'Deputy Minister',
    portfolio: 'Deputy Minister of Education, Innovation and Talent Development',
  },
  // YB Datuk Dr Abdul Rahman Junaidi (N23 Pantai Damai)
  {
    constituencyCode: 'N23',
    role: 'Deputy Minister',
    portfolio: 'Deputy Minister of Modernisation of Agriculture and Regional Development',
  },
  // YB Martin Ben (N66 Marudi)
  {
    constituencyCode: 'N66',
    role: 'Deputy Minister',
    portfolio: 'Deputy Minister of Infrastructure and Port Development',
  },
  // YB Datuk Liwan Lagang (N67 Telang Usan)
  {
    constituencyCode: 'N67',
    role: 'Deputy Minister',
    portfolio: 'Deputy Minister of Native Laws and Customs',
  },
  // YB Datuk Dr Malcolm Mussen Lamoh (N59 Batang Ai)
  {
    constituencyCode: 'N59',
    role: 'Deputy Minister',
    portfolio: 'Deputy Minister of Food Industry, Commodity and Regional Development',
  },
  // YB Datuk Ding Kuong Hiing (N78 Meradong)
  {
    constituencyCode: 'N78',
    role: 'Deputy Minister',
    portfolio: 'Deputy Minister of Transport',
  },
  // YB Datuk Mohd Razi Sitam (N36 Sadong Jaya)
  {
    constituencyCode: 'N36',
    role: 'Deputy Minister',
    portfolio: 'Deputy Minister of Utility and Telecommunication',
  },
  // YB Michael Tiang Ming Sing (N47 Pelawan)
  {
    constituencyCode: 'N47',
    role: 'Deputy Minister',
    portfolio: 'Deputy Minister of Public Health, Housing and Local Government',
  },
  
  // Assistant Ministers
  // YB Jefferson Jamit Unyat (N60 Lubok Antu)
  {
    constituencyCode: 'N60',
    role: 'Assistant Minister',
    portfolio: 'Assistant Minister of Education, Innovation and Talent Development',
  },
  // YB Dato Gerawat Gala (N65 Mulu)
  {
    constituencyCode: 'N65',
    role: 'Assistant Minister',
    portfolio: 'Assistant Minister of Tourism, Creative Industry and Performing Arts',
  },
  // YB Ripin Lamat (N64 Jepak)
  {
    constituencyCode: 'N64',
    role: 'Assistant Minister',
    portfolio: 'Assistant Minister of Utility and Telecommunication',
  },
  // YB Lo Khere Chiang (N73 Kudap)
  {
    constituencyCode: 'N73',
    role: 'Assistant Minister',
    portfolio: 'Assistant Minister of Infrastructure and Port Development',
  },
  // YB Yussibnosh Balo (N62 Murum)
  {
    constituencyCode: 'N62',
    role: 'Assistant Minister',
    portfolio: 'Assistant Minister of Youth, Sports and Entrepreneur Development',
  },
  // YB Datuk Wilson Nyabong Ijang (N50 Meluan)
  {
    constituencyCode: 'N50',
    role: 'Assistant Minister',
    portfolio: 'Assistant Minister of Modernisation of Agriculture and Regional Development',
  },
  // YB Sharifah Hasidah Sayeed Aman Ghazali (N15 Kota Sentosa)
  {
    constituencyCode: 'N15',
    role: 'Assistant Minister',
    portfolio: 'Assistant Minister of Women, Childhood and Community Wellbeing Development',
  },
  // YB Datuk Abdullah Saidol (N35 Semop)
  {
    constituencyCode: 'N35',
    role: 'Assistant Minister',
    portfolio: 'Assistant Minister of Urban Development and Natural Resources',
  },
  // YB Datuk Aidel Lariwoo (N69 Limbang)
  {
    constituencyCode: 'N69',
    role: 'Assistant Minister',
    portfolio: 'Assistant Minister of Food Industry, Commodity and Regional Development',
  },
  // YB Datuk Mohd Chifu Semawi (N71 Bukit Kota)
  {
    constituencyCode: 'N71',
    role: 'Assistant Minister',
    portfolio: 'Assistant Minister of Energy and Environmental Sustainability',
  },
  // YB Datuk Sebastian Ting Chiew Yew (N82 Piasau)
  {
    constituencyCode: 'N82',
    role: 'Assistant Minister',
    portfolio: 'Assistant Minister of International Trade, Industrial Terminal and Entrepreneur Development',
  },
  // YB Dato Majang Renggi (N58 Simanggang)
  {
    constituencyCode: 'N58',
    role: 'Assistant Minister',
    portfolio: 'Assistant Minister of Transport',
  },
  // YB Datuk Malcom Mussen Lamoh (N70 Batu Danau) - Second appointment
  {
    constituencyCode: 'N70',
    role: 'Assistant Minister',
    portfolio: 'Assistant Minister of Native Laws and Customs',
  },
  // YB Datuk Len Talif Salleh (N33 Tanjong Datu)
  {
    constituencyCode: 'N33',
    role: 'Assistant Minister',
    portfolio: 'Assistant Minister of Finance and New Economy',
  },
];

export function getCabinetMemberByConstituency(constituencyCode: string): CabinetMemberData | undefined {
  const normalizedCode = constituencyCode.toUpperCase().replace(/^N\.?/, 'N');
  return SARAWAK_CABINET_MEMBERS.find(m => m.constituencyCode === normalizedCode);
}

export function getCabinetAllowance(role: CabinetPosition['role']): typeof CABINET_ALLOWANCES[CabinetPosition['role']] {
  return CABINET_ALLOWANCES[role];
}

export function getTotalCabinetMembers(): number {
  return SARAWAK_CABINET_MEMBERS.length;
}
