-- Update Bills to Watch data for February 2026 parliamentary pipeline
-- Reflects latest bill statuses, stages, tags, summaries, and details

-- ============================================================
-- Political Financing Bill — Drafting / Stakeholder Consultation
-- ============================================================
UPDATE bills_to_watch
SET
  tags = '["Reform", "Anti-Corruption", "Transparency"]'::jsonb,
  summary_en = 'Landmark reform to regulate political party funding, curb money politics, mandate public disclosure of donations, impose caps on contributions, restrict eligible donors, and end perceived links between funding and government contracts.',
  summary_ms = 'Pembaharuan penting untuk mengawal selia pembiayaan parti politik, membendung politik wang, memandatkan pendedahan awam derma, mengenakan had sumbangan, menyekat penderma yang layak, dan menamatkan persepsi kaitan antara pembiayaan dan kontrak kerajaan.',
  details_en = 'Draft shaped by 20+ stakeholder sessions; public perception study (led by IIUM researchers) expected to complete by end-February 2026. Government awaiting results before finalizing for tabling—likely post-study.

Key proposals:
• Mandatory public disclosure of party finances
• Donation caps: RM50k/individual, RM100k/company, RM500k/large groups
• Protect small donor anonymity (disclose donations >RM10k only)
• Possible public funding for parties
• Restrictions to end "donations-for-contracts" perception

Opposition raises concerns about enforcement and fear-of-reprisal for donors.',
  details_ms = 'Draf dibentuk melalui 20+ sesi pemegang taruh; kajian persepsi awam (diketuai penyelidik IIUM) dijangka selesai menjelang akhir Februari 2026. Kerajaan menunggu keputusan sebelum memuktamadkan untuk pembentangan—berkemungkinan selepas kajian.

Cadangan utama:
• Pendedahan mandatori kewangan parti kepada awam
• Had derma: RM50k/individu, RM100k/syarikat, RM500k/kumpulan besar
• Lindungi kerahsiaan penderma kecil (dedahkan derma >RM10k sahaja)
• Kemungkinan pembiayaan awam untuk parti
• Sekatan untuk menamatkan persepsi "derma-untuk-kontrak"

Pembangkang membangkitkan kebimbangan mengenai penguatkuasaan dan ketakutan pembalasan terhadap penderma.',
  source_url = 'https://www.parlimen.gov.my',
  updated_at = NOW()
WHERE title_en = 'Political Financing Bill';

-- ============================================================
-- Prime Minister Term Limit Bill — Tabled for First Reading (Feb 23, 2026)
-- ============================================================
UPDATE bills_to_watch
SET
  status = 'tabled',
  tags = '["Constitutional Reform", "Governance", "Power Limits"]'::jsonb,
  summary_en = 'Constitutional amendment (Constitution (Amendment) Bill 2026) to cap PM tenure at cumulative 10 years or 2 full terms, with automatic cessation upon reaching the limit. Tabled for First Reading on February 23, 2026 by Minister Azalina Othman Said; fulfills GE15 manifesto pledge.',
  summary_ms = 'Pindaan perlembagaan (Rang Undang-Undang Perlembagaan (Pindaan) 2026) untuk mengehadkan tempoh PM kepada 10 tahun kumulatif atau 2 penggal penuh, dengan penamatan automatik apabila mencapai had. Dibentangkan untuk Bacaan Pertama pada 23 Februari 2026 oleh Menteri Azalina Othman Said; memenuhi janji manifesto PRU15.',
  details_en = 'Tabled for First Reading on February 23, 2026; Second and Third Readings scheduled in the current parliamentary sitting.

Key provisions:
• Cumulative 10-year tenure cap or 2 full terms
• Automatic cessation upon reaching the limit
• Applies to current and future Prime Ministers
• Excludes service after dissolution in some cases
• Former PMs who have served 10+ years are ineligible to return

Politically sensitive but advancing quickly as part of GE15 reform commitments. Tabled by Minister Azalina Othman Said.',
  details_ms = 'Dibentangkan untuk Bacaan Pertama pada 23 Februari 2026; Bacaan Kedua dan Ketiga dijadualkan dalam persidangan parlimen semasa.

Peruntukan utama:
• Had tempoh kumulatif 10 tahun atau 2 penggal penuh
• Penamatan automatik apabila mencapai had
• Terpakai kepada PM semasa dan masa hadapan
• Mengecualikan perkhidmatan selepas pembubaran dalam sesetengah kes
• Bekas PM yang telah berkhidmat 10 tahun ke atas tidak layak kembali

Sensitif secara politik tetapi bergerak dengan cepat sebagai sebahagian daripada komitmen pembaharuan PRU15. Dibentangkan oleh Menteri Azalina Othman Said.',
  source_url = 'https://www.parlimen.gov.my',
  updated_at = NOW()
WHERE title_en = 'Prime Minister Term Limit Bill';

