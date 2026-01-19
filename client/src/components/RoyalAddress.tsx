import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/i18n/LanguageContext";
import { Crown } from "lucide-react";

export function RoyalAddress() {
  const { t } = useLanguage();

  return (
    <Card className="border-primary/20 bg-primary/5 mb-8 overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-primary/10 px-6 py-4 flex items-center justify-between border-b border-primary/10">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-full">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-primary">Royal Address</h2>
              <p className="text-sm text-muted-foreground">His Majesty Sultan Ibrahim XVII • 19 January 2026</p>
            </div>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 uppercase tracking-wider font-semibold">
            Fifth Session • 15th Parliament
          </Badge>
        </div>
        
        <ScrollArea className="h-[400px] w-full">
          <div className="px-8 py-8 prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed">
            <div className="text-center mb-10 space-y-2">
              <p className="font-semibold text-lg italic">Assalamualaikum Warahmatullah Wabarakatuh.</p>
              <p className="text-muted-foreground italic text-sm">In the name of Allah, the Most Gracious, the Most Merciful. All praise is due to Allah, Lord of all the Worlds. May blessings and peace be upon the noblest of Messengers, our Prophet Muhammad (SAW), his family and his companions.</p>
            </div>

            <p className="mb-6 font-medium">Honourable President of the Senate, Speaker of the House of Representatives, Members of the Senate and House of Representatives, esteemed Ladies and Gentlemen.</p>
            
            <p className="mb-8 italic border-l-4 border-primary/20 pl-4 py-1">Alhamdulillah, I give thanks to Allah Subhanahu Wata’ala for it is by His grace and permission, I am able to be present today at the Opening of the Fifth Session of the Fifteenth Parliament on this blessed morning.</p>

            <div className="space-y-6">
              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">1.</span>
                <p>Firstly, I extend my congratulations on Malaysia’s success as ASEAN Chair last year, and on the hosting of the 47th ASEAN Summit in Kuala Lumpur.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">2.</span>
                <p>I also commend the nation’s achievements. Despite the challenges faced by the world, Malaysia registered a positive economic growth of 4.7 percent from January to September last year. Unemployment and inflation remained low, and the rate of hardcore poverty stood at 0.09 percent.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">3.</span>
                <p>This year marks the beginning of the Thirteenth Malaysia Plan. I expect this Plan to focus on the well-being of the people, especially in the areas of education, housing, healthcare and public transport.</p>
              </div>

              <div className="flex gap-4 bg-red-500/5 p-4 rounded-lg border border-red-500/10">
                <span className="font-bold text-red-600 dark:text-red-400 shrink-0">4.</span>
                <p className="font-semibold text-red-700 dark:text-red-300">I must remind this House that no plan can succeed if corrupt practices continue to be widespread.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">5.</span>
                <p>I have stated before that I came to Kuala Lumpur to root out the corrupt, and it appears that they have been uncovered.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">6.</span>
                <p>I am deeply disappointed that corruption has occurred within the Malaysian Armed Forces even at the highest levels.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">7.</span>
                <p>This is but the tip of the iceberg. I am certain that many more will be uncovered, whether in the Customs, Immigration and Police Departments or elsewhere, including within this House. They will be pursued until they are exposed.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">8.</span>
                <p>Corruption must be fought decisively. People should be the eyes and ears of the nation and report all forms of corruption. It is not only the recipients of bribes who should be investigated, but bribers and the agents abetting them must also be held accountable.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">9.</span>
                <p>The Malaysian Anti-Corruption Commission (MACC) must carry out investigations swiftly and thoroughly, regardless of rank or position. The Government should appoint experienced judges and establish special lane court so that corruption trials may be expedited and concluded without delay.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">10.</span>
                <p>To all Honourable Members and civil servants, bear in mind that the positions you hold are a trust owed to the people and the nation. If you abuse power, misappropriate public funds, accept bribes or conspire to protect the corrupt, you are a traitor to the country.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">11.</span>
                <p>In addition, the nation faces modern threats to digital security and information integrity, including deepfake technology, which may enable fraud and undermine social stability.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">12.</span>
                <p>Threats posed by serious crimes, violence and acts involving 3R matters must also be dealt with firmly and effectively.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">13.</span>
                <p>Accordingly, laws relating to domestic security and external threats should be enacted urgently to preserve harmony among all races and safeguard the sovereignty of the nation.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">14.</span>
                <p>I welcome the efforts to strengthen laws relating to the electoral process, democratic institutions and political funding.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">15.</span>
                <p>These include initiatives limiting the Prime Minister’s tenure to two terms or ten years, separating the roles of the Attorney General and the Public Prosecutor, introducing a Freedom of Information Act and establishing the office of Ombudsman.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">16.</span>
                <p>The national education system must also continue to be strengthened as the foundation for nation-building, national identity and the country’s future.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">17.</span>
                <p>If a new education system is to be introduced, it must be aligned with the National Education Policy, and the Malay language must be the primary language as it is the national language.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">18.</span>
                <p>Any proposal to recognise any other education system must uphold the status of the Malay language and the history of Malaysia.</p>
              </div>
            </div>

            <div className="mt-8 mb-6 font-semibold border-t pt-8">
              <p>Honourable Members,</p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">19.</span>
                <p>The foundation of Malaysia lies in the Malaysia Agreement 1963, which brought together Malaya, Sabah and Sarawak as one nation.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">20.</span>
                <p>It is imperative that we return to the original intent behind the formation of Malaysia, founded on the principles of unity, mutual respect and close cooperation between the states and the Federal Government.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">21.</span>
                <p>Honourable Members must exercise greater caution, so as not to incite discord and give rise to hostility between regions. Any differences in views should be resolved with maturity, not through hatred or suspicion.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">22.</span>
                <p>State rights must always be respected. However, the shared interests of Malaysia should be the foremost priority.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">23.</span>
                <p>I also wish to remind Honourable Members that every debate, decision and vote in this House is not merely a political party position. It will determine the future of the nation.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">24.</span>
                <p>Therefore, fulfill your obligations with integrity, wisdom and responsibility in the interest of all Malaysians.</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">25.</span>
                <p>Finally, let us all pray Malaysia will continue to progress and prosper, remain peaceful and harmonious and that all her people may enjoy a life of fulfilment, happiness and prosperity.</p>
              </div>
            </div>

            <div className="mt-12 text-right italic font-medium space-y-1">
              <p>Sekian,</p>
              <p>Wabillahi Taufik Wal Hidayah,</p>
              <p>Wassalamualaikum Warahmatullah Wabarakatuh.</p>
            </div>
          </div>
        </ScrollArea>
        
        <div className="px-6 py-3 bg-primary/5 text-center border-t border-primary/10">
          <p className="text-xs text-muted-foreground font-medium">Delivered at the Opening of the Fifth Session of the Fifteenth Parliament</p>
        </div>
      </CardContent>
    </Card>
  );
}
