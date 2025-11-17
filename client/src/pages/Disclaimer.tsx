import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-primary/10">
            <AlertCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Disclaimer & Data Methodology</h1>
            <p className="text-muted-foreground mt-1">
              Important information about data sources and limitations
            </p>
          </div>
        </div>

        <Card className="p-8">
          <div className="prose prose-sm max-w-none">
            <p className="text-base mb-6">
              Welcome to MyParliament. This dashboard is an independent, data-driven initiative designed to provide transparency and insights into the performance of Malaysian Members of Parliament (MPs). Please read the following carefully.
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">1. Nature of Information</h2>
              <p className="mb-3">
                The metrics, scores, and analysis presented on this site are generated automatically based on data aggregation and algorithmic processing. They are intended for informational and educational purposes only.
              </p>
              <p>
                This site is an analytical tool, not a definitive report card. Parliamentary performance is multi-faceted and cannot be fully captured by quantitative metrics alone.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">2. Data Sources & Limitations</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Primary Source:</h3>
                  <p>
                    Our primary data is sourced from the official reports and Hansards of the Malaysian Parliament. While we strive for accuracy, the availability and consistency of the source data are beyond our control.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Media Sources:</h3>
                  <p>
                    We supplement parliamentary data with information from publicly available news articles. The inclusion of news reports allows us to track MPs' public engagement and policy influence but may reflect media bias or coverage frequency.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Inherent Biases:</h3>
                  <p>
                    All data sources contain inherent biases. Parliamentary procedures may favour certain roles (e.g., Ministers), and media coverage is not uniform. Our algorithms are designed to mitigate, but not eliminate, these biases.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">3. No Warranty and Limitation of Liability</h2>
              <p className="mb-3">
                The information is provided on an "as is" basis. We make no warranties, expressed or implied, regarding its completeness, accuracy, or timeliness.
              </p>
              <p>
                MyParliament and its creators shall not be held liable for any decision, action, or inaction taken based on the information presented on this website. Users are encouraged to consult primary sources for official purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">4. Subjectivity of Metrics</h2>
              <p>
                The "performance" metrics are based on our defined methodology (e.g., participation, questions asked, media mentions). Different methodologies would yield different results. These metrics should not be interpreted as the sole measure of an MP's effectiveness, dedication, or worth.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">5. Independence</h2>
              <p>
                This is an independent project and is not affiliated with, endorsed by, or funded by the Parliament of Malaysia, any political party, or government agency.
              </p>
            </section>

            <div className="mt-8 p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
              <p className="text-sm font-medium">
                By using this site, you acknowledge and agree to these terms.
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
