import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import federalConstitutionPdf from "@assets/Federal Constitution (Reprint 2020)_1763559512512.pdf";

export default function Constitution() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Scale className="w-8 h-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-constitution-title">
                Federal Constitution
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Malaysia's supreme law
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <CardTitle className="text-2xl" data-testid="text-federal-constitution-title">
                    Federal Constitution (Reprint 2020)
                  </CardTitle>
                  <CardDescription>
                    The supreme law of Malaysia, as at 15 October 2020
                  </CardDescription>
                </div>
                <Badge variant="secondary">17,558 lines</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[calc(100vh-300px)] min-h-[600px] border rounded-md overflow-hidden">
                <iframe
                  src={federalConstitutionPdf}
                  className="w-full h-full"
                  title="Federal Constitution of Malaysia"
                  data-testid="pdf-viewer-constitution"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                First introduced as the Constitution of the Federation of Malaya on Merdeka Day (31 August 1957).
                Subsequently introduced as the Constitution of Malaysia on Malaysia Day (16 September 1963).
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
