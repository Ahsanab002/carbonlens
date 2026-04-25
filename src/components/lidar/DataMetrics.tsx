import { Card } from "@/components/ui/card";
import { Activity, TreePine, Layers } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface DataMetricsProps {
  dataset: any;
  compartments: any[];
  selectedPoint?: any;
  totalArea: number;
}

const DataMetrics = ({ dataset, compartments, selectedPoint, totalArea }: DataMetricsProps) => {
  const { theme } = useTheme();
  const pointDensity = dataset?.avg_point_density ?? 0;
  const avgTreeHeight = compartments.length
    ? compartments.reduce((sum, comp) => sum + (comp.properties.canopy_height_mean || 0), 0) / compartments.length
    : Math.min((dataset.max_height - dataset.min_height) * 0.65, 22);
  const canopyCover = compartments.length
    ? compartments.reduce((sum, comp) => sum + (comp.properties.canopy_cover_percent || 0), 0) / compartments.length
    : Math.min((dataset?.avg_point_density ?? 0) / 150 * 100, 85);
  const metrics = [
    { icon: Activity, label: "Point Density", value: pointDensity.toFixed(1), unit: "pts/m²" },
    { icon: TreePine, label: "Avg Canopy Height", value: avgTreeHeight.toFixed(1), unit: "m" },
    { icon: Layers, label: "Canopy Cover", value: canopyCover.toFixed(1), unit: "%" },
    { icon: Layers, label: "Dataset Area", value: totalArea.toFixed(2), unit: "ha" },
  ];
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-2 text-foreground px-2">Live Metrics</h3>
      <div className="grid grid-cols-1 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className={`relative overflow-hidden p-6 rounded-2xl group transition-all duration-500 hover:-translate-y-1 ${theme === 'light' ? 'bg-gray-200/80 backdrop-blur-xl border border-gray-300/50' : 'bg-[#0f172a]/60 backdrop-blur-xl border border-white/5'}`}>
              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1">
                  <div className={`flex items-center gap-3 mb-4 border-b pb-3 ${theme === 'light' ? 'border-gray-300/50' : 'border-white/5'}`}>
                    <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-emerald-200/50 text-emerald-700' : 'bg-[#10b981]/10 text-[#10b981]'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`text-sm font-bold font-mono tracking-widest uppercase ${theme === 'light' ? 'text-gray-600' : 'text-[#94a3b8]'}`}>{metric.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-5xl font-extrabold tracking-tight ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{metric.value}</span>
                    <span className={`text-base font-mono ${theme === 'light' ? 'text-gray-600' : 'text-[#64748b]'}`}>{metric.unit}</span>
                  </div>
                  <div className={`mt-4 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono border ${theme === 'light' ? 'text-emerald-700 bg-emerald-200/50 border-emerald-300/50' : 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${theme === 'light' ? 'bg-emerald-700' : 'bg-[#10b981]'}`}></span>
                    LIVE_TELEMETRY
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DataMetrics;