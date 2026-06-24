-- Update Bills to Watch summaries and details to match Feb 2026 content
-- Reflects current status of all curated bills including featured Political Financing Bill

-- ============================================================
-- Political Financing Bill — IIUM study concluded, status → consultation
-- ============================================================
UPDATE bills_to_watch
SET
  status = 'consultation',
  summary_en = 'Public consultation phase complete. Bill now under final review before Cabinet deliberation, targeting tabling in Parliament by mid-2026.',
  summary_ms = 'Fasa perundingan awam selesai. Rang undang-undang kini dalam semakan akhir sebelum perbincangan Kabinet, menyasarkan pembentangan di Parlimen menjelang pertengahan 2026.',
  details_en = '✓ 20+ stakeholder sessions completed by BHEUU.
✓ IIUM-led public perception study concluded Feb 2026.

Key proposals:
• Mandatory public disclosure of party finances
• Donation caps: RM50k/individual, RM100k/company, RM500k/large groups
• Protect small donor anonymity (disclose donations >RM10k only)
• Possible public funding for parties
• Restrictions to end "donations-for-contracts" perception

Next steps: Cabinet review expected Q2 2026, followed by tabling in Parliament.

Opposition raises concerns about enforcement and fear-of-reprisal for donors.',
  details_ms = '✓ 20+ sesi pemegang taruh telah selesai oleh BHEUU.
✓ Kajian persepsi awam diketuai IIUM selesai Feb 2026.

Cadangan utama:
• Pendedahan mandatori kewangan parti kepada awam
• Had derma: RM50k/individu, RM100k/syarikat, RM500k/kumpulan besar
• Lindungi kerahsiaan penderma kecil (dedahkan derma >RM10k sahaja)
• Kemungkinan pembiayaan awam untuk parti
• Sekatan untuk menamatkan persepsi "derma-untuk-kontrak"

Langkah seterusnya: Semakan Kabinet dijangka S2 2026, diikuti pembentangan di Parlimen.

Pembangkang membangkitkan kebimbangan mengenai penguatkuasaan dan ketakutan pembalasan terhadap penderma.',
  updated_at = NOW()
WHERE title_en = 'Political Financing Bill';

-- ============================================================
-- Prime Minister Term Limit Bill — updated summary
-- ============================================================
UPDATE bills_to_watch
SET
  summary_en = 'Proposes capping PM tenure at cumulative 10 years (or 2 full terms); automatic cessation upon reaching limit. Applies to current and future PMs (excludes service after dissolution in some cases); former PMs with 10+ years ineligible to return. Tabled by Minister Azalina Othman Said; fulfills GE15 promise—politically sensitive but advancing quickly.',
  summary_ms = 'Mencadangkan had tempoh PM kepada 10 tahun kumulatif (atau 2 penggal penuh); penamatan automatik apabila mencapai had. Terpakai kepada PM semasa dan masa hadapan (mengecualikan perkhidmatan selepas pembubaran dalam sesetengah kes); bekas PM yang berkhidmat 10 tahun ke atas tidak layak kembali. Dibentangkan oleh Menteri Azalina Othman Said; memenuhi janji PRU15—sensitif secara politik tetapi bergerak dengan cepat.',
  updated_at = NOW()
WHERE title_en = 'Prime Minister Term Limit Bill';

-- ============================================================
-- Attorney-General/Public Prosecutor Separation Bill — updated summary
-- ============================================================
UPDATE bills_to_watch
SET
  summary_en = 'Seeks to split AG''s advisory role from prosecutorial functions; establishes distinct Public Prosecutor to reduce political interference in legal proceedings. Controversial among legal circles but tabled alongside PM term limit bill—part of broader institutional reforms.',
  summary_ms = 'Bertujuan mengasingkan peranan nasihat Peguam Negara daripada fungsi pendakwaan; menubuhkan Pendakwa Raya yang berasingan untuk mengurangkan campur tangan politik dalam prosiding undang-undang. Kontroversi dalam kalangan badan undang-undang tetapi dibentangkan bersama RUU had penggal PM—sebahagian daripada pembaharuan institusi yang lebih luas.',
  updated_at = NOW()
WHERE title_en = 'Attorney-General/Public Prosecutor Separation Bill';

-- ============================================================
-- Ombudsman Bill — updated summary + add details
-- ============================================================
UPDATE bills_to_watch
SET
  summary_en = 'To establish independent body investigating public administration complaints/maladministration. Scope and executive independence still under debate; listed among key reforms to be tabled this year (per PM Anwar statements).',
  summary_ms = 'Untuk menubuhkan badan bebas menyiasat aduan pentadbiran awam/salah tadbir. Skop dan kebebasan eksekutif masih dalam perbahasan; disenaraikan antara pembaharuan utama untuk dibentangkan tahun ini (menurut kenyataan PM Anwar).',
  details_en = 'Consultation / In Pipeline stage; promised for 2026 tabling per PM Anwar''s statements.

Key objectives:
• Establish an independent body to investigate public administration complaints
• Address maladministration by government bodies and agencies
• Provide citizens a formal channel outside the courts for redress
• Scope and executive independence still under active debate

Listed among the government''s key institutional reforms to be tabled this year.',
  details_ms = 'Peringkat Rundingan / Dalam Saluran; dijanjikan untuk pembentangan 2026 menurut kenyataan PM Anwar.

Objektif utama:
• Menubuhkan badan bebas untuk menyiasat aduan pentadbiran awam
• Menangani salah tadbir oleh badan dan agensi kerajaan
• Menyediakan saluran rasmi kepada rakyat di luar mahkamah untuk mendapatkan remedi
• Skop dan kebebasan eksekutif masih dalam perbahasan aktif

Disenaraikan antara pembaharuan institusi utama kerajaan yang akan dibentangkan tahun ini.',
  source_url = 'https://www.parlimen.gov.my',
  updated_at = NOW()
WHERE title_en = 'Ombudsman Bill';

-- ============================================================
-- Freedom of Information Bill — updated summary
-- ============================================================
UPDATE bills_to_watch
SET
  summary_en = 'Aims to enhance access to government information, with safeguards for national security, intelligence, and race-religion-royalty (3R) issues. Cabinet committee approved in principle; expected tabling this year to promote accountability (e.g., project tenders, abuse prevention). Complements other anti-corruption reforms.',
  summary_ms = 'Bertujuan meningkatkan akses kepada maklumat kerajaan, dengan perlindungan untuk keselamatan negara, perisikan, dan isu bangsa-agama-raja (3R). Jawatankuasa Kabinet meluluskan secara prinsip; jangkaan pembentangan tahun ini untuk menggalakkan akauntabiliti (contoh: tender projek, pencegahan penyalahgunaan). Melengkapi pembaharuan anti-rasuah lain.',
  updated_at = NOW()
WHERE title_en = 'Freedom of Information Bill';
