import { db } from '../server/db';
import { mps, hansardRecords } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface SpeakerMatch {
  mpId: string;
  mpName: string;
  constituency: string;
  speakingOrder: number;
}

async function parseHansardSpeakers() {
  // List all speakers identified from the Hansard document
  const speakersData = [
    { constituency: "Julau", name: "Larry Soon @ Larry Sng Wei Shien" },
    { constituency: "Labuan", name: "Suhaili bin Abdul Rahman" },
    { constituency: "Bayan Baru", name: "Sim Tze Tzin" },
    { constituency: "Kulim Bandar Baharu", name: "Roslan bin Hashim" },
    { constituency: "Putrajaya", name: "Radzi Jidin" },
    { constituency: "Betong", name: "Richard Rapu @ Aman Anak Begri" },
    { constituency: "Kuala Terengganu", name: "Ahmad Amzad bin Mohamed @ Hashim" },
    { constituency: "Dungun", name: "Wan Hassan bin Mohd Ramli" },
    { constituency: "Batang Lupar", name: "Mohamad Shafizan Haji Kepli" },
    { constituency: "Petaling Jaya", name: "Lee Chean Chung" },
    { constituency: "Ledang", name: "Syed Ibrahim bin Syed Noh" },
    { constituency: "Bachok", name: "Mohd Syahir bin Che Sulaiman" },
    { constituency: "Shah Alam", name: "Azli bin Yusof" },
    { constituency: "Temerloh", name: "Salamiah binti Mohd Nor" },
    { constituency: "Kampar", name: "Chong Zhemin" },
    { constituency: "Padang Terap", name: "Nurul Amin bin Hamid" },
    { constituency: "Sabak Bernam", name: "Kalam bin Salan" },
    { constituency: "Pasir Salak", name: "Jamaludin bin Yahya" },
    { constituency: "Balik Pulau", name: "Muhammad Bakhtiar bin Wan Chik" },
    { constituency: "Arau", name: "Shahidan bin Kassim" },
    { constituency: "Sik", name: "Ahmad Tarmizi bin Sulaiman" },
    { constituency: "Jelutong", name: "Sanisvara Nethaji Rayer a/l Rajaji" },
    { constituency: "Kubang Pasu", name: "Ku Abd Rahman bin Ku Ismail" },
    { constituency: "Tanjong Karang", name: "Zulkafperi bin Hanapi" },
    // Ministers who also spoke
    { constituency: "Tanjong Malim", name: "Chang Lih Kang" }, // Minister MOSTI
    { constituency: "Lembah Pantai", name: "Ahmad Fahmi bin Mohamed Fadzil" }, // Minister Komunikasi
    { constituency: "Tanjong", name: "Lim Hui Ying" }, // Deputy Minister Finance
    { constituency: "Taiping", name: "Wong Kah Woh" }, // Deputy Minister Education
  ];

  const allMps = await db.select().from(mps);
  const speakers: SpeakerMatch[] = [];
  let speakingOrder = 1;

  for (const speaker of speakersData) {
    const mp = allMps.find(m => 
      m.constituency.toLowerCase() === speaker.constituency.toLowerCase() ||
      m.name.toLowerCase().includes(speaker.name.toLowerCase())
    );

    if (mp) {
      speakers.push({
        mpId: mp.id,
        mpName: mp.name,
        constituency: mp.constituency,
        speakingOrder: speakingOrder++
      });
      console.log(`✅ Matched: ${mp.name} (${mp.constituency})`);
    } else {
      console.log(`❌ Not found: ${speaker.name} (${speaker.constituency})`);
    }
  }

  console.log(`\nTotal speakers matched: ${speakers.length} out of ${speakersData.length}`);
  return speakers;
}

