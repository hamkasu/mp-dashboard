import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { AllowanceBreakdownCard } from "@/components/AllowanceBreakdownCard";
import { AllowanceRatioGrid } from "@/components/AllowanceRatioGrid";
import { Button } from "@/components/ui/button";

interface MPAllowanceData {
  id: string;
  name: string;
  party: string;
  state: string;
  annualAllowance: number;
  allowancePerSpeech: number;
  allowancePerBill: number;
  allowancePerQuestion: number;
  allowancePerCommittee: number;
  roiScore: number;
  roiGrade: string;
  speeches: number;
  bills: number;
  questions: number;
  committees: number;
  mpAllowance: number;
  ministerSalary: number;
  entertainmentAllowance: number;
  handphoneAllowance: number;
  computerAllowance: number;
  dressWearAllowance: number;
  parliamentSittingAllowance: number;
}

export function MPAllowanceBreakdown() {
  const { mpId } = useParams<{ mpId: string }>();
  const [, setLocation] = useLocation();
  const [mpData, setMpData] = useState<MPAllowanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mpId) return;

    async function fetchMPData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/mps/${mpId}/allowance-breakdown`);
        if (!response.ok) {
          throw new Error("Failed to fetch MP allowance data");
        }
        const data = await response.json();
        setMpData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setMpData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchMPData();
  }, [mpId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-600">Loading MP allowance data...</div>
      </div>
    );
  }

  if (error || !mpData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="outline" onClick={() => setLocation("/allowance-analysis")} className="mb-6">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="text-center text-red-600">{error || "MP data not found"}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="outline" onClick={() => setLocation("/allowance-analysis")} className="mb-6">
        <ChevronLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{mpData.name}</h1>
        <p className="text-lg text-gray-600">{mpData.party} • {mpData.state}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-lg border-2 border-purple-200">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">ROI Score</h3>
          <p className="text-4xl font-bold text-purple-700 mb-2">{mpData.roiScore}</p>
          <div className={`inline-block px-4 py-2 rounded-lg font-bold text-white ${
            mpData.roiGrade === 'A' ? 'bg-green-600' :
            mpData.roiGrade === 'B' ? 'bg-blue-600' :
            mpData.roiGrade === 'C' ? 'bg-amber-600' :
            mpData.roiGrade === 'D' ? 'bg-orange-600' :
            'bg-red-600'
          }`}>
            Grade {mpData.roiGrade}
          </div>
        </div>

        <div className="lg:col-span-1 bg-white p-6 rounded-lg border-2 border-blue-200">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Annual Allowance</h3>
          <p className="text-3xl font-bold text-blue-700 mb-2">RM {mpData.annualAllowance.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Monthly: RM {Math.round(mpData.annualAllowance / 12).toLocaleString()}</p>
        </div>

        <div className="lg:col-span-1 bg-white p-6 rounded-lg border-2 border-green-200">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Total Outputs</h3>
          <p className="text-3xl font-bold text-green-700">{mpData.speeches + mpData.bills + mpData.questions}</p>
          <p className="text-sm text-gray-600 mt-2">
            {mpData.speeches} speeches • {mpData.bills} bills • {mpData.questions} questions
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <AllowanceBreakdownCard
          mpName={mpData.name}
          annualAllowance={mpData.annualAllowance}
          mpAllowance={mpData.mpAllowance}
          ministerSalary={mpData.ministerSalary}
          entertainmentAllowance={mpData.entertainmentAllowance}
          handphoneAllowance={mpData.handphoneAllowance}
          computerAllowance={mpData.computerAllowance}
          dressWearAllowance={mpData.dressWearAllowance}
          parliamentSittingAllowance={mpData.parliamentSittingAllowance}
        />

        <AllowanceRatioGrid
          allowancePerSpeech={mpData.allowancePerSpeech}
          allowancePerBill={mpData.allowancePerBill}
          allowancePerQuestion={mpData.allowancePerQuestion}
          allowancePerCommittee={mpData.allowancePerCommittee}
          speeches={mpData.speeches}
          bills={mpData.bills}
          questions={mpData.questions}
          committees={mpData.committees}
        />
      </div>
    </div>
  );
}
