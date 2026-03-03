-- Update Bills to Watch with latest news as of March 3, 2026
-- Key developments: PM Term Limit Bill failed by 2 votes, AG/PP bill referred to committee,
-- Political Financing timeline pushed, Ombudsman/FOI not tabled in first session.

-- ============================================================
-- Political Financing Bill — IIUM study concluded Feb 28, tabling pushed
-- ============================================================
UPDATE bills_to_watch
SET
  status = 'consultation',
  summary_en = 'IIUM-led public perception study concluded Feb 28, 2026. Policy parameters now being finalised before Cabinet deliberation; formal drafting not yet started. Tabling in Parliament targeted for second or third session 2026 (earliest June). Passage before GE16 considered unlikely.',
  summary_ms = 'Kajian persepsi awam diketuai IIUM selesai 28 Feb 2026. Parameter dasar kini sedang dimuktamadkan sebelum perbincangan Kabinet; penggubalan rasmi belum bermula. Pembentangan di Parlimen disasarkan untuk sesi kedua atau ketiga 2026 (paling awal Jun). Pelulusan sebelum PRU16 dianggap tidak mungkin.',
  details_en = '✓ 20+ stakeholder sessions completed by BHEUU.
✓ IIUM-led public perception study concluded Feb 28, 2026.
✗ Formal drafting not yet started; not tabled in first 2026 session.

Key proposals:
• Mandatory public disclosure of party finances
• Donation caps: RM50k/individual, RM100k/company, RM500k/large groups
• Protect small donor anonymity (disclose donations >RM10k only)
• Possible public funding for parties via Political Financing Commission
• Restrictions to end "donations-for-contracts" perception

Next steps: Cabinet review expected Q2 2026. Bill may be tabled in 2nd session (Jun 22–Jul 16) or 3rd session (Oct 5–Dec 8).

Minister Azalina has cautioned that passing this bill before GE16 will be difficult.',
  details_ms = '✓ 20+ sesi pemegang taruh telah selesai oleh BHEUU.
✓ Kajian persepsi awam diketuai IIUM selesai 28 Feb 2026.
✗ Penggubalan rasmi belum bermula; tidak dibentangkan dalam sesi pertama 2026.

Cadangan utama:
• Pendedahan mandatori kewangan parti kepada awam
• Had derma: RM50k/individu, RM100k/syarikat, RM500k/kumpulan besar
• Lindungi kerahsiaan penderma kecil (dedahkan derma >RM10k sahaja)
• Kemungkinan pembiayaan awam untuk parti melalui Suruhanjaya Pembiayaan Politik
• Sekatan untuk menamatkan persepsi "derma-untuk-kontrak"

Langkah seterusnya: Semakan Kabinet dijangka S2 2026. Rang undang-undang mungkin dibentangkan dalam sesi ke-2 (22 Jun–16 Jul) atau sesi ke-3 (5 Okt–8 Dis).

Menteri Azalina memberi amaran bahawa meluluskan rang undang-undang ini sebelum PRU16 adalah sukar.',
  updated_at = NOW()
WHERE title_en = 'Political Financing Bill';

-- ============================================================
-- Prime Minister Term Limit Bill — FAILED Mar 2 by 2 votes
-- ============================================================
UPDATE bills_to_watch
SET
  status = 'tabled',
  summary_en = 'FAILED by 2 votes on Mar 2, 2026. The constitutional amendment secured 146 votes—just 2 short of the 148 (two-thirds) supermajority required. High absenteeism among MPs (32 absent, 44 present but did not vote) caused the shock defeat. Government may refile in the 2nd sitting (Jun 22–Jul 16) or 3rd sitting (Oct 5–Dec 8) of 2026.',
  summary_ms = 'GAGAL dengan 2 undi pada 2 Mac 2026. Pindaan perlembagaan mendapat 146 undi—hanya 2 kurang daripada majoriti dua pertiga yang diperlukan (148 undi). Ketidakhadiran tinggi ahli parlimen (32 tidak hadir, 44 hadir tetapi tidak mengundi) menyebabkan kekalahan mengejut. Kerajaan mungkin memfailkan semula dalam persidangan ke-2 (22 Jun–16 Jul) atau ke-3 (5 Okt–8 Dis) 2026.',
  details_en = 'First Reading: February 23, 2026.
Vote (Second & Third Readings): March 2, 2026 — FAILED.

Result: 146 votes for, fell 2 short of the 148 (two-thirds of 222) needed for a constitutional amendment.
• 32 MPs were absent; 44 were present but did not vote.
• DAP secretary-general Anthony Loke called on voters to punish absent MPs.
• PM Anwar defended the bill, saying it strengthens checks and balances.

Key provisions:
• Cumulative 10-year tenure cap or 2 full terms
• Automatic cessation upon reaching the limit
• Applies to current and future Prime Ministers
• Former PMs who served 10+ years are ineligible to return

