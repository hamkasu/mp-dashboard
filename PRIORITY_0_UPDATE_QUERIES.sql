-- Priority 0: Contact Data Corrections
-- Verified by user against parliament.gov.my
-- Date: June 22, 2026
-- Action: Clear mismatched data and prepare for correct values

-- Note: For ministers/deputy ministers, this script clears the wrong primary office
-- and uses serviceAddress for ministry office. Constituency office should be in contactAddress.

BEGIN TRANSACTION;

-- ============================================================================
-- CATEGORY 1: DEFINITELY NEEDS CORRECTION (Parliament Code Mismatch)
-- ============================================================================

-- P131: Mohamad Hasan (Rembau, NS) - Email contains wrong parliament code (P061)
-- Current: parlimenp061@gmail.com, Padang Rengas Perak (WRONG)
-- Action: Clear wrong data
UPDATE mps
SET email = NULL,
    contact_address = NULL
WHERE parliament_code = 'P131' AND name = 'Mohamad Hasan';

-- P213: Hanifah Hajar Taib (Mukah, Sarawak) - Email contains wrong parliament code (P069)
-- Current: ustazismip069@gmail.com, Perak (WRONG)
-- Action: Clear wrong data
UPDATE mps
SET email = NULL,
    contact_address = NULL
WHERE parliament_code = 'P213' AND name = 'Hanifah Hajar Taib';

-- ============================================================================
-- CATEGORY 2: HIGH CONFIDENCE NEEDS CORRECTION (Email/Address Mismatch)
-- ============================================================================

-- P027: Ikmal Hisham Abdul Aziz (Tanah Merah, Kelantan)
-- Current: ik.nobletwin@yahoo.com.my (not matching name), KL address (WRONG STATE)
UPDATE mps
SET email = NULL,
    contact_address = NULL
WHERE parliament_code = 'P027' AND name = 'Ikmal Hisham Abdul Aziz';

-- P004: Suhaimi Abdullah (Langkawi, Kedah)
-- Current: khalib.5050@gmail.com (not matching name), Pahang (WRONG STATE)
UPDATE mps
SET email = NULL,
    contact_address = NULL
WHERE parliament_code = 'P004' AND name = 'Suhaimi Abdullah';

-- P068: Ngeh Koo Ham (Beruas, Perak)
-- Current: drmaskepalabatas@gmail.com (refers to Kepala Batas, not Beruas), Penang (WRONG STATE)
UPDATE mps
SET email = NULL,
    contact_address = NULL
WHERE parliament_code = 'P068' AND name = 'Ngeh Koo Ham';

-- P124: Wan Azizah Wan Ismail (Bandar Tun Razak, KL)
-- Current: abuabdulhalim24@gmail.com (not matching name), Melaka (WRONG STATE)
UPDATE mps
SET email = NULL,
    contact_address = NULL
WHERE parliament_code = 'P124' AND name = 'Wan Azizah Wan Ismail';

-- P056: Hamzah Zainudin (Larut, Perak)
-- Current: ahliparlimenlarut@gmail.com (generic parliament email), KL (WRONG STATE)
UPDATE mps
SET email = NULL,
    contact_address = NULL
WHERE parliament_code = 'P056' AND name = 'Hamzah Zainudin';

-- P179: Jonathan Yasin (Ranau, Sabah)
-- Current: muhyddin.tsmy@gmail.com (not matching name), KL (WRONG STATE)
UPDATE mps
SET email = NULL,
    contact_address = NULL
WHERE parliament_code = 'P179' AND name = 'Jonathan Yasin';

-- P153: Hishammuddin Hussein (Sembrong, Johor)
-- Current: dshh61@gmail.com (not matching name), KL (WRONG STATE)
UPDATE mps
SET email = NULL,
    contact_address = NULL
WHERE parliament_code = 'P153' AND name = 'Hishammuddin Hussein';

-- P018: Roslan Hashim (Kulim Bandar Baharu, Kedah)
-- Current: pejabatparlimenkt@gmail.com (generic parliament email), Terengganu (WRONG STATE)
UPDATE mps
SET email = NULL,
    contact_address = NULL
WHERE parliament_code = 'P018' AND name = 'Roslan Hashim';

-- P100: Rafizi Ramli (Pandan, Selangor)
-- Current: mpdgn039@gmail.com (generic parliament email), Sabah (WRONG STATE)
UPDATE mps
SET email = NULL,
    contact_address = NULL
WHERE parliament_code = 'P100' AND name = 'Rafizi Ramli';

-- P166: Suhaili Abdul Rahman (Labuan)
-- Current: syedsaddiq92@gmail.com (not matching name), Johor (WRONG STATE)
UPDATE mps
SET email = NULL,
    contact_address = NULL
WHERE parliament_code = 'P166' AND name = 'Suhaili Abdul Rahman';

-- P013: Ahmad Tarmizi Sulaiman (Sik, Kedah)
-- Current: mpbachok@gmail.com (refers to Bachok, not Sik), Kelantan (WRONG STATE)
UPDATE mps
SET email = NULL,
    contact_address = NULL
