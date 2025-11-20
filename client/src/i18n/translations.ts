// Translation keys and text for English and Malay
export const translations = {
  en: {
    // Common
    common: {
      loading: "Loading...",
      error: "Error",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      add: "Add",
      search: "Search",
      filter: "Filter",
      back: "Back",
      next: "Next",
      previous: "Previous",
      close: "Close",
      submit: "Submit",
      reset: "Reset",
      all: "All",
      none: "None",
      yes: "Yes",
      no: "No",
      or: "or",
      of: "of",
      views: "views",
      in: "in",
    },

    // Navigation & Header
    nav: {
      home: "Home",
      dashboard: "Dashboard",
      mps: "MPs",
      hansard: "Hansard",
      allowances: "Allowances",
      backToDashboard: "Back to Dashboard",
      parliamentGuide: "How It Works",
      constitution: "Constitution",
      admin: "Admin",
      analysis: "Analysis",
      activity: "Activity",
      attendance: "Attendance",
      hansardAnalysis: "Hansard Analysis",
      visitorAnalytics: "Visitor Analytics",
      disclaimer: "Disclaimer",
      kawanku: "KAWANKU",
      searchMps: "Search MPs...",
      malayParliament: "Malaysian Parliament",
      dewanRakyatDashboard: "Dewan Rakyat Dashboard",
    },

    // Filters & Sorting
    filters: {
      title: "Filters",
      sortBy: "Sort By",
      sortName: "Name (A-Z)",
      sortBestAttendance: "Best Attendance",
      sortWorstAttendance: "Worst Attendance",
      sortMostSpeeches: "Most Speeches",
      sortFewestSpeeches: "Fewest Speeches",
      party: "Party",
      state: "State",
      selected: "selected",
      clearAllFilters: "Clear All Filters",
    },

    // MP Card
    mpCard: {
      totalEarned: "Total earned",
      monthly: "Monthly",
      yearly: "Yearly",
      sessions: "sessions",
      hansardAttendance: "Hansard attendance",
      sinceSwornIn: "since sworn in",
      parliamentSittingAllowance: "Parliament sitting allowance",
      speeches: "speeches",
      speakesIn: "speeches in",
      spokeIn: "Spoke in",
      hansardParticipation: "Hansard participation",
      avg: "avg",
      speechesPerSession: "speeches/session",
      hansardSpeakingParticipation: "Hansard speaking participation",
    },

    // Home Page
    home: {
      title: "Malaysian MP Dashboard",
      subtitle: "Track Malaysian MPs' Parliamentary Performance & Public Accountability",
      description: "Comprehensive data on MPs' attendance, voting records, speeches, allowances, and court cases",
      viewAllMps: "View All MPs",
      searchPlaceholder: "Search MPs by name, constituency, or party...",

      // Stats
      totalMps: "Total MPs",
      totalParties: "Total Parties",
      avgAttendance: "Avg Attendance",

      // Filters
      filters: "Filters",
      allParties: "All Parties",
      allStates: "All States",
      allGenders: "All Genders",
      male: "Male",
      female: "Female",
      clearFilters: "Clear Filters",

      // Sort
      sortBy: "Sort by",
      sortName: "Name",
      sortAttendance: "Attendance",
      sortConstituency: "Constituency",

      // MP Card
      constituency: "Constituency",
      state: "State",
      attendance: "Attendance",
      viewProfile: "View Profile",

      // No results
      noMpsFound: "No MPs found",
      noMpsDescription: "Try adjusting your search or filters",
    },

    // MP Profile
    profile: {
      title: "MP Profile",
      notFound: "MP Not Found",

      // Basic Info
      role: "Role",
      party: "Party",
      parliamentCode: "Parliament Code",
      gender: "Gender",
      swornInDate: "Sworn In Date",

      // Contact
      contact: "Contact Information",
      email: "Email",
      telephone: "Telephone",
      mobile: "Mobile",
      fax: "Fax",
      contactAddress: "Contact Address",
      serviceAddress: "Service Address",
      socialMedia: "Social Media",

      // Attendance
      parliamentAttendance: "Parliament Attendance",
      attendanceRecord: "Attendance Record",
      parliamentarySessions: "parliamentary sessions",
      attendanceRate: "Attendance Rate",
      performance: "Performance",
      excellent: "Excellent",
      good: "Good",
      needsImprovement: "Needs Improvement",
      source: "Source: Official Hansard Records",

      // Speaking Record
      hansardSpeakingRecord: "Hansard Speaking Record",
      sessionsSpoken: "Sessions Spoken",
      totalSpeeches: "Total Speeches",
      sessions: "sessions",
      instances: "instances",
      recentSessions: "Recent Sessions",
      noSpeakingRecords: "No speaking records found",

      // Parliamentary Info
      parliamentaryInformation: "Parliamentary Information",
      partyAffiliation: "Party Affiliation",
      currentRole: "Current Role",
      constituencyDetails: "Constituency Details",
      constituencyName: "Constituency Name",
      stateTerritory: "State/Territory",

      // Salary & Allowances
      salaryInformation: "Salary Information",
      monthlyAllowance: "Monthly Allowance",
      yearlyAllowance: "Yearly Allowance",
      totalEarnedToDate: "Total Earned to Date",

      allowanceInformation: "Allowance Information",
      allowanceType: "Allowance Type",
      frequency: "Frequency",
      amount: "Amount",
      baseAllowance: "Base MP Allowance",
      entertainmentAllowance: "Entertainment Allowance",
      handphoneAllowance: "Handphone Allowance",
      parliamentSittingAttendance: "Parliament Sitting Attendance",
      computerAllowance: "Computer Allowance",
      dressWearAllowance: "Dress Wear Allowance",
      monthly: "Monthly",
      yearly: "Yearly",
      cumulative: "Cumulative",
      day: "day",
      days: "days",
      daysCumulative: "days (cumulative since sworn in)",

      yearlyBreakdown: "Yearly Allowance Breakdown",
      year: "Year",
      monthsServed: "Months Served",
      amountEarned: "Amount Earned",
      month: "month",
      months: "months",
      current: "(Current)",
      total: "Total",

      // Court Cases
      courtCases: "Court Cases",
      ongoingCases: "Ongoing Cases",
      completedCases: "Completed Cases",
      noCases: "No court cases on record for this MP.",
      ongoing: "Ongoing",
      completed: "Completed",
      courtLevel: "Court Level",
      caseNumber: "Case No",
      charges: "Charges",
      filed: "Filed",
      outcome: "Outcome",
      sources: "Sources",
      caseSummary: "Case Summary",

      // SPRM Investigations
      sprmInvestigations: "SPRM Investigations",
      ongoingInvestigations: "Ongoing Investigations",
      completedInvestigations: "Completed Investigations",
      noInvestigations: "No SPRM investigations on record for this MP.",
      allegations: "Allegations",
      started: "Started",
      investigationSummary: "Investigation Summary",

      // Legislative Activity
      legislativeActivity: "Legislative Activity",
      legislativeActivityDesc: "Parliamentary activities including questions asked, bills sponsored, and motions proposed based on official Hansard records.",
      questionsAsked: "Questions Asked",
      billsSponsored: "Bills Sponsored",
      motionsProposed: "Motions Proposed",
      totalQuestions: "total questions",
      billsProposed: "bills proposed",
      motionsProposedCount: "motions proposed",
      oralQuestions: "Oral Questions",
      writtenQuestions: "Written Questions",
      ministerQuestions: "Minister Questions",
      pending: "Pending",
      approved: "Approved / Passed",
      rejected: "Rejected",

      // Parliamentary Activity
      parliamentaryActivity: "Parliamentary Activity",
      bills: "Bills",
      motions: "Motions",
      debates: "Debates",
      questions: "Questions",
      noBills: "No bills on record for this MP.",
      noMotions: "No motions on record for this MP.",
      noDebates: "No debate participations on record for this MP.",
      noQuestions: "No parliamentary questions on record for this MP.",
      proposed: "Proposed",
      hansard: "Hansard",
      questionsByMinistry: "Questions by Ministry",
      oral: "Oral",
      written: "Written",
      minister: "Minister",
      answered: "Answered",
      asked: "Asked",
      question: "Question",
      answer: "Answer",
      topic: "Topic",

      // Sources
      sourcesReferences: "Sources & References",
      sourcesDescription: "All information on this page is sourced from the following publications and news outlets:",
    },

    // Allowances Page
    allowances: {
      title: "MP Allowances & Salaries",
      description: "Comprehensive breakdown of Malaysian MPs' monthly allowances, yearly salaries, and cumulative earnings",

      summary: "Allowance Summary",
      totalMps: "Total MPs",
      totalMonthlyAllowances: "Total Monthly Allowances",
      totalYearlyAllowances: "Total Yearly Allowances",
      avgMonthlyPerMp: "Avg Monthly per MP",

      breakdown: "Allowance Breakdown",
      mp: "MP",
      monthly: "Monthly",
      yearly: "Yearly",
      totalEarned: "Total Earned",
      viewDetails: "View Details",

      searchPlaceholder: "Search MPs...",

      types: "Allowance Types",
      baseAllowance: "Base MP Allowance",
      entertainment: "Entertainment Allowance",
      handphone: "Handphone Allowance",
      computer: "Computer Allowance",
      dressWear: "Dress Wear Allowance",
      parliamentSitting: "Parliament Sitting Allowance",
    },

    // Error Messages
    error: {
      generic: "An error occurred. Please try again.",
      notFound: "Not found",
      unauthorized: "Unauthorized access",
      serverError: "Server error",
      networkError: "Network error. Please check your connection.",
    },
  },

  ms: {
    // Common / Biasa
    common: {
      loading: "Memuatkan...",
      error: "Ralat",
      cancel: "Batal",
      save: "Simpan",
      delete: "Padam",
      edit: "Edit",
      add: "Tambah",
      search: "Cari",
      filter: "Tapis",
      back: "Kembali",
      next: "Seterusnya",
      previous: "Sebelumnya",
      close: "Tutup",
      submit: "Hantar",
      reset: "Set Semula",
      all: "Semua",
      none: "Tiada",
      yes: "Ya",
      no: "Tidak",
      or: "atau",
      of: "daripada",
      views: "tontonan",
      in: "dalam",
    },

    // Navigation & Header / Navigasi & Pengepala
    nav: {
      home: "Laman Utama",
      dashboard: "Papan Pemuka",
      mps: "Ahli Parlimen",
      hansard: "Hansard",
      allowances: "Elaun",
      backToDashboard: "Kembali ke Papan Pemuka",
      parliamentGuide: "Cara Ia Berfungsi",
      constitution: "Perlembagaan",
      admin: "Pentadbir",
      analysis: "Analisis",
      activity: "Aktiviti",
      attendance: "Kehadiran",
      hansardAnalysis: "Analisis Hansard",
      visitorAnalytics: "Analitik Pelawat",
      disclaimer: "Penafian",
      kawanku: "KAWANKU",
      searchMps: "Cari Ahli Parlimen...",
      malayParliament: "Parlimen Malaysia",
      dewanRakyatDashboard: "Papan Pemuka Dewan Rakyat",
    },

    // Filters & Sorting / Penapis & Isihan
    filters: {
      title: "Penapis",
      sortBy: "Isih Mengikut",
      sortName: "Nama (A-Z)",
      sortBestAttendance: "Kehadiran Terbaik",
      sortWorstAttendance: "Kehadiran Terburuk",
      sortMostSpeeches: "Ucapan Terbanyak",
      sortFewestSpeeches: "Ucapan Paling Sedikit",
      party: "Parti",
      state: "Negeri",
      selected: "dipilih",
      clearAllFilters: "Kosongkan Semua Penapis",
    },

    // MP Card / Kad Ahli Parlimen
    mpCard: {
      totalEarned: "Jumlah perolehan",
      monthly: "Bulanan",
      yearly: "Tahunan",
      sessions: "sidang",
      hansardAttendance: "Kehadiran Hansard",
      sinceSwornIn: "sejak mengangkat sumpah",
      parliamentSittingAllowance: "Elaun mesyuarat parlimen",
      speeches: "ucapan",
      speakesIn: "ucapan dalam",
      spokeIn: "Berucap dalam",
      hansardParticipation: "Penyertaan Hansard",
      avg: "purata",
      speechesPerSession: "ucapan/sidang",
      hansardSpeakingParticipation: "Penyertaan ucapan Hansard",
    },

    // Home Page / Laman Utama
    home: {
      title: "Papan Pemuka Ahli Parlimen Malaysia",
      subtitle: "Jejaki Prestasi Parlimen & Akauntabiliti Awam Ahli Parlimen Malaysia",
      description: "Data komprehensif mengenai kehadiran, rekod pengundian, ucapan, elaun, dan kes mahkamah Ahli Parlimen",
      viewAllMps: "Lihat Semua Ahli Parlimen",
      searchPlaceholder: "Cari Ahli Parlimen mengikut nama, kawasan, atau parti...",

      // Stats / Statistik
      totalMps: "Jumlah Ahli Parlimen",
      totalParties: "Jumlah Parti",
      avgAttendance: "Purata Kehadiran",

      // Filters / Penapis
      filters: "Penapis",
      allParties: "Semua Parti",
      allStates: "Semua Negeri",
      allGenders: "Semua Jantina",
      male: "Lelaki",
      female: "Perempuan",
      clearFilters: "Kosongkan Penapis",

      // Sort / Isih
      sortBy: "Isih mengikut",
      sortName: "Nama",
      sortAttendance: "Kehadiran",
      sortConstituency: "Kawasan",

      // MP Card / Kad Ahli Parlimen
      constituency: "Kawasan",
      state: "Negeri",
      attendance: "Kehadiran",
      viewProfile: "Lihat Profil",

      // No results / Tiada keputusan
      noMpsFound: "Tiada Ahli Parlimen dijumpai",
      noMpsDescription: "Cuba laraskan carian atau penapis anda",
    },

    // MP Profile / Profil Ahli Parlimen
    profile: {
      title: "Profil Ahli Parlimen",
      notFound: "Ahli Parlimen Tidak Dijumpai",

      // Basic Info / Maklumat Asas
      role: "Peranan",
      party: "Parti",
      parliamentCode: "Kod Parlimen",
      gender: "Jantina",
      swornInDate: "Tarikh Mengangkat Sumpah",

      // Contact / Hubungi
      contact: "Maklumat Hubungan",
      email: "E-mel",
      telephone: "Telefon",
      mobile: "Telefon Bimbit",
      fax: "Faks",
      contactAddress: "Alamat Perhubungan",
      serviceAddress: "Alamat Perkhidmatan",
      socialMedia: "Media Sosial",

      // Attendance / Kehadiran
      parliamentAttendance: "Kehadiran Parlimen",
      attendanceRecord: "Rekod Kehadiran",
      parliamentarySessions: "sidang parlimen",
      attendanceRate: "Kadar Kehadiran",
      performance: "Prestasi",
      excellent: "Cemerlang",
      good: "Baik",
      needsImprovement: "Perlu Penambahbaikan",
      source: "Sumber: Rekod Rasmi Hansard",

      // Speaking Record / Rekod Ucapan
      hansardSpeakingRecord: "Rekod Ucapan Hansard",
      sessionsSpoken: "Sidang Berucap",
      totalSpeeches: "Jumlah Ucapan",
      sessions: "sidang",
      instances: "kali",
      recentSessions: "Sidang Terkini",
      noSpeakingRecords: "Tiada rekod ucapan dijumpai",

      // Parliamentary Info / Maklumat Parlimen
      parliamentaryInformation: "Maklumat Parlimen",
      partyAffiliation: "Gabungan Parti",
      currentRole: "Peranan Semasa",
      constituencyDetails: "Butiran Kawasan",
      constituencyName: "Nama Kawasan",
      stateTerritory: "Negeri/Wilayah",

      // Salary & Allowances / Gaji & Elaun
      salaryInformation: "Maklumat Gaji",
      monthlyAllowance: "Elaun Bulanan",
      yearlyAllowance: "Elaun Tahunan",
      totalEarnedToDate: "Jumlah Perolehan Setakat Ini",

      allowanceInformation: "Maklumat Elaun",
      allowanceType: "Jenis Elaun",
      frequency: "Kekerapan",
      amount: "Jumlah",
      baseAllowance: "Elaun Asas Ahli Parlimen",
      entertainmentAllowance: "Elaun Layanan Tetamu",
      handphoneAllowance: "Elaun Telefon Bimbit",
      parliamentSittingAttendance: "Kehadiran Mesyuarat Parlimen",
      computerAllowance: "Elaun Komputer",
      dressWearAllowance: "Elaun Pakaian",
      monthly: "Bulanan",
      yearly: "Tahunan",
      cumulative: "Kumulatif",
      day: "hari",
      days: "hari",
      daysCumulative: "hari (kumulatif sejak mengangkat sumpah)",

      yearlyBreakdown: "Pecahan Elaun Tahunan",
      year: "Tahun",
      monthsServed: "Bulan Berkhidmat",
      amountEarned: "Jumlah Perolehan",
      month: "bulan",
      months: "bulan",
      current: "(Semasa)",
      total: "Jumlah",

      // Court Cases / Kes Mahkamah
      courtCases: "Kes Mahkamah",
      ongoingCases: "Kes Berjalan",
      completedCases: "Kes Selesai",
      noCases: "Tiada kes mahkamah dalam rekod untuk Ahli Parlimen ini.",
      ongoing: "Berjalan",
      completed: "Selesai",
      courtLevel: "Peringkat Mahkamah",
      caseNumber: "No. Kes",
      charges: "Pertuduhan",
      filed: "Difailkan",
      outcome: "Keputusan",
      sources: "Sumber",
      caseSummary: "Ringkasan Kes",

      // SPRM Investigations / Siasatan SPRM
      sprmInvestigations: "Siasatan SPRM",
      ongoingInvestigations: "Siasatan Berjalan",
      completedInvestigations: "Siasatan Selesai",
      noInvestigations: "Tiada siasatan SPRM dalam rekod untuk Ahli Parlimen ini.",
      allegations: "Dakwaan",
      started: "Bermula",
      investigationSummary: "Ringkasan Siasatan",

      // Legislative Activity / Aktiviti Perundangan
      legislativeActivity: "Aktiviti Perundangan",
      legislativeActivityDesc: "Aktiviti parlimen termasuk soalan yang ditanya, rang undang-undang yang ditaja, dan usul yang dicadangkan berdasarkan rekod rasmi Hansard.",
      questionsAsked: "Soalan Ditanya",
      billsSponsored: "Rang Undang-undang Ditaja",
      motionsProposed: "Usul Dicadangkan",
      totalQuestions: "jumlah soalan",
      billsProposed: "rang undang-undang dicadangkan",
      motionsProposedCount: "usul dicadangkan",
      oralQuestions: "Soalan Lisan",
      writtenQuestions: "Soalan Bertulis",
      ministerQuestions: "Soalan Menteri",
      pending: "Belum Selesai",
      approved: "Diluluskan / Diluluskan",
      rejected: "Ditolak",

      // Parliamentary Activity / Aktiviti Parlimen
      parliamentaryActivity: "Aktiviti Parlimen",
      bills: "Rang Undang-undang",
      motions: "Usul",
      debates: "Perbahasan",
      questions: "Soalan",
      noBills: "Tiada rang undang-undang dalam rekod untuk Ahli Parlimen ini.",
      noMotions: "Tiada usul dalam rekod untuk Ahli Parlimen ini.",
      noDebates: "Tiada penyertaan perbahasan dalam rekod untuk Ahli Parlimen ini.",
      noQuestions: "Tiada soalan parlimen dalam rekod untuk Ahli Parlimen ini.",
      proposed: "Dicadangkan",
      hansard: "Hansard",
      questionsByMinistry: "Soalan mengikut Kementerian",
      oral: "Lisan",
      written: "Bertulis",
      minister: "Menteri",
      answered: "Dijawab",
      asked: "Ditanya",
      question: "Soalan",
      answer: "Jawapan",
      topic: "Topik",

      // Sources / Sumber
      sourcesReferences: "Sumber & Rujukan",
      sourcesDescription: "Semua maklumat di halaman ini bersumber daripada penerbitan dan portal berita berikut:",
    },

    // Allowances Page / Halaman Elaun
    allowances: {
      title: "Elaun & Gaji Ahli Parlimen",
      description: "Pecahan komprehensif elaun bulanan, gaji tahunan, dan pendapatan kumulatif Ahli Parlimen Malaysia",

      summary: "Ringkasan Elaun",
      totalMps: "Jumlah Ahli Parlimen",
      totalMonthlyAllowances: "Jumlah Elaun Bulanan",
      totalYearlyAllowances: "Jumlah Elaun Tahunan",
      avgMonthlyPerMp: "Purata Bulanan per Ahli Parlimen",

      breakdown: "Pecahan Elaun",
      mp: "Ahli Parlimen",
      monthly: "Bulanan",
      yearly: "Tahunan",
      totalEarned: "Jumlah Perolehan",
      viewDetails: "Lihat Butiran",

      searchPlaceholder: "Cari Ahli Parlimen...",

      types: "Jenis Elaun",
      baseAllowance: "Elaun Asas Ahli Parlimen",
      entertainment: "Elaun Layanan Tetamu",
      handphone: "Elaun Telefon Bimbit",
      computer: "Elaun Komputer",
      dressWear: "Elaun Pakaian",
      parliamentSitting: "Elaun Mesyuarat Parlimen",
    },

    // Error Messages / Mesej Ralat
    error: {
      generic: "Ralat berlaku. Sila cuba lagi.",
      notFound: "Tidak dijumpai",
      unauthorized: "Akses tidak dibenarkan",
      serverError: "Ralat pelayan",
      networkError: "Ralat rangkaian. Sila semak sambungan anda.",
    },
  },
} as const;

export type Language = 'en' | 'ms';
export type TranslationKey = typeof translations.en;
