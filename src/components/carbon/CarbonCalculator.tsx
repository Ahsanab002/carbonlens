import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";

interface CarbonCalculatorProps {
  agbMapData?: any;
}

const CarbonCalculator = ({ agbMapData }: CarbonCalculatorProps) => {
  const { theme } = useTheme();
  const [bufferPercent, setBufferPercent] = useState("20");
  const [pricePerCredit, setPricePerCredit] = useState("10");

  const [results, setResults] = useState({
    carbonStock: "0.00",
    co2Equivalent: "0.00",
    netCredits: "0.00",
    creditValue: "0.00"
  });

  useEffect(() => {
    if (agbMapData) {
      const buffer = parseFloat(bufferPercent) || 0;
      const price = parseFloat(pricePerCredit) || 0;
      const totalCarbon = agbMapData.total_carbon_tonnes || 0;
      const totalCo2e = agbMapData.total_co2e_tonnes || 0;

      const netCredits = totalCo2e * (1 - (buffer / 100));
      const value = netCredits * price;

      setResults({
        carbonStock: totalCarbon.toFixed(2),
        co2Equivalent: totalCo2e.toFixed(2),
        netCredits: netCredits.toFixed(2),
        creditValue: value.toFixed(2) // Format to 2 decimal places with commas manually later or here
      });
    } else {
      setResults({
        carbonStock: "0.00",
        co2Equivalent: "0.00",
        netCredits: "0.00",
        creditValue: "0.00"
      });
    }
  }, [agbMapData, bufferPercent, pricePerCredit]);

  return (
    <Card className={`p-6 backdrop-blur-2xl rounded-2xl relative overflow-hidden group transition-colors duration-300 ${
      theme === 'light'
        ? 'bg-gray-100/80 border border-gray-300/50 shadow-[0_0_40px_rgba(107,114,128,0.1)]'
        : 'bg-black/60 border border-white/10 shadow-[0_0_40px_rgba(16,185,129,0.1)]'
    }`}>
      <div className={`absolute top-0 right-0 w-32 h-32 blur-[50px] rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none ${
        theme === 'light'
          ? 'bg-emerald-200/20'
          : 'bg-[#10b981]/10'
      }`}></div>
      
      <div className={`flex items-center gap-3 mb-6 border-b pb-4 relative z-10 transition-colors duration-300 ${
        theme === 'light'
          ? 'border-gray-300/50'
          : 'border-white/5'
      }`}>
        <div className={`p-2 rounded-lg transition-colors duration-300 ${
          theme === 'light'
            ? 'bg-emerald-200/50 text-emerald-700'
            : 'bg-[#10b981]/10 text-[#10b981]'
        }`}>
          <Calculator className="h-5 w-5" />
        </div>
        <h3 className={`text-xl font-bold tracking-wide transition-colors duration-300 ${
          theme === 'light'
            ? 'text-gray-900'
            : 'text-white'
        }`}>Value Calculator Matrix</h3>
      </div>
      
      {!agbMapData && (
        <div className={`text-xs font-mono font-bold p-3 rounded-lg mb-6 flex items-center gap-3 relative z-10 border transition-colors duration-300 ${
          theme === 'light'
            ? 'text-amber-700 bg-amber-200/30 border-amber-300/50'
            : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
        }`}>
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
          AWAITING_TELEMETRY_DATA_FOR_CALCULATION
        </div>
      )}
      
      <div className="space-y-6 relative z-10">
        <div className="space-y-3">
          <Label htmlFor="buffer" className={`text-xs font-mono font-bold tracking-widest transition-colors duration-300 ${
            theme === 'light'
              ? 'text-gray-700'
              : 'text-[#94a3b8]'
          }`}>BUFFER_RESERVE_PCT</Label>
          <div className={`flex items-center gap-4 p-3 rounded-xl border transition-colors duration-300 ${
            theme === 'light'
              ? 'bg-gray-200/50 border-gray-300/50'
              : 'bg-black/40 border-white/5'
          }`}>
              <Input
                id="buffer"
                type="range"
                min="0"
                max="50"
                value={bufferPercent}
                onChange={(e) => setBufferPercent(e.target.value)}
                className="w-full flex-1 accent-[#10b981]"
                disabled={!agbMapData}
              />
              <span className={`w-16 text-lg font-mono font-bold py-1 px-2 rounded text-center transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-emerald-700 bg-emerald-200/50'
                  : 'text-[#10b981] bg-[#10b981]/10'
              }`}>{bufferPercent}%</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <Label htmlFor="price" className={`text-xs font-mono font-bold tracking-widest transition-colors duration-300 ${
            theme === 'light'
              ? 'text-gray-700'
              : 'text-[#94a3b8]'
          }`}>CREDIT_VALUATION_USD</Label>
          <div className="relative">
            <span className={`absolute left-4 top-3 font-mono font-bold transition-colors duration-300 ${
              theme === 'light'
                ? 'text-emerald-700'
                : 'text-[#10b981]'
            }`}>$</span>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.5"
              value={pricePerCredit}
              onChange={(e) => setPricePerCredit(e.target.value)}
              className={`pl-8 font-mono text-lg font-bold h-12 focus-visible:ring-[#10b981] transition-colors duration-300 ${
                theme === 'light'
                  ? 'bg-gray-200/50 border-gray-300/50 text-gray-900'
                  : 'bg-black/40 border-white/5 text-white'
              }`}
              disabled={!agbMapData}
            />
          </div>
        </div>

        <div className={`space-y-3 pt-6 border-t mt-6 transition-colors duration-300 ${
          theme === 'light'
            ? 'border-gray-300/50'
            : 'border-white/10'
        }`}>
          <div className={`flex justify-between items-center p-3 rounded-lg border transition-colors duration-300 ${
            theme === 'light'
              ? 'bg-gray-200/50 border-gray-300/50'
              : 'bg-black/30 border-white/5'
          }`}>
            <span className={`text-xs font-mono font-bold transition-colors duration-300 ${
              theme === 'light'
                ? 'text-gray-700'
                : 'text-[#64748b]'
            }`}>GROSS_CARBON_MASS</span>
            <span className={`font-mono text-lg font-bold transition-colors duration-300 ${
              theme === 'light'
                ? 'text-gray-900'
                : 'text-[#e2e8f0]'
            }`}>{results.carbonStock} <span className={`text-sm transition-colors duration-300 ${
              theme === 'light'
                ? 'text-gray-600'
                : 'text-[#64748b]'
            }`}>tC</span></span>
          </div>
          <div className={`flex justify-between items-center p-3 rounded-lg border transition-colors duration-300 ${
            theme === 'light'
              ? 'bg-gray-200/50 border-gray-300/50'
              : 'bg-black/30 border-white/5'
          }`}>
            <span className={`text-xs font-mono font-bold transition-colors duration-300 ${
              theme === 'light'
                ? 'text-gray-700'
                : 'text-[#64748b]'
            }`}>CO2_EQUIVALENT</span>
            <span className={`font-mono text-lg font-bold transition-colors duration-300 ${
              theme === 'light'
                ? 'text-gray-900'
                : 'text-[#e2e8f0]'
            }`}>{results.co2Equivalent} <span className={`text-sm transition-colors duration-300 ${
              theme === 'light'
                ? 'text-gray-600'
                : 'text-[#64748b]'
            }`}>tCO₂e</span></span>
          </div>
          <div className={`flex justify-between items-center p-3 rounded-lg border transition-colors duration-300 ${
            theme === 'light'
              ? 'bg-emerald-200/30 border-emerald-300/50 text-emerald-700'
              : 'bg-black/30 border-white/5 text-[#10b981]'
          }`}>
            <span className={`text-xs font-mono font-bold transition-colors duration-300 ${
              theme === 'light'
                ? 'text-emerald-700'
                : 'text-[#10b981]'
            }`}>TRADEABLE_UNITS</span>
            <span className={`font-mono text-lg font-bold transition-colors duration-300 ${
              theme === 'light'
                ? 'text-emerald-700'
                : 'text-[#10b981]'
            }`}>{results.netCredits}</span>
          </div>
          <div className={`flex justify-between items-center p-4 rounded-xl border shadow-[0_0_20px_rgba(16,185,129,0.1)] mt-4 transition-all duration-300 ${
            theme === 'light'
              ? 'bg-emerald-200/30 border-emerald-300/50'
              : 'bg-gradient-to-r from-[#10b981]/20 to-[#0ea5e9]/20 border-[#10b981]/30'
          }`}>
            <span className={`text-xs font-mono font-bold tracking-widest drop-shadow-sm transition-colors duration-300 ${
              theme === 'light'
                ? 'text-emerald-700'
                : 'text-[#10b981]'
            }`}>EST_YIELD</span>
            <span className={`font-extrabold text-2xl tracking-tight drop-shadow-md transition-all duration-300 ${
              theme === 'light'
                ? 'text-emerald-700'
                : 'text-transparent bg-clip-text bg-gradient-to-r from-[#34d399] to-[#0ea5e9]'
            }`}>$${Number(results.creditValue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CarbonCalculator;