async function createHansardRecord() {
  console.log("Parsing Hansard speakers...\n");
  const speakers = await parseHansardSpeakers();

  const allMps = await db.select().from(mps);
  
  // Get attended and absent MP IDs from the attendance list
  const attendedConstituencies = [
    "Petra Jaya", "Kota Raja", "Tanjong Malim", "Papar", "Titiwangsa", "Damansara",
    "Bukit Mertajam", "Pontian", "Sepang", "Iskandar Puteri", "Cameron Highlands",
    "Lanang", "Lembah Pantai", "Nibong Tebal", "Santubong", "Segambut", "Sekijang",
    "Johor Bahru", "Alor Gajah", "Kota Samarahan", "Kimanis", "Kulai", "Tanjong",
    "Sepanggar", "Sibuti", "Parit Sulong", "Ipoh Barat", "Sungai Buloh", "Taiping",
    "Sri Gading", "Wangsa Maju", "Segamat", "Petaling Jaya", "Klang", "Bangi",
    "Ampang", "Gopeng", "Raub", "Bakri", "Tampin", "Jempol", "Selangau", "Betong",
    "Kalabakan", "Bentong", "Bukit Bendera", "Lubok Antu", "Miri", "Tawau",
    "Hulu Langat", "Shah Alam", "Tebrau", "Batu Pahat", "Batang Lupar", "Kampar",
    "Ipoh Timor", "Sungai Petani", "Bandar Tun Razak", "Bagan", "Ayer Hitam",
    "Serian", "Seputeh", "Pandan", "Bukit Gelugor", "Setiawangsa", "Batu Gajah",
    "Paya Besar", "Bukit Bintang", "Jelebu", "Cheras", "Stampin", "Tuaran",
    "Sri Aman", "Puchong", "Balik Pulau", "Subang", "Tanjung Piai", "Bandar Kuching",
    "Puncak Borneo", "Julau", "Kluang", "Sandakan", "Beaufort", "Lawas",
    "Simpang Renggam", "Sibu", "Selayang", "Beruas", "Baram", "Sungai Siput",
    "Jelutong", "Pulai", "Ledang", "Kota Melaka", "Labis", "Igan", "Bayan Baru",
    "Rasah", "Batu", "Tenom", "Batang Sadong", "Arau", "Machang", "Alor Setar",
    "Maran", "Dungun", "Langkawi", "Jerai", "Kapar", "Setiu", "Kuala Krau",
    "Tangga Batu", "Kepala Batas", "Padang Rengas", "Jerlun", "Rompin", "Kangar",
    "Padang Besar", "Temerloh", "Lumut", "Sabak Bernam", "Kuantan", "Pasir Salak",
    "Muar", "Kuala Kangsar", "Bukit Gantang", "Tanjong Karang", "Gua Musang",
    "Jeli", "Labuan", "Bagan Serai", "Putrajaya", "Indera Mahkota", "Pokok Sena",
    "Sungai Besar", "Pengkalan Chepa", "Rantau Panjang", "Tasek Gelugor", "Ketereh",
    "Besut", "Tumpat", "Parit Buntar", "Kuala Langat", "Jasin", "Kuala Nerus",
    "Kuala Kedah", "Gerik", "Padang Terap", "Kulim Bandar Baharu", "Pagoh",
    "Kubang Kerian", "Kota Bharu", "Masjid Tanah", "Bachok", "Hulu Terengganu",
    "Tanah Merah", "Pendang", "Pasir Puteh", "Kuala Terengganu", "Kuala Krai",
    "Sik", "Pasir Mas", "Merbok", "Kubang Pasu", "Permatang Pauh", "Padang Serai",
    "Hulu Selangor", "Jerantut", "Mersing", "Baling"
  ];

  const absentConstituencies = [
    "Tambun", "Bagan Datuk", "Seremban", "Kota Tinggi", "Penampang", "Pengerang",
    "Limbang", "Kota Kinabalu", "Lipis", "Lenggong", "Teluk Intan", "Rembau",
    "Kapit", "Kanowit", "Kuala Selangor", "Mukah"
  ];

  const attendedMpIds = allMps
    .filter(mp => attendedConstituencies.includes(mp.constituency))
    .map(mp => mp.id);

  const absentMpIds = allMps
    .filter(mp => absentConstituencies.includes(mp.constituency))
    .map(mp => mp.id);

  const hansardData = {
    sessionNumber: "DR.6.11.2025",
    sessionDate: new Date("2025-11-06"),
    parliamentTerm: "Kelima Belas",
    sitting: "Penggal Keempat, Mesyuarat Ketiga",
    transcript: "Hansard DR.6.11.2025 - Parliamentary debates on 2026 Supply Bill and Development Budget including debates on Ministries of Finance (B.10, B.11, B.12, P.10, P.70) and Ministry of Foreign Affairs (B.13, P.13).",
    summary: "Parliamentary session on November 6, 2025 debating the 2026 Supply Bill and Development Budget. Key topics included: 1) Questions to Ministers on AI/robotics professional recognition, Borneo Arts Festival, patriotism programs, medical insurance premiums, and education assessment systems. 2) Committee stage debates on Ministry of Finance budget allocations covering tax collection, international relations, PPP/PFI projects, insurance claims, and civil service salary adjustments. 3) Debates on Ministry of Foreign Affairs budget covering diplomatic relations, human rights, humanitarian aid, ASEAN cooperation, and Malaysia's foreign policy positions.",
    summaryLanguage: "en",
    pdfLinks: ["attached_assets/DR-06112025_1762791752278.pdf"],
    topics: ["2026 Supply Bill", "Development Budget", "Ministry of Finance", "Ministry of Foreign Affairs", "Tax Policy", "Medical Insurance Reform", "Education Assessment", "Diplomatic Relations", "ASEAN Summit", "Malaysia-US Trade Agreement", "Humanitarian Aid", "South China Sea"],
    speakers,
    voteRecords: [],
    attendedMpIds,
    absentMpIds,
    constituenciesPresent: attendedConstituencies.length,
    constituenciesAbsent: absentConstituencies.length
  };

  console.log("\nCreating Hansard record...");
  const [record] = await db.insert(hansardRecords).values(hansardData).returning();
  console.log(`✅ Created Hansard record: ${record.sessionNumber}`);
  console.log(`   - ${attendedMpIds.length} MPs attended`);
  console.log(`   - ${absentMpIds.length} MPs absent`);
  console.log(`   - ${speakers.length} MPs spoke in debates`);
  
  return record;
}

createHansardRecord()
  .then(() => {
    console.log("\n✅ Successfully created Hansard record with all speaker data");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