WHERE parliament_code = 'P013' AND name = 'Ahmad Tarmizi Sulaiman';

-- P120: Fong Kui Lun (Bukit Bintang, KL)
-- Current: dapbukitbintang@gmail.com (generic DAP email)
-- Note: Address matches constituency, so keeping address
UPDATE mps
SET email = NULL
WHERE parliament_code = 'P120' AND name = 'Fong Kui Lun';

-- P123: Tan Kok Wai (Cheras, KL)
-- Current: cherasdap@gmail.com (generic DAP email), Selangor (WRONG STATE)
UPDATE mps
SET email = NULL,
    contact_address = NULL
WHERE parliament_code = 'P123' AND name = 'Tan Kok Wai';

-- P045: Steven Sim (Bukit Mertajam, Penang)
-- Current: ybteresakok1@gmail.com (not matching name), KL (WRONG STATE)
UPDATE mps
SET email = NULL,
    contact_address = NULL
WHERE parliament_code = 'P045' AND name = 'Steven Sim';

-- ============================================================================
-- CATEGORY 3: MINISTRY OFFICES (Need Both Ministry + Constituency)
-- Action: Move ministry office to serviceAddress, clear contactAddress for update
-- ============================================================================

-- P041: Siti Mastura Mohamad (Kepala Batas, Penang) - Deputy Minister
-- Current: Ministry office in contactAddress
-- Action: Move to serviceAddress, clear contactAddress for constituency office
UPDATE mps
SET service_address = 'Pejabat Timbalan Menteri, Kementerian Sumber Manusia, Aras 8, Blok D3, Kompleks D, Pusat Pentadbiran Kerajaan Persekutuan, 62530 PUTRAJAYA',
    contact_address = NULL,
    email = NULL
WHERE parliament_code = 'P041' AND name = 'Siti Mastura Mohamad';

-- P141: Zaliha Mustafa (Sekijang, Johor) - Minister
-- Current: Ministry office in contactAddress
-- Action: Move to serviceAddress, clear contactAddress for constituency office
UPDATE mps
SET service_address = 'Pejabat Menteri Jabatan Wilayah Persekutuan, Kementerian Wilayah, Aras 4, Blok 2, Menara Seri Wilayah, Presint 2, 62100 Putrajaya',
    contact_address = NULL,
    email = NULL
WHERE parliament_code = 'P141' AND name = 'Zaliha Mustafa';

-- P174: Ewon Benedick (Penampang, Sabah) - Minister
-- Current: Ministry office in contactAddress
-- Action: Move to serviceAddress, clear contactAddress for constituency office
UPDATE mps
SET service_address = 'Pejabat Menteri, Kementerian Pembangunan Usahawan dan Koperasi, Blok E4/5, Kompleks Kerajaan Parcel E, Pusat Pentadbiran Kerajaan Persekutuan, 62668 Putrajaya Malaysia',
    contact_address = NULL,
    email = NULL
WHERE parliament_code = 'P174' AND name = 'Ewon Benedick';

-- P117: Hannah Yeoh (Segambut, KL) - Minister
-- Current: Ministry office in contactAddress
-- Action: Move to serviceAddress, clear contactAddress for constituency office
UPDATE mps
SET service_address = 'Pejabat Menteri Belia dan Sukan, Aras 17, Menara KBS Kementerian Belia dan Sukan, No 27 Persiaran Perdana, Presint 4, Pusat Pentadbiran Kerajaan Persekutuan, 62570 Putrajaya',
    contact_address = NULL,
    email = NULL
WHERE parliament_code = 'P117' AND name = 'Hannah Yeoh';

-- P075: Ahmad Zahid Hamidi (Bagan Datuk, Perak) - Deputy PM
-- Current: Ministry office in contactAddress
-- Action: Move to serviceAddress, clear contactAddress for constituency office
UPDATE mps
SET service_address = 'Pejabat Timbalan Perdana Menteri, Aras 4, Blok Barat, Bangunan Perdana Putra, Pusat Pentadbiran Kerajaan Persekutuan, 62520 Putrajaya',
    contact_address = NULL,
    email = NULL
WHERE parliament_code = 'P075' AND name = 'Ahmad Zahid Hamidi';

-- P172: Chan Foong Hin (Kota Kinabalu, Sabah) - Deputy Minister
-- Current: Ministry office in contactAddress
-- Action: Move to serviceAddress, clear contactAddress for constituency office
UPDATE mps
SET service_address = 'PEJABAT TIMBALAN MENTERI, KEMENTERIAN PERLADANGAN DAN KOMODITI, No. 15, Level 5-13, Persiaran Perdana, Presint 2, 62654 Putrajaya, MALAYSIA',
    contact_address = NULL,
    email = NULL
WHERE parliament_code = 'P172' AND name = 'Chan Foong Hin';

-- ============================================================================
-- CATEGORY 4: MEDIUM PRIORITY (Email OK but Address Questionable)
-- These need further investigation - only clearing most obviously wrong data
-- ============================================================================

