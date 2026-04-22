import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Activity, BarChart3, Loader2 } from "lucide-react";
import { lidarApi, LidarDataset, GenerateAgbMapResponse } from "@/services/lidarApi";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const Analytics = () => {
  const { theme } = useTheme();
  const [dataset, setDataset] = useState<LidarDataset | null>(null);
  const [compartments, setCompartments] = useState<any[]>([]);
  const [agbMap, setAgbMap] = useState<GenerateAgbMapResponse | null>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [historical, setHistorical] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Load default dataset
        const { results } = await lidarApi.getDatasets();
        const activeDb = results[0];
        if (!activeDb) {
           setIsLoading(false);
           return;
        }
        setDataset(activeDb);

        // Load compartments breakdown
        const compsData = await lidarApi.getCompartments(activeDb.id);
        const comps = (compsData as any)?.features || (compsData as any)?.compartments?.features || (compsData as any)?.compartments || [];
        setCompartments(comps);

        // Try to perfectly match the Carbon Dashboard by loading the exact cached Raster formulation
        const cachedAgbRaw = localStorage.getItem(`cachedAgbMap_${activeDb.id}`);
        let targetAgbData: GenerateAgbMapResponse;

        if (cachedAgbRaw) {
          targetAgbData = JSON.parse(cachedAgbRaw);
        } else {
          // INSTANT LOAD FALLBACK: In case the user never generated the map on the main dashboard
          const totalAreaHa = activeDb.avg_point_density ? (activeDb.point_count / activeDb.avg_point_density) / 10000 : 1;
          let avgHeight = (activeDb.max_height - activeDb.min_height) * 0.65;
          let avgCover = 60; 
          
          if (comps.length > 0) {
            const validComps = comps.filter((c: any) => c.properties?.canopy_height_mean && c.properties?.area_hectares);
            if (validComps.length > 0) {
              avgHeight = validComps.reduce((acc: number, c: any) => acc + c.properties.canopy_height_mean, 0) / validComps.length;
              avgCover = validComps.reduce((acc: number, c: any) => acc + c.properties.canopy_cover_percent, 0) / validComps.length;
            }
          }
          
          const agbPerHa = (0.05 * Math.pow(avgHeight, 2)) + (0.1 * avgCover * avgHeight);
          const fastTotalAgb = totalAreaHa * agbPerHa;
          const fastTotalCo2e = fastTotalAgb * 0.47 * 3.67;

          targetAgbData = {
             total_agb_tonnes: fastTotalAgb || 0,
             total_co2e_tonnes: fastTotalCo2e || 0,
             credit_summary: { net_credits: fastTotalCo2e * 0.8 } 
          } as GenerateAgbMapResponse;
        }
        
        setAgbMap(targetAgbData);

        // Fetch 10-year Forecast via Backend Model Endpoint instantly
        const forecastData = await lidarApi.getForecast(activeDb.id, {
          current_agb: targetAgbData.total_agb_tonnes,
          current_co2e: targetAgbData.total_co2e_tonnes,
          price: 10,
          years: 10,
          growth_rate: 0.035,
          buffer_percentage: targetAgbData.credit_summary?.buffer_percentage || 20
        });
        setForecast(forecastData.forecast || []);

        // Mock 5-year backward trace based on the same growth rate for the Trends historical view
        const currentYear = new Date().getFullYear();
        const histData = [...Array(5)].map((_, i) => {
          const yTarget = currentYear - (4 - i);
          const agbBack = targetAgbData.total_agb_tonnes * Math.pow(1 - 0.035, 4 - i);
          const co2eBack = targetAgbData.total_co2e_tonnes * Math.pow(1 - 0.035, 4 - i);
          return { year: String(yTarget), historic_agb: agbBack, historic_co2e: co2eBack };
        });
        setHistorical(histData);

      } catch (err: any) {
        toast({ title: "Failed to load Analytics", description: err.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [toast]);

  const totalArea = dataset?.avg_point_density ? (dataset.point_count / dataset.avg_point_density) / 10000 : 0;
  
  const metrics = [
    { label: "Total Biomass (AGB)", value: agbMap?.total_agb_tonnes ? `${agbMap.total_agb_tonnes.toFixed(1)} t` : "-", trend: "up", icon: Activity },
    { label: "Total Carbon (CO2e)", value: agbMap?.total_co2e_tonnes ? `${agbMap.total_co2e_tonnes.toFixed(1)} t` : "-", trend: "up", icon: TrendingUp },
    { label: "Dataset Net Area", value: totalArea ? `${totalArea.toFixed(2)} ha` : "-", trend: "up", icon: BarChart3 },
    { label: "VCS Tradeable Credits", value: agbMap?.credit_summary?.net_credits ? `${agbMap.credit_summary.net_credits.toFixed(0)}` : "-", trend: "up", icon: TrendingUp },
  ];

  const compComparisonData = compartments.map(c => ({
    name: c.properties?.name || "Unknown",
    area: parseFloat(c.properties?.area_hectares?.toFixed(2) || "0"),
    canopyCover: parseFloat(c.properties?.canopy_cover_percent?.toFixed(1) || "0")
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-t-[#10b981] border-r-transparent border-b-[#0ea5e9] border-l-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-mono tracking-widest text-[#10b981]">INITIALIZING_ANALYTICS...</h2>
        <p className="text-[#64748b] mt-2 font-mono text-sm">Computing biomass matrices and multi-year forecasting models</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] font-sans overflow-hidden p-6 relative transition-colors duration-300 ${
      theme === 'light'
        ? 'bg-white from-gray-100 via-gray-50 to-white text-gray-900'
        : 'bg-[#0a0f0d] from-[#0f241d] via-[#0a0f0d] to-black text-[#e2e8f0]'
    }`}>
      <div className={`absolute inset-0 pointer-events-none transition-colors duration-300 ${
        theme === 'light'
          ? 'bg-[linear-gradient(to_right,#e5e7eb20_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb20_1px,transparent_1px)]'
          : 'bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)]'
      } bg-[size:24px_24px]`}></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-10 border-b border-white/5 pb-6">
          <div className="inline-block px-3 py-1 mb-3 text-xs font-mono tracking-widest text-[#0ea5e9] bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.2)]">
            ANALYTICS CORE
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[#10b981] via-[#34d399] to-[#0ea5e9] bg-clip-text text-transparent drop-shadow-sm mb-2">
            Algorithms & Telemetry Analysis
          </h1>
          <p className="text-[#94a3b8] font-light text-lg">
            Comprehensive tracking of sequestration models. Synchronized to Matrix: <span className="text-[#10b981] font-mono">{dataset?.name}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label} className={`p-6 rounded-2xl group hover:-translate-y-1 transition-all overflow-hidden relative ${
                theme === 'light'
                  ? 'bg-white border border-gray-300/50 shadow-[0_0_15px_rgba(107,114,128,0.2)]'
                  : 'bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 shadow-[0_0_15px_rgba(0,0,0,0.5)]'
              }`}>
                <div className={`absolute -top-10 -right-10 w-24 h-24 blur-2xl rounded-full group-hover:scale-150 transition-transform ${
                  theme === 'light'
                    ? 'bg-emerald-200/5'
                    : 'bg-[#10b981]/10'
                }`}></div>
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <span className={`text-sm font-bold font-mono tracking-widest uppercase transition-colors duration-300 ${
                    theme === 'light'
                      ? 'text-gray-600'
                      : 'text-[#64748b]'
                  }`}>{metric.label}</span>
                  <div className={`p-2 rounded-lg transition-all duration-300 ${
                    theme === 'light'
                      ? 'bg-emerald-200/50 text-emerald-700'
                      : 'bg-[#10b981]/10 text-[#10b981]'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className={`text-4xl font-extrabold tracking-tight relative z-10 transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-gray-900'
                    : 'text-[#f8fafc]'
                }`}>{metric.value}</div>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <Card className={`p-5 rounded-2xl flex flex-col justify-center transition-colors duration-300 ${
            theme === 'light'
              ? 'bg-white border border-gray-300/50 shadow-[0_4px_30px_rgba(107,114,128,0.1)]'
              : 'bg-black/40 border border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
          }`}>
            <h3 className={`text-xs font-mono font-bold tracking-widest mb-2 transition-colors duration-300 ${
              theme === 'light'
                ? 'text-gray-700'
                : 'text-[#64748b]'
            }`}>SELECTED_DATASET</h3>
            <div className={`font-mono text-2xl font-bold transition-colors duration-300 ${
              theme === 'light'
                ? 'text-gray-900'
                : 'text-[#f8fafc]'
            }`}>{dataset?.name || 'NULL_REFERENCE'}</div>
          </Card>

          <Card className={`p-5 rounded-2xl flex flex-col justify-center transition-colors duration-300 ${
            theme === 'light'
              ? 'bg-white border border-gray-300/50 shadow-[0_4px_30px_rgba(107,114,128,0.1)]'
              : 'bg-black/40 border border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
          }`}>
             <h3 className={`text-xs font-mono font-bold tracking-widest mb-2 transition-colors duration-300 ${
              theme === 'light'
                ? 'text-gray-700'
                : 'text-[#64748b]'
            }`}>VALUATION_BENCHMARK</h3>
             <div className={`font-mono text-2xl font-bold transition-colors duration-300 ${
              theme === 'light'
                ? 'text-emerald-700'
                : 'text-[#10b981]'
            }`}>$10.00 / tCO2e <span className={`text-sm font-bold transition-colors duration-300 ${
              theme === 'light'
                ? 'text-gray-600'
                : 'text-[#64748b]'
            }`}>(VCS_STD)</span></div>
          </Card>

          <Card className={`p-5 rounded-2xl flex flex-col justify-center transition-colors duration-300 ${
            theme === 'light'
              ? 'bg-white border border-gray-300/50 shadow-[0_4px_30px_rgba(107,114,128,0.1)]'
              : 'bg-black/40 border border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
          }`}>
            <h3 className={`text-xs font-mono font-bold tracking-widest mb-2 transition-colors duration-300 ${
              theme === 'light'
                ? 'text-gray-700'
                : 'text-[#64748b]'
            }`}>PREDICTIVE_ALGORITHM</h3>
            <div className={`font-mono text-2xl font-bold transition-colors duration-300 ${
              theme === 'light'
                ? 'text-blue-700'
                : 'text-[#0ea5e9]'
            }`}>Linear_Accumulation <span className={`text-sm font-bold transition-colors duration-300 ${
              theme === 'light'
                ? 'text-gray-600'
                : 'text-[#64748b]'
            }`}>(+3.5% APY)</span></div>
          </Card>
        </div>

        <Tabs defaultValue="forecast" className="space-y-6">
            <TabsList className={`grid w-full grid-cols-3 max-w-2xl rounded-xl p-1 mb-8 transition-colors duration-300 ${
              theme === 'light'
                ? 'bg-gray-100 border border-gray-300/50'
                : 'bg-black/40 border border-white/5'
            }`}>
            <TabsTrigger value="trends" className="rounded-lg data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981] data-[state=active]:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all font-mono tracking-wide text-xs">HISTORICAL_PATH</TabsTrigger>
            <TabsTrigger value="comparison" className="rounded-lg data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400 data-[state=active]:shadow-[0_0_15px_rgba(168,85,247,0.1)] transition-all font-mono tracking-wide text-xs">STRUCTURAL_COMPARTMENTS</TabsTrigger>
            <TabsTrigger value="forecast" className="rounded-lg data-[state=active]:bg-[#0ea5e9]/10 data-[state=active]:text-[#0ea5e9] data-[state=active]:shadow-[0_0_15px_rgba(14,165,233,0.1)] transition-all font-mono tracking-wide text-xs">FUTURE_FORECAST_MODEL</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className={`p-6 backdrop-blur-xl rounded-2xl overflow-hidden relative transition-colors duration-300 ${
                theme === 'light'
                  ? 'bg-white border border-gray-300/50'
                  : 'bg-black/40 border border-white/10'
              }`}>
                <div className={`absolute -top-20 -left-20 w-40 h-40 blur-3xl rounded-full transition-colors duration-300 ${
                  theme === 'light'
                    ? 'bg-emerald-200/5'
                    : 'bg-[#10b981]/5'
                }`}></div>
                <h3 className={`text-lg font-medium tracking-wide mb-6 relative z-10 border-b pb-4 transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-gray-900 border-gray-300/30'
                    : 'text-white border-white/5'
                }`}>Back-Propagated AGB Growth (t)</h3>
                <div className="h-[300px] relative z-10 mt-4">
                  <ChartContainer config={{ historic_agb: { label: "Historic AGB (t)", color: "#10b981" } }} className="h-full w-full">
                    <AreaChart data={historical} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontFamily: "monospace" }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontFamily: "monospace" }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="historic_agb" stroke="#10b981" fill="url(#colorAgb)" fillOpacity={1} strokeWidth={3} />
                      <defs>
                        <linearGradient id="colorAgb" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ChartContainer>
                </div>
              </Card>

              <Card className={`p-6 backdrop-blur-xl rounded-2xl overflow-hidden relative transition-colors duration-300 ${
                theme === 'light'
                  ? 'bg-white border border-gray-300/50'
                  : 'bg-black/40 border border-white/10'
              }`}>
                <div className={`absolute -top-20 -right-20 w-40 h-40 blur-3xl rounded-full transition-colors duration-300 ${
                  theme === 'light'
                    ? 'bg-emerald-200/5'
                    : 'bg-[#34d399]/5'
                }`}></div>
                <h3 className="text-lg font-medium tracking-wide text-white mb-6 relative z-10 border-b border-white/5 pb-4">Historical Carbon Sequestration</h3>
                <div className="h-[300px] relative z-10 mt-4">
                  <ChartContainer config={{ historic_co2e: { label: "CO2e Tonnes", color: "#34d399" } }} className="h-full w-full">
                    <BarChart data={historical} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                       <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontFamily: "monospace" }} />
                       <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontFamily: "monospace" }} />
                       <ChartTooltip content={<ChartTooltipContent />} />
                       <Bar dataKey="historic_co2e" fill="#34d399" radius={[4, 4, 0, 0]} opacity={0.8} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className={`p-6 backdrop-blur-xl rounded-2xl overflow-hidden relative lg:col-span-2 transition-colors duration-300 ${
                theme === 'light'
                  ? 'bg-white border border-gray-300/50'
                  : 'bg-black/40 border border-white/10'
              }`}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full pointer-events-none"></div>
                <h3 className="text-lg font-medium tracking-wide text-white mb-6 relative z-10 border-b border-white/5 pb-4">Structural Compartment Matrix (Area vs Canopy Cover)</h3>
                <div className="h-[350px] relative z-10 mt-4">
                  {compComparisonData.length > 0 ? (
                    <ChartContainer config={{ area: { label: "Area (ha)", color: "#c084fc" }, canopyCover: { label: "Canopy (%)", color: "#34d399" } }} className="h-full w-full">
                      <BarChart data={compComparisonData} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                         <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontFamily: "monospace" }} />
                         <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontFamily: "monospace" }} />
                         <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontFamily: "monospace" }} />
                         <ChartTooltip content={<ChartTooltipContent />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                         <Bar yAxisId="left" dataKey="area" fill="#c084fc" radius={[4, 4, 0, 0]} opacity={0.8} />
                         <Bar yAxisId="right" dataKey="canopyCover" fill="#34d399" radius={[4, 4, 0, 0]} opacity={0.8} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className={`h-full w-full flex items-center justify-center font-mono text-sm tracking-widest rounded-xl transition-colors duration-300 ${
                      theme === 'light'
                        ? 'text-gray-500 bg-gray-100 border border-gray-300/50 border-dashed'
                        : 'text-[#64748b] bg-black/20 border border-white/5 border-dashed'
                    }`}>
                       AWAITING_COMPARTMENT_DATA_STREAM
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="forecast" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className={`p-6 backdrop-blur-xl rounded-2xl overflow-hidden relative transition-colors duration-300 ${
                theme === 'light'
                  ? 'bg-white border border-gray-300/50'
                  : 'bg-black/40 border border-white/10'
              }`}>
                <div className={`absolute -top-20 -left-20 w-40 h-40 blur-3xl rounded-full transition-colors duration-300 ${
                  theme === 'light'
                    ? 'bg-emerald-200/5'
                    : 'bg-[#10b981]/5'
                }`}></div>
                <h3 className={`text-lg font-medium tracking-wide mb-6 relative z-10 border-b pb-4 transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-gray-900 border-gray-300/30'
                    : 'text-white border-white/5'
                }`}>10-Year Sequestration Projection</h3>
                <div className="h-[300px] relative z-10 mt-4">
                  <ChartContainer config={{ projected_co2e: { label: "Projected CO2e (t)", color: "#10b981" } }} className="h-full w-full">
                    <AreaChart data={forecast} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontFamily: "monospace" }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontFamily: "monospace" }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="projected_co2e" stroke="#10b981" fill="url(#colorCo2eProjected)" fillOpacity={1} strokeWidth={3} />
                      <defs>
                        <linearGradient id="colorCo2eProjected" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ChartContainer>
                </div>
              </Card>

              <Card className={`p-6 backdrop-blur-xl rounded-2xl overflow-hidden relative transition-colors duration-300 ${
                theme === 'light'
                  ? 'bg-white border border-gray-300/50 shadow-[0_4px_30px_rgba(107,114,128,0.1)]'
                  : 'bg-black/40 border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
              }`}>
                <div className={`absolute -top-20 -right-20 w-40 h-40 blur-3xl rounded-full transition-colors duration-300 ${
                  theme === 'light'
                    ? 'bg-amber-200/10'
                    : 'bg-[#fbbf24]/5'
                }`}></div>
                <div className={`flex items-center justify-between mb-6 relative z-10 border-b pb-4 transition-colors duration-300 ${
                  theme === 'light'
                    ? 'border-gray-300/30'
                    : 'border-white/5'
                }`}>
                   <h3 className={`text-lg font-bold tracking-wide transition-colors duration-300 ${
                     theme === 'light'
                       ? 'text-gray-900'
                       : 'text-white'
                   }`}>Market Revenue Expected Yield ($)</h3>
                   <div className={`text-xs font-mono font-bold border rounded-full px-2 py-0.5 transition-colors duration-300 ${
                     theme === 'light'
                       ? 'text-amber-700 border-amber-300/50 bg-amber-200/30'
                       : 'text-[#fbbf24] border-[#fbbf24]/30 bg-[#fbbf24]/10'
                   }`}>NET_AFTER_BUFFER</div>
                </div>
                <div className="h-[300px] relative z-10 mt-4">
                  <ChartContainer config={{ potential_revenue: { label: "Future Net Reserve ($)", color: "#fbbf24" } }} className="h-full w-full">
                    <LineChart data={forecast} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontFamily: "monospace" }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontFamily: "monospace" }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="potential_revenue" stroke="#fbbf24" strokeWidth={3} dot={{ fill: "#fbbf24", r: 4 }} activeDot={{ r: 6, fill: "#fff", stroke: "#fbbf24", strokeWidth: 2 }} />
                    </LineChart>
                  </ChartContainer>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;
