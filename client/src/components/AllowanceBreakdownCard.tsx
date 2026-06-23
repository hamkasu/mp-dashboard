/**
 * Phase 5: Allowance Breakdown Card
 * Shows how total allowance is distributed across different sources
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { DollarSign } from "lucide-react";

interface AllowanceBreakdownCardProps {
  mpName: string;
  annualAllowance: number;
  mpAllowance?: number;
  ministerSalary?: number;
  entertainmentAllowance?: number;
  handphoneAllowance?: number;
  computerAllowance?: number;
  dressWearAllowance?: number;
  parliamentSittingAllowance?: number;
}

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#06b6d4'];

export function AllowanceBreakdownCard({
  mpName,
  annualAllowance,
  mpAllowance = 120000,
  ministerSalary = 0,
  entertainmentAllowance = 30000,
  handphoneAllowance = 24000,
  computerAllowance = 72000,
  dressWearAllowance = 12000,
  parliamentSittingAllowance = 28000,
}: AllowanceBreakdownCardProps) {
  const data = [
    { name: 'Base Allowance', value: mpAllowance, percentage: Math.round((mpAllowance / annualAllowance) * 100) },
    ...(ministerSalary > 0 ? [{ name: 'Minister Salary', value: ministerSalary, percentage: Math.round((ministerSalary / annualAllowance) * 100) }] : []),
    { name: 'Entertainment', value: entertainmentAllowance, percentage: Math.round((entertainmentAllowance / annualAllowance) * 100) },
    { name: 'Phone', value: handphoneAllowance, percentage: Math.round((handphoneAllowance / annualAllowance) * 100) },
    { name: 'Computer', value: computerAllowance, percentage: Math.round((computerAllowance / annualAllowance) * 100) },
    { name: 'Dress', value: dressWearAllowance, percentage: Math.round((dressWearAllowance / annualAllowance) * 100) },
    { name: 'Sitting', value: parliamentSittingAllowance, percentage: Math.round((parliamentSittingAllowance / annualAllowance) * 100) },
  ];

  const totalDisplayed = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              {mpName}'s Annual Allowance
            </CardTitle>
            <CardDescription>Breakdown by allowance source</CardDescription>
          </div>
          <Badge className="bg-blue-600 text-white text-lg px-4 py-2">
            RM {(annualAllowance / 1000).toFixed(0)}K
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Pie Chart */}
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percentage }) => `${percentage}%`}
                outerRadius={80}
                fill="#3b82f6"
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `RM ${(value as number).toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown Table */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900 mb-3">Detailed Breakdown</h4>
          <div className="space-y-2">
            {data.map((item) => (
              <div key={item.name} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[data.indexOf(item) % COLORS.length] }}></div>
                  <span className="font-medium text-gray-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">RM {item.value.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">{item.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="p-4 bg-blue-100 border-2 border-blue-300 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-900">Total Annual Allowance</span>
            <span className="text-2xl font-bold text-blue-700">RM {annualAllowance.toLocaleString()}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Average monthly: RM {Math.round(annualAllowance / 12).toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