Analysts say the bill can still be passed in the 2nd sitting (Jun 22–Jul 16) or 3rd sitting (Oct 5–Dec 8) of 2026.',
  details_ms = 'Bacaan Pertama: 23 Februari 2026.
Pengundian (Bacaan Kedua & Ketiga): 2 Mac 2026 — GAGAL.

Keputusan: 146 undi memihak, kurang 2 daripada 148 (dua pertiga daripada 222) yang diperlukan untuk pindaan perlembagaan.
• 32 Ahli Parlimen tidak hadir; 44 hadir tetapi tidak mengundi.
• Setiausaha Agung DAP Anthony Loke menyeru pengundi menghukum MP yang tidak hadir.
• PM Anwar mempertahankan rang undang-undang itu, mengatakan ia mengukuhkan semak dan imbang.

Peruntukan utama:
• Had tempoh kumulatif 10 tahun atau 2 penggal penuh
• Penamatan automatik apabila mencapai had
• Terpakai kepada PM semasa dan masa hadapan
• Bekas PM yang berkhidmat 10 tahun ke atas tidak layak kembali

Penganalisis mengatakan rang undang-undang itu masih boleh diluluskan dalam persidangan ke-2 (22 Jun–16 Jul) atau ke-3 (5 Okt–8 Dis) 2026.',
  updated_at = NOW()
WHERE title_en = 'Prime Minister Term Limit Bill';

-- ============================================================
-- AG/PP Separation Bill — referred to special committee Mar 3
-- ============================================================
UPDATE bills_to_watch
SET
  status = 'committee',
  summary_en = 'Referred to special parliamentary committee on Mar 3, 2026 after debate over rushed timeline and accountability gaps. Minister Azalina chairs the committee. Bill amends 6 constitutional articles to create an independent Public Prosecutor. Parliament adjourned; vote expected no earlier than June 2026.',
  summary_ms = 'Dirujuk ke jawatankuasa parlimen khas pada 3 Mac 2026 selepas perdebatan mengenai garis masa yang tergesa-gesa dan jurang akauntabiliti. Menteri Azalina mengerusikan jawatankuasa tersebut. Rang undang-undang meminda 6 perkara perlembagaan untuk mewujudkan Pendakwa Raya bebas. Parlimen ditangguhkan; undi dijangka tidak lebih awal daripada Jun 2026.',
  details_en = 'First Reading: February 23, 2026.
Mar 3, 2026: Dewan Rakyat approved (voice vote) referral to a special parliamentary committee.
Parliament then adjourned until June 2026.

Committee chaired by Minister Azalina Othman Said will:
• Review accountability mechanisms for the new Public Prosecutor role
• Address concerns about power concentration in the PM and JLSC
• Explore whether Parliament should have a role in appointing the PP

Key constitutional amendments (6 articles):
• Article 42: Remove AG from state Pardons Boards
• Article 132: AG and PP offices removed from federal public service
• Article 138: JLSC expanded with 3 ex officio members

Once passed, two further bills will be tabled: one on the PP''s remuneration, and an omnibus bill amending 20+ existing laws (Penal Code, CPC, Evidence Act, etc.).',
  details_ms = 'Bacaan Pertama: 23 Februari 2026.
3 Mac 2026: Dewan Rakyat meluluskan (undi suara) rujukan ke jawatankuasa parlimen khas.
Parlimen kemudian ditangguhkan sehingga Jun 2026.

Jawatankuasa dikerusikan oleh Menteri Azalina Othman Said akan:
• Mengkaji mekanisme akauntabiliti untuk peranan Pendakwa Raya baharu
• Menangani kebimbangan tentang pemusatan kuasa dalam PM dan JLSC
• Meneliti sama ada Parlimen perlu berperanan dalam pelantikan PP

Pindaan perlembagaan utama (6 perkara):
• Perkara 42: Keluarkan Peguam Negara daripada Lembaga Pengampun negeri
• Perkara 132: Pejabat PN dan PP dikeluarkan daripada perkhidmatan awam persekutuan
• Perkara 138: JLSC diperluaskan dengan 3 ahli ex officio

Setelah diluluskan, dua rang undang-undang lanjut akan dibentangkan: satu mengenai saraan PP, dan satu rang undang-undang omnibus meminda 20+ undang-undang sedia ada (Kanun Keseksaan, KAJ, Akta Keterangan, dll.).',
  updated_at = NOW()
WHERE title_en = 'Attorney-General/Public Prosecutor Separation Bill';

-- ============================================================
-- Ombudsman Bill — not tabled in first 2026 session, deferred
-- ============================================================
UPDATE bills_to_watch
SET
  summary_en = 'Not tabled in the first 2026 parliamentary session (Jan–Mar). Was prioritised but deferred for further engagement. PM Anwar reaffirmed commitment to tabling in 2026. Expected in 2nd session (Jun 22–Jul 16) or 3rd session (Oct–Dec). Civil society warns the bill must not subordinate the FOI function.',
  summary_ms = 'Tidak dibentangkan dalam sesi parlimen pertama 2026 (Jan–Mac). Diprioritaskan tetapi ditangguhkan untuk penglibatan lanjut. PM Anwar mengesahkan semula komitmen untuk membentangkan pada 2026. Dijangka dalam sesi ke-2 (22 Jun–16 Jul) atau ke-3 (Okt–Dis). Masyarakat sivil memberi amaran bahawa rang undang-undang itu tidak boleh mengurangkan fungsi KMI.',
  details_en = 'In Pipeline; was among 4 priority reform bills for early 2026 but not tabled in first session.