-- ============================================================
-- Attorney-General/Public Prosecutor Separation Bill — Tabled for First Reading (Feb 23, 2026)
-- ============================================================
UPDATE bills_to_watch
SET
  status = 'tabled',
  tags = '["Judicial Independence", "Anti-Corruption", "Rule of Law"]'::jsonb,
  summary_en = 'Constitution (Amendment) Bill 2026 to split the AG''s advisory role from prosecutorial functions; establishes a distinct Public Prosecutor to reduce political interference in legal proceedings. Tabled for First Reading on February 23, 2026 alongside the PM term limit bill.',
  summary_ms = 'Rang Undang-Undang Perlembagaan (Pindaan) 2026 untuk mengasingkan peranan nasihat Peguam Negara daripada fungsi pendakwaan; menubuhkan Pendakwa Raya yang berasingan untuk mengurangkan campur tangan politik dalam prosiding undang-undang. Dibentangkan untuk Bacaan Pertama pada 23 Februari 2026 bersama RUU had penggal PM.',
  details_en = 'Tabled for First Reading on February 23, 2026, alongside the Prime Minister Term Limit Bill.

Key objectives:
• Split the AG''s advisory role (legal advisor to the government) from prosecutorial functions
• Establish a distinct and independent Public Prosecutor
• Reduce political interference in criminal proceedings
• Strengthen rule of law and judicial independence

Controversial among legal circles but part of the government''s broader anti-corruption and institutional reform agenda.',
  details_ms = 'Dibentangkan untuk Bacaan Pertama pada 23 Februari 2026, bersama dengan RUU Had Penggal Perdana Menteri.

Objektif utama:
• Mengasingkan peranan nasihat Peguam Negara (penasihat undang-undang kepada kerajaan) daripada fungsi pendakwaan
• Menubuhkan Pendakwa Raya yang berasingan dan bebas
• Mengurangkan campur tangan politik dalam prosiding jenayah
• Mengukuhkan kedaulatan undang-undang dan kebebasan kehakiman

Kontroversi dalam kalangan badan undang-undang tetapi merupakan sebahagian daripada agenda pembaharuan anti-rasuah dan institusi kerajaan yang lebih luas.',
  source_url = 'https://www.parlimen.gov.my',
  updated_at = NOW()
WHERE title_en = 'Attorney-General/Public Prosecutor Separation Bill';

-- ============================================================
-- Ombudsman Bill — Consultation / In Pipeline (promised for 2026 tabling)
-- ============================================================
UPDATE bills_to_watch
SET
  tags = '["Oversight", "Anti-Maladministration", "Accountability"]'::jsonb,
  summary_en = 'Establishes independent oversight body to investigate public administration complaints and maladministration. Scope and executive independence still under debate; listed among key reforms to be tabled in 2026 per PM Anwar''s statements.',
  summary_ms = 'Menubuhkan badan pengawasan bebas untuk menyiasat aduan pentadbiran awam dan salah tadbir. Skop dan kebebasan eksekutif masih dalam perbahasan; disenaraikan antara pembaharuan utama untuk dibentangkan pada 2026 menurut kenyataan PM Anwar.',
  updated_at = NOW()
WHERE title_en = 'Ombudsman Bill';

-- ============================================================
-- Freedom of Information Bill — Approved in Principle / Drafting
-- ============================================================
UPDATE bills_to_watch
SET
  status = 'drafting',
  tags = '["Transparency", "Public Access", "Governance"]'::jsonb,
  summary_en = 'Cabinet committee approved in principle; aims to enhance public access to government information with safeguards for national security, intelligence, and 3R issues. Expected tabling in 2026 to promote accountability in project tenders and abuse prevention.',
  summary_ms = 'Jawatankuasa Kabinet meluluskan secara prinsip; bertujuan meningkatkan akses awam kepada maklumat kerajaan dengan perlindungan untuk keselamatan negara, perisikan, dan isu 3R. Jangkaan pembentangan pada 2026 untuk menggalakkan akauntabiliti dalam tender projek dan pencegahan penyalahgunaan.',
  details_en = 'Cabinet committee approved in principle; bill currently in drafting stage for expected tabling in 2026.

Key objectives:
• Enhance public access to government information
• Promote transparency in project tenders and public spending
• Prevent abuse and maladministration
• Safeguards for national security, intelligence matters, and 3R (race, religion, royalty) issues

Complements other anti-corruption reforms such as the Political Financing Bill and Ombudsman Bill. Expected to strengthen accountability mechanisms across government.',
  details_ms = 'Jawatankuasa Kabinet meluluskan secara prinsip; rang undang-undang sedang dalam peringkat penggubalan untuk pembentangan pada 2026.

Objektif utama:
• Meningkatkan akses awam kepada maklumat kerajaan
• Menggalakkan ketelusan dalam tender projek dan perbelanjaan awam
• Mencegah penyalahgunaan dan salah tadbir
• Perlindungan untuk keselamatan negara, perkara perisikan, dan isu 3R (kaum, agama, raja)

Melengkapi pembaharuan anti-rasuah lain seperti RUU Pembiayaan Politik dan RUU Ombudsman. Dijangka mengukuhkan mekanisme akauntabiliti seluruh kerajaan.',
  updated_at = NOW()
WHERE title_en = 'Freedom of Information Bill';
