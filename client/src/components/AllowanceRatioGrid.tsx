import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface AllowanceRatioGridProps {
  allowancePerSpeech: number;
  allowancePerBill: number;
  allowancePerQuestion: number;
  allowancePerCommittee: number;
  speeches: number;
  bills: number;
  questions: number;
  committees: number;
}

export function AllowanceRatioGrid({
  allowancePerSpeech,
  allowancePerBill,
  allowancePerQuestion,
  allowancePerCommittee,
  speeches,
  bills,
  questions,
  committees,
}: AllowanceRatioGridProps) {
  const ratios = [
    {
      label: "Cost per Speech",
      value: allowancePerSpeech,
      count: speeches,
      icon: "📢",
      color: "bg-blue-50 border-blue-200",
      textColor: "text-blue-700",
      trend: allowancePerSpeech < 5000 ? "down" : "up",
    },
    {
      label: "Cost per Bill",
      value: allowancePerBill,
      count: bills,
      icon: "📋",
      color: "bg-green-50 border-green-200",
      textColor: "text-green-700",
      trend: allowancePerBill > 100000 ? "up" : "down",
    },
    {
      label: "Cost per Question",
      value: allowancePerQuestion,
      count: questions,
      icon: "❓",
      color: "bg-amber-50 border-amber-200",
      textColor: "text-amber-700",
      trend: allowancePerQuestion < 3000 ? "down" : "up",
    },
    {
      label: "Cost per Committee",
      value: allowancePerCommittee,
      count: committees,
      icon: "👥",
      color: "bg-purple-50 border-purple-200",
      textColor: "text-purple-700",
      trend: allowancePerCommittee > 50000 ? "up" : "down",
    },
  ];

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle>Cost-per-Output Ratios</CardTitle>
        <CardDescription>Annual allowance divided by MP outputs</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ratios.map((ratio) => (
            <div key={ratio.label} className={`p-4 rounded-lg border-2 ${ratio.color}`}>
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{ratio.icon}</span>
                {ratio.trend === "down" ? (
                  <TrendingDown className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-red-600" />
                )}
              </div>
              <div className="mb-2">
                <p className="text-sm text-gray-600">{ratio.label}</p>
                <p className={`text-xl font-bold ${ratio.textColor}`}>RM {ratio.value.toLocaleString()}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {ratio.count} {ratio.label.split(" ").pop()}
                {ratio.count !== 1 ? "s" : ""}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