Key objectives:
• Establish an independent body (Ombudsman Malaysia) to investigate public administration complaints
• Consolidate functions of Public Complaints Bureau (BPA) and Enforcement Agency Integrity Commission (EAIC)
• Address maladministration by government bodies and agencies
• Provide citizens a formal channel outside the courts for redress

Civil society concern: Merging with Ombudsman risks marginalising the FOI oversight mandate; advocates urge a separate, Parliament-accountable FOI Commission.

Next steps: Expected to be tabled in 2nd session (Jun 22–Jul 16) or 3rd session (Oct 5–Dec 8) 2026.',
  details_ms = 'Dalam Saluran; antara 4 rang undang-undang pembaharuan keutamaan awal 2026 tetapi tidak dibentangkan dalam sesi pertama.

Objektif utama:
• Menubuhkan badan bebas (Ombudsman Malaysia) untuk menyiasat aduan pentadbiran awam
• Menggabungkan fungsi Biro Pengaduan Awam (BPA) dan Suruhanjaya Integriti Agensi Penguatkuasaan (EAIC)
• Menangani salah tadbir oleh badan dan agensi kerajaan
• Menyediakan saluran rasmi kepada rakyat di luar mahkamah untuk mendapatkan remedi

Kebimbangan masyarakat sivil: Penggabungan dengan Ombudsman berisiko menepikan mandat pengawasan KMI; peguam menyeru Suruhanjaya KMI berasingan yang bertanggungjawab kepada Parlimen.

Langkah seterusnya: Dijangka dibentangkan dalam sesi ke-2 (22 Jun–16 Jul) atau ke-3 (5 Okt–8 Dis) 2026.',
  updated_at = NOW()
WHERE title_en = 'Ombudsman Bill';

-- ============================================================
-- Freedom of Information Bill — not tabled, civil society pushes for
-- independent Info Commission separate from Ombudsman
-- ============================================================
UPDATE bills_to_watch
SET
  summary_en = 'Not tabled in the first 2026 parliamentary session (Jan–Mar). Cabinet committee approved in principle; PM Anwar reconfirmed commitment for 2026 tabling. Civil society urges an independent Information Commission accountable to Parliament, not the Ombudsman. Expected in 2nd or 3rd session 2026.',
  summary_ms = 'Tidak dibentangkan dalam sesi parlimen pertama 2026 (Jan–Mac). Jawatankuasa Kabinet meluluskan secara prinsip; PM Anwar mengesahkan semula komitmen untuk pembentangan 2026. Masyarakat sivil mendesak Suruhanjaya Maklumat bebas yang bertanggungjawab kepada Parlimen, bukan Ombudsman. Dijangka dalam sesi ke-2 atau ke-3 2026.',
  details_en = 'Cabinet committee approved in principle; bill in drafting stage. Not tabled in first 2026 session.

Key objectives:
• Enhance public access to government information
• Promote transparency in project tenders and public spending
• Prevent abuse and maladministration
• Safeguards for national security, intelligence matters, and 3R (race, religion, royalty) issues

Civil society demand: An independent Information Commission of up to 7 members (with gender balance, expertise in information governance, law, human rights) directly accountable to Parliament—not folded under the Ombudsman.

Next steps: Expected to be tabled in 2nd session (Jun 22–Jul 16) or 3rd session (Oct 5–Dec 8) 2026.',
  details_ms = 'Jawatankuasa Kabinet meluluskan secara prinsip; rang undang-undang dalam peringkat penggubalan. Tidak dibentangkan dalam sesi pertama 2026.

Objektif utama:
• Meningkatkan akses awam kepada maklumat kerajaan
• Menggalakkan ketelusan dalam tender projek dan perbelanjaan awam
• Mencegah penyalahgunaan dan salah tadbir
• Perlindungan untuk keselamatan negara, perkara perisikan, dan isu 3R (kaum, agama, raja)

Tuntutan masyarakat sivil: Suruhanjaya Maklumat bebas sehingga 7 ahli (dengan keseimbangan gender, kepakaran dalam tadbir urus maklumat, undang-undang, hak asasi manusia) yang bertanggungjawab terus kepada Parlimen—tidak dimasukkan di bawah Ombudsman.

Langkah seterusnya: Dijangka dibentangkan dalam sesi ke-2 (22 Jun–16 Jul) atau ke-3 (5 Okt–8 Dis) 2026.',
  updated_at = NOW()
WHERE title_en = 'Freedom of Information Bill';
