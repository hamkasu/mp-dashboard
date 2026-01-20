/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Header } from "@/components/Header";
import { PageMeta } from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Shield, Home, MessageCircle, Globe, GraduationCap, Wallet, Printer } from "lucide-react";

export default function FundamentalRights() {
  const { language: contextLanguage } = useLanguage();
  const [language, setLanguage] = useState<"en" | "bm" | "zh" | "ta">(contextLanguage === "ms" ? "bm" : "en");

  const handlePrint = () => {
    window.print();
  };

  const content = {
    en: {
      title: "Fundamental Rights of Malaysian Citizens",
      subtitle: "Part II (Articles 5-13) of the Federal Constitution",
      intro: {
        title: "About Fundamental Liberties",
        content: "Part II of the Federal Constitution of Malaysia guarantees fundamental liberties to all citizens and persons in Malaysia. These rights are the foundation of a democratic society and protect individuals from arbitrary state actions."
      },
      articles: [
        {
          number: "5",
          title: "Liberty of the Person",
          icon: Shield,
          summary: "No person shall be deprived of life or personal liberty except in accordance with law.",
          points: [
            "Protection against arbitrary arrest and detention",
            "Right to be informed of grounds for arrest",
            "Right to legal representation",
            "Must be produced before a magistrate within 24 hours of arrest",
            "Protection from retrospective criminal laws and repeated trials (as per Article 7)"
          ]
        },
        {
          number: "6",
          title: "Prohibition of Slavery and Forced Labour",
          icon: Shield,
          summary: "No person shall be held in slavery, and all forms of forced labour are prohibited.",
          points: [
            "Slavery and human trafficking are absolutely prohibited",
            "Forced labour is prohibited except for compulsory national service",
            "Does not include work required for convicted persons",
            "Does not include work or service forming part of normal civil obligations"
          ]
        },
        {
          number: "8",
          title: "Equality Before the Law",
          icon: Scale,
          summary: "All persons are equal before the law and entitled to equal protection of the law.",
          points: [
            "No discrimination against citizens based on religion, race, descent, place of birth, or gender",
            "Equal access to public places (shops, restaurants, hotels, public entertainment)",
            "Equal treatment in employment or holding office",
            "Parliament may enact laws for the protection and advancement of certain groups",
            "Reservation of quotas in education or public service for certain communities"
          ]
        },
        {
          number: "9",
          title: "Prohibition of Banishment and Freedom of Movement",
          icon: Home,
          summary: "Citizens cannot be banished from Malaysia and have freedom of movement.",
          points: [
            "No citizen shall be banished or excluded from Malaysia",
            "Citizens have the right to move freely throughout Malaysia",
            "Right to reside in any part of Malaysia",
            "May be restricted by law for public health, morality, or protection of other rights",
            "May be restricted in the interest of security or public order"
          ]
        },
        {
          number: "10",
          title: "Freedom of Speech, Assembly and Association",
          icon: MessageCircle,
          summary: "Every citizen has the right to freedom of speech, peaceful assembly, and association.",
          points: [
            "Freedom of speech and expression",
            "Right to assemble peaceably and without arms",
            "Right to form associations (including trade unions and political parties)",
            "Parliament may impose restrictions in the interest of security, public order, or morality",
            "Parliament may restrict freedom of association for civil servants"
          ]
        },
        {
          number: "11",
          title: "Freedom of Religion",
          icon: Globe,
          summary: "Every person has the right to profess and practice their religion.",
          points: [
            "Freedom to profess and practice any religion",
            "Right to propagate religious beliefs (subject to state law restrictions on propagating to Muslims)",
            "No person shall be compelled to pay any tax for purposes of a religion other than their own",
            "Parents have the right to determine their children's religious upbringing (under 18 years)",
            "Islam is the religion of the Federation, but other religions may be practiced in peace and harmony",
            "Special qualifications for Muslims: State law may control or restrict propagation of any religious doctrine or belief among persons professing the religion of Islam",
            "Muslims are subject to Syariah law in matters of personal and family law, administered by Syariah courts",
            "Conversion from Islam (apostasy) is subject to State Islamic law and Syariah court procedures"
          ]
        },
        {
          number: "12",
          title: "Rights in Respect of Education",
          icon: GraduationCap,
          summary: "Rights related to education and protection from discrimination in educational institutions.",
          points: [
            "No discrimination in admission to educational institutions based on religion, race, descent, or place of birth",
            "Citizens have the right to establish and maintain institutions for education of children",
            "No person shall be required to receive instruction or take part in any ceremony or worship of a religion other than their own",
            "Federal or State may establish or maintain Islamic institutions or provide instruction in Islam",
            "Right to federal aid for educational institutions"
          ]
        },
        {
          number: "13",
          title: "Rights to Property",
          icon: Wallet,
          summary: "Protection against compulsory acquisition of property without adequate compensation.",
          points: [
            "No person shall be deprived of property except in accordance with law",
            "No law shall provide for compulsory acquisition without adequate compensation",
            "Restriction on alienation of Malay reservation land to non-Malays",
            "State authority to acquire land for public purposes",
            "Right to challenge inadequate compensation in court"
          ]
        }
      ],
      limitations: {
        title: "Limitations and Qualifications",
        intro: "While these fundamental liberties are guaranteed, they are not absolute. The Federal Constitution allows Parliament to impose restrictions in certain circumstances:",
        points: [
          "Security of the Federation or any part thereof",
          "Public order or morality",
          "Protection of the privileges of Parliament or Legislative Assemblies",
          "Contempt of court",
          "Defamation or incitement to an offense",
          "Emergency proclamations (Article 150)",
          "Preventive detention for security reasons (subject to Article 5 safeguards)"
        ]
      },
      importance: {
        title: "Why These Rights Matter",
        content: "Fundamental liberties form the bedrock of Malaysia's constitutional democracy. They protect individuals from abuse of state power, ensure human dignity, and create the foundation for a just and equitable society. Understanding these rights empowers citizens to hold the government accountable and participate meaningfully in democratic processes."
      }
    },
    bm: {
      title: "Hak-Hak Asasi Warganegara Malaysia",
      subtitle: "Bahagian II (Perkara 5-13) Perlembagaan Persekutuan",
      intro: {
        title: "Tentang Kebebasan Asasi",
        content: "Bahagian II Perlembagaan Persekutuan Malaysia menjamin kebebasan asasi kepada semua warganegara dan individu di Malaysia. Hak-hak ini adalah asas kepada masyarakat demokratik dan melindungi individu daripada tindakan sewenang-wenang negara."
      },
      articles: [
        {
          number: "5",
          title: "Kebebasan Diri",
          icon: Shield,
          summary: "Tiada seorang pun boleh dilucutkan nyawa atau kebebasan dirinya melainkan mengikut undang-undang.",
          points: [
            "Perlindungan terhadap penangkapan dan penahanan sewenang-wenang",
            "Hak untuk dimaklumkan sebab-sebab penangkapan",
            "Hak kepada perwakilan undang-undang",
            "Mesti dibawa ke hadapan majistret dalam masa 24 jam selepas ditangkap",
            "Perlindungan daripada undang-undang jenayah retroaktif dan perbicaraan berulang (mengikut Perkara 7)"
          ]
        },
        {
          number: "6",
          title: "Larangan terhadap Perhambaan dan Buruh Paksa",
          icon: Shield,
          summary: "Tiada seorang pun boleh dijadikan hamba, dan semua bentuk buruh paksa adalah dilarang.",
          points: [
            "Perhambaan dan pemerdagangan manusia adalah dilarang sepenuhnya",
            "Buruh paksa dilarang kecuali untuk khidmat negara yang wajib",
            "Tidak termasuk kerja yang diperlukan untuk orang yang disabitkan kesalahan",
            "Tidak termasuk kerja atau perkhidmatan yang merupakan sebahagian daripada kewajipan sivil biasa"
          ]
        },
        {
          number: "8",
          title: "Kesaksamaan di Hadapan Undang-Undang",
          icon: Scale,
          summary: "Semua orang adalah sama rata di sisi undang-undang dan berhak mendapat perlindungan yang sama.",
          points: [
            "Tiada diskriminasi terhadap warganegara berdasarkan agama, bangsa, keturunan, tempat lahir, atau jantina",
            "Akses yang sama ke tempat-tempat awam (kedai, restoran, hotel, hiburan awam)",
            "Layanan yang sama dalam pekerjaan atau memegang jawatan",
            "Parlimen boleh menggubal undang-undang untuk melindungi dan memajukan kumpulan tertentu",
            "Tempahan kuota dalam pendidikan atau perkhidmatan awam untuk komuniti tertentu"
          ]
        },
        {
          number: "9",
          title: "Larangan Pengusiran dan Kebebasan Bergerak",
          icon: Home,
          summary: "Warganegara tidak boleh dibuang negeri dari Malaysia dan mempunyai kebebasan bergerak.",
          points: [
            "Tiada warganegara boleh dibuang negeri atau dikecualikan dari Malaysia",
            "Warganegara mempunyai hak untuk bergerak dengan bebas di seluruh Malaysia",
            "Hak untuk menetap di mana-mana bahagian Malaysia",
            "Boleh disekat oleh undang-undang untuk kesihatan awam, moral, atau perlindungan hak lain",
            "Boleh disekat demi kepentingan keselamatan atau ketenteraman awam"
          ]
        },
        {
          number: "10",
          title: "Kebebasan Bersuara, Berhimpun dan Berpersatuan",
          icon: MessageCircle,
          summary: "Setiap warganegara mempunyai hak kebebasan bersuara, berhimpun secara aman, dan berpersatuan.",
          points: [
            "Kebebasan bersuara dan menyatakan pendapat",
            "Hak untuk berhimpun secara aman dan tanpa senjata",
            "Hak untuk membentuk persatuan (termasuk kesatuan sekerja dan parti politik)",
            "Parlimen boleh mengenakan sekatan demi kepentingan keselamatan, ketenteraman awam, atau moral",
            "Parlimen boleh menyekat kebebasan berpersatuan untuk penjawat awam"
          ]
        },
        {
          number: "11",
          title: "Kebebasan Beragama",
          icon: Globe,
          summary: "Setiap orang mempunyai hak untuk menganut dan mengamalkan agamanya.",
          points: [
            "Kebebasan untuk menganut dan mengamalkan sebarang agama",
            "Hak untuk menyebarkan kepercayaan agama (tertakluk kepada sekatan undang-undang negeri ke atas penyebaran kepada orang Islam)",
            "Tiada seorang pun boleh dipaksa membayar cukai untuk tujuan agama selain agamanya sendiri",
            "Ibu bapa mempunyai hak untuk menentukan pendidikan agama anak mereka (bawah 18 tahun)",
            "Islam adalah agama Persekutuan, tetapi agama lain boleh diamalkan dengan aman dan harmoni",
            "Kelayakan khas untuk orang Islam: Undang-undang negeri boleh mengawal atau menyekat penyebaran apa-apa doktrin atau kepercayaan agama di kalangan orang yang menganut agama Islam",
            "Orang Islam tertakluk kepada undang-undang Syariah dalam hal ehwal peribadi dan keluarga, ditadbir oleh mahkamah Syariah",
            "Pertukaran agama daripada Islam (murtad) tertakluk kepada undang-undang Islam Negeri dan prosedur mahkamah Syariah"
          ]
        },
        {
          number: "12",
          title: "Hak Berkenaan Pendidikan",
          icon: GraduationCap,
          summary: "Hak yang berkaitan dengan pendidikan dan perlindungan daripada diskriminasi dalam institusi pendidikan.",
          points: [
            "Tiada diskriminasi dalam kemasukan ke institusi pendidikan berdasarkan agama, bangsa, keturunan, atau tempat lahir",
            "Warganegara mempunyai hak untuk menubuhkan dan menyelenggara institusi untuk pendidikan kanak-kanak dalam bahasa mereka sendiri",
            "Tiada seorang pun boleh dipaksa menerima pengajaran atau mengambil bahagian dalam upacara atau ibadat agama selain agamanya sendiri",
            "Persekutuan atau Negeri boleh menubuhkan atau menyelenggara institusi Islam atau menyediakan pengajaran Islam",
            "Hak kepada bantuan persekutuan untuk institusi pendidikan"
          ]
        },
        {
          number: "13",
          title: "Hak kepada Harta",
          icon: Wallet,
          summary: "Perlindungan terhadap pengambilan harta secara paksa tanpa pampasan yang mencukupi.",
          points: [
            "Tiada seorang pun boleh dilucutkan hartanya melainkan mengikut undang-undang",
            "Tiada undang-undang boleh memperuntukkan pengambilan paksa tanpa pampasan yang mencukupi",
            "Sekatan terhadap pemindahmilikkan tanah rizab Melayu kepada bukan Melayu",
            "Kuasa negeri untuk mengambil tanah untuk tujuan awam",
            "Hak untuk mencabar pampasan yang tidak mencukupi di mahkamah"
          ]
        }
      ],
      limitations: {
        title: "Had dan Kelayakan",
        intro: "Walaupun kebebasan asasi ini dijamin, ia tidak mutlak. Perlembagaan Persekutuan membenarkan Parlimen mengenakan sekatan dalam keadaan tertentu:",
        points: [
          "Keselamatan Persekutuan atau mana-mana bahagiannya",
          "Ketenteraman awam atau moral",
          "Perlindungan keistimewaan Parlimen atau Dewan Undangan",
          "Penghinaan mahkamah",
          "Fitnah atau hasutan untuk melakukan kesalahan",
          "Pengisytiharan darurat (Perkara 150)",
          "Tahanan pencegahan atas sebab keselamatan (tertakluk kepada perlindungan Perkara 5)"
        ]
      },
      importance: {
        title: "Mengapa Hak-Hak Ini Penting",
        content: "Kebebasan asasi membentuk asas demokrasi perlembagaan Malaysia. Ia melindungi individu daripada penyalahgunaan kuasa negara, memastikan maruah manusia, dan mewujudkan asas untuk masyarakat yang adil dan saksama. Memahami hak-hak ini memperkasakan warganegara untuk memastikan kerajaan bertanggungjawab dan mengambil bahagian secara bermakna dalam proses demokratik."
      }
    },
    zh: {
      title: "马来西亚公民基本权利",
      subtitle: "联邦宪法第二部分（第5-13条）",
      intro: {
        title: "关于基本自由",
        content: "马来西亚联邦宪法第二部分保障所有马来西亚公民和居民的基本自由。这些权利是民主社会的基石，保护个人免受国家任意行为的侵害。"
      },
      articles: [
        {
          number: "5",
          title: "人身自由",
          icon: Shield,
          summary: "除依法律规定外，任何人不得被剥夺生命或人身自由。",
          points: [
            "保护免受任意逮捕和拘留",
            "有权被告知逮捕理由",
            "有权获得法律代理",
            "逮捕后24小时内必须被带到法官面前",
            "保护免受追溯性刑事法律和重复审判（依据第7条）"
          ]
        },
        {
          number: "6",
          title: "禁止奴役和强迫劳动",
          icon: Shield,
          summary: "任何人不得被奴役，所有形式的强迫劳动均被禁止。",
          points: [
            "奴役和人口贩卖绝对被禁止",
            "强迫劳动被禁止，但义务国民服务除外",
            "不包括被定罪者被要求的劳动",
            "不包括构成正常公民义务的工作或服务"
          ]
        },
        {
          number: "8",
          title: "法律面前人人平等",
          icon: Scale,
          summary: "所有人在法律面前一律平等，有权获得法律的平等保护。",
          points: [
            "不得基于宗教、种族、血统、出生地或性别歧视公民",
            "平等进入公共场所（商店、餐厅、酒店、公共娱乐场所）",
            "在就业或任职方面享有平等待遇",
            "国会可为保护和促进某些群体制定法律",
            "为某些社区在教育或公共服务中保留配额"
          ]
        },
        {
          number: "9",
          title: "禁止驱逐和迁徙自由",
          icon: Home,
          summary: "公民不得被驱逐出马来西亚，并享有迁徙自由。",
          points: [
            "任何公民不得被驱逐或排除出马来西亚",
            "公民有权在马来西亚境内自由迁徙",
            "有权在马来西亚任何地方居住",
            "可因公共卫生、道德或保护他人权利而依法限制",
            "可因安全或公共秩序利益而限制"
          ]
        },
        {
          number: "10",
          title: "言论、集会和结社自由",
          icon: MessageCircle,
          summary: "每个公民都有言论自由、和平集会和结社的权利。",
          points: [
            "言论和表达自由",
            "和平且不携带武器集会的权利",
            "组织团体的权利（包括工会和政党）",
            "国会可为安全、公共秩序或道德利益施加限制",
            "国会可限制公务员的结社自由"
          ]
        },
        {
          number: "11",
          title: "宗教自由",
          icon: Globe,
          summary: "每个人都有权信奉和实践其宗教。",
          points: [
            "信奉和实践任何宗教的自由",
            "传播宗教信仰的权利（受州法律对向穆斯林传教的限制）",
            "任何人不得被强迫为非本人宗教目的缴税",
            "父母有权决定子女的宗教教育（18岁以下）",
            "伊斯兰教是联邦宗教，但其他宗教可在和平与和谐中实践",
            "穆斯林的特别规定：州法律可控制或限制向信奉伊斯兰教的人传播任何宗教教义或信仰",
            "穆斯林在个人和家庭法事务上受伊斯兰教法管辖，由伊斯兰法庭管理",
            "脱离伊斯兰教（叛教）受州伊斯兰法律和伊斯兰法庭程序管辖"
          ]
        },
        {
          number: "12",
          title: "教育权利",
          icon: GraduationCap,
          summary: "与教育相关的权利及保护免受教育机构歧视。",
          points: [
            "教育机构入学不得基于宗教、种族、血统或出生地歧视",
            "公民有权建立和维护以其母语教育子女的机构",
            "任何人不得被要求接受或参与非本人宗教的指导、仪式或礼拜",
            "联邦或州可建立或维护伊斯兰机构或提供伊斯兰教育",
            "教育机构有权获得联邦援助"
          ]
        },
        {
          number: "13",
          title: "财产权",
          icon: Wallet,
          summary: "保护免受未经适当赔偿的强制征收财产。",
          points: [
            "除依法律规定外，任何人不得被剥夺财产",
            "任何法律不得规定未经适当赔偿的强制征收",
            "限制将马来保留地转让给非马来人",
            "州当局为公共目的征收土地的权力",
            "在法庭上对不当赔偿提出异议的权利"
          ]
        }
      ],
      limitations: {
        title: "限制与条件",
        intro: "虽然这些基本自由受到保障，但并非绝对。联邦宪法允许国会在某些情况下施加限制：",
        points: [
          "联邦或其任何部分的安全",
          "公共秩序或道德",
          "保护国会或州立法议会的特权",
          "藐视法庭",
          "诽谤或煽动犯罪",
          "紧急状态宣告（第150条）",
          "因安全原因的预防性拘留（受第5条保障限制）"
        ]
      },
      importance: {
        title: "这些权利为何重要",
        content: "基本自由构成马来西亚宪政民主的基石。它们保护个人免受国家权力滥用，确保人的尊严，并为公正平等的社会奠定基础。了解这些权利使公民能够监督政府问责并有意义地参与民主进程。"
      }
    },
    ta: {
      title: "மலேசிய குடிமக்களின் அடிப்படை உரிமைகள்",
      subtitle: "கூட்டாட்சி அரசியலமைப்பின் இரண்டாம் பகுதி (உறுப்புகள் 5-13)",
      intro: {
        title: "அடிப்படை சுதந்திரங்கள் பற்றி",
        content: "மலேசிய கூட்டாட்சி அரசியலமைப்பின் இரண்டாம் பகுதி மலேசியாவில் உள்ள அனைத்து குடிமக்கள் மற்றும் நபர்களுக்கும் அடிப்படை சுதந்திரங்களை உறுதி செய்கிறது. இந்த உரிமைகள் ஜனநாயக சமூகத்தின் அடித்தளமாக இருக்கின்றன மற்றும் தன்னிச்சையான அரசு நடவடிக்கைகளில் இருந்து தனிநபர்களைப் பாதுகாக்கின்றன."
      },
      articles: [
        {
          number: "5",
          title: "நபரின் சுதந்திரம்",
          icon: Shield,
          summary: "சட்டத்தின்படி தவிர, எந்த நபரும் உயிர் அல்லது தனிப்பட்ட சுதந்திரம் பறிக்கப்படக்கூடாது.",
          points: [
            "தன்னிச்சையான கைது மற்றும் தடுப்புக்காவலில் இருந்து பாதுகாப்பு",
            "கைது செய்யப்பட்டதற்கான காரணங்களைத் தெரிந்துகொள்ளும் உரிமை",
            "சட்ட பிரதிநிதித்துவத்திற்கான உரிமை",
            "கைதுக்குப் பிறகு 24 மணி நேரத்திற்குள் நீதவான் முன் கொண்டு செல்லப்பட வேண்டும்",
            "பின்நோக்கிய குற்றவியல் சட்டங்கள் மற்றும் மீண்டும் விசாரணைகளில் இருந்து பாதுகாப்பு (உறுப்பு 7 படி)"
          ]
        },
        {
          number: "6",
          title: "அடிமைத்தனம் மற்றும் கட்டாய உழைப்பு தடை",
          icon: Shield,
          summary: "எந்த நபரும் அடிமைத்தனத்தில் வைக்கப்படக்கூடாது, அனைத்து வகையான கட்டாய உழைப்பும் தடைசெய்யப்பட்டுள்ளது.",
          points: [
            "அடிமைத்தனம் மற்றும் மனித கடத்தல் முற்றிலும் தடைசெய்யப்பட்டுள்ளது",
            "கட்டாய தேசிய சேவையைத் தவிர கட்டாய உழைப்பு தடைசெய்யப்பட்டுள்ளது",
            "தண்டனை பெற்றவர்களுக்கு தேவையான வேலை உள்ளடங்காது",
            "சாதாரண குடிமை கடமைகளின் ஒரு பகுதியான வேலை அல்லது சேவை உள்ளடங்காது"
          ]
        },
        {
          number: "8",
          title: "சட்டத்தின் முன் சமத்துவம்",
          icon: Scale,
          summary: "அனைத்து நபர்களும் சட்டத்தின் முன் சமம் மற்றும் சட்டத்தின் சம பாதுகாப்புக்கு உரிமை உடையவர்கள்.",
          points: [
            "மதம், இனம், வம்சாவளி, பிறந்த இடம் அல்லது பாலின அடிப்படையில் குடிமக்களை பாகுபாடு காட்டக்கூடாது",
            "பொது இடங்களுக்கு சமமான அணுகல் (கடைகள், உணவகங்கள், விடுதிகள், பொது பொழுதுபோக்கு)",
            "வேலைவாய்ப்பு அல்லது பதவி வகிப்பதில் சம நடத்தை",
            "குறிப்பிட்ட குழுக்களின் பாதுகாப்பு மற்றும் முன்னேற்றத்திற்காக பாராளுமன்றம் சட்டங்களை இயற்றலாம்",
            "குறிப்பிட்ட சமூகங்களுக்கு கல்வி அல்லது அரசு சேவையில் இட ஒதுக்கீடு"
          ]
        },
        {
          number: "9",
          title: "நாடுகடத்தல் தடை மற்றும் நடமாட்ட சுதந்திரம்",
          icon: Home,
          summary: "குடிமக்கள் மலேசியாவில் இருந்து நாடுகடத்தப்படக்கூடாது மற்றும் நடமாட்ட சுதந்திரம் உள்ளது.",
          points: [
            "எந்த குடிமகனும் மலேசியாவில் இருந்து நாடுகடத்தப்படவோ விலக்கப்படவோ கூடாது",
            "குடிமக்கள் மலேசியா முழுவதும் சுதந்திரமாக நடமாட உரிமை உள்ளது",
            "மலேசியாவின் எந்த பகுதியிலும் வசிக்கும் உரிமை",
            "பொது சுகாதாரம், ஒழுக்கம் அல்லது பிற உரிமைகளின் பாதுகாப்புக்காக சட்டத்தால் கட்டுப்படுத்தப்படலாம்",
            "பாதுகாப்பு அல்லது பொது ஒழுங்கின் நலனுக்காக கட்டுப்படுத்தப்படலாம்"
          ]
        },
        {
          number: "10",
          title: "பேச்சு, கூட்டம் மற்றும் சங்க சுதந்திரம்",
          icon: MessageCircle,
          summary: "ஒவ்வொரு குடிமகனுக்கும் பேச்சு சுதந்திரம், அமைதியான கூட்டம் மற்றும் சங்கம் அமைக்கும் உரிமை உள்ளது.",
          points: [
            "பேச்சு மற்றும் கருத்து சுதந்திரம்",
            "ஆயுதங்கள் இல்லாமல் அமைதியாக கூடும் உரிமை",
            "சங்கங்களை உருவாக்கும் உரிமை (தொழிற்சங்கங்கள் மற்றும் அரசியல் கட்சிகள் உட்பட)",
            "பாதுகாப்பு, பொது ஒழுங்கு அல்லது ஒழுக்கத்தின் நலனுக்காக பாராளுமன்றம் கட்டுப்பாடுகளை விதிக்கலாம்",
            "அரசு ஊழியர்களின் சங்க சுதந்திரத்தை பாராளுமன்றம் கட்டுப்படுத்தலாம்"
          ]
        },
        {
          number: "11",
          title: "மத சுதந்திரம்",
          icon: Globe,
          summary: "ஒவ்வொரு நபருக்கும் தனது மதத்தை வெளிப்படுத்தவும் பின்பற்றவும் உரிமை உள்ளது.",
          points: [
            "எந்த மதத்தையும் வெளிப்படுத்தவும் பின்பற்றவும் சுதந்திரம்",
            "மத நம்பிக்கைகளை பரப்பும் உரிமை (முஸ்லிம்களிடம் பரப்புவதற்கான மாநில சட்ட கட்டுப்பாடுகளுக்கு உட்பட்டது)",
            "எந்த நபரும் தனது சொந்த மதம் அல்லாத மதத்திற்காக வரி செலுத்த கட்டாயப்படுத்தப்படக்கூடாது",
            "பெற்றோர்கள் தங்கள் குழந்தைகளின் மத வளர்ப்பை தீர்மானிக்க உரிமை உள்ளது (18 வயதுக்குட்பட்டவர்கள்)",
            "இஸ்லாம் கூட்டாட்சியின் மதம், ஆனால் மற்ற மதங்கள் அமைதியாகவும் இணக்கமாகவும் பின்பற்றப்படலாம்",
            "முஸ்லிம்களுக்கான சிறப்பு தகுதிகள்: இஸ்லாம் மதத்தை வெளிப்படுத்தும் நபர்களிடையே எந்த மத கோட்பாடு அல்லது நம்பிக்கையையும் பரப்புவதை மாநில சட்டம் கட்டுப்படுத்தலாம் அல்லது தடை செய்யலாம்",
            "முஸ்லிம்கள் தனிப்பட்ட மற்றும் குடும்ப சட்ட விஷயங்களில் ஷரியா சட்டத்திற்கு உட்பட்டவர்கள், ஷரியா நீதிமன்றங்களால் நிர்வகிக்கப்படுகின்றன",
            "இஸ்லாமில் இருந்து மாறுதல் (மதமாற்றம்) மாநில இஸ்லாமிய சட்டம் மற்றும் ஷரியா நீதிமன்ற நடைமுறைகளுக்கு உட்பட்டது"
          ]
        },
        {
          number: "12",
          title: "கல்வி தொடர்பான உரிமைகள்",
          icon: GraduationCap,
          summary: "கல்வி தொடர்பான உரிமைகள் மற்றும் கல்வி நிறுவனங்களில் பாகுபாட்டிலிருந்து பாதுகாப்பு.",
          points: [
            "மதம், இனம், வம்சாவளி அல்லது பிறந்த இடத்தின் அடிப்படையில் கல்வி நிறுவனங்களில் சேர்க்கையில் பாகுபாடு காட்டக்கூடாது",
            "குடிமக்கள் தங்கள் சொந்த மொழியில் குழந்தைகளின் கல்விக்காக நிறுவனங்களை நிறுவி பராமரிக்க உரிமை உள்ளது",
            "எந்த நபரும் தனது சொந்த மதம் அல்லாத மதத்தின் போதனை அல்லது சடங்கு அல்லது வழிபாட்டில் பங்கேற்க கட்டாயப்படுத்தப்படக்கூடாது",
            "கூட்டாட்சி அல்லது மாநிலம் இஸ்லாமிய நிறுவனங்களை நிறுவலாம் அல்லது பராமரிக்கலாம் அல்லது இஸ்லாமில் போதனை வழங்கலாம்",
            "கல்வி நிறுவனங்களுக்கு கூட்டாட்சி உதவிக்கான உரிமை"
          ]
        },
        {
          number: "13",
          title: "சொத்து உரிமைகள்",
          icon: Wallet,
          summary: "போதுமான இழப்பீடு இல்லாமல் சொத்தை கட்டாயமாக கையகப்படுத்துவதில் இருந்து பாதுகாப்பு.",
          points: [
            "சட்டத்தின்படி தவிர எந்த நபரும் சொத்து பறிக்கப்படக்கூடாது",
            "போதுமான இழப்பீடு இல்லாமல் கட்டாய கையகப்படுத்தலை எந்த சட்டமும் வழங்கக்கூடாது",
            "மலாய் இட ஒதுக்கீடு நிலத்தை மலாய் அல்லாதவர்களுக்கு மாற்றுவதில் கட்டுப்பாடு",
            "பொது நோக்கங்களுக்காக நிலத்தை கையகப்படுத்த மாநில அதிகாரம்",
            "போதுமான இழப்பீடு இல்லையென்றால் நீதிமன்றத்தில் எதிர்க்கும் உரிமை"
          ]
        }
      ],
      limitations: {
        title: "வரம்புகள் மற்றும் தகுதிகள்",
        intro: "இந்த அடிப்படை சுதந்திரங்கள் உத்தரவாதம் அளிக்கப்பட்டிருந்தாலும், அவை முழுமையானவை அல்ல. கூட்டாட்சி அரசியலமைப்பு சில சூழ்நிலைகளில் கட்டுப்பாடுகளை விதிக்க பாராளுமன்றத்தை அனுமதிக்கிறது:",
        points: [
          "கூட்டாட்சி அல்லது அதன் எந்த பகுதியின் பாதுகாப்பு",
          "பொது ஒழுங்கு அல்லது ஒழுக்கம்",
          "பாராளுமன்றம் அல்லது சட்டமன்றங்களின் சிறப்புரிமைகளின் பாதுகாப்பு",
          "நீதிமன்ற அவமதிப்பு",
          "அவதூறு அல்லது குற்றத்திற்கு தூண்டுதல்",
          "அவசரகால பிரகடனங்கள் (உறுப்பு 150)",
          "பாதுகாப்பு காரணங்களுக்காக தடுப்புக்காவல் (உறுப்பு 5 பாதுகாப்புகளுக்கு உட்பட்டது)"
        ]
      },
      importance: {
        title: "இந்த உரிமைகள் ஏன் முக்கியம்",
        content: "அடிப்படை சுதந்திரங்கள் மலேசியாவின் அரசியலமைப்பு ஜனநாயகத்தின் அடித்தளமாக உள்ளன. அவை தனிநபர்களை அரசு அதிகார துஷ்பிரயோகத்திலிருந்து பாதுகாக்கின்றன, மனித கண்ணியத்தை உறுதி செய்கின்றன, மற்றும் நியாயமான மற்றும் சமமான சமூகத்திற்கான அடித்தளத்தை உருவாக்குகின்றன. இந்த உரிமைகளைப் புரிந்துகொள்வது குடிமக்கள் அரசாங்கத்தை பொறுப்புக்கூற வைக்கவும் ஜனநாயக செயல்முறைகளில் அர்த்தமுள்ள வகையில் பங்கேற்கவும் அதிகாரமளிக்கிறது."
      }
    }
  };

  const currentContent = content[language];

  return (
    <>
      <PageMeta
        title="Fundamental Rights"
        description="Learn about the fundamental rights and liberties guaranteed to Malaysian citizens under the Federal Constitution. Part II Articles 5-13 explained."
        keywords="fundamental rights, Malaysian Constitution, civil liberties, human rights, Malaysian law, constitutional rights"
        url="https://myparliament.calmic.com.my/fundamental-rights"
      />
      <style>{`
        @media print {
          @page {
            size: A5;
            margin: 10mm;
          }

          body {
            font-size: 9pt;
            line-height: 1.3;
          }

          .print\\:hidden {
            display: none !important;
          }

          h1 {
            font-size: 14pt;
            margin-bottom: 4pt;
          }

          h2 {
            font-size: 11pt;
            margin-bottom: 3pt;
          }

          p {
            font-size: 8pt;
            margin-bottom: 4pt;
          }

          ul {
            margin: 0;
            padding-left: 12pt;
          }

          li {
            font-size: 8pt;
            margin-bottom: 2pt;
            page-break-inside: avoid;
          }

          .card {
            page-break-inside: avoid;
            margin-bottom: 6pt;
            border: 0.5pt solid #ccc;
          }

          /* Hide header navigation */
          header {
            display: none !important;
          }

          /* Compact spacing */
          * {
            box-shadow: none !important;
          }
        }
      `}</style>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8 md:px-6 lg:px-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Scale className="w-8 h-8 text-primary" />
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  {currentContent.title}
                </h1>
              </div>
              <p className="text-lg text-muted-foreground">
                {currentContent.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button
                variant={language === "en" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("en")}
                data-testid="button-lang-en"
              >
                English
              </Button>
              <Button
                variant={language === "bm" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("bm")}
                data-testid="button-lang-bm"
              >
                Bahasa Malaysia
              </Button>
              <Button
                variant={language === "zh" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("zh")}
                data-testid="button-lang-zh"
              >
                中文
              </Button>
              <Button
                variant={language === "ta" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("ta")}
                data-testid="button-lang-ta"
              >
                தமிழ்
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                data-testid="button-print"
              >
                <Printer className="w-4 h-4 mr-2" />
                {language === "en" ? "Print A5" : language === "bm" ? "Cetak A5" : language === "zh" ? "打印A5" : "அச்சிடு A5"}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {currentContent.intro.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {currentContent.intro.content}
              </p>
            </CardContent>
          </Card>

          {currentContent.articles.map((article, index) => {
            const Icon = article.icon;
            return (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-5 h-5 text-primary" />
                        <CardTitle className="text-xl">
                          {language === "en" ? "Article" : language === "bm" ? "Perkara" : language === "zh" ? "第" : "உறுப்பு"} {article.number}{language === "zh" ? "条" : ""}: {article.title}
                        </CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground italic mt-2">
                        {article.summary}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {article.points.map((point, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-primary font-bold mt-0.5">•</span>
                        <span className="flex-1 text-sm leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {currentContent.limitations.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                {currentContent.limitations.intro}
              </p>
              <ul className="space-y-2">
                {currentContent.limitations.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-primary font-bold mt-0.5">•</span>
                    <span className="flex-1 text-sm leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5" />
                {currentContent.importance.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {currentContent.importance.content}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
    </>
  );
}
