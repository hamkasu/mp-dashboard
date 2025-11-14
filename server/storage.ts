import { type User, type InsertUser, type Mp, type InsertMp, type CourtCase, type InsertCourtCase, type SprmInvestigation, type InsertSprmInvestigation, type LegislativeProposal, type InsertLegislativeProposal, type DebateParticipation, type InsertDebateParticipation, type ParliamentaryQuestion, type InsertParliamentaryQuestion, type HansardRecord, type InsertHansardRecord, type UpdateHansardRecord, type PageView } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { mps, users, courtCases, sprmInvestigations, legislativeProposals, debateParticipations, parliamentaryQuestions, hansardRecords, pageViews } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { MPNameMatcher } from "./mp-name-matcher";
import { HansardScraper } from "./hansard-scraper";
import { ConstituencyMatcher } from "./constituency-matcher";
import { scrapeMpPhotos } from "./utils/scrape-mp-photos";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // MP methods
  getMp(id: string): Promise<Mp | undefined>;
  getAllMps(): Promise<Mp[]>;
  createMp(mp: InsertMp): Promise<Mp>;
  
  // Court Case methods
  getCourtCase(id: string): Promise<CourtCase | undefined>;
  getCourtCasesByMpId(mpId: string): Promise<CourtCase[]>;
  getCourtCaseByCaseNumber(caseNumber: string): Promise<CourtCase | undefined>;
  getAllCourtCases(): Promise<CourtCase[]>;
  createCourtCase(courtCase: InsertCourtCase): Promise<CourtCase>;
  updateCourtCase(id: string, courtCase: Partial<InsertCourtCase>): Promise<CourtCase | undefined>;
  deleteCourtCase(id: string): Promise<boolean>;
  
  // SPRM Investigation methods
  getSprmInvestigation(id: string): Promise<SprmInvestigation | undefined>;
  getSprmInvestigationsByMpId(mpId: string): Promise<SprmInvestigation[]>;
  getSprmInvestigationByCaseNumber(caseNumber: string): Promise<SprmInvestigation | undefined>;
  getAllSprmInvestigations(): Promise<SprmInvestigation[]>;
  createSprmInvestigation(investigation: InsertSprmInvestigation): Promise<SprmInvestigation>;
  updateSprmInvestigation(id: string, investigation: Partial<InsertSprmInvestigation>): Promise<SprmInvestigation | undefined>;
  deleteSprmInvestigation(id: string): Promise<boolean>;
  
  // Legislative Proposal methods
  getLegislativeProposal(id: string): Promise<LegislativeProposal | undefined>;
  getLegislativeProposalsByMpId(mpId: string): Promise<LegislativeProposal[]>;
  getAllLegislativeProposals(): Promise<LegislativeProposal[]>;
  createLegislativeProposal(proposal: InsertLegislativeProposal): Promise<LegislativeProposal>;
  updateLegislativeProposal(id: string, proposal: Partial<InsertLegislativeProposal>): Promise<LegislativeProposal | undefined>;
  deleteLegislativeProposal(id: string): Promise<boolean>;
  
  // Debate Participation methods
  getDebateParticipation(id: string): Promise<DebateParticipation | undefined>;
  getDebateParticipationsByMpId(mpId: string): Promise<DebateParticipation[]>;
  getAllDebateParticipations(): Promise<DebateParticipation[]>;
  createDebateParticipation(participation: InsertDebateParticipation): Promise<DebateParticipation>;
  updateDebateParticipation(id: string, participation: Partial<InsertDebateParticipation>): Promise<DebateParticipation | undefined>;
  deleteDebateParticipation(id: string): Promise<boolean>;
  
  // Parliamentary Question methods
  getParliamentaryQuestion(id: string): Promise<ParliamentaryQuestion | undefined>;
  getParliamentaryQuestionsByMpId(mpId: string): Promise<ParliamentaryQuestion[]>;
  getAllParliamentaryQuestions(): Promise<ParliamentaryQuestion[]>;
  createParliamentaryQuestion(question: InsertParliamentaryQuestion): Promise<ParliamentaryQuestion>;
  updateParliamentaryQuestion(id: string, question: Partial<InsertParliamentaryQuestion>): Promise<ParliamentaryQuestion | undefined>;
  deleteParliamentaryQuestion(id: string): Promise<boolean>;
  
  // Hansard Record methods
  getHansardRecord(id: string): Promise<HansardRecord | undefined>;
  getAllHansardRecords(): Promise<HansardRecord[]>;
  getHansardRecordsBySessionNumber(sessionNumber: string): Promise<HansardRecord[]>;
  getLatestHansardRecord(): Promise<HansardRecord | undefined>;
  getHansardSpeakingParticipationByMpId(mpId: string): Promise<{ count: number; sessions: HansardRecord[] }>;
  get15thParliamentParticipationByMpId(mpId: string): Promise<{
    totalSessions: number;
    totalSpeeches: number;
    sessionsSpoke: number;
    averageSpeeches: number;
    sessions: Array<{
      id: string;
      sessionNumber: string;
      sessionDate: string;
      sitting: string;
      topics: string[];
      speechCount: number;
    }>;
  }>;
  createHansardRecord(record: InsertHansardRecord): Promise<HansardRecord>;
  createHansardRecordWithSpeechStats(record: InsertHansardRecord, speakerStats: Array<{mpId: string; totalSpeeches: number}>): Promise<HansardRecord>;
  updateHansardRecord(id: string, record: UpdateHansardRecord): Promise<HansardRecord | undefined>;
  deleteHansardRecord(id: string): Promise<boolean>;
  deleteBulkHansardRecords(ids: string[]): Promise<number>;
  deleteAllHansardRecords(): Promise<number>;
  
  // Page View methods
  incrementPageView(page: string): Promise<number>;
  getPageViewCount(page: string): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private mps: Map<string, Mp>;
  private courtCases: Map<string, CourtCase>;
  private sprmInvestigations: Map<string, SprmInvestigation>;
  private legislativeProposals: Map<string, LegislativeProposal>;
  private debateParticipations: Map<string, DebateParticipation>;
  private parliamentaryQuestions: Map<string, ParliamentaryQuestion>;
  private hansardRecords: Map<string, HansardRecord>;

  constructor() {
    this.users = new Map();
    this.mps = new Map();
    this.courtCases = new Map();
    this.sprmInvestigations = new Map();
    this.legislativeProposals = new Map();
    this.debateParticipations = new Map();
    this.parliamentaryQuestions = new Map();
    this.hansardRecords = new Map();
    this.seedAdminUser();
    this.seedMps();
    this.seedCourtCases();
    this.seedSprmInvestigations();
    this.seedLegislativeProposals();
    this.seedDebateParticipations();
    this.seedParliamentaryQuestions();
    this.seedHansardRecords();
  }

  private validatePassword(password: string): { valid: boolean; errors: string[] } {
    // Environment-driven security bypass for testing ONLY
    // Defaults to SECURE (validation enabled) unless explicitly disabled
    const disableValidation = process.env.DISABLE_PASSWORD_VALIDATION === 'true';
    
    if (disableValidation) {
      console.warn('⚠️⚠️⚠️ PASSWORD VALIDATION BYPASSED via DISABLE_PASSWORD_VALIDATION=true ⚠️⚠️⚠️');
      console.warn('   This is for TESTING ONLY - Remove this flag before production!');
      return {
        valid: true,
        errors: []
      };
    }
    
    // SECURE by default - Full password validation
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  private seedAdminUser() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Get admin credentials from environment variables
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    // In production, require environment variables
    if (isProduction) {
      if (!adminUsername || !adminPassword) {
        throw new Error(
          'ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set in production'
        );
      }
    }
    
    // Use environment variables or fallback to defaults (dev only)
    const username = adminUsername || 'admin';
    const password = adminPassword || '061167@abcdeF1';
    
    // Validate password strength (defaults to enabled for security)
    const validation = this.validatePassword(password);
    if (!validation.valid) {
      const errorMessage = `Admin password does not meet security requirements:\n${validation.errors.join('\n')}`;
      if (isProduction) {
        throw new Error(errorMessage);
      } else {
        console.warn(`⚠️  WARNING: ${errorMessage}`);
      }
    }
    
    // Warn if using defaults in development
    if (!adminUsername || !adminPassword) {
      console.warn('⚠️  WARNING: Using default admin credentials (development only)');
      console.warn('   Set ADMIN_USERNAME and ADMIN_PASSWORD environment variables for production');
    }
    
    // Hash the password
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const adminUser: User = {
      id: randomUUID(),
      username: username,
      password: hashedPassword,
      isAdmin: true
    };
    
    this.users.set(adminUser.id, adminUser);
    console.log(`✅ Admin user created - Username: ${username}`);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getMp(id: string): Promise<Mp | undefined> {
    return this.mps.get(id);
  }

  async getAllMps(): Promise<Mp[]> {
    return Array.from(this.mps.values());
  }

  async createMp(insertMp: InsertMp): Promise<Mp> {
    const id = randomUUID();
    const mp: Mp = { 
      ...insertMp, 
      id,
      photoUrl: insertMp.photoUrl ?? null,
      title: insertMp.title ?? null,
      role: insertMp.role ?? null,
      ministerSalary: insertMp.ministerSalary ?? 0,
      daysAttended: insertMp.daysAttended ?? 0,
      totalParliamentDays: insertMp.totalParliamentDays ?? 0,
      totalSpeechInstances: insertMp.totalSpeechInstances ?? 0,
      hansardSessionsSpoke: insertMp.hansardSessionsSpoke ?? 0,
      entertainmentAllowance: insertMp.entertainmentAllowance ?? 2500,
      handphoneAllowance: insertMp.handphoneAllowance ?? 2000,
      computerAllowance: insertMp.computerAllowance ?? 6000,
      dressWearAllowance: insertMp.dressWearAllowance ?? 1000,
      parliamentSittingAllowance: insertMp.parliamentSittingAllowance ?? 400,
      governmentMeetingDays: insertMp.governmentMeetingDays ?? 0,
      isMinister: insertMp.isMinister ?? false,
      ministerialPosition: insertMp.ministerialPosition ?? null,
    };
    this.mps.set(id, mp);
    return mp;
  }

  private generateAttendance(): { daysAttended: number; totalParliamentDays: number } {
    const totalParliamentDays = 65;
    const random = Math.random();
    
    let attendanceRate: number;
    if (random < 0.65) {
      attendanceRate = 0.85 + Math.random() * 0.13;
    } else if (random < 0.90) {
      attendanceRate = 0.70 + Math.random() * 0.15;
    } else {
      attendanceRate = 0.50 + Math.random() * 0.20;
    }
    
    const daysAttended = Math.floor(totalParliamentDays * attendanceRate);
    return { daysAttended, totalParliamentDays };
  }

  private seedMps() {
    const swornInDate = new Date("2022-12-19");
    const BASE_MP_ALLOWANCE = 25700;
    
    const mpsData: InsertMp[] = [
      // PERLIS (P001-P003)
      { name: "Shahidan Kassim", photoUrl: null, party: "PN", parliamentCode: "P003", constituency: "Arau", state: "Perlis", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Rushdan Rusmi", photoUrl: null, party: "PN", parliamentCode: "P001", constituency: "Padang Besar", state: "Perlis", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Zakri Hassan", photoUrl: null, party: "PN", parliamentCode: "P002", constituency: "Kangar", state: "Perlis", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },

      // KEDAH (P004-P018)
      { name: "Suhaimi Abdullah", photoUrl: null, party: "PN", parliamentCode: "P004", constituency: "Langkawi", state: "Kedah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Abdul Ghani Ahmad", photoUrl: null, party: "PN", parliamentCode: "P005", constituency: "Jerlun", state: "Kedah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ku Abdul Rahman Ku Ismail", photoUrl: null, party: "PN", parliamentCode: "P006", constituency: "Kubang Pasu", state: "Kedah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Nurul Amin Hamid", photoUrl: null, party: "PN", parliamentCode: "P007", constituency: "Padang Terap", state: "Kedah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ahmad Saad @ Yahaya", photoUrl: null, party: "PN", parliamentCode: "P008", constituency: "Pokok Sena", state: "Kedah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Afnan Hamimi Taib Azamuddin", photoUrl: null, party: "PN", parliamentCode: "P009", constituency: "Alor Setar", state: "Kedah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ahmad Fakhruddin Fakhrurazi", photoUrl: null, party: "PN", parliamentCode: "P010", constituency: "Kuala Kedah", state: "Kedah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Awang Solahudin Hashim", photoUrl: null, party: "PN", parliamentCode: "P011", constituency: "Pendang", state: "Kedah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Sabri Azit", photoUrl: null, party: "PN", parliamentCode: "P012", constituency: "Jerai", state: "Kedah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ahmad Tarmizi Sulaiman", photoUrl: null, party: "PN", parliamentCode: "P013", constituency: "Sik", state: "Kedah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Nazri Abu Hassan", photoUrl: null, party: "PN", parliamentCode: "P014", constituency: "Merbok", state: "Kedah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Taufiq Johari", photoUrl: null, party: "PH", parliamentCode: "P015", constituency: "Sungai Petani", state: "Kedah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Hassan Saad", photoUrl: null, party: "PN", parliamentCode: "P016", constituency: "Baling", state: "Kedah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Mohd Aminuddin Mohd Hanafiah", photoUrl: null, party: "PH", parliamentCode: "P017", constituency: "Padang Serai", state: "Kedah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Roslan Hashim", photoUrl: null, party: "PN", parliamentCode: "P018", constituency: "Kulim Bandar Baharu", state: "Kedah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },

      // KELANTAN (P019-P032)
      { name: "Mumtaz Md Nawi", photoUrl: null, party: "PN", parliamentCode: "P019", constituency: "Tumpat", state: "Kelantan", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ahmad Marzuk Shaary", photoUrl: null, party: "PN", parliamentCode: "P020", constituency: "Pengkalan Chepa", state: "Kelantan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Takiyuddin Hassan", photoUrl: null, party: "PN", parliamentCode: "P021", constituency: "Kota Bharu", state: "Kelantan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ahmad Fadhli Shaari", photoUrl: null, party: "PN", parliamentCode: "P022", constituency: "Pasir Mas", state: "Kelantan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Siti Zailah Yusoff", photoUrl: null, party: "PN", parliamentCode: "P023", constituency: "Rantau Panjang", state: "Kelantan", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Tuan Ibrahim Tuan Man", photoUrl: null, party: "PN", parliamentCode: "P024", constituency: "Kubang Kerian", state: "Kelantan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Syahir Che Sulaiman", photoUrl: null, party: "PN", parliamentCode: "P025", constituency: "Bachok", state: "Kelantan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Khlir Mohd Nor", photoUrl: null, party: "PN", parliamentCode: "P026", constituency: "Ketereh", state: "Kelantan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ikmal Hisham Abdul Aziz", photoUrl: null, party: "PN", parliamentCode: "P027", constituency: "Tanah Merah", state: "Kelantan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Nik Zawawi Salleh", photoUrl: null, party: "PN", parliamentCode: "P028", constituency: "Pasir Puteh", state: "Kelantan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Wan Ahmad Fayhsal Wan Ahmad Kamal", photoUrl: null, party: "PN", parliamentCode: "P029", constituency: "Machang", state: "Kelantan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Zahari Kechik", photoUrl: null, party: "PN", parliamentCode: "P030", constituency: "Jeli", state: "Kelantan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Abdul Latiff Abdul Rahman", photoUrl: null, party: "PN", parliamentCode: "P031", constituency: "Kuala Krai", state: "Kelantan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Azizi Abu Naim", photoUrl: null, party: "PN", parliamentCode: "P032", constituency: "Gua Musang", state: "Kelantan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },

      // TERENGGANU (P033-P040)
      { name: "Che Zulkifly Jusoh", photoUrl: null, party: "PN", parliamentCode: "P033", constituency: "Besut", state: "Terengganu", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Shaharizukirnain Abdul Kadir", photoUrl: null, party: "PN", parliamentCode: "P034", constituency: "Setiu", state: "Terengganu", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Alias Razak", photoUrl: null, party: "PN", parliamentCode: "P035", constituency: "Kuala Nerus", state: "Terengganu", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ahmad Amzad Hashim", photoUrl: null, party: "PN", parliamentCode: "P036", constituency: "Kuala Terengganu", state: "Terengganu", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Abdul Hadi Awang", photoUrl: null, party: "PN", parliamentCode: "P037", constituency: "Marang", state: "Terengganu", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Rosol Wahid", photoUrl: null, party: "PN", parliamentCode: "P038", constituency: "Hulu Terengganu", state: "Terengganu", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Wan Hassan Ramli", photoUrl: null, party: "PN", parliamentCode: "P039", constituency: "Dungun", state: "Terengganu", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Che Alias Hamid", photoUrl: null, party: "PN", parliamentCode: "P040", constituency: "Kemaman", state: "Terengganu", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },

      // PULAU PINANG (P041-P053)
      { name: "Siti Mastura Mohamad", photoUrl: null, party: "PN", parliamentCode: "P041", constituency: "Kepala Batas", state: "Pulau Pinang", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Wan Saifulruddin Wan Jan", photoUrl: null, party: "PN", parliamentCode: "P042", constituency: "Tasek Gelugor", state: "Pulau Pinang", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Lim Guan Eng", photoUrl: null, party: "PH", parliamentCode: "P043", constituency: "Bagan", state: "Pulau Pinang", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Fawwaz Mohamad Jan", photoUrl: null, party: "PN", parliamentCode: "P044", constituency: "Permatang Pauh", state: "Pulau Pinang", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Steven Sim", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P045.jpg", party: "PH", parliamentCode: "P045", constituency: "Bukit Mertajam", state: "Pulau Pinang", gender: "Male", title: "YB", role: "Minister of Human Resources", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Chow Kon Yeow", photoUrl: null, party: "PH", parliamentCode: "P046", constituency: "Batu Kawan", state: "Pulau Pinang", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Fadhlina Sidek", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P047.jpg", party: "PH", parliamentCode: "P047", constituency: "Nibong Tebal", state: "Pulau Pinang", gender: "Female", title: "YB Puan", role: "Minister of Education", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Syerleena Abdul Rashid", photoUrl: null, party: "PH", parliamentCode: "P048", constituency: "Bukit Bendera", state: "Pulau Pinang", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Lim Hui Ying", photoUrl: null, party: "PH", parliamentCode: "P049", constituency: "Tanjong", state: "Pulau Pinang", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "RSN Rayer", photoUrl: null, party: "PH", parliamentCode: "P050", constituency: "Jelutong", state: "Pulau Pinang", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ramkarpal Singh", photoUrl: null, party: "PH", parliamentCode: "P051", constituency: "Bukit Gelugor", state: "Pulau Pinang", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Sim Tze Tzin", photoUrl: null, party: "PH", parliamentCode: "P052", constituency: "Bayan Baru", state: "Pulau Pinang", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Bakhtiar Wan Chik", photoUrl: null, party: "PH", parliamentCode: "P053", constituency: "Balik Pulau", state: "Pulau Pinang", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },

      // PERAK (P054-P077)
      { name: "Fathul Huzir Ayob", photoUrl: null, party: "PN", parliamentCode: "P054", constituency: "Gerik", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Shamsul Anuar Nasarah", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P055.png", party: "BN", parliamentCode: "P055", constituency: "Lenggong", state: "Perak", gender: "Male", title: "YB Datuk Seri Dr.", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Hamzah Zainudin", photoUrl: null, party: "PN", parliamentCode: "P056", constituency: "Larut", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Misbahul Munir Masduki", photoUrl: null, party: "PN", parliamentCode: "P057", constituency: "Parit Buntar", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Idris Ahmad", photoUrl: null, party: "PN", parliamentCode: "P058", constituency: "Bagan Serai", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Syed Abu Hussin Hafiz Syed Abdul Fasal", photoUrl: null, party: "PN", parliamentCode: "P059", constituency: "Bukit Gantang", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Wong Kah Woh", photoUrl: null, party: "PH", parliamentCode: "P060", constituency: "Taiping", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Azahari Hasan", photoUrl: null, party: "PN", parliamentCode: "P061", constituency: "Padang Rengas", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "S Kesavan", photoUrl: null, party: "PH", parliamentCode: "P062", constituency: "Sungai Siput", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Anwar Ibrahim", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P063.png", party: "PH", parliamentCode: "P063", constituency: "Tambun", state: "Perak", gender: "Male", title: "YAB Dato' Seri", role: "Prime Minister", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 34000 },
      { name: "Howard Lee", photoUrl: null, party: "PH", parliamentCode: "P064", constituency: "Ipoh Timor", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "M Kulasegaran", photoUrl: null, party: "PH", parliamentCode: "P065", constituency: "Ipoh Barat", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "V Sivakumar", photoUrl: null, party: "PH", parliamentCode: "P066", constituency: "Batu Gajah", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Iskandar Dzulkarnain Abdul Khalid", photoUrl: null, party: "PN", parliamentCode: "P067", constituency: "Kuala Kangsar", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ngeh Koo Ham", photoUrl: null, party: "PH", parliamentCode: "P068", constituency: "Beruas", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ismi Mat Taib", photoUrl: null, party: "PN", parliamentCode: "P069", constituency: "Parit", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Chong Zhemin", photoUrl: null, party: "PH", parliamentCode: "P070", constituency: "Kampar", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Tan Kar Hing", photoUrl: null, party: "PH", parliamentCode: "P071", constituency: "Gopeng", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "M Saravanan", photoUrl: null, party: "BN", parliamentCode: "P072", constituency: "Tapah", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Jamaluddin Yahya", photoUrl: null, party: "PN", parliamentCode: "P073", constituency: "Pasir Salak", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Nordin Ahmad Ismail", photoUrl: null, party: "PN", parliamentCode: "P074", constituency: "Lumut", state: "Perak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ahmad Zahid Hamidi", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/YAB%20TPM%201.jpg", party: "BN", parliamentCode: "P075", constituency: "Bagan Datuk", state: "Perak", gender: "Male", title: "YAB Dato' Seri Dr.", role: "Deputy Prime Minister", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 24000 },
      { name: "Nga Kor Ming", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P076.png", party: "PH", parliamentCode: "P076", constituency: "Teluk Intan", state: "Perak", gender: "Male", title: "YB Tuan", role: "Minister of Local Government", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Chang Lih Kang", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P077.jpg", party: "PH", parliamentCode: "P077", constituency: "Tanjong Malim", state: "Perak", gender: "Male", title: "YB Tuan", role: "Minister of Science", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },

      // PAHANG (P078-P091)
      { name: "Ramli Nor", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P078.jpg", party: "BN", parliamentCode: "P078", constituency: "Cameron Highlands", state: "Pahang", gender: "Male", title: "YB Dato' Dr.", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Abdul Rahman Mohamad", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P079.png", party: "BN", parliamentCode: "P079", constituency: "Lipis", state: "Pahang", gender: "Male", title: "YB Dato' Sri Haji", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Chow Yu Hui", photoUrl: null, party: "PH", parliamentCode: "P080", constituency: "Raub", state: "Pahang", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Khairil Nizam Khirudin", photoUrl: null, party: "PN", parliamentCode: "P081", constituency: "Jerantut", state: "Pahang", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Saifuddin Abdullah", photoUrl: null, party: "PN", parliamentCode: "P082", constituency: "Indera Mahkota", state: "Pahang", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Wan Razali Wan Nor", photoUrl: null, party: "PN", parliamentCode: "P083", constituency: "Kuantan", state: "Pahang", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Shahar Abdullah", photoUrl: null, party: "BN", parliamentCode: "P084", constituency: "Paya Besar", state: "Pahang", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Sh Mohmed Puzi Sh Ali", photoUrl: null, party: "BN", parliamentCode: "P085", constituency: "Pekan", state: "Pahang", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ismail Abdul Muttalib", photoUrl: null, party: "PN", parliamentCode: "P086", constituency: "Maran", state: "Pahang", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Kamal Ashaari", photoUrl: null, party: "PN", parliamentCode: "P087", constituency: "Kuala Krau", state: "Pahang", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Salamiah Mohd Nor", photoUrl: null, party: "PN", parliamentCode: "P088", constituency: "Temerloh", state: "Pahang", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Young Syefura Othman", photoUrl: null, party: "PH", parliamentCode: "P089", constituency: "Bentong", state: "Pahang", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ismail Sabri Yaakob", photoUrl: null, party: "BN", parliamentCode: "P090", constituency: "Bera", state: "Pahang", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Abdul Khalib Abdullah", photoUrl: null, party: "PN", parliamentCode: "P091", constituency: "Rompin", state: "Pahang", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },

      // SELANGOR (P092-P113)
      { name: "Kalam Salan", photoUrl: null, party: "PN", parliamentCode: "P092", constituency: "Sabak Bernam", state: "Selangor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Muslimin Yahaya", photoUrl: null, party: "PN", parliamentCode: "P093", constituency: "Sungai Besar", state: "Selangor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Hasnizan Harun", photoUrl: null, party: "PN", parliamentCode: "P094", constituency: "Hulu Selangor", state: "Selangor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Zulkafperi Hanapi", photoUrl: null, party: "PN", parliamentCode: "P095", constituency: "Tanjong Karang", state: "Selangor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Dzulkefly Ahmad", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P096.png", party: "PH", parliamentCode: "P096", constituency: "Kuala Selangor", state: "Selangor", gender: "Male", title: "YB Datuk Seri Haji Dr.", role: "Minister of Health", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "William Leong", photoUrl: null, party: "PH", parliamentCode: "P097", constituency: "Selayang", state: "Selangor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Amirudin Shari", photoUrl: null, party: "PH", parliamentCode: "P098", constituency: "Gombak", state: "Selangor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Rodziah Ismail", photoUrl: null, party: "PH", parliamentCode: "P099", constituency: "Ampang", state: "Selangor", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Rafizi Ramli", photoUrl: null, party: "PH", parliamentCode: "P100", constituency: "Pandan", state: "Selangor", gender: "Male", title: "YB", role: "Minister of Economy", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Sany Hamzan", photoUrl: null, party: "PH", parliamentCode: "P101", constituency: "Hulu Langat", state: "Selangor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Syahredzan Johan", photoUrl: null, party: "PH", parliamentCode: "P102", constituency: "Bangi", state: "Selangor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Yeo Bee Yin", photoUrl: null, party: "PH", parliamentCode: "P103", constituency: "Puchong", state: "Selangor", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Wong Chen", photoUrl: null, party: "PH", parliamentCode: "P104", constituency: "Subang", state: "Selangor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Lee Chean Chung", photoUrl: null, party: "PH", parliamentCode: "P105", constituency: "Petaling Jaya", state: "Selangor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Gobind Singh Deo", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P106.png", party: "PH", parliamentCode: "P106", constituency: "Damansara", state: "Selangor", gender: "Male", title: "YB Tuan", role: "Minister of Digital", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "R Ramanan", photoUrl: null, party: "PH", parliamentCode: "P107", constituency: "Sungai Buloh", state: "Selangor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Azli Yusof", photoUrl: null, party: "PH", parliamentCode: "P108", constituency: "Shah Alam", state: "Selangor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Halimah Ali", photoUrl: null, party: "PN", parliamentCode: "P109", constituency: "Kapar", state: "Selangor", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "V Ganabatirau", photoUrl: null, party: "PH", parliamentCode: "P110", constituency: "Klang", state: "Selangor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Mohamad Sabu", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P111.png", party: "PH", parliamentCode: "P111", constituency: "Kota Raja", state: "Selangor", gender: "Male", title: "YB Datuk Seri Haji", role: "Minister of Agriculture", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Ahmad Yunus Hairi", photoUrl: null, party: "PN", parliamentCode: "P112", constituency: "Kuala Langat", state: "Selangor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Aiman Athirah", photoUrl: null, party: "PH", parliamentCode: "P113", constituency: "Sepang", state: "Selangor", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },

      // KUALA LUMPUR (P114-P124)
      { name: "Lim Lip Eng", photoUrl: null, party: "PH", parliamentCode: "P114", constituency: "Kepong", state: "Kuala Lumpur", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "P Prabakaran", photoUrl: null, party: "PH", parliamentCode: "P115", constituency: "Batu", state: "Kuala Lumpur", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Zahir Hassan", photoUrl: null, party: "PH", parliamentCode: "P116", constituency: "Wangsa Maju", state: "Kuala Lumpur", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Hannah Yeoh", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P117.png", party: "PH", parliamentCode: "P117", constituency: "Segambut", state: "Kuala Lumpur", gender: "Female", title: "YB Puan", role: "Minister of Youth and Sports", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Nik Nazmi Nik Ahmad", photoUrl: null, party: "PH", parliamentCode: "P118", constituency: "Setiawangsa", state: "Kuala Lumpur", gender: "Male", title: "YB", role: "Minister of Natural Resources", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Johari Ghani", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P119.png", party: "BN", parliamentCode: "P119", constituency: "Titiwangsa", state: "Kuala Lumpur", gender: "Male", title: "YB Datuk Seri", role: "Minister of Plantation Industries", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Fong Kui Lun", photoUrl: null, party: "PH", parliamentCode: "P120", constituency: "Bukit Bintang", state: "Kuala Lumpur", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Fahmi Fadzil", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P121.png", party: "PH", parliamentCode: "P121", constituency: "Lembah Pantai", state: "Kuala Lumpur", gender: "Male", title: "YB Datuk", role: "Minister of Communications", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Teresa Kok", photoUrl: null, party: "PH", parliamentCode: "P122", constituency: "Seputeh", state: "Kuala Lumpur", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Tan Kok Wai", photoUrl: null, party: "PH", parliamentCode: "P123", constituency: "Cheras", state: "Kuala Lumpur", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Wan Azizah Wan Ismail", photoUrl: null, party: "PH", parliamentCode: "P124", constituency: "Bandar Tun Razak", state: "Kuala Lumpur", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },

      // PUTRAJAYA (P125)
      { name: "Radzi Jidin", photoUrl: null, party: "PN", parliamentCode: "P125", constituency: "Putrajaya", state: "Putrajaya", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },

      // NEGERI SEMBILAN (P126-P133)
      { name: "Jalaluddin Alias", photoUrl: null, party: "BN", parliamentCode: "P126", constituency: "Jelebu", state: "Negeri Sembilan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Shamsulkahar Deli", photoUrl: null, party: "BN", parliamentCode: "P127", constituency: "Jempol", state: "Negeri Sembilan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Loke Siew Fook", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P128.png", party: "PH", parliamentCode: "P128", constituency: "Seremban", state: "Negeri Sembilan", gender: "Male", title: "YB Tuan", role: "Minister of Transport", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Adnan Abu Hassan", photoUrl: null, party: "BN", parliamentCode: "P129", constituency: "Kuala Pilah", state: "Negeri Sembilan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Cha Kee Chin", photoUrl: null, party: "PH", parliamentCode: "P130", constituency: "Rasah", state: "Negeri Sembilan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Mohamad Hasan", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P131.png", party: "BN", parliamentCode: "P131", constituency: "Rembau", state: "Negeri Sembilan", gender: "Male", title: "YB Dato' Seri Utama Haji", role: "Minister of Foreign Affairs", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Aminuddin Harun", photoUrl: null, party: "PH", parliamentCode: "P132", constituency: "Port Dickson", state: "Negeri Sembilan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Isam Isa", photoUrl: null, party: "BN", parliamentCode: "P133", constituency: "Tampin", state: "Negeri Sembilan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },

      // MELAKA (P134-P139)
      { name: "Mas Ermieyati Samsudin", photoUrl: null, party: "PN", parliamentCode: "P134", constituency: "Masjid Tanah", state: "Melaka", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Adly Zahari", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P135.jpg", party: "PH", parliamentCode: "P135", constituency: "Alor Gajah", state: "Melaka", gender: "Male", title: "YB Tuan Haji", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Bakri Jamaluddin", photoUrl: null, party: "PN", parliamentCode: "P136", constituency: "Tangga Batu", state: "Melaka", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Adam Adli", photoUrl: null, party: "PH", parliamentCode: "P137", constituency: "Hang Tuah Jaya", state: "Melaka", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Khoo Poay Tiong", photoUrl: null, party: "PH", parliamentCode: "P138", constituency: "Kota Melaka", state: "Melaka", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Zulkifli Ismail", photoUrl: null, party: "PN", parliamentCode: "P139", constituency: "Jasin", state: "Melaka", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },

      // JOHOR (P140-P165)
      { name: "R Yuneswaran", photoUrl: null, party: "PH", parliamentCode: "P140", constituency: "Segamat", state: "Johor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Zaliha Mustafa", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/Sekijang.png", party: "PH", parliamentCode: "P141", constituency: "Sekijang", state: "Johor", gender: "Female", title: "YB Datuk Seri Dr.", role: "Minister of Federal Territories", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Pang Hok Liong", photoUrl: null, party: "PH", parliamentCode: "P142", constituency: "Labis", state: "Johor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Muhyiddin Yassin", photoUrl: null, party: "PN", parliamentCode: "P143", constituency: "Pagoh", state: "Johor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Syed Ibrahim Syed Noh", photoUrl: null, party: "PH", parliamentCode: "P144", constituency: "Ledang", state: "Johor", gender: "Male", title: "YB Tuan", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Tan Hong Pin", photoUrl: null, party: "PH", parliamentCode: "P145", constituency: "Bakri", state: "Johor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Syed Saddiq Syed Abdul Rahman", photoUrl: null, party: "MUDA", parliamentCode: "P146", constituency: "Muar", state: "Johor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Noraini Ahmad", photoUrl: null, party: "BN", parliamentCode: "P147", constituency: "Parit Sulong", state: "Johor", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Wee Ka Siong", photoUrl: null, party: "BN", parliamentCode: "P148", constituency: "Ayer Hitam", state: "Johor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Aminolhuda Hassan", photoUrl: null, party: "PH", parliamentCode: "P149", constituency: "Sri Gading", state: "Johor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Onn Abu Bakar", photoUrl: null, party: "PH", parliamentCode: "P150", constituency: "Batu Pahat", state: "Johor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Hasni Mohammad", photoUrl: null, party: "BN", parliamentCode: "P151", constituency: "Simpang Renggam", state: "Johor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Wong Shu Qi", photoUrl: null, party: "PH", parliamentCode: "P152", constituency: "Kluang", state: "Johor", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Hishammuddin Hussein", photoUrl: null, party: "BN", parliamentCode: "P153", constituency: "Sembrong", state: "Johor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Islahuddin Abas", photoUrl: null, party: "PN", parliamentCode: "P154", constituency: "Mersing", state: "Johor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Manndzri Nasib", photoUrl: null, party: "BN", parliamentCode: "P155", constituency: "Tenggara", state: "Johor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Khaled Nordin", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P156.png", party: "BN", parliamentCode: "P156", constituency: "Kota Tinggi", state: "Johor", gender: "Male", title: "YB Dato' Seri Haji", role: "Minister of Defense", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Azalina Othman Said", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P157.png", party: "BN", parliamentCode: "P157", constituency: "Pengerang", state: "Johor", gender: "Female", title: "YB Dato' Sri", role: "Minister in Prime Minister's Department", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Jimmy Puah", photoUrl: null, party: "PH", parliamentCode: "P158", constituency: "Tebrau", state: "Johor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Hassan Abdul Karim", photoUrl: null, party: "PH", parliamentCode: "P159", constituency: "Pasir Gudang", state: "Johor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Akmal Nasir", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P160.jpg", party: "PH", parliamentCode: "P160", constituency: "Johor Bahru", state: "Johor", gender: "Male", title: "YB Tuan Haji", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Salahuddin Ayub", photoUrl: null, party: "PH", parliamentCode: "P161", constituency: "Pulai", state: "Johor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Liew Chin Tong", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P162.jpg", party: "PH", parliamentCode: "P162", constituency: "Iskandar Puteri", state: "Johor", gender: "Male", title: "YB Tuan", role: "Deputy Minister of Defense", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 6000 },
      { name: "Teo Nie Ching", photoUrl: null, party: "PH", parliamentCode: "P163", constituency: "Kulai", state: "Johor", gender: "Female", title: "YB", role: "Deputy Minister", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 6000 },
      { name: "Ahmad Maslan", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P164.png", party: "BN", parliamentCode: "P164", constituency: "Pontian", state: "Johor", gender: "Male", title: "YB Datuk Seri Haji", role: "Deputy Minister of Finance", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 6000 },
      { name: "Wee Jeck Seng", photoUrl: null, party: "BN", parliamentCode: "P165", constituency: "Tanjung Piai", state: "Johor", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },

      // LABUAN (P166)
      { name: "Suhaili Abdul Rahman", photoUrl: null, party: "PN", parliamentCode: "P166", constituency: "Labuan", state: "Labuan", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },

      // SABAH (P167-P191)
      { name: "Verdon Bahanda", photoUrl: null, party: "IND", parliamentCode: "P167", constituency: "Kudat", state: "Sabah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Wetrom Bahanda", photoUrl: null, party: "KDM", parliamentCode: "P168", constituency: "Kota Marudu", state: "Sabah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Isnaraissah Munirah Majilis", photoUrl: null, party: "WARISAN", parliamentCode: "P169", constituency: "Kota Belud", state: "Sabah", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Wilfred Madius Tangau", photoUrl: null, party: "PH", parliamentCode: "P170", constituency: "Tuaran", state: "Sabah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Mustapha Sakmud", photoUrl: null, party: "PH", parliamentCode: "P171", constituency: "Sepanggar", state: "Sabah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Chan Foong Hin", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P172.jpg", party: "PH", parliamentCode: "P172", constituency: "Kota Kinabalu", state: "Sabah", gender: "Male", title: "YB Datuk", role: "Deputy Minister", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 6000 },
      { name: "Shahelmey Yahya", photoUrl: null, party: "BN", parliamentCode: "P173", constituency: "Putatan", state: "Sabah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ewon Benedick", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P174.png", party: "PH", parliamentCode: "P174", constituency: "Penampang", state: "Sabah", gender: "Male", title: "YB Datuk", role: "Minister of Entrepreneur Development", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Armizan Ali", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P175.png", party: "GRS", parliamentCode: "P175", constituency: "Papar", state: "Sabah", gender: "Male", title: "YB Datuk", role: "Minister of Domestic Trade", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Mohamad Alamin", photoUrl: null, party: "BN", parliamentCode: "P176", constituency: "Kimanis", state: "Sabah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Siti Aminah Aching", photoUrl: null, party: "BN", parliamentCode: "P177", constituency: "Beaufort", state: "Sabah", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Matbali Musah", photoUrl: null, party: "GRS", parliamentCode: "P178", constituency: "Sipitang", state: "Sabah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Jonathan Yasin", photoUrl: null, party: "GRS", parliamentCode: "P179", constituency: "Ranau", state: "Sabah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Jeffrey Kitingan", photoUrl: null, party: "GRS", parliamentCode: "P180", constituency: "Keningau", state: "Sabah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Riduan Rubin", photoUrl: null, party: "IND", parliamentCode: "P181", constituency: "Tenom", state: "Sabah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Arthur Joseph Kurup", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P182.png", party: "BN", parliamentCode: "P182", constituency: "Pensiangan", state: "Sabah", gender: "Male", title: "YB Dato' Sri", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ronald Kiandee", photoUrl: null, party: "PN", parliamentCode: "P183", constituency: "Beluran", state: "Sabah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Suhaimi Nasir", photoUrl: null, party: "BN", parliamentCode: "P184", constituency: "Libaran", state: "Sabah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Khairul Firdaus Akhbar Khan", photoUrl: null, party: "GRS", parliamentCode: "P185", constituency: "Batu Sapi", state: "Sabah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Vivian Wong", photoUrl: null, party: "PH", parliamentCode: "P186", constituency: "Sandakan", state: "Sabah", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Bung Moktar Radin", photoUrl: null, party: "BN", parliamentCode: "P187", constituency: "Kinabatangan", state: "Sabah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Yusof Apdal", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P188.png", party: "WARISAN", parliamentCode: "P188", constituency: "Lahad Datu", state: "Sabah", gender: "Male", title: "YB Dato'", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Shafie Apdal", photoUrl: null, party: "WARISAN", parliamentCode: "P189", constituency: "Semporna", state: "Sabah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Lo Su Fui", photoUrl: null, party: "GRS", parliamentCode: "P190", constituency: "Tawau", state: "Sabah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Andi Suryady Bandy", photoUrl: null, party: "BN", parliamentCode: "P191", constituency: "Kalabakan", state: "Sabah", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },

      // SARAWAK (P192-P222)
      { name: "Mordi Bimol", photoUrl: null, party: "PH", parliamentCode: "P192", constituency: "Mas Gading", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Nancy Shukri", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/santubong.jpg", party: "GPS", parliamentCode: "P193", constituency: "Santubong", state: "Sarawak", gender: "Female", title: "YB Dato' Sri Hajah", role: "Minister of Women", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Fadillah Yusof", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P194.jpg", party: "GPS", parliamentCode: "P194", constituency: "Petra Jaya", state: "Sarawak", gender: "Male", title: "YAB Datuk Amar Haji", role: "Deputy Prime Minister", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 24000 },
      { name: "Kelvin Yii", photoUrl: null, party: "PH", parliamentCode: "P195", constituency: "Bandar Kuching", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Chong Chieng Jen", photoUrl: null, party: "PH", parliamentCode: "P196", constituency: "Stampin", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Rubiah Wang", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P197.jpg", party: "GPS", parliamentCode: "P197", constituency: "Kota Samarahan", state: "Sarawak", gender: "Female", title: "YB Datuk Hajah", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Willie Mongin", photoUrl: null, party: "GPS", parliamentCode: "P198", constituency: "Puncak Borneo", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Richard Riot Jaem", photoUrl: null, party: "GPS", parliamentCode: "P199", constituency: "Serian", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Rodiyah Sapiee", photoUrl: null, party: "GPS", parliamentCode: "P200", constituency: "Batang Sadong", state: "Sarawak", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Shafizan Kepli", photoUrl: null, party: "GPS", parliamentCode: "P201", constituency: "Batang Lupar", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Doris Sophia Brodi", photoUrl: null, party: "GPS", parliamentCode: "P202", constituency: "Sri Aman", state: "Sarawak", gender: "Female", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Roy Angau Gingkoi", photoUrl: null, party: "GPS", parliamentCode: "P203", constituency: "Lubok Antu", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Richard Rapu", photoUrl: null, party: "GPS", parliamentCode: "P204", constituency: "Betong", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ali Biju", photoUrl: null, party: "PN", parliamentCode: "P205", constituency: "Saratok", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Yusuf Wahab", photoUrl: null, party: "GPS", parliamentCode: "P206", constituency: "Tanjong Manis", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Ahmad Johnie Zawawi", photoUrl: null, party: "GPS", parliamentCode: "P207", constituency: "Igan", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Huang Tiong Sii", photoUrl: null, party: "GPS", parliamentCode: "P208", constituency: "Sarikei", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Larry Sng", photoUrl: null, party: "PBM", parliamentCode: "P209", constituency: "Julau", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Aaron Ago Dagang", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P210.png", party: "GPS", parliamentCode: "P210", constituency: "Kanowit", state: "Sarawak", gender: "Male", title: "YB Datuk", role: "Minister of National Unity", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Alice Lau", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/YB%20Lanang.JPG", party: "PH", parliamentCode: "P211", constituency: "Lanang", state: "Sarawak", gender: "Female", title: "YB Puan", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Oscar Ling", photoUrl: null, party: "PH", parliamentCode: "P212", constituency: "Sibu", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Hanifah Hajar Taib", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P213.jpg", party: "GPS", parliamentCode: "P213", constituency: "Mukah", state: "Sarawak", gender: "Female", title: "YB Dato Hajjah", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Edwin Banta", photoUrl: null, party: "GPS", parliamentCode: "P214", constituency: "Selangau", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Alexander Nanta Linggi", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P215.jpg", party: "GPS", parliamentCode: "P215", constituency: "Kapit", state: "Sarawak", gender: "Male", title: "YB Dato Sri", role: "Minister of Works", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Wilson Ugak Kumbong", photoUrl: null, party: "GPS", parliamentCode: "P216", constituency: "Hulu Rajang", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Tiong King Sing", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P217.png", party: "GPS", parliamentCode: "P217", constituency: "Bintulu", state: "Sarawak", gender: "Male", title: "YB Dato Sri", role: "Minister of Tourism", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 14000 },
      { name: "Lukanisman Awang Sauni", photoUrl: null, party: "GPS", parliamentCode: "P218", constituency: "Sibuti", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Chiew Choon Man", photoUrl: null, party: "PH", parliamentCode: "P219", constituency: "Miri", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Anyi Ngau", photoUrl: null, party: "GPS", parliamentCode: "P220", constituency: "Baram", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Hasbi Habibollah", photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P221.jpg", party: "GPS", parliamentCode: "P221", constituency: "Limbang", state: "Sarawak", gender: "Male", title: "YB Datuk Haji", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
      { name: "Henry Sum Agong", photoUrl: null, party: "GPS", parliamentCode: "P222", constituency: "Lawas", state: "Sarawak", gender: "Male", title: "YB", role: "Member of Parliament", swornInDate, mpAllowance: BASE_MP_ALLOWANCE, ministerSalary: 0 },
    ];

    mpsData.forEach((mpData) => {
      const id = randomUUID();
      const attendance = this.generateAttendance();
      const ministerSalary = mpData.ministerSalary ?? 0;
      const isMinister = ministerSalary > 0;
      const mp: Mp = { 
        ...mpData, 
        id,
        photoUrl: mpData.photoUrl ?? null,
        title: mpData.title ?? null,
        role: mpData.role ?? null,
        ministerSalary,
        daysAttended: attendance.daysAttended,
        totalParliamentDays: attendance.totalParliamentDays,
        hansardSessionsSpoke: 0,
        entertainmentAllowance: 2500,
        handphoneAllowance: 2000,
        computerAllowance: 6000,
        dressWearAllowance: 1000,
        parliamentSittingAllowance: 400,
        governmentMeetingDays: 0,
        isMinister,
        ministerialPosition: isMinister ? (mpData.role ?? null) : null,
      };
      this.mps.set(id, mp);
    });
  }

  async getCourtCase(id: string): Promise<CourtCase | undefined> {
    return this.courtCases.get(id);
  }

  async getCourtCasesByMpId(mpId: string): Promise<CourtCase[]> {
    return Array.from(this.courtCases.values()).filter(
      (courtCase) => courtCase.mpId === mpId
    );
  }

  async getCourtCaseByCaseNumber(caseNumber: string): Promise<CourtCase | undefined> {
    return Array.from(this.courtCases.values()).find(
      (courtCase) => courtCase.caseNumber === caseNumber
    );
  }

  async getAllCourtCases(): Promise<CourtCase[]> {
    return Array.from(this.courtCases.values());
  }

  async createCourtCase(insertCourtCase: InsertCourtCase): Promise<CourtCase> {
    const id = randomUUID();
    const courtCase: CourtCase = {
      ...insertCourtCase,
      id,
      outcome: insertCourtCase.outcome ?? null,
      documentLinks: insertCourtCase.documentLinks ?? null,
    };
    this.courtCases.set(id, courtCase);
    return courtCase;
  }

  async updateCourtCase(id: string, updates: Partial<InsertCourtCase>): Promise<CourtCase | undefined> {
    const existing = this.courtCases.get(id);
    if (!existing) return undefined;

    const updated: CourtCase = {
      ...existing,
      ...updates,
    };
    this.courtCases.set(id, updated);
    return updated;
  }

  async deleteCourtCase(id: string): Promise<boolean> {
    return this.courtCases.delete(id);
  }

  private seedCourtCases() {
    const mpsArray = Array.from(this.mps.values());
    
    const ahmadZahidMp = mpsArray.find(mp => mp.name === "Ahmad Zahid Hamidi");
    if (ahmadZahidMp) {
      this.createCourtCase({
        mpId: ahmadZahidMp.id,
        caseNumber: "PP-45-272-11/2018",
        title: "Public Prosecutor v Ahmad Zahid Hamidi - 47 Corruption Charges",
        courtLevel: "High Court",
        status: "Ongoing",
        filingDate: new Date("2018-10-19"),
        outcome: null,
        charges: "47 charges of criminal breach of trust, corruption and money laundering involving Yayasan Akalbudi funds totaling RM114 million",
        documentLinks: [
          "https://www.thestar.com.my/news/nation/2023/09/04/high-court-grants-zahid-discharge-not-amounting-to-acquittal-in-yab-case",
          "https://www.thestar.com.my/news/nation/2022/01/24/yayasan-akalbudi-trial-zahid-ordered-to-enter-defence-on-47-charges-of-corruption"
        ],
      });

      this.createCourtCase({
        mpId: ahmadZahidMp.id,
        caseNumber: "PP-45-194-08/2018",
        title: "Public Prosecutor v Ahmad Zahid Hamidi - VLN Foreign Visa System",
        courtLevel: "High Court",
        status: "Completed",
        filingDate: new Date("2018-10-12"),
        outcome: "Acquitted on all 40 charges (Sept 2022), AG withdrew appeals (Dec 2024)",
        charges: "40 charges of corruption involving RM42 million in bribes from Ultra Kirana Sdn Bhd related to the Foreign Visa System (VLN) contract extension",
        documentLinks: [
          "https://www.thestar.com.my/news/nation/2024/12/12/agc-withdraws-appeals-against-zahid039s-acquittal-on-40-graft-charges-linked-to-vln",
          "https://theedgemalaysia.com/article/zahid-acquitted-all-charges-vln-case-0"
        ],
      });
    }

    const limGuanEngMp = mpsArray.find(mp => mp.name === "Lim Guan Eng");
    if (limGuanEngMp) {
      this.createCourtCase({
        mpId: limGuanEngMp.id,
        caseNumber: "CR-45-88-06/2018",
        title: "Public Prosecutor v Lim Guan Eng - Tunnel Project Corruption",
        courtLevel: "High Court",
        status: "Ongoing",
        filingDate: new Date("2020-08-06"),
        outcome: null,
        charges: "Corruption charges related to soliciting 10% profit and receiving RM3.3 million in bribes for the RM6.3 billion Penang undersea tunnel project",
        documentLinks: [
          "https://www.nst.com.my/amp/news/nation/2025/10/1304477/guan-eng-used-businessman-secure-penang-undersea-tunnel-project-court",
          "https://www.thestar.com.my/news/nation/2024/07/12/undersea-tunnel-case-guan-eng-submits-representation-to-drop-corruption-charges"
        ],
      });
    }

    const syedSaddiqMp = mpsArray.find(mp => mp.name === "Syed Saddiq Syed Abdul Rahman");
    if (syedSaddiqMp) {
      this.createCourtCase({
        mpId: syedSaddiqMp.id,
        caseNumber: "PP-45-119-09/2021",
        title: "Public Prosecutor v Syed Saddiq - CBT and Money Laundering",
        courtLevel: "High Court",
        status: "Completed",
        filingDate: new Date("2021-07-22"),
        outcome: "Acquitted by Court of Appeal on all charges (June 25, 2025)",
        charges: "Criminal breach of trust, misappropriation of funds and money laundering involving RM1.2 million from Armada Bersatu funds",
        documentLinks: [
          "https://www.thestar.com.my/news/nation/2025/06/25/syed-saddiq-acquitted",
          "https://www.thestar.com.my/news/nation/2023/11/09/syed-saddiq-guilty-on-all-four-charges-high-court-rules"
        ],
      });
    }

    const muhyiddinMp = mpsArray.find(mp => mp.name === "Muhyiddin Yassin");
    if (muhyiddinMp) {
      this.createCourtCase({
        mpId: muhyiddinMp.id,
        caseNumber: "PP-45-308-08/2022",
        title: "Public Prosecutor v Muhyiddin Yassin - Power Abuse",
        courtLevel: "High Court",
        status: "Ongoing",
        filingDate: new Date("2023-03-10"),
        outcome: null,
        charges: "4 charges of abuse of power and 3 charges of money laundering involving RM427.5 million in connection with Jana Wibawa programme",
        documentLinks: [
          "https://www.nst.com.my/news/crime-courts/2025/01/1161671/updated-muhyiddins-seven-power-abuse-money-laundering-cases-be",
          "https://www.nst.com.my/news/crime-courts/2024/09/1104233/muhyiddins-four-abuse-power-charges-over-jana-wibawa-maintained"
        ],
      });
    }

    const bungMoktarMp = mpsArray.find(mp => mp.name === "Bung Moktar Radin");
    if (bungMoktarMp) {
      this.createCourtCase({
        mpId: bungMoktarMp.id,
        caseNumber: "PP-45-308-05/2019",
        title: "Public Prosecutor v Bung Moktar Radin - Corruption",
        courtLevel: "Sessions Court",
        status: "Ongoing",
        filingDate: new Date("2019-05-03"),
        outcome: null,
        charges: "3 charges of corruption involving RM2.8 million related to Felcra investment in Public Mutual unit trusts. Ordered to enter defence after Court of Appeal overturned acquittal in November 2024.",
        documentLinks: [
          "https://www.thestar.com.my/news/nation/2025/05/22/appellate-court-dismisses-final-review-bid-by-bung-moktar-wife-over-graft-case",
          "https://www.bernama.com/en/news.php?id=2364505"
        ],
      });
    }

    if (limGuanEngMp && muhyiddinMp) {
      this.createCourtCase({
        mpId: limGuanEngMp.id,
        caseNumber: "CIVIL-LGE-MY-2023",
        title: "Lim Guan Eng v Muhyiddin Yassin - Defamation (Civil)",
        courtLevel: "High Court (Civil)",
        status: "Completed",
        filingDate: new Date("2023-03-27"),
        outcome: "Won - RM1.35 million awarded",
        charges: "Defamation lawsuit over Facebook posts alleging Lim misused power to revoke tax-exempt status of Yayasan Albukhary. Judgment awarded RM1.35 million plus RM50,000 costs in November 2024.",
        documentLinks: [
          "https://www.malaymail.com/news/malaysia/2024/12/18/guan-eng-seeks-interest-on-rm135m-defamation-damages-from-muhyiddin/160309",
          "https://www.usnews.com/news/world/articles/2024-11-08/malaysias-troubled-ex-pm-ordered-to-pay-300-000-to-politician-over-defamatory-remarks"
        ],
      });
    }

    const mahathirMp = mpsArray.find(mp => mp.name === "Mahathir Mohamad");
    const anwarMp = mpsArray.find(mp => mp.name === "Anwar Ibrahim");
    if (mahathirMp && anwarMp) {
      this.createCourtCase({
        mpId: mahathirMp.id,
        caseNumber: "CIVIL-MM-AI-2023",
        title: "Mahathir Mohamad v Anwar Ibrahim - Defamation (Civil)",
        courtLevel: "High Court (Civil)",
        status: "Ongoing",
        filingDate: new Date("2023-05-03"),
        outcome: null,
        charges: "RM150 million defamation lawsuit claiming Anwar accused Mahathir of enriching himself and family during 22+ years as Prime Minister. Case ongoing as of October 2025.",
        documentLinks: [
          "https://www.thestar.com.my/news/nation/2025/10/21/dr-m039s-defamation-suit-proceedings-against-pm-postponed-to-oct-23",
          "https://www.benarnews.org/english/news/malaysian/libel-lawsuit-05052023104557.html"
        ],
      });
    }
  }

  async getSprmInvestigation(id: string): Promise<SprmInvestigation | undefined> {
    return this.sprmInvestigations.get(id);
  }

  async getSprmInvestigationsByMpId(mpId: string): Promise<SprmInvestigation[]> {
    return Array.from(this.sprmInvestigations.values()).filter(
      (investigation) => investigation.mpId === mpId
    );
  }

  async getSprmInvestigationByCaseNumber(caseNumber: string): Promise<SprmInvestigation | undefined> {
    return Array.from(this.sprmInvestigations.values()).find(
      (investigation) => investigation.caseNumber === caseNumber
    );
  }

  async getAllSprmInvestigations(): Promise<SprmInvestigation[]> {
    return Array.from(this.sprmInvestigations.values());
  }

  async createSprmInvestigation(insertInvestigation: InsertSprmInvestigation): Promise<SprmInvestigation> {
    const id = randomUUID();
    const investigation: SprmInvestigation = {
      ...insertInvestigation,
      id,
      caseNumber: insertInvestigation.caseNumber ?? null,
      endDate: insertInvestigation.endDate ?? null,
      outcome: insertInvestigation.outcome ?? null,
      documentLinks: insertInvestigation.documentLinks ?? null,
    };
    this.sprmInvestigations.set(id, investigation);
    return investigation;
  }

  async updateSprmInvestigation(id: string, updates: Partial<InsertSprmInvestigation>): Promise<SprmInvestigation | undefined> {
    const existing = this.sprmInvestigations.get(id);
    if (!existing) return undefined;

    const updated: SprmInvestigation = {
      ...existing,
      ...updates,
    };
    this.sprmInvestigations.set(id, updated);
    return updated;
  }

  async deleteSprmInvestigation(id: string): Promise<boolean> {
    return this.sprmInvestigations.delete(id);
  }

  private seedSprmInvestigations() {
    const mpsArray = Array.from(this.mps.values());
    
    const ismailSabriMp = mpsArray.find(mp => mp.name === "Ismail Sabri Yaakob");
    if (ismailSabriMp) {
      this.createSprmInvestigation({
        mpId: ismailSabriMp.id,
        caseNumber: "MACC-ISY-2025",
        title: "Corruption and money laundering probe - Keluarga Malaysia campaign",
        status: "Ongoing",
        startDate: new Date("2025-02-10"),
        endDate: null,
        outcome: null,
        charges: "Under MACC investigation for corruption and money laundering related to RM700 million 'Keluarga Malaysia' promotional campaign during his tenure as PM (Aug 2021-Nov 2022). Named as primary suspect on March 3, 2025. Total assets seized: RM177 million comprising RM170 million in cash (multiple currencies) and 16kg gold bars worth RM7 million from safe houses and residences of senior aides. 13 bank accounts frozen with RM2 million. Will not challenge RM169 million forfeiture (Sept 2025). AGC reviewing full investigation report as of Oct 2025. No charges filed yet.",
        documentLinks: [
          "https://www.nst.com.my/news/crime-courts/2025/09/1272173/ismail-sabri-will-not-challenge-maccs-rm169mil-forfeiture",
          "https://www.freemalaysiatoday.com/category/nation/2025/03/13/ismail-sabri-pledges-full-cooperation-in-macc-probe",
          "https://www.malaymail.com/news/malaysia/2025/10/16/ag-macc-report-on-ismail-sabri-under-review-charges-ready-for-muhyiddins-son-in-law/194763"
        ],
      });
    }
  }

  // Legislative Proposal methods
  async getLegislativeProposal(id: string): Promise<LegislativeProposal | undefined> {
    return this.legislativeProposals.get(id);
  }

  async getLegislativeProposalsByMpId(mpId: string): Promise<LegislativeProposal[]> {
    return Array.from(this.legislativeProposals.values()).filter(
      (proposal) => proposal.mpId === mpId
    );
  }

  async getAllLegislativeProposals(): Promise<LegislativeProposal[]> {
    return Array.from(this.legislativeProposals.values());
  }

  async createLegislativeProposal(insertProposal: InsertLegislativeProposal): Promise<LegislativeProposal> {
    const id = randomUUID();
    const proposal: LegislativeProposal = {
      ...insertProposal,
      id,
      hansardReference: insertProposal.hansardReference ?? null,
      outcome: insertProposal.outcome ?? null,
    };
    this.legislativeProposals.set(id, proposal);
    return proposal;
  }

  async updateLegislativeProposal(id: string, updates: Partial<InsertLegislativeProposal>): Promise<LegislativeProposal | undefined> {
    const existing = this.legislativeProposals.get(id);
    if (!existing) return undefined;

    const updated: LegislativeProposal = {
      ...existing,
      ...updates,
    };
    this.legislativeProposals.set(id, updated);
    return updated;
  }

  async deleteLegislativeProposal(id: string): Promise<boolean> {
    return this.legislativeProposals.delete(id);
  }

  // Debate Participation methods
  async getDebateParticipation(id: string): Promise<DebateParticipation | undefined> {
    return this.debateParticipations.get(id);
  }

  async getDebateParticipationsByMpId(mpId: string): Promise<DebateParticipation[]> {
    return Array.from(this.debateParticipations.values()).filter(
      (participation) => participation.mpId === mpId
    );
  }

  async getAllDebateParticipations(): Promise<DebateParticipation[]> {
    return Array.from(this.debateParticipations.values());
  }

  async createDebateParticipation(insertParticipation: InsertDebateParticipation): Promise<DebateParticipation> {
    const id = randomUUID();
    const participation: DebateParticipation = {
      ...insertParticipation,
      id,
      hansardReference: insertParticipation.hansardReference ?? null,
      position: insertParticipation.position ?? null,
    };
    this.debateParticipations.set(id, participation);
    return participation;
  }

  async updateDebateParticipation(id: string, updates: Partial<InsertDebateParticipation>): Promise<DebateParticipation | undefined> {
    const existing = this.debateParticipations.get(id);
    if (!existing) return undefined;

    const updated: DebateParticipation = {
      ...existing,
      ...updates,
    };
    this.debateParticipations.set(id, updated);
    return updated;
  }

  async deleteDebateParticipation(id: string): Promise<boolean> {
    return this.debateParticipations.delete(id);
  }

  // Parliamentary Question methods
  async getParliamentaryQuestion(id: string): Promise<ParliamentaryQuestion | undefined> {
    return this.parliamentaryQuestions.get(id);
  }

  async getParliamentaryQuestionsByMpId(mpId: string): Promise<ParliamentaryQuestion[]> {
    return Array.from(this.parliamentaryQuestions.values()).filter(
      (question) => question.mpId === mpId
    );
  }

  async getAllParliamentaryQuestions(): Promise<ParliamentaryQuestion[]> {
    return Array.from(this.parliamentaryQuestions.values());
  }

  async createParliamentaryQuestion(insertQuestion: InsertParliamentaryQuestion): Promise<ParliamentaryQuestion> {
    const id = randomUUID();
    const question: ParliamentaryQuestion = {
      ...insertQuestion,
      id,
      hansardReference: insertQuestion.hansardReference ?? null,
      answerText: insertQuestion.answerText ?? null,
    };
    this.parliamentaryQuestions.set(id, question);
    return question;
  }

  async updateParliamentaryQuestion(id: string, updates: Partial<InsertParliamentaryQuestion>): Promise<ParliamentaryQuestion | undefined> {
    const existing = this.parliamentaryQuestions.get(id);
    if (!existing) return undefined;

    const updated: ParliamentaryQuestion = {
      ...existing,
      ...updates,
    };
    this.parliamentaryQuestions.set(id, updated);
    return updated;
  }

  async deleteParliamentaryQuestion(id: string): Promise<boolean> {
    return this.parliamentaryQuestions.delete(id);
  }
  
  // Hansard Record methods
  async getHansardRecord(id: string): Promise<HansardRecord | undefined> {
    return this.hansardRecords.get(id);
  }
  
  async getAllHansardRecords(): Promise<HansardRecord[]> {
    return Array.from(this.hansardRecords.values());
  }
  
  async getHansardRecordsBySessionNumber(sessionNumber: string): Promise<HansardRecord[]> {
    return Array.from(this.hansardRecords.values()).filter(
      record => record.sessionNumber === sessionNumber
    );
  }
  
  async getLatestHansardRecord(): Promise<HansardRecord | undefined> {
    const records = Array.from(this.hansardRecords.values());
    if (records.length === 0) return undefined;
    
    return records.sort((a, b) => {
      const dateA = new Date(a.sessionDate).getTime();
      const dateB = new Date(b.sessionDate).getTime();
      return dateB - dateA;
    })[0];
  }
  
  async getHansardSpeakingParticipationByMpId(mpId: string): Promise<{ count: number; sessions: HansardRecord[] }> {
    const allRecords = Array.from(this.hansardRecords.values());
    
    const sessionsWithSpeaker = allRecords.filter(record => 
      record.speakers && record.speakers.some(speaker => speaker.mpId === mpId)
    );
    
    const sortedSessions = sessionsWithSpeaker.sort((a, b) => {
      const dateA = new Date(a.sessionDate).getTime();
      const dateB = new Date(b.sessionDate).getTime();
      return dateB - dateA;
    });
    
    return {
      count: sortedSessions.length,
      sessions: sortedSessions.slice(0, 10)
    };
  }

  async get15thParliamentParticipationByMpId(mpId: string): Promise<{
    totalSessions: number;
    totalSpeeches: number;
    sessionsSpoke: number;
    averageSpeeches: number;
    sessions: Array<{
      id: string;
      sessionNumber: string;
      sessionDate: string;
      sitting: string;
      topics: string[];
      speechCount: number;
    }>;
  }> {
    const allRecords = Array.from(this.hansardRecords.values());
    
    const parliament15Records = allRecords.filter(r => r.parliamentTerm === '15');
    const totalSessions = parliament15Records.length;
    
    const sessionsWithMp = parliament15Records
      .filter(record => record.speakerStats?.some((stat: any) => stat.mpId === mpId))
      .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
    
    const sessions = sessionsWithMp.map(record => {
      const mpStats = record.speakerStats?.find((stat: any) => stat.mpId === mpId);
      return {
        id: record.id,
        sessionNumber: record.sessionNumber,
        sessionDate: record.sessionDate.toISOString(),
        sitting: record.sitting,
        topics: record.topics || [],
        speechCount: mpStats?.totalSpeeches || 0
      };
    });
    
    const totalSpeeches = sessions.reduce((sum, s) => sum + s.speechCount, 0);
    const sessionsSpoke = sessions.length;
    const averageSpeeches = sessionsSpoke > 0 ? totalSpeeches / sessionsSpoke : 0;
    
    return {
      totalSessions,
      totalSpeeches,
      sessionsSpoke,
      averageSpeeches: Math.round(averageSpeeches * 100) / 100,
      sessions
    };
  }
  
  async createHansardRecord(insertRecord: InsertHansardRecord): Promise<HansardRecord> {
    const id = randomUUID();
    const record: HansardRecord = {
      ...insertRecord,
      id,
      summary: insertRecord.summary ?? null,
      summaryLanguage: insertRecord.summaryLanguage ?? null,
      summarizedAt: null,
      createdAt: new Date(),
      constituenciesPresent: insertRecord.constituenciesPresent ?? null,
      constituenciesAbsent: insertRecord.constituenciesAbsent ?? null,
      constituenciesAbsentRule91: insertRecord.constituenciesAbsentRule91 ?? null,
    };
    this.hansardRecords.set(id, record);
    return record;
  }

  async createHansardRecordWithSpeechStats(
    insertRecord: InsertHansardRecord,
    speakerStats: Array<{mpId: string; totalSpeeches: number}>
  ): Promise<HansardRecord> {
    // Clone MPs into temp map for atomic updates
    const mpUpdates = new Map<string, Mp>();
    
    // Prepare MP updates - throw if any MP is missing
    for (const { mpId, totalSpeeches } of speakerStats) {
      const mp = this.mps.get(mpId);
      if (!mp) {
        throw new Error(`MP ${mpId} not found - cannot update speech statistics`);
      }
      
      // Clone and increment
      mpUpdates.set(mpId, {
        ...mp,
        hansardSessionsSpoke: mp.hansardSessionsSpoke + 1,
        totalSpeechInstances: mp.totalSpeechInstances + totalSpeeches
      });
    }
    
    // Create hansard record
    const record = await this.createHansardRecord(insertRecord);
    
    // Apply all MP updates atomically (all succeed or none)
    mpUpdates.forEach((updatedMp, mpId) => {
      this.mps.set(mpId, updatedMp);
    });
    
    return record;
  }
  
  async updateHansardRecord(id: string, updates: UpdateHansardRecord): Promise<HansardRecord | undefined> {
    const existing = this.hansardRecords.get(id);
    if (!existing) return undefined;
    
    const updated: HansardRecord = {
      ...existing,
      ...updates,
    };
    this.hansardRecords.set(id, updated);
    return updated;
  }
  
  async deleteHansardRecord(id: string): Promise<boolean> {
    return this.hansardRecords.delete(id);
  }
  
  async deleteBulkHansardRecords(ids: string[]): Promise<number> {
    let deleted = 0;
    for (const id of ids) {
      if (this.hansardRecords.delete(id)) {
        deleted++;
      }
    }
    return deleted;
  }
  
  async deleteAllHansardRecords(): Promise<number> {
    const count = this.hansardRecords.size;
    this.hansardRecords.clear();
    return count;
  }
  
  // Page View methods
  private pageViewCounts: Map<string, number> = new Map();
  
  async incrementPageView(page: string): Promise<number> {
    const current = this.pageViewCounts.get(page) || 0;
    const newCount = current + 1;
    this.pageViewCounts.set(page, newCount);
    return newCount;
  }
  
  async getPageViewCount(page: string): Promise<number> {
    return this.pageViewCounts.get(page) || 0;
  }

  private seedHansardRecords() {
    const mpsArray = Array.from(this.mps.values());
    
    const anwarMp = mpsArray.find(mp => mp.name === "Anwar Ibrahim");
    const rafizMp = mpsArray.find(mp => mp.name === "Rafizi Ramli");
    const ahmadZahidMp = mpsArray.find(mp => mp.name === "Ahmad Zahid Hamidi");
    
    const absentMps1 = mpsArray.filter(mp => 
      mp.name !== "Anwar Ibrahim" && 
      mp.name !== "Ahmad Zahid Hamidi"
    ).slice(0, 15);
    
    const hansard1Speakers = [
      ...(anwarMp ? [{
        mpId: anwarMp.id,
        mpName: anwarMp.name,
        speakingOrder: 1,
        duration: 45,
      }] : []),
      ...(ahmadZahidMp ? [{
        mpId: ahmadZahidMp.id,
        mpName: ahmadZahidMp.name,
        speakingOrder: 2,
        duration: 30,
      }] : []),
    ];
    
    this.createHansardRecord({
      sessionNumber: "DR.11.04.2022",
      sessionDate: new Date("2022-04-11"),
      parliamentTerm: "15th Parliament",
      sitting: "First Session",
      transcript: "The Dewan Rakyat proceeded with the second reading of the Constitution (Amendment) Bill 2022, commonly known as the Anti-Hopping Bill. The Yang Berhormat Prime Minister Dato' Seri Anwar Ibrahim presented the bill, explaining that this constitutional amendment aims to strengthen democratic principles by preventing elected representatives from switching political allegiances mid-term. The bill received strong bipartisan support with extensive debate on the mechanisms of implementation and impact on parliamentary democracy.",
      pdfLinks: ["https://hansard.parliament.gov.my/files/DR-11042022.pdf"],
      topics: ["Anti-Hopping Bill", "Constitutional Amendment", "Democratic Reform", "Party Loyalty"],
      speakers: hansard1Speakers,
      speakerStats: hansard1Speakers.map(speaker => ({
        mpId: speaker.mpId,
        mpName: speaker.mpName,
        totalSpeeches: speaker.speakingOrder === 1 ? 7 : 4,
        speakingOrder: speaker.speakingOrder,
      })),
      voteRecords: [{
        voteType: "Second Reading",
        motion: "Constitution (Amendment) Bill 2022",
        result: "Passed",
        yesCount: 209,
        noCount: 11,
        abstainCount: 2,
        timestamp: "2022-04-11T16:30:00Z",
      }],
      attendedMpIds: [anwarMp?.id, ahmadZahidMp?.id].filter((id): id is string => id !== undefined),
      absentMpIds: absentMps1.map(mp => mp.id),
    });
    
    const absentMps2 = mpsArray.filter(mp => 
      mp.name !== "Rafizi Ramli"
    ).slice(0, 22);
    
    const hansard2Speakers = [
      ...(rafizMp ? [{
        mpId: rafizMp.id,
        mpName: rafizMp.name,
        speakingOrder: 1,
        duration: 60,
      }] : []),
    ];
    
    this.createHansardRecord({
      sessionNumber: "DR.13.10.2023",
      sessionDate: new Date("2023-10-13"),
      parliamentTerm: "15th Parliament",
      sitting: "Third Session",
      transcript: "The Dewan Rakyat debated Budget 2024 with focus on economic reforms, subsidy rationalization, and fiscal sustainability. The Minister of Economy YB Rafizi Ramli presented the government's comprehensive economic plan including the PADU (Central Database Hub) initiative for targeted subsidy distribution. Extensive discussions covered inflation control, digital economy development, and social safety net programs.",
      pdfLinks: ["https://hansard.parliament.gov.my/files/DR-13102023.pdf"],
      topics: ["Budget 2024", "Economic Reform", "Subsidy Rationalization", "PADU Database", "Digital Economy"],
      speakers: hansard2Speakers,
      speakerStats: hansard2Speakers.map(speaker => ({
        mpId: speaker.mpId,
        mpName: speaker.mpName,
        totalSpeeches: 5,
        speakingOrder: speaker.speakingOrder,
      })),
      voteRecords: [{
        voteType: "Budget Approval",
        motion: "Budget 2024 - Economic Development",
        result: "Passed",
        yesCount: 148,
        noCount: 74,
        abstainCount: 0,
        timestamp: "2023-10-13T18:45:00Z",
      }],
      attendedMpIds: rafizMp ? [rafizMp.id] : [],
      absentMpIds: absentMps2.map(mp => mp.id),
    });
    
    const hansardAbsentNames = [
      "Dato' Seri Anwar bin Ibrahim",
      "Dato' Seri Dr. Ahmad Zahid bin Hamidi",
      "Tuan Loke Siew Fook",
      "Dato' Seri Haji Mohamed Khaled bin Nordin",
      "Datuk Ewon Benedick",
      "Dato' Sri Azalina Othman Said",
      "Datuk Haji Hasbi bin Haji Habibollah",
      "Datuk Chan Foong Hin",
      "Dato' Sri Haji Abdul Rahman bin Mohamad",
      "Datuk Seri Dr. Shamsul Anuar bin Haji Nasarah",
      "Tuan Nga Kor Ming",
      "Dato' Seri Utama Haji Mohamad bin Haji Hasan",
      "Dato Sri Alexander Nanta Linggi",
      "Datuk Aaron Ago Dagang",
      "Datuk Seri Dr. Haji Dzulkefly bin Ahmad",
      "Dato Hajjah Hanifah Hajar Taib",
      "Dato' Mohammad Yusof bin Apdal",
      "Dato' Sri Arthur Joseph Kurup",
      "Dato' Sri Huang Tiong Sii",
      "Tuan Khairul Firdaus bin Akbar Khan",
      "Tuan Adam Adli bin Abd Halim",
      "Datuk Wilson Ugak Anak Kumbong",
      "Dato' Sri Sh Mohmed Puzi bin Sh Ali",
      "Datuk Ir. Shahelmey bin Yahya",
      "Datuk Suhaimi bin Nasir",
      "Datuk Seri Panglima Haji Mohd Shafie bin Haji Apdal",
      "Dato' Seri Hishammuddin bin Tun Hussein",
      "Datuk Seri Saravanan a/l Murugan",
      "Tuan Chow Kon Yeow",
      "Dato' Seri Utama Haji Aminuddin bin Harun",
      "Dato' Amirudin bin Shari",
      "Datuk Seri Panglima Bung Moktar bin Radin",
      "Puan Isnaraissah Munirah binti Majilis",
      "Tuan Mordi Bimol",
      "Tuan Lim Lip Eng",
      "Dato' Verdon bin Bahanda",
      "Datuk Wetrom bin Bahanda",
      "Tuan Haji Muhammad Ismi bin Mat Taib",
      "Dato' Seri Dr. Ahmad Samsuri bin Mokhtar",
      "Dato' Seri Hamzah bin Zainudin",
      "Tan Sri Dato' Seri Haji Abdul Hadi bin Haji Awang",
      "Datuk Seri Dr. Ronald Kiandee",
      "Dato Sri Tiong King Sing",
      "Datuk Jonathan bin Yasin",
      "Datuk Matbali bin Musah",
      "Tuan Haji Manndzri bin Haji Nasib",
      "Dato' Haji Adnan bin Abu Hassan",
      "Dato' Sri Ismail Sabri bin Yaakob",
      "Tuan Hassan bin Abdul Karim",
      "Datuk Seri Panglima Dr. Gapari bin Katingan @ Geoffrey Kitingan",
      "Dato Ir. Haji Yusuf bin Abd Wahab",
      "Datuk Ali Anak Biju"
    ];
    
    const nameMatcher = new MPNameMatcher(mpsArray);
    const absentMpIds = nameMatcher.matchNames(hansardAbsentNames);
    const attendedMpIds = mpsArray
      .filter(mp => !absentMpIds.includes(mp.id))
      .map(mp => mp.id);
    
    console.log(`Seeding Hansard DR.6.11.2025: ${absentMpIds.length} absent MPs, ${attendedMpIds.length} attended MPs`);
    
    this.createHansardRecord({
      sessionNumber: "DR.6.11.2025",
      sessionDate: new Date("2025-11-06"),
      parliamentTerm: "15th Parliament",
      sitting: "Third Session",
      transcript: "Naskah belum disemak DEWAN RAKYAT PARLIMEN KELIMA BELAS PENGGAL KEEMPAT MESYUARAT KETIGA Bil. 62 Khamis 6 November 2025 K A N D U N G A N WAKTU PERTANYAAN-PERTANYAAN MENTERI (Halaman 1) PERTANYAAN-PERTANYAAN BAGI JAWAB LISAN (Halaman 12) USUL: Waktu Mesyuarat dan Urusan Dibebaskan Daripada Peraturan...",
      pdfLinks: ["https://hansard.parliament.gov.my/files/DR-06112025.pdf"],
      topics: ["Rang Undang-Undang", "Perlembagaan", "Constitution", "Soalan", "Question", "Parlimen", "Parliament", "Ekonomi", "Economy"],
      speakers: [],
      voteRecords: [],
      attendedMpIds,
      absentMpIds,
    });
  }

  private seedLegislativeProposals() {
    const mpsArray = Array.from(this.mps.values());
    
    const anwarMp = mpsArray.find(mp => mp.name === "Anwar Ibrahim");
    if (anwarMp) {
      this.createLegislativeProposal({
        mpId: anwarMp.id,
        title: "Anti-Hopping Bill 2022",
        type: "Bill",
        dateProposed: new Date("2022-04-11"),
        status: "Passed",
        description: "Constitutional amendment to prevent MPs from party-hopping, requiring MPs who switch parties or become independents to vacate their seats.",
        hansardReference: "DR.11.04.2022",
        outcome: "Passed with 2/3 majority (209 votes) on July 28, 2022. Constitution (Amendment) Act 2022 gazetted August 2022.",
      });
    }

    const nurulIzzah = mpsArray.find(mp => mp.name === "Nurul Izzah Anwar");
    if (nurulIzzah) {
      this.createLegislativeProposal({
        mpId: nurulIzzah.id,
        title: "Anti-Sexual Harassment Bill 2024",
        type: "Private Member's Bill",
        dateProposed: new Date("2024-03-25"),
        status: "Under Review",
        description: "Comprehensive legislation to address sexual harassment in workplaces, educational institutions, and public spaces. Establishes protection mechanisms and complaint procedures.",
        hansardReference: "DR.25.03.2024",
        outcome: null,
      });
    }
  }

  private seedDebateParticipations() {
    const mpsArray = Array.from(this.mps.values());
    
    const rafizMp = mpsArray.find(mp => mp.name === "Rafizi Ramli");
    if (rafizMp) {
      this.createDebateParticipation({
        mpId: rafizMp.id,
        topic: "Budget 2024 - Economic Reform and Subsidy Rationalization",
        date: new Date("2023-10-13"),
        contribution: "Spoke extensively on subsidy rationalization, digital economy initiatives, and targeted assistance programs. Defended government's approach to fiscal reform and PADU database implementation.",
        hansardReference: "DR.13.10.2023",
        position: "Supporting",
      });
    }

    const ahmadZahidMp = mpsArray.find(mp => mp.name === "Ahmad Zahid Hamidi");
    if (ahmadZahidMp) {
      this.createDebateParticipation({
        mpId: ahmadZahidMp.id,
        topic: "Malaysia Agreement 1963 (MA63) Implementation",
        date: new Date("2024-07-16"),
        contribution: "Emphasized BN's commitment to implementing MA63 provisions for Sabah and Sarawak. Discussed special grants, revenue allocation, and restoration of state rights.",
        hansardReference: "DR.16.07.2024",
        position: "Supporting",
      });
    }
  }

  private seedParliamentaryQuestions() {
    const mpsArray = Array.from(this.mps.values());
    
    const syedSaddiqMp = mpsArray.find(mp => mp.name === "Syed Saddiq Syed Abdul Rahman");
    if (syedSaddiqMp) {
      this.createParliamentaryQuestion({
        mpId: syedSaddiqMp.id,
        questionText: "What is the government's plan to address youth unemployment and create quality job opportunities for graduates, especially in the digital economy sector?",
        dateAsked: new Date("2024-05-20"),
        ministry: "Ministry of Human Resources",
        topic: "Youth Employment and Digital Economy Jobs",
        answerStatus: "Answered",
        hansardReference: "DR.20.05.2024",
        answerText: "Minister outlined initiatives including Graduate Employment Scheme, digital skills training programs, and incentives for companies hiring fresh graduates. Target of 50,000 new jobs in tech sector by 2025.",
      });
    }

    const hannahYeohMp = mpsArray.find(mp => mp.name === "Hannah Yeoh");
    if (hannahYeohMp) {
      this.createParliamentaryQuestion({
        mpId: hannahYeohMp.id,
        questionText: "What measures is the Ministry taking to improve child protection services and prevent child abuse cases, particularly in childcare centers and schools?",
        dateAsked: new Date("2024-06-18"),
        ministry: "Ministry of Women, Family and Community Development",
        topic: "Child Protection and Safety",
        answerStatus: "Answered",
        hansardReference: "DR.18.06.2024",
        answerText: "Outlined enhanced screening for childcare workers, mandatory CCTV installation in centers, increased funding for welfare officers, and amendments to Child Act 2001 for stronger penalties.",
      });
    }
  }
}

// Database storage implementation using Drizzle ORM
export class DbStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // MP methods
  async getMp(id: string): Promise<Mp | undefined> {
    const result = await db.select().from(mps).where(eq(mps.id, id));
    return result[0];
  }

  async getAllMps(): Promise<Mp[]> {
    const result = await db.select().from(mps);
    return result ?? [];
  }

  async createMp(mp: InsertMp): Promise<Mp> {
    const result = await db.insert(mps).values(mp).returning();
    return result[0];
  }

  // Court Case methods
  async getCourtCase(id: string): Promise<CourtCase | undefined> {
    const result = await db.select().from(courtCases).where(eq(courtCases.id, id));
    return result[0];
  }

  async getCourtCasesByMpId(mpId: string): Promise<CourtCase[]> {
    try {
      const result = await db.select().from(courtCases).where(eq(courtCases.mpId, mpId));
      return result ?? [];
    } catch (error) {
      console.error("Error in getCourtCasesByMpId:", error);
      return [];
    }
  }

  async getCourtCaseByCaseNumber(caseNumber: string): Promise<CourtCase | undefined> {
    try {
      const result = await db.select().from(courtCases).where(eq(courtCases.caseNumber, caseNumber));
      return result[0];
    } catch (error) {
      console.error("Error in getCourtCaseByCaseNumber:", error);
      return undefined;
    }
  }

  async getAllCourtCases(): Promise<CourtCase[]> {
    try {
      const result = await db.select().from(courtCases);
      return result ?? [];
    } catch (error) {
      console.error("Error in getAllCourtCases:", error);
      return [];
    }
  }

  async createCourtCase(courtCase: InsertCourtCase): Promise<CourtCase> {
    const result = await db.insert(courtCases).values(courtCase).returning();
    return result[0];
  }

  async updateCourtCase(id: string, updates: Partial<InsertCourtCase>): Promise<CourtCase | undefined> {
    const result = await db.update(courtCases).set(updates).where(eq(courtCases.id, id)).returning();
    return result[0];
  }

  async deleteCourtCase(id: string): Promise<boolean> {
    const result = await db.delete(courtCases).where(eq(courtCases.id, id)).returning();
    return result.length > 0;
  }

  // SPRM Investigation methods
  async getSprmInvestigation(id: string): Promise<SprmInvestigation | undefined> {
    const result = await db.select().from(sprmInvestigations).where(eq(sprmInvestigations.id, id));
    return result[0];
  }

  async getSprmInvestigationsByMpId(mpId: string): Promise<SprmInvestigation[]> {
    try {
      const result = await db.select().from(sprmInvestigations).where(eq(sprmInvestigations.mpId, mpId));
      return result ?? [];
    } catch (error) {
      console.error("Error in getSprmInvestigationsByMpId:", error);
      return [];
    }
  }

  async getSprmInvestigationByCaseNumber(caseNumber: string): Promise<SprmInvestigation | undefined> {
    try {
      const result = await db.select().from(sprmInvestigations).where(eq(sprmInvestigations.caseNumber, caseNumber));
      return result[0];
    } catch (error) {
      console.error("Error in getSprmInvestigationByCaseNumber:", error);
      return undefined;
    }
  }

  async getAllSprmInvestigations(): Promise<SprmInvestigation[]> {
    try {
      const result = await db.select().from(sprmInvestigations);
      return result ?? [];
    } catch (error) {
      console.error("Error in getAllSprmInvestigations:", error);
      return [];
    }
  }

  async createSprmInvestigation(investigation: InsertSprmInvestigation): Promise<SprmInvestigation> {
    const result = await db.insert(sprmInvestigations).values(investigation).returning();
    return result[0];
  }

  async updateSprmInvestigation(id: string, updates: Partial<InsertSprmInvestigation>): Promise<SprmInvestigation | undefined> {
    const result = await db.update(sprmInvestigations).set(updates).where(eq(sprmInvestigations.id, id)).returning();
    return result[0];
  }

  async deleteSprmInvestigation(id: string): Promise<boolean> {
    const result = await db.delete(sprmInvestigations).where(eq(sprmInvestigations.id, id)).returning();
    return result.length > 0;
  }

  // Legislative Proposal methods
  async getLegislativeProposal(id: string): Promise<LegislativeProposal | undefined> {
    const result = await db.select().from(legislativeProposals).where(eq(legislativeProposals.id, id));
    return result[0];
  }

  async getLegislativeProposalsByMpId(mpId: string): Promise<LegislativeProposal[]> {
    try {
      const result = await db.select().from(legislativeProposals).where(eq(legislativeProposals.mpId, mpId));
      return result ?? [];
    } catch (error) {
      console.error("Error in getLegislativeProposalsByMpId:", error);
      return [];
    }
  }

  async getAllLegislativeProposals(): Promise<LegislativeProposal[]> {
    try {
      const result = await db.select().from(legislativeProposals);
      return result ?? [];
    } catch (error) {
      console.error("Error in getAllLegislativeProposals:", error);
      return [];
    }
  }

  async createLegislativeProposal(proposal: InsertLegislativeProposal): Promise<LegislativeProposal> {
    const result = await db.insert(legislativeProposals).values(proposal).returning();
    return result[0];
  }

  async updateLegislativeProposal(id: string, updates: Partial<InsertLegislativeProposal>): Promise<LegislativeProposal | undefined> {
    const result = await db.update(legislativeProposals).set(updates).where(eq(legislativeProposals.id, id)).returning();
    return result[0];
  }

  async deleteLegislativeProposal(id: string): Promise<boolean> {
    const result = await db.delete(legislativeProposals).where(eq(legislativeProposals.id, id)).returning();
    return result.length > 0;
  }

  // Debate Participation methods
  async getDebateParticipation(id: string): Promise<DebateParticipation | undefined> {
    const result = await db.select().from(debateParticipations).where(eq(debateParticipations.id, id));
    return result[0];
  }

  async getDebateParticipationsByMpId(mpId: string): Promise<DebateParticipation[]> {
    try {
      const result = await db.select().from(debateParticipations).where(eq(debateParticipations.mpId, mpId));
      return result ?? [];
    } catch (error) {
      console.error("Error in getDebateParticipationsByMpId:", error);
      return [];
    }
  }

  async getAllDebateParticipations(): Promise<DebateParticipation[]> {
    try {
      const result = await db.select().from(debateParticipations);
      return result ?? [];
    } catch (error) {
      console.error("Error in getAllDebateParticipations:", error);
      return [];
    }
  }

  async createDebateParticipation(participation: InsertDebateParticipation): Promise<DebateParticipation> {
    const result = await db.insert(debateParticipations).values(participation).returning();
    return result[0];
  }

  async updateDebateParticipation(id: string, updates: Partial<InsertDebateParticipation>): Promise<DebateParticipation | undefined> {
    const result = await db.update(debateParticipations).set(updates).where(eq(debateParticipations.id, id)).returning();
    return result[0];
  }

  async deleteDebateParticipation(id: string): Promise<boolean> {
    const result = await db.delete(debateParticipations).where(eq(debateParticipations.id, id)).returning();
    return result.length > 0;
  }

  // Parliamentary Question methods
  async getParliamentaryQuestion(id: string): Promise<ParliamentaryQuestion | undefined> {
    const result = await db.select().from(parliamentaryQuestions).where(eq(parliamentaryQuestions.id, id));
    return result[0];
  }

  async getParliamentaryQuestionsByMpId(mpId: string): Promise<ParliamentaryQuestion[]> {
    try {
      const result = await db.select().from(parliamentaryQuestions).where(eq(parliamentaryQuestions.mpId, mpId));
      return result ?? [];
    } catch (error) {
      console.error("Error in getParliamentaryQuestionsByMpId:", error);
      return [];
    }
  }

  async getAllParliamentaryQuestions(): Promise<ParliamentaryQuestion[]> {
    try {
      const result = await db.select().from(parliamentaryQuestions);
      return result ?? [];
    } catch (error) {
      console.error("Error in getAllParliamentaryQuestions:", error);
      return [];
    }
  }

  async createParliamentaryQuestion(question: InsertParliamentaryQuestion): Promise<ParliamentaryQuestion> {
    const result = await db.insert(parliamentaryQuestions).values(question).returning();
    return result[0];
  }

  async updateParliamentaryQuestion(id: string, updates: Partial<InsertParliamentaryQuestion>): Promise<ParliamentaryQuestion | undefined> {
    const result = await db.update(parliamentaryQuestions).set(updates).where(eq(parliamentaryQuestions.id, id)).returning();
    return result[0];
  }

  async deleteParliamentaryQuestion(id: string): Promise<boolean> {
    const result = await db.delete(parliamentaryQuestions).where(eq(parliamentaryQuestions.id, id)).returning();
    return result.length > 0;
  }
  
  // Hansard Record methods
  async getHansardRecord(id: string): Promise<HansardRecord | undefined> {
    // Use raw SQL to work around Neon driver's broken timestamp deserialization
    const result = await db.execute(sql`
      SELECT 
        id,
        session_number,
        to_char(session_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as session_date,
        parliament_term,
        sitting,
        transcript,
        summary,
        summary_language,
        summarized_at,
        pdf_links,
        topics,
        speakers,
        vote_records,
        attended_mp_ids,
        absent_mp_ids,
        constituencies_present,
        constituencies_absent,
        constituencies_absent_rule91,
        created_at
      FROM hansard_records
      WHERE id = ${id}
    `);
    if (!result.rows || result.rows.length === 0) return undefined;
    const row: any = result.rows[0];
    return {
      id: row.id,
      sessionNumber: row.session_number,
      sessionDate: row.session_date,
      parliamentTerm: row.parliament_term,
      sitting: row.sitting,
      transcript: row.transcript,
      summary: row.summary,
      summaryLanguage: row.summary_language,
      summarizedAt: row.summarized_at,
      pdfLinks: row.pdf_links,
      topics: row.topics,
      speakers: row.speakers,
      voteRecords: row.vote_records,
      attendedMpIds: row.attended_mp_ids || [],
      absentMpIds: row.absent_mp_ids || [],
      constituenciesPresent: row.constituencies_present,
      constituenciesAbsent: row.constituencies_absent,
      constituenciesAbsentRule91: row.constituencies_absent_rule91,
      createdAt: row.created_at,
    } as unknown as HansardRecord;
  }
  
  async getAllHansardRecords(): Promise<HansardRecord[]> {
    try {
      // Use raw SQL to work around Neon driver's broken timestamp deserialization
      const result = await db.execute(sql`
        SELECT 
          id,
          session_number,
          to_char(session_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as session_date,
          parliament_term,
          sitting,
          transcript,
          summary,
          summary_language,
          summarized_at,
          pdf_links,
          topics,
          speakers,
          vote_records,
          attended_mp_ids,
          absent_mp_ids,
          constituencies_present,
          constituencies_absent,
          constituencies_absent_rule91,
          created_at
        FROM hansard_records
        ORDER BY session_date DESC
      `);
      return result.rows.map((row: any) => ({
        id: row.id,
        sessionNumber: row.session_number,
        sessionDate: row.session_date,
        parliamentTerm: row.parliament_term,
        sitting: row.sitting,
        transcript: row.transcript,
        summary: row.summary,
        summaryLanguage: row.summary_language,
        summarizedAt: row.summarized_at,
        pdfLinks: row.pdf_links,
        topics: row.topics,
        speakers: row.speakers,
        voteRecords: row.vote_records,
        attendedMpIds: row.attended_mp_ids || [],
        absentMpIds: row.absent_mp_ids || [],
        constituenciesPresent: row.constituencies_present,
        constituenciesAbsent: row.constituencies_absent,
        constituenciesAbsentRule91: row.constituencies_absent_rule91,
        createdAt: row.created_at,
      })) as unknown as HansardRecord[];
    } catch (error) {
      console.error("Error in getAllHansardRecords:", error);
      return [];
    }
  }
  
  async getHansardRecordsBySessionNumber(sessionNumber: string): Promise<HansardRecord[]> {
    try {
      // Use raw SQL to work around Neon driver's broken timestamp deserialization
      const result = await db.execute(sql`
        SELECT 
          id,
          session_number,
          to_char(session_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as session_date,
          parliament_term,
          sitting,
          transcript,
          summary,
          summary_language,
          summarized_at,
          pdf_links,
          topics,
          speakers,
          vote_records,
          attended_mp_ids,
          absent_mp_ids,
          constituencies_present,
          constituencies_absent,
          constituencies_absent_rule91,
          created_at
        FROM hansard_records
        WHERE session_number = ${sessionNumber}
        ORDER BY session_date DESC
      `);
      return result.rows.map((row: any) => ({
        id: row.id,
        sessionNumber: row.session_number,
        sessionDate: row.session_date,
        parliamentTerm: row.parliament_term,
        sitting: row.sitting,
        transcript: row.transcript,
        summary: row.summary,
        summaryLanguage: row.summary_language,
        summarizedAt: row.summarized_at,
        pdfLinks: row.pdf_links,
        topics: row.topics,
        speakers: row.speakers,
        voteRecords: row.vote_records,
        attendedMpIds: row.attended_mp_ids || [],
        absentMpIds: row.absent_mp_ids || [],
        constituenciesPresent: row.constituencies_present,
        constituenciesAbsent: row.constituencies_absent,
        constituenciesAbsentRule91: row.constituencies_absent_rule91,
        createdAt: row.created_at,
      })) as unknown as HansardRecord[];
    } catch (error) {
      console.error("Error in getHansardRecordsBySessionNumber:", error);
      return [];
    }
  }
  
  async getLatestHansardRecord(): Promise<HansardRecord | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          session_number,
          to_char(session_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as session_date,
          parliament_term,
          sitting,
          transcript,
          summary,
          summary_language,
          summarized_at,
          pdf_links,
          topics,
          speakers,
          vote_records,
          attended_mp_ids,
          absent_mp_ids,
          constituencies_present,
          constituencies_absent,
          constituencies_absent_rule91,
          created_at
        FROM hansard_records
        ORDER BY session_date DESC
        LIMIT 1
      `);
      if (!result.rows || result.rows.length === 0) return undefined;
      const row: any = result.rows[0];
      return {
        id: row.id,
        sessionNumber: row.session_number,
        sessionDate: row.session_date,
        parliamentTerm: row.parliament_term,
        sitting: row.sitting,
        transcript: row.transcript,
        summary: row.summary,
        summaryLanguage: row.summary_language,
        summarizedAt: row.summarized_at,
        pdfLinks: row.pdf_links,
        topics: row.topics,
        speakers: row.speakers,
        voteRecords: row.vote_records,
        attendedMpIds: row.attended_mp_ids || [],
        absentMpIds: row.absent_mp_ids || [],
        constituenciesPresent: row.constituencies_present,
        constituenciesAbsent: row.constituencies_absent,
        constituenciesAbsentRule91: row.constituencies_absent_rule91,
        createdAt: row.created_at,
      } as unknown as HansardRecord;
    } catch (error) {
      console.error("Error in getLatestHansardRecord:", error);
      return undefined;
    }
  }

  async getHansardSpeakingParticipationByMpId(mpId: string): Promise<{ count: number; sessions: HansardRecord[] }> {
    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          session_number,
          to_char(session_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as session_date,
          parliament_term,
          sitting,
          transcript,
          summary,
          summary_language,
          summarized_at,
          pdf_links,
          topics,
          speakers,
          vote_records,
          attended_mp_ids,
          absent_mp_ids,
          constituencies_present,
          constituencies_absent,
          constituencies_absent_rule91,
          created_at
        FROM hansard_records
        WHERE speakers @> ${JSON.stringify([{ mpId }])}::jsonb
        ORDER BY session_date DESC
        LIMIT 10
      `);
      
      const sessions = result.rows.map((row: any) => ({
        id: row.id,
        sessionNumber: row.session_number,
        sessionDate: row.session_date,
        parliamentTerm: row.parliament_term,
        sitting: row.sitting,
        transcript: row.transcript,
        summary: row.summary,
        summaryLanguage: row.summary_language,
        summarizedAt: row.summarized_at,
        pdfLinks: row.pdf_links,
        topics: row.topics,
        speakers: row.speakers,
        voteRecords: row.vote_records,
        attendedMpIds: row.attended_mp_ids || [],
        absentMpIds: row.absent_mp_ids || [],
        constituenciesPresent: row.constituencies_present,
        constituenciesAbsent: row.constituencies_absent,
        constituenciesAbsentRule91: row.constituencies_absent_rule91,
        createdAt: row.created_at,
      })) as unknown as HansardRecord[];

      const countResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM hansard_records
        WHERE speakers @> ${JSON.stringify([{ mpId }])}::jsonb
      `);
      const count = Number(countResult.rows[0]?.count || 0);

      return {
        count,
        sessions
      };
    } catch (error) {
      console.error("Error in getHansardSpeakingParticipationByMpId:", error);
      return { count: 0, sessions: [] };
    }
  }

  async get15thParliamentParticipationByMpId(mpId: string): Promise<{
    totalSessions: number;
    totalSpeeches: number;
    sessionsSpoke: number;
    averageSpeeches: number;
    sessions: Array<{
      id: string;
      sessionNumber: string;
      sessionDate: string;
      sitting: string;
      topics: string[];
      speechCount: number;
    }>;
  }> {
    try {
      const totalSessionsResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM hansard_records
        WHERE parliament_term = '15'
      `);
      const totalSessions = Number(totalSessionsResult.rows[0]?.count || 0);

      const result = await db.execute(sql`
        SELECT 
          id,
          session_number,
          to_char(session_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as session_date,
          sitting,
          topics,
          speaker_stats
        FROM hansard_records
        WHERE parliament_term = '15'
        ORDER BY session_date DESC
      `);

      const sessions = result.rows
        .map((row: any) => {
          const speakerStats = row.speaker_stats || [];
          const mpStats = speakerStats.find((s: any) => s.mpId === mpId || s.mp_id === mpId);
          const speechCount = mpStats?.totalSpeeches || mpStats?.total_speeches || 0;

          return {
            id: row.id,
            sessionNumber: row.session_number,
            sessionDate: row.session_date,
            sitting: row.sitting,
            topics: row.topics || [],
            speechCount,
            hasMp: speechCount > 0
          };
        })
        .filter((session: any) => session.hasMp)
        .map(({ hasMp, ...session }) => session);

      const totalSpeeches = sessions.reduce((sum, s) => sum + s.speechCount, 0);
      const sessionsSpoke = sessions.length;
      const averageSpeeches = sessionsSpoke > 0 ? totalSpeeches / sessionsSpoke : 0;

      return {
        totalSessions,
        totalSpeeches,
        sessionsSpoke,
        averageSpeeches: Math.round(averageSpeeches * 100) / 100,
        sessions
      };
    } catch (error) {
      console.error("Error in get15thParliamentParticipationByMpId:", error);
      return {
        totalSessions: 0,
        totalSpeeches: 0,
        sessionsSpoke: 0,
        averageSpeeches: 0,
        sessions: []
      };
    }
  }
  
  async createHansardRecord(record: InsertHansardRecord): Promise<HansardRecord> {
    const result = await db.insert(hansardRecords).values(record).returning();
    return result[0];
  }

  async createHansardRecordWithSpeechStats(
    record: InsertHansardRecord,
    speakerStats: Array<{mpId: string; totalSpeeches: number}>
  ): Promise<HansardRecord> {
    return await db.transaction(async (tx) => {
      // Insert hansard record
      const inserted = await tx.insert(hansardRecords).values(record).returning();
      const hansardRecord = inserted[0];

      // Update MP speech statistics atomically
      for (const { mpId, totalSpeeches } of speakerStats) {
        const updated = await tx.update(mps)
          .set({
            hansardSessionsSpoke: sql`${mps.hansardSessionsSpoke} + 1`,
            totalSpeechInstances: sql`${mps.totalSpeechInstances} + ${totalSpeeches}`
          })
          .where(eq(mps.id, mpId))
          .returning();
        
        if (!updated.length) {
          throw new Error(`MP ${mpId} not found - cannot update speech statistics`);
        }
      }

      return hansardRecord;
    });
  }
  
  async updateHansardRecord(id: string, record: UpdateHansardRecord): Promise<HansardRecord | undefined> {
    const result = await db.update(hansardRecords).set(record).where(eq(hansardRecords.id, id)).returning();
    return result[0];
  }
  
  async deleteHansardRecord(id: string): Promise<boolean> {
    const result = await db.delete(hansardRecords).where(eq(hansardRecords.id, id)).returning();
    return result.length > 0;
  }
  
  async deleteBulkHansardRecords(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(hansardRecords)
      .where(sql`${hansardRecords.id} = ANY(${ids})`)
      .returning();
    return result.length;
  }
  
  async deleteAllHansardRecords(): Promise<number> {
    const result = await db.delete(hansardRecords).returning();
    return result.length;
  }
  
  // Page View methods
  async incrementPageView(page: string): Promise<number> {
    const existing = await db.select().from(pageViews).where(eq(pageViews.page, page));
    
    if (existing.length > 0) {
      const updated = await db
        .update(pageViews)
        .set({ 
          viewCount: sql`${pageViews.viewCount} + 1`,
          lastViewed: sql`NOW()`
        })
        .where(eq(pageViews.page, page))
        .returning();
      return updated[0].viewCount;
    } else {
      const created = await db
        .insert(pageViews)
        .values({ page, viewCount: 1 })
        .returning();
      return created[0].viewCount;
    }
  }
  
  async getPageViewCount(page: string): Promise<number> {
    const result = await db.select().from(pageViews).where(eq(pageViews.page, page));
    return result.length > 0 ? result[0].viewCount : 0;
  }
}

// Helper function to seed the database with initial data from MemStorage
export async function seedDatabase() {
  const memStorage = new MemStorage();
  const dbStorage = new DbStorage();
  
  // Seed admin user if not exists
  try {
    const existingAdmin = await dbStorage.getUserByUsername('admin');
    if (!existingAdmin) {
      const hashedPassword = bcrypt.hashSync('061167@abcdeF1', 10);
      await dbStorage.createUser({
        username: 'admin',
        password: hashedPassword,
        isAdmin: true
      });
      console.log('✅ Admin user created - Username: admin');
    }
  } catch (error) {
    console.log('Admin user seeding skipped or already exists');
  }
  
  let mpIdMap = new Map<string, string>();
  let shouldSeedMps = false;
  
  // Check if database is already seeded with MPs
  try {
    const existingMps = await dbStorage.getAllMps();
    if (existingMps && existingMps.length > 0) {
      console.log("MPs already seeded, building ID map...");
      // Build MP ID map from existing MPs
      const memMps = await memStorage.getAllMps();
      for (const memMp of memMps) {
        const dbMp = existingMps.find(m => m.name === memMp.name);
        if (dbMp) {
          mpIdMap.set(memMp.id, dbMp.id);
        }
      }
    } else {
      shouldSeedMps = true;
    }
  } catch (error) {
    console.log("Database not yet seeded, proceeding with full seed...");
    shouldSeedMps = true;
  }
  
  if (!shouldSeedMps) {
    // Check if court cases and SPRM investigations need to be seeded
    const existingCourtCases = await dbStorage.getAllCourtCases();
    const existingSprmInvestigations = await dbStorage.getAllSprmInvestigations();
    const existingHansardRecords = await dbStorage.getAllHansardRecords();
    
    const hasCourtCases = existingCourtCases && existingCourtCases.length > 0;
    const hasSprmInvestigations = existingSprmInvestigations && existingSprmInvestigations.length > 0;
    const hasHansardRecords = existingHansardRecords && existingHansardRecords.length > 0;
    
    if (hasHansardRecords) {
      // Check if existing records have null/undefined absentMpIds (stale data from before this feature was added)
      // Note: Empty arrays [] are valid (sessions with perfect attendance), so we only check for null/undefined
      const hasStaleData = existingHansardRecords.some(record => 
        record.absentMpIds === null || record.absentMpIds === undefined
      );
      
      if (hasStaleData) {
        console.log("⚠️  Detected Hansard records with null/undefined absentMpIds (stale data from before attendance tracking)");
        console.log("🔄 Deleting all Hansard records to reseed with proper attendance tracking...");
        
        // Delete all Hansard records so we can reseed with correct attendance data
        for (const record of existingHansardRecords) {
          await dbStorage.deleteHansardRecord(record.id);
        }
        console.log("✅ Deleted stale Hansard records, proceeding with fresh seed...");
      } else if (hasCourtCases && hasSprmInvestigations) {
        // Check if MP photos need to be updated
        const existingMps = await dbStorage.getAllMps();
        const mpsWithoutPhotos = existingMps.filter(mp => !mp.photoUrl || mp.photoUrl === null);
        
        if (mpsWithoutPhotos.length > 0) {
          console.log(`${mpsWithoutPhotos.length} MPs missing photos, fetching from parliament website...`);
          const photoMap = await scrapeMpPhotos();
          let photosUpdated = 0;
          
          for (const mp of existingMps) {
            const photoUrl = photoMap.get(mp.parliamentCode);
            if (photoUrl && (!mp.photoUrl || mp.photoUrl === null)) {
              try {
                await db.update(mps)
                  .set({ photoUrl })
                  .where(eq(mps.id, mp.id));
                photosUpdated++;
              } catch (error) {
                console.error(`Error updating photo for MP ${mp.name}:`, error);
              }
            }
          }
          
          if (photosUpdated > 0) {
            console.log(`✅ Updated ${photosUpdated} MP photos from parliament website`);
          }
        }
        
        // Only skip if we have everything: MPs, court cases, SPRM investigations, and Hansard
        console.log("Database already fully seeded, skipping...");
        return;
      } else {
        console.log("Hansard records exist but court cases or SPRM investigations missing, proceeding with partial seed...");
      }
    } else {
      console.log("Hansard records not seeded, proceeding with full seed...");
    }
  }
  
  // Seed MPs and keep track of ID mapping (only if needed)
  if (shouldSeedMps) {
    const allMps = await memStorage.getAllMps();
    
    console.log(`Seeding ${allMps.length} MPs...`);
    for (const mp of allMps) {
      const { id: oldId, ...mpData} = mp;
      try {
        const newMp = await dbStorage.createMp(mpData);
        if (!newMp || !newMp.id) {
          console.error(`Failed to create MP: ${mp.name} - returned undefined or no ID`);
          continue;
        }
        mpIdMap.set(oldId, newMp.id);
      } catch (error) {
        console.error(`Error creating MP ${mp.name}:`, error);
      }
    }
    console.log(`Successfully seeded ${mpIdMap.size} MPs`);
    
    // Fetch and update MP photos
    console.log("Fetching MP photos from parliament website...");
    const photoMap = await scrapeMpPhotos();
    let photosUpdated = 0;
    
    const allSeededMps = await dbStorage.getAllMps();
    for (const mp of allSeededMps) {
      const photoUrl = photoMap.get(mp.parliamentCode);
      if (photoUrl && photoUrl !== mp.photoUrl) {
        try {
          await db.update(mps)
            .set({ photoUrl })
            .where(eq(mps.id, mp.id));
          photosUpdated++;
        } catch (error) {
          console.error(`Error updating photo for MP ${mp.name}:`, error);
        }
      }
    }
    
    if (photosUpdated > 0) {
      console.log(`✅ Updated ${photosUpdated} MP photos from parliament website`);
    } else {
      console.log("⚠️  No MP photos found on parliament website");
    }
  }
  
  // Seed court cases with updated MP IDs (check for duplicates)
  const allCourtCases = await memStorage.getAllCourtCases();
  let courtCaseCreated = 0;
  let courtCaseSkipped = 0;
  
  for (const courtCase of allCourtCases) {
    const { id, mpId, ...caseData } = courtCase;
    const newMpId = mpIdMap.get(mpId);
    if (newMpId) {
      // Check if this case already exists
      const existing = await dbStorage.getCourtCaseByCaseNumber(courtCase.caseNumber);
      if (existing) {
        courtCaseSkipped++;
      } else {
        await dbStorage.createCourtCase({ ...caseData, mpId: newMpId });
        courtCaseCreated++;
      }
    }
  }
  
  if (courtCaseCreated > 0) {
    console.log(`✅ Created ${courtCaseCreated} new court cases`);
  }
  if (courtCaseSkipped > 0) {
    console.log(`⏭️  Skipped ${courtCaseSkipped} existing court cases`);
  }
  
  // Seed SPRM investigations with updated MP IDs (check for duplicates)
  const allInvestigations = await memStorage.getAllSprmInvestigations();
  let investigationCreated = 0;
  let investigationSkipped = 0;
  
  for (const investigation of allInvestigations) {
    const { id, mpId, ...invData } = investigation;
    const newMpId = mpIdMap.get(mpId);
    if (newMpId && investigation.caseNumber) {
      // Check if this investigation already exists
      const existing = await dbStorage.getSprmInvestigationByCaseNumber(investigation.caseNumber);
      if (existing) {
        investigationSkipped++;
      } else {
        await dbStorage.createSprmInvestigation({ ...invData, mpId: newMpId });
        investigationCreated++;
      }
    }
  }
  
  if (investigationCreated > 0) {
    console.log(`✅ Created ${investigationCreated} new SPRM investigations`);
  }
  if (investigationSkipped > 0) {
    console.log(`⏭️  Skipped ${investigationSkipped} existing SPRM investigations`);
  }
  
  // Seed legislative proposals with updated MP IDs
  const allProposals = await memStorage.getAllLegislativeProposals();
  for (const proposal of allProposals) {
    const { id, mpId, ...propData } = proposal;
    const newMpId = mpIdMap.get(mpId);
    if (newMpId) {
      await dbStorage.createLegislativeProposal({ ...propData, mpId: newMpId });
    }
  }
  
  // Seed debate participations with updated MP IDs
  const allDebates = await memStorage.getAllDebateParticipations();
  for (const debate of allDebates) {
    const { id, mpId, ...debateData } = debate;
    const newMpId = mpIdMap.get(mpId);
    if (newMpId) {
      await dbStorage.createDebateParticipation({ ...debateData, mpId: newMpId });
    }
  }
  
  // Seed parliamentary questions with updated MP IDs
  const allQuestions = await memStorage.getAllParliamentaryQuestions();
  for (const question of allQuestions) {
    const { id, mpId, ...qData } = question;
    const newMpId = mpIdMap.get(mpId);
    if (newMpId) {
      await dbStorage.createParliamentaryQuestion({ ...qData, mpId: newMpId });
    }
  }
  
  // Seed Hansard records (update MP IDs in speakers, attendedMpIds, and absentMpIds)
  const allHansardRecords = await memStorage.getAllHansardRecords();
  console.log(`Seeding ${allHansardRecords.length} Hansard records...`);
  
  for (const record of allHansardRecords) {
    const { id, createdAt, ...recordData } = record;
    
    // Update MP IDs in speakers array
    const updatedSpeakers = recordData.speakers.map(speaker => {
      const newMpId = mpIdMap.get(speaker.mpId);
      return newMpId ? { ...speaker, mpId: newMpId } : speaker;
    });
    
    // Update MP IDs in attendedMpIds array
    const updatedAttendedMpIds = (recordData.attendedMpIds || [])
      .map(oldId => mpIdMap.get(oldId))
      .filter((id): id is string => id !== undefined);
    
    // Update MP IDs in absentMpIds array
    const updatedAbsentMpIds = (recordData.absentMpIds || [])
      .map(oldId => mpIdMap.get(oldId))
      .filter((id): id is string => id !== undefined);
    
    console.log(`Seeding Hansard ${record.sessionNumber}: ${updatedAbsentMpIds.length} absent MPs, ${updatedAttendedMpIds.length} attended MPs`);
    
    await dbStorage.createHansardRecord({
      ...recordData,
      speakers: updatedSpeakers,
      attendedMpIds: updatedAttendedMpIds,
      absentMpIds: updatedAbsentMpIds,
    });
  }
  
  console.log("Database seeded successfully!");
}

// Use DbStorage if DATABASE_URL is configured, otherwise use MemStorage
export const storage = process.env.DATABASE_URL ? new DbStorage() : new MemStorage();
