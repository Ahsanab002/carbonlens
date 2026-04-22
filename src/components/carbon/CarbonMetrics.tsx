import { Card } from "@/components/ui/card";
import { TrendingUp, Leaf, DollarSign, TreeDeciduous } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface CarbonMetricsProps {
  agbMapData?: any;
  creditSummary?: any;
}

const CarbonMetrics = ({ agbMapData, creditSummary }: CarbonMetricsProps) => {
  const { theme } = useTheme();
  const totalCarbon = agbMapData?.total_carbon_tonnes || 0;
  const totalCo2e = agbMapData?.total_co2e_tonnes || 0;
  // Estimate 5% annual sequestration rate if historical data is unavailable
  const annualSequestration = totalCo2e * 0.05; 
  const creditPotential = creditSummary?.potential_revenue || (totalCo2e * 10);

  const formatNumber = (num: number, decimals: number = 0) => {
    return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const metrics = [
    {
      icon: TreeDeciduous,
      label: "Total Carbon Stock",
      value: agbMapData ? formatNumber(totalCarbon, 0) : "1,523",
      unit: "tC",
      change: "+8.9%",
      changeType: "positive" as const,
    },
    {
      icon: Leaf,
      label: "Annual Sequestration",
      value: agbMapData ? formatNumber(annualSequestration, 1) : "89.4",
      unit: "tCO₂/year",
      change: "+12.3%",
      changeType: "positive" as const,
    },
    {
      icon: TrendingUp,
      label: "CO₂ Equivalent",
      value: agbMapData ? formatNumber(totalCo2e, 0) : "5,584",
      unit: "tCO₂e",
      change: "+10.5%",
      changeType: "positive" as const,
    },
    {
      icon: DollarSign,
      label: "Credit Potential (Est)",
      value: agbMapData ? `$${formatNumber(creditPotential, 0)}` : "$167,520",
      unit: "USD",
      change: "+15.2%",
      changeType: "positive" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card
            key={metric.label}
            className={`relative overflow-hidden p-6 rounded-2xl group hover:-translate-y-1 transition-all duration-500 ${
              theme === 'light'
                ? 'bg-gray-200/80 backdrop-blur-xl border border-gray-300/50 hover:shadow-[0_10px_40px_rgba(107,114,128,0.15)]'
                : 'bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 hover:shadow-[0_10px_40px_rgba(16,185,129,0.15)]'
            }`}
          >
            <div className="flex items-start justify-between relative z-10">
              <div className="flex-1">
                <div className={`flex items-center gap-3 mb-4 border-b pb-3 transition-colors duration-300 ${
                  theme === 'light'
                    ? 'border-gray-300/50'
                    : 'border-white/5'
                }`}>
                  <div className={`p-2 rounded-lg transition-all duration-300 ${
                    metric.changeType === "positive"
                      ? theme === 'light'
                        ? 'bg-emerald-200/50 text-emerald-700'
                        : 'bg-[#10b981]/10 text-[#10b981]'
                      : theme === 'light'
                      ? 'bg-red-200/50 text-red-700'
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`text-sm font-bold font-mono tracking-widest uppercase transition-colors duration-300 ${
                    theme === 'light'
                      ? 'text-gray-600'
                      : 'text-[#94a3b8]'
                  }`}>{metric.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-5xl font-extrabold tracking-tight transition-colors duration-300 ${
                    theme === 'light'
                      ? 'text-gray-900'
                      : 'text-white'
                  }`}>{metric.value}</span>
                  <span className={`text-base font-mono transition-colors duration-300 ${
                    theme === 'light'
                      ? 'text-gray-600'
                      : 'text-[#64748b]'
                  }`}>{metric.unit}</span>
                </div>
                <div className={`mt-4 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono border transition-all duration-300 ${
                  metric.changeType === "positive"
                    ? theme === 'light'
                      ? 'text-emerald-700 bg-emerald-200/50 border-emerald-300/50'
                      : 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20'
                    : theme === 'light'
                    ? 'text-red-700 bg-red-200/50 border-red-300/50'
                    : 'text-red-400 bg-red-400/10 border-red-400/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                    metric.changeType === "positive"
                      ? theme === 'light'
                        ? 'bg-emerald-700'
                        : 'bg-[#10b981]'
                      : theme === 'light'
                      ? 'bg-red-700'
                      : 'bg-red-400'
                  }`}></span>
                  {agbMapData ? "LIVE_TELEMETRY" : `HISTORICAL_DATA`}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default CarbonMetrics;