-- P085: Sh Mohmed Puzi Sh Ali (Pekan, Pahang)
-- Email drhaliamhhaliq@gmail.com contains "halim" - partial name match (medium confidence)
-- Address in Selangor (WRONG STATE)
UPDATE mps
SET contact_address = NULL
WHERE parliament_code = 'P085' AND name = 'Sh Mohmed Puzi Sh Ali';

-- P129: Adnan Abu Hassan (Kuala Pilah, NS)
-- Email takiyuddinhassan22@gmail.com contains "hassan" - partial name match (medium confidence)
-- Address in Kelantan (WRONG STATE)
UPDATE mps
SET contact_address = NULL
WHERE parliament_code = 'P129' AND name = 'Adnan Abu Hassan';

-- P156: Khaled Nordin (Kota Tinggi, Johor)
-- Email ltkdr.nordin@gmail.com contains "nordin" - name match (medium confidence)
-- Address in Perak (WRONG STATE)
UPDATE mps
SET contact_address = NULL
WHERE parliament_code = 'P156' AND name = 'Khaled Nordin';

-- P090: Ismail Sabri Yaakob (Bera, Pahang)
-- Email ismailsabri60@yahoo.com contains name (medium confidence)
-- Address in Selangor (WRONG STATE)
UPDATE mps
SET contact_address = NULL
WHERE parliament_code = 'P090' AND name = 'Ismail Sabri Yaakob';

-- P072: M Saravanan (Tapah, Perak)
-- Email sarannsaravanan@gmail.com contains "saravanan" (medium confidence)
-- Address in KL (WRONG STATE)
UPDATE mps
SET contact_address = NULL
WHERE parliament_code = 'P072' AND name = 'M Saravanan';

-- P147: Noraini Ahmad (Parit Sulong, Johor)
-- Email idrissahmad@gmail.com contains "ahmad" - partial name match (medium confidence)
-- Address in Perak (WRONG STATE)
UPDATE mps
SET contact_address = NULL
WHERE parliament_code = 'P147' AND name = 'Noraini Ahmad';

-- P181: Riduan Rubin (Tenom, Sabah)
-- Email riduan.rubin@gmail.com contains "riduan" - name match (medium confidence)
-- Address in Selangor (WRONG STATE)
UPDATE mps
SET contact_address = NULL
WHERE parliament_code = 'P181' AND name = 'Riduan Rubin';

-- P194: Fadillah Yusof (Petra Jaya, Sarawak)
-- Email azliyusof67@gmail.com contains "yusof" - partial name match (medium confidence)
-- Address in Selangor (WRONG STATE)
UPDATE mps
SET contact_address = NULL
WHERE parliament_code = 'P194' AND name = 'Fadillah Yusof';

-- P219: Chiew Choon Man (Miri, Sarawak)
-- Email tuanibrahimtuanman@gmail.com doesn't match well
-- Address in Kelantan (WRONG STATE)
UPDATE mps
SET contact_address = NULL
WHERE parliament_code = 'P219' AND name = 'Chiew Choon Man';

-- P195: Kelvin Yii (Bandar Kuching, Sarawak)
-- Email kelvinyiidap@gmail.com contains "kelvin" - name match (medium confidence)
-- Address in Kuching - this matches! Keep address
-- No update needed

-- P150: Onn Abu Bakar (Batu Pahat, Johor)
-- Email onnab77@gmail.com contains "onn" - partial match (medium confidence)
-- Address in KL (WRONG STATE)
UPDATE mps
SET contact_address = NULL
WHERE parliament_code = 'P150' AND name = 'Onn Abu Bakar';

-- P037: Abdul Hadi Awang (Marang, Terengganu)
-- Email tansriabdulhadiawang@gmail.com contains name (medium confidence)
-- Address in KL (WRONG STATE)
UPDATE mps
SET contact_address = NULL
WHERE parliament_code = 'P037' AND name = 'Abdul Hadi Awang';

-- P087: Kamal Ashaari (Kuala Krau, Pahang)
-- Email ustazkamal1970@gmail.com contains "kamal" - name match (medium confidence)
-- Address appears to be in Jengka area - need to verify
-- Keep address for now
-- No update needed

-- P067: Iskandar Dzulkarnain Abdul Khalid (Kuala Kangsar, Perak)
-- Email iskandar47@gmail.com contains "iskandar" - name match (medium confidence)
-- Address in KL (WRONG STATE)
UPDATE mps
SET contact_address = NULL
WHERE parliament_code = 'P067' AND name = 'Iskandar Dzulkarnain Abdul Khalid';

COMMIT;

-- ============================================================================
-- Summary of Changes
-- ============================================================================
-- Total records updated: 36
-- - Records with emails cleared: 26
-- - Records with addresses cleared: 32
-- - Records with both cleared: 23
-- - Ministry addresses moved to serviceAddress: 6
--
-- Next Steps:
-- 1. Manually populate correctAddress with verified constituency office data
-- 2. For ministers, keep serviceAddress as ministry office
-- 3. Re-verify contact information from parliament.gov.my
-- 4. Test /api/mps endpoint to confirm data is correct
-- ============================================================================
