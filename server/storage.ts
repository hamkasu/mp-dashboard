import { type User, type InsertUser, type Mp, type InsertMp } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // MP methods
  getMp(id: string): Promise<Mp | undefined>;
  getAllMps(): Promise<Mp[]>;
  createMp(mp: InsertMp): Promise<Mp>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private mps: Map<string, Mp>;

  constructor() {
    this.users = new Map();
    this.mps = new Map();
    this.seedMps();
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
    const mp: Mp = { ...insertMp, id };
    this.mps.set(id, mp);
    return mp;
  }

  private seedMps() {
    const mpsData: InsertMp[] = [
      // PARLIMEN (Speaker)
      {
        name: "Johari bin Abdul",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/ypdr.jpg",
        party: "PH",
        parliamentCode: "Speaker",
        constituency: "Speaker of Dewan Rakyat",
        state: "Federal",
        gender: "Male",
        title: "Tan Sri Dato' (Dr.)",
        role: "Speaker",
      },
      
      // EKSEKUTIF (Cabinet)
      {
        name: "Anwar bin Ibrahim",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P063.png",
        party: "PH",
        parliamentCode: "P063",
        constituency: "Tambun",
        state: "Perak",
        gender: "Male",
        title: "YAB Dato' Seri",
        role: "Prime Minister",
      },
      {
        name: "Ahmad Zahid bin Hamidi",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/YAB%20TPM%201.jpg",
        party: "BN",
        parliamentCode: "P075",
        constituency: "Bagan Datuk",
        state: "Perak",
        gender: "Male",
        title: "YAB Dato' Seri Dr.",
        role: "Deputy Prime Minister",
      },
      {
        name: "Fadillah bin Haji Yusof",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P194.jpg",
        party: "GPS",
        parliamentCode: "P194",
        constituency: "Petra Jaya",
        state: "Sarawak",
        gender: "Male",
        title: "YAB Datuk Amar Haji",
        role: "Deputy Prime Minister",
      },
      {
        name: "Loke Siew Fook",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P128.png",
        party: "PH",
        parliamentCode: "P128",
        constituency: "Seremban",
        state: "Negeri Sembilan",
        gender: "Male",
        title: "YB Tuan",
        role: "Minister of Transport",
      },
      {
        name: "Mohamad bin Sabu",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P111.png",
        party: "PH",
        parliamentCode: "P111",
        constituency: "Kota Raja",
        state: "Selangor",
        gender: "Male",
        title: "YB Datuk Seri Haji",
        role: "Minister of Agriculture",
      },
      {
        name: "Nga Kor Ming",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P076.png",
        party: "PH",
        parliamentCode: "P076",
        constituency: "Teluk Intan",
        state: "Perak",
        gender: "Male",
        title: "YB Tuan",
        role: "Minister of Local Government",
      },
      {
        name: "Mohamad bin Haji Hasan",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P131.png",
        party: "BN",
        parliamentCode: "P131",
        constituency: "Rembau",
        state: "Negeri Sembilan",
        gender: "Male",
        title: "YB Dato' Seri Utama Haji",
        role: "Minister of Rural Development",
      },
      {
        name: "Alexander Nanta Linggi",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P215.jpg",
        party: "GPS",
        parliamentCode: "P215",
        constituency: "Kapit",
        state: "Sarawak",
        gender: "Male",
        title: "YB Dato Sri",
        role: "Minister of Domestic Trade",
      },
      {
        name: "Mohamed Khaled bin Nordin",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P156.png",
        party: "BN",
        parliamentCode: "P156",
        constituency: "Kota Tinggi",
        state: "Johor",
        gender: "Male",
        title: "YB Dato' Seri Haji",
        role: "Minister of Higher Education",
      },
      {
        name: "Chang Lih Kang",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P077.jpg",
        party: "PH",
        parliamentCode: "P077",
        constituency: "Tanjong Malim",
        state: "Perak",
        gender: "Male",
        title: "YB Tuan",
        role: "Minister of Science",
      },
      {
        name: "Nancy binti Shukri",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/santubong.jpg",
        party: "GPS",
        parliamentCode: "P193",
        constituency: "Santubong",
        state: "Sarawak",
        gender: "Female",
        title: "YB Dato' Sri Hajah",
        role: "Minister of Tourism",
      },
      {
        name: "Azalina binti Othman Said",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P157.png",
        party: "BN",
        parliamentCode: "P157",
        constituency: "Pengerang",
        state: "Johor",
        gender: "Female",
        title: "YB Dato' Sri",
        role: "Minister in Prime Minister's Department",
      },
      {
        name: "Ewon Benedick",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P174.png",
        party: "PH",
        parliamentCode: "P174",
        constituency: "Penampang",
        state: "Sabah",
        gender: "Male",
        title: "YB Datuk",
        role: "Minister of Natural Resources",
      },
      {
        name: "Tiong King Sing",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P217.png",
        party: "GPS",
        parliamentCode: "P217",
        constituency: "Bintulu",
        state: "Sarawak",
        gender: "Male",
        title: "YB Dato Sri",
        role: "Minister of Tourism",
      },
      {
        name: "Ahmad Fahmi bin Mohamed Fadzil",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P121.png",
        party: "PH",
        parliamentCode: "P121",
        constituency: "Lembah Pantai",
        state: "Kuala Lumpur",
        gender: "Male",
        title: "YB Datuk",
        role: "Minister of Communications",
      },
      {
        name: "Fadhlina binti Sidek",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P047.jpg",
        party: "PH",
        parliamentCode: "P047",
        constituency: "Nibong Tebal",
        state: "Pulau Pinang",
        gender: "Female",
        title: "YB Puan",
        role: "Minister of Education",
      },
      {
        name: "Aaron Ago anak Dagang",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P210.png",
        party: "GPS",
        parliamentCode: "P210",
        constituency: "Kanowit",
        state: "Sarawak",
        gender: "Male",
        title: "YB Datuk",
        role: "Deputy Minister",
      },
      {
        name: "Hannah Yeoh Tseow Suan",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P117.png",
        party: "PH",
        parliamentCode: "P117",
        constituency: "Segambut",
        state: "Kuala Lumpur",
        gender: "Female",
        title: "YB Puan",
        role: "Minister of Youth and Sports",
      },
      {
        name: "Zaliha binti Mustafa",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/Sekijang.png",
        party: "PH",
        parliamentCode: "P141",
        constituency: "Sekijang",
        state: "Johor",
        gender: "Female",
        title: "YB Datuk Seri Dr.",
        role: "Minister of Women",
      },
      {
        name: "Armizan bin Mohd Ali",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P175.png",
        party: "GRS",
        parliamentCode: "P175",
        constituency: "Papar",
        state: "Sabah",
        gender: "Male",
        title: "YB Datuk",
        role: "Member of Parliament",
      },
      {
        name: "Johari bin Abdul Ghani",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P119.png",
        party: "BN",
        parliamentCode: "P119",
        constituency: "Titiwangsa",
        state: "Kuala Lumpur",
        gender: "Male",
        title: "YB Datuk Seri",
        role: "Minister of Plantation Industries",
      },
      {
        name: "Gobind Singh Deo",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P106.png",
        party: "PH",
        parliamentCode: "P106",
        constituency: "Damansara",
        state: "Selangor",
        gender: "Male",
        title: "YB Tuan",
        role: "Minister of Digital",
      },
      {
        name: "Dzulkefly bin Ahmad",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P096.png",
        party: "PH",
        parliamentCode: "P096",
        constituency: "Kuala Selangor",
        state: "Selangor",
        gender: "Male",
        title: "YB Datuk Seri Haji Dr.",
        role: "Minister of Health",
      },
      {
        name: "Sim Chee Keong",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P045.jpg",
        party: "PH",
        parliamentCode: "P045",
        constituency: "Bukit Mertajam",
        state: "Pulau Pinang",
        gender: "Male",
        title: "YB Tuan",
        role: "Member of Parliament",
      },
      {
        name: "Ahmad bin Haji Maslan",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P164.png",
        party: "BN",
        parliamentCode: "P164",
        constituency: "Pontian",
        state: "Johor",
        gender: "Male",
        title: "YB Datuk Seri Haji",
        role: "Deputy Minister of Finance",
      },
      {
        name: "Rubiah binti Wang",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P197.jpg",
        party: "GPS",
        parliamentCode: "P197",
        constituency: "Kota Samarahan",
        state: "Sarawak",
        gender: "Female",
        title: "YB Datuk Hajah",
        role: "Member of Parliament",
      },
      {
        name: "Hasbi bin Haji Habibollah",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P221.jpg",
        party: "GPS",
        parliamentCode: "P221",
        constituency: "Limbang",
        state: "Sarawak",
        gender: "Male",
        title: "YB Datuk Haji",
        role: "Member of Parliament",
      },
      {
        name: "Chan Foong Hin",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P172.jpg",
        party: "PH",
        parliamentCode: "P172",
        constituency: "Kota Kinabalu",
        state: "Sabah",
        gender: "Male",
        title: "YB Datuk",
        role: "Deputy Minister",
      },
      {
        name: "Hanifah Hajar Taib",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P213.jpg",
        party: "GPS",
        parliamentCode: "P213",
        constituency: "Mukah",
        state: "Sarawak",
        gender: "Female",
        title: "YB Dato Hajjah",
        role: "Member of Parliament",
      },
      {
        name: "Akmal Nasrullah bin Mohd Nasir",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P160.jpg",
        party: "PH",
        parliamentCode: "P160",
        constituency: "Johor Bahru",
        state: "Johor",
        gender: "Male",
        title: "YB Tuan Haji",
        role: "Member of Parliament",
      },
      {
        name: "Adly bin Zahari",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P135.jpg",
        party: "PH",
        parliamentCode: "P135",
        constituency: "Alor Gajah",
        state: "Melaka",
        gender: "Male",
        title: "YB Tuan Haji",
        role: "Member of Parliament",
      },
      {
        name: "Abdul Rahman bin Haji Mohamad",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P079.png",
        party: "BN",
        parliamentCode: "P079",
        constituency: "Lipis",
        state: "Pahang",
        gender: "Male",
        title: "YB Dato' Sri Haji",
        role: "Minister of Defense",
      },
      {
        name: "Shamsul Anuar bin Haji Nasarah",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P055.png",
        party: "BN",
        parliamentCode: "P055",
        constituency: "Lenggong",
        state: "Perak",
        gender: "Male",
        title: "YB Datuk Seri Dr.",
        role: "Minister of Energy",
      },
      {
        name: "Liew Chin Tong",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P162.jpg",
        party: "PH",
        parliamentCode: "P162",
        constituency: "Iskandar Puteri",
        state: "Johor",
        gender: "Male",
        title: "YB Tuan",
        role: "Deputy Minister of Defense",
      },
      {
        name: "Mohammad Yusof bin Apdal",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P188.png",
        party: "WARISAN",
        parliamentCode: "P188",
        constituency: "Lahad Datu",
        state: "Sabah",
        gender: "Male",
        title: "YB Dato'",
        role: "Member of Parliament",
      },
      {
        name: "Arthur Joseph Kurup",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P182.png",
        party: "BN",
        parliamentCode: "P182",
        constituency: "Pensiangan",
        state: "Sabah",
        gender: "Male",
        title: "YB Dato' Sri",
        role: "Member of Parliament",
      },
      {
        name: "Ramli bin Dato' Mohd Nor",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/P078.jpg",
        party: "BN",
        parliamentCode: "P078",
        constituency: "Cameron Highlands",
        state: "Pahang",
        gender: "Male",
        title: "YB Dato' Dr.",
        role: "Member of Parliament",
      },
      {
        name: "Alice Lau Kiong Yieng",
        photoUrl: "https://www.parlimen.gov.my/images/webuser/ahli/2022/YB%20Lanang.JPG",
        party: "PH",
        parliamentCode: "P211",
        constituency: "Lanang",
        state: "Sarawak",
        gender: "Female",
        title: "YB Puan",
        role: "Member of Parliament",
      },
      {
        name: "Syed Ibrahim Syed Noh",
        photoUrl: null,
        party: "PH",
        parliamentCode: "P016",
        constituency: "Ledang",
        state: "Johor",
        gender: "Male",
        title: "YB Tuan",
        role: "Member of Parliament",
      },
      {
        name: "Nurul Izzah Anwar",
        photoUrl: null,
        party: "PH",
        parliamentCode: "P104",
        constituency: "Permatang Pauh",
        state: "Pulau Pinang",
        gender: "Female",
        title: "YB Puan",
        role: "Member of Parliament",
      },
      {
        name: "Fahmi Fadzil",
        photoUrl: null,
        party: "PH",
        parliamentCode: "P121",
        constituency: "Lembah Pantai",
        state: "Kuala Lumpur",
        gender: "Male",
        title: "YB",
        role: "Member of Parliament",
      },
      {
        name: "Siti Zailah Mohd Yusoff",
        photoUrl: null,
        party: "BN",
        parliamentCode: "P033",
        constituency: "Rantau Panjang",
        state: "Kelantan",
        gender: "Female",
        title: "YB Puan",
        role: "Member of Parliament",
      },
      {
        name: "Wan Saifuldin Wan Jan",
        photoUrl: null,
        party: "PN",
        parliamentCode: "P040",
        constituency: "Tasek Gelugor",
        state: "Pulau Pinang",
        gender: "Male",
        title: "YB Datuk Dr.",
        role: "Member of Parliament",
      },
      {
        name: "Nik Nazmi Nik Ahmad",
        photoUrl: null,
        party: "PH",
        parliamentCode: "P115",
        constituency: "Setiawangsa",
        state: "Kuala Lumpur",
        gender: "Male",
        title: "YB",
        role: "Minister of Natural Resources",
      },
      {
        name: "Dayang Noor Faizah binti Awang Haji Hassan",
        photoUrl: null,
        party: "GPS",
        parliamentCode: "P218",
        constituency: "Kabong",
        state: "Sarawak",
        gender: "Female",
        title: "YB Puan",
        role: "Member of Parliament",
      },
      {
        name: "Shahidan Kassim",
        photoUrl: null,
        party: "BN",
        parliamentCode: "P001",
        constituency: "Arau",
        state: "Perlis",
        gender: "Male",
        title: "YB Tan Sri Dato' Seri",
        role: "Member of Parliament",
      },
      {
        name: "Fuziah Salleh",
        photoUrl: null,
        party: "PH",
        parliamentCode: "P085",
        constituency: "Kuantan",
        state: "Pahang",
        gender: "Female",
        title: "YB Puan",
        role: "Deputy Minister of Health",
      },
      {
        name: "Wong Kah Woh",
        photoUrl: null,
        party: "PH",
        parliamentCode: "P070",
        constituency: "Ipoh Timur",
        state: "Perak",
        gender: "Male",
        title: "YB",
        role: "Member of Parliament",
      },
      {
        name: "Teo Nie Ching",
        photoUrl: null,
        party: "PH",
        parliamentCode: "P099",
        constituency: "Kulai",
        state: "Johor",
        gender: "Female",
        title: "YB",
        role: "Deputy Minister",
      },
    ];

    // Add additional MPs to reach 222 total
    const additionalMps: Partial<InsertMp>[] = [];
    const states = ["Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Pulau Pinang", "Perak", "Perlis", "Selangor", "Terengganu", "Sabah", "Sarawak", "Kuala Lumpur", "Labuan", "Putrajaya"];
    const parties = ["PH", "BN", "GPS", "GRS", "PN", "WARISAN", "MUDA", "BEBAS"];
    const genders = ["Male", "Female"];
    
    // Generate MPs to reach 222 total (48 already defined, need 174 more)
    for (let i = 0; i < 174; i++) {
      const stateIndex = i % states.length;
      const partyIndex = i % parties.length;
      const parliamentNum = String(i + 100).padStart(3, '0');
      
      additionalMps.push({
        name: `MP ${i + 49}`,
        photoUrl: null,
        party: parties[partyIndex],
        parliamentCode: `P${parliamentNum}`,
        constituency: `Constituency ${i + 49}`,
        state: states[stateIndex],
        gender: genders[i % 2],
        title: "YB",
        role: "Member of Parliament",
      });
    }

    // Combine all MPs
    const allMps = [...mpsData, ...additionalMps];

    allMps.forEach((mpData) => {
      const id = randomUUID();
      const mp: Mp = { ...mpData as InsertMp, id };
      this.mps.set(id, mp);
    });
  }
}

export const storage = new MemStorage();
