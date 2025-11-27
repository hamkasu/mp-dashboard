/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Shield, Home, MessageCircle, Globe, GraduationCap, Wallet, Printer } from "lucide-react";

export default function FundamentalRights() {
  const { language: contextLanguage } = useLanguage();
  const [language, setLanguage] = useState<"en" | "bm">(contextLanguage === "ms" ? "bm" : "en");

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
            "Citizens have the right to establish and maintain institutions for education of children in their own language",
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
    }
  };

  const currentContent = content[language];

  return (
    <>
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
            <div className="flex gap-2 print:hidden">
              <Button
                variant={language === "en" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("en")}
              >
                English
              </Button>
              <Button
                variant={language === "bm" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("bm")}
              >
                Bahasa Malaysia
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4 mr-2" />
                {language === "en" ? "Print A5" : "Cetak A5"}
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
                          {language === "en" ? "Article" : "Perkara"} {article.number}: {article.title}
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
