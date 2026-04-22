import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import CarbonMap from "@/components/carbon/CarbonMap";
import CarbonMetrics from "@/components/carbon/CarbonMetrics";
import CarbonCalculator from "@/components/carbon/CarbonCalculator";
import SequestrationChart from "@/components/carbon/SequestrationChart";
import { TrendingUp, Calculator, Download } from "lucide-react";
import { lidarApi } from "@/services/lidarApi";
import { useTheme } from "@/components/ThemeProvider";

const CarbonDashboard = () => {
  const { theme } = useTheme();
  const [dataset, setDataset] = useState<any>(null);
  const [agbMap, setAgbMap] = useState<any>(null);
  const [creditSummary, setCreditSummary] = useState<any>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [loadingMap, setLoadingMap] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  const generateCreditSummary = async (datasetId: number, autoLoad = false) => {
    try {
      setMapError(null);
      if (autoLoad) {
        setLoadingMap(true);
      } else {
        setLoadingCredits(true);
      }

      const result = await lidarApi.generateAgbMap(datasetId, {
        pixel_size: 10,
        model_type: "random_forest",
        credit_standard: "VCS",
        vintage_year: new Date().getFullYear(),
        buffer_percentage: 20,
        estimated_price: 10,
      });

      setAgbMap(result);
      setCreditSummary(result.credit_summary || null);
      localStorage.setItem(
        "lastAgbMap",
        JSON.stringify({ datasetId, agbMap: result })
      );
    } catch (err: any) {
      console.error(err);
      setMapError(err?.message || "Failed to generate AGB map.");
    } finally {
      setLoadingMap(false);
      setLoadingCredits(false);
    }
  };

  const loadCarbonDashboard = async () => {
    const stored = localStorage.getItem("lastAgbMap");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.datasetId && parsed?.agbMap) {
          const dataset = await lidarApi.getDataset(parsed.datasetId);
          setDataset(dataset);
          setAgbMap(parsed.agbMap);
          setCreditSummary(parsed.agbMap.credit_summary || null);
          setLoadingMap(false);
          return;
        }
      } catch (err) {
        console.warn("Failed to restore last AGB map from storage", err);
      }
    }

    const datasetsResponse = await lidarApi.getDatasets();
    const datasets = datasetsResponse.results;
    if (datasets && datasets.length > 0) {
      const latest = datasets[0];
      setDataset(latest);
      await generateCreditSummary(latest.id, true);
    } else {
      setLoadingMap(false);
    }
  };

  useEffect(() => {
    loadCarbonDashboard();
  }, []);

  return (
    <div className={`min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] font-sans overflow-hidden transition-colors duration-300 ${
      theme === 'light'
        ? 'bg-white from-gray-100 via-gray-50 to-white text-gray-900'
        : 'bg-[#0a0f0d] from-[#0f241d] via-[#0a0f0d] to-black text-[#e2e8f0]'
    }`}>
      <div className={`absolute inset-0 pointer-events-none transition-colors duration-300 ${
        theme === 'light'
          ? 'bg-[linear-gradient(to_right,#e5e7eb20_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb20_1px,transparent_1px)]'
          : 'bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)]'
      } bg-[size:24px_24px]`}></div>
      
      <div className="container relative mx-auto p-6 space-y-8 z-10">
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-block px-3 py-1 mb-2 text-xs font-mono tracking-widest text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/30 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              SYSTEM ONLINE
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-[#10b981]">
              Carbon Stock Terminal
            </h1>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button
              variant="outline"
              className="border-[#10b981]/40 text-[#10b981] hover:bg-[#10b981]/10 hover:border-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.1)] transition-all"
              onClick={() => dataset && generateCreditSummary(dataset.id)}
              disabled={!dataset || loadingCredits}
            >
              <Calculator className="mr-2 h-4 w-4" />
              {loadingCredits ? "Syncing Data..." : "Recalculate Matrices"}
            </Button>
            <Button className="bg-[#10b981] text-black hover:bg-[#34d399] shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all font-semibold">
              <TrendingUp className="mr-2 h-4 w-4" />
              Initialize Forecast
            </Button>
          </div>
        </div>

        {dataset && (
          <Card className={`p-5 rounded-2xl transition-colors duration-300 flex flex-col justify-center ${
            theme === 'light'
              ? 'bg-white border border-gray-300/50 shadow-[0_4px_30px_rgba(107,114,128,0.1)]'
              : 'bg-black/40 border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className={`text-xs font-bold uppercase tracking-wider font-semibold transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-gray-600'
                    : 'text-[#64748b]'
                }`}>Active Matrix</p>
                <p className={`font-mono text-lg transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-gray-900'
                    : 'text-[#f8fafc]'
                }`}>{dataset.name}</p>
              </div>
              <div className="space-y-1">
                <p className={`text-xs font-bold uppercase tracking-wider font-semibold transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-gray-600'
                    : 'text-[#64748b]'
                }`}>Telemetry Source</p>
                <p className={`font-mono text-lg transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-gray-900'
                    : 'text-[#f8fafc]'
                }`}>LiDAR + Deep L.</p>
              </div>
              <div className="space-y-1">
                <p className={`text-xs font-bold uppercase tracking-wider font-semibold transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-gray-600'
                    : 'text-[#64748b]'
                }`}>Epoch Year</p>
                <p className={`font-mono text-lg transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-gray-900'
                    : 'text-[#f8fafc]'
                }`}>{new Date().getFullYear()}</p>
              </div>
              <div className="space-y-1">
                <p className={`text-xs font-bold uppercase tracking-wider font-semibold transition-colors duration-300 ${
                  theme === 'light'
                    ? 'text-gray-600'
                    : 'text-[#64748b]'
                }`}>System Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${creditSummary ? (theme === 'light' ? 'bg-emerald-700 shadow-[0_0_5px_#047857]' : 'bg-[#10b981] shadow-[0_0_5px_#10b981]') : 'bg-amber-500 animate-pulse'}`}></div>
                  <p className={`font-mono text-lg transition-colors duration-300 ${
                    theme === 'light'
                      ? 'text-gray-900'
                      : 'text-[#f8fafc]'
                  }`}>{creditSummary ? "Synchronized" : "Computing"}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Top Metrics */}
        <CarbonMetrics agbMapData={agbMap} creditSummary={creditSummary} />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Carbon Map */}
          <Card className="lg:col-span-2 p-1 bg-gradient-to-br from-white/10 to-transparent rounded-2xl relative group pb-6">
            <div className={`absolute inset-0 backdrop-blur-3xl rounded-2xl z-0 transition-colors duration-300 ${
              theme === 'light'
                ? 'bg-white/50'
                : 'bg-[#0f172a]/80'
            }`}></div>
            <div className="relative z-10 p-5 pb-0">
              <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4">
                <h2 className="text-xl font-medium tracking-wide text-white drop-shadow-md">
                  Biomass Distribution Uplink
                </h2>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10b981]"></span>
                  </span>
                  <span className="text-xs font-mono text-[#10b981]">LIVE</span>
                </div>
              </div>
              <div className={`rounded-xl overflow-hidden border shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-colors duration-300 ${
                theme === 'light'
                  ? 'bg-white border-gray-300/50'
                  : 'bg-black/50 border-white/10'
              }`}>
              <CarbonMap mapData={agbMap} />
            </div>
            <div className="mt-5 px-1 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono text-[#94a3b8]">
              <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                <p className="text-[#64748b] mb-1">DATASET</p>
                <p className="text-white">{dataset?.name ?? "NULL_REF"}</p>
              </div>
              <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                <p className="text-[#64748b] mb-1">MAPPING_ENGINE</p>
                <p className="text-[#10b981]">{loadingMap ? "INITIALIZING..." : agbMap ? "READY" : "NO_SIGNAL"}</p>
              </div>
              <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                <p className="text-[#64748b] mb-1">CRDT_EVALUATION</p>
                <p className="text-[#cbd5e1]">{loadingCredits ? "RECALCULATING..." : agbMap ? "STABLE" : "PENDING"}</p>
              </div>
            </div>
            {loadingMap && (
              <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl transition-colors duration-300 ${
                theme === 'light'
                  ? 'bg-white/80 backdrop-blur-sm'
                  : 'bg-black/60 backdrop-blur-sm'
              }`}>
                <div className="w-16 h-16 border-4 border-t-[#10b981] border-r-transparent border-b-[#0ea5e9] border-l-transparent rounded-full animate-spin"></div>
                <div className="mt-4 text-[#10b981] font-mono text-sm tracking-widest">DECRYPTING_TERRAIN...</div>
              </div>
            )}
            {mapError && (
              <div className="mt-5 rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400 font-mono flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                {mapError}
              </div>
            )}
            </div>
          </Card>

            <CarbonCalculator agbMapData={agbMap} />
        </div>

        {/* Sequestration Analysis */}
        <Card className={`p-1 border-none rounded-2xl relative overflow-hidden group transition-colors duration-300 ${
          theme === 'light'
            ? 'bg-white'
            : 'bg-[#1e293b]/80'
        }`}>
          <div className="relative z-10 p-6">
          <Tabs defaultValue="trends" className="w-full">
            <TabsList className={`grid w-full grid-cols-4 rounded-xl p-1 mb-8 transition-colors duration-300 ${
              theme === 'light'
                ? 'bg-gray-100 border border-gray-300/50'
                : 'bg-black/40 border border-white/5'
            }`}>
              <TabsTrigger value="trends" className="rounded-lg data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981] data-[state=active]:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all">Historical Trends</TabsTrigger>
              <TabsTrigger value="forecast" className="rounded-lg data-[state=active]:bg-[#0ea5e9]/10 data-[state=active]:text-[#0ea5e9] data-[state=active]:shadow-[0_0_15px_rgba(14,165,233,0.1)] transition-all">Decadal Forecast</TabsTrigger>
              <TabsTrigger value="credits" className="rounded-lg data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400 data-[state=active]:shadow-[0_0_15px_rgba(168,85,247,0.1)] transition-all">Tokenized Credits</TabsTrigger>
              <TabsTrigger value="reports" className="rounded-lg data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 transition-all">Data Export</TabsTrigger>
            </TabsList>
            
            <TabsContent value="trends" className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SequestrationChart />
            </TabsContent>

            <TabsContent value="forecast" className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-6">
                <p className="text-[#94a3b8] font-light">
                  Algorithmic prediction of carbon sequestration scaling based on historical lidar deltas.
                </p>
                <div className={`h-80 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group transition-colors duration-300 ${
                  theme === 'light'
                    ? 'bg-white border border-gray-300/50'
                    : 'bg-black/40 border border-white/5'
                }`}>
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b9810a_1px,transparent_1px),linear-gradient(to_bottom,#10b9810a_1px,transparent_1px)] bg-[size:1rem_1rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]"></div>
                  <TrendingUp className="h-10 w-10 text-[#0ea5e9] mb-4 opacity-50 group-hover:scale-110 transition-transform duration-500" />
                  <p className="text-[#64748b] font-mono tracking-widest text-sm relative z-10">FORECAST_MODULE_OFFLINE</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="credits" className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-6">
                <p className="text-[#94a3b8] font-light">
                  Immutable ledger analysis of verified carbon units modeled on REDD+ methodologies.
                </p>
                {creditSummary ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <Card className={`p-6 rounded-2xl relative overflow-hidden group hover:border-purple-500/30 transition-all ${
                      theme === 'light'
                        ? 'bg-gray-200/50 backdrop-blur-xl border border-gray-300/30'
                        : 'bg-black/50 backdrop-blur-xl border border-white/10'
                    }`}>
                      <div className={`absolute top-0 right-0 w-20 h-20 blur-2xl rounded-full ${
                        theme === 'light'
                          ? 'bg-purple-300/10'
                          : 'bg-purple-500/10'
                      }`}></div>
                      <p className={`text-sm font-bold font-mono uppercase tracking-wider mb-2 transition-colors duration-300 ${
                        theme === 'light'
                          ? 'text-gray-600'
                          : 'text-[#64748b]'
                      }`}>Net Tradable Units</p>
                      <p className={`text-5xl font-extrabold mt-2 transition-colors duration-300 ${
                        theme === 'light'
                          ? 'text-gray-900'
                          : 'text-white'
                      }`}>
                        {creditSummary.net_credits.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </p>
                      <p className={`text-sm mt-2 font-mono transition-colors duration-300 ${
                        theme === 'light'
                          ? 'text-gray-600'
                          : 'text-[#94a3b8]'
                      }`}>tCO₂e</p>
                    </Card>
                    <Card className={`p-6 rounded-2xl relative overflow-hidden group hover:border-[#f59e0b]/30 transition-all ${
                      theme === 'light'
                        ? 'bg-gray-200/50 backdrop-blur-xl border border-gray-300/30'
                        : 'bg-black/50 backdrop-blur-xl border border-white/10'
                    }`}>
                      <div className={`absolute top-0 right-0 w-20 h-20 blur-2xl rounded-full ${
                        theme === 'light'
                          ? 'bg-amber-300/10'
                          : 'bg-[#f59e0b]/10'
                      }`}></div>
                      <p className={`text-sm font-bold font-mono uppercase tracking-wider mb-2 transition-colors duration-300 ${
                        theme === 'light'
                          ? 'text-gray-600'
                          : 'text-[#64748b]'
                      }`}>Buffer Risk Reserve</p>
                      <p className={`text-5xl font-extrabold mt-2 transition-colors duration-300 ${
                        theme === 'light'
                          ? 'text-gray-900'
                          : 'text-white'
                      }`}>
                        {creditSummary.buffer_percentage.toFixed(0)}%
                      </p>
                      <p className={`text-sm mt-2 font-mono transition-colors duration-300 ${
                        theme === 'light'
                          ? 'text-gray-600'
                          : 'text-[#94a3b8]'
                      }`}>Locked Asset Pool</p>
                    </Card>
                    <Card className={`p-6 rounded-2xl relative overflow-hidden group hover:border-[#10b981]/30 transition-all ${
                      theme === 'light'
                        ? 'bg-gray-200/50 backdrop-blur-xl border border-gray-300/30'
                        : 'bg-black/50 backdrop-blur-xl border border-white/10'
                    }`}>
                      <div className={`absolute top-0 right-0 w-20 h-20 blur-2xl rounded-full ${
                        theme === 'light'
                          ? 'bg-emerald-300/10'
                          : 'bg-[#10b981]/10'
                      }`}></div>
                      <p className={`text-sm font-bold font-mono uppercase tracking-wider mb-2 transition-colors duration-300 ${
                        theme === 'light'
                          ? 'text-gray-600'
                          : 'text-[#64748b]'
                      }`}>Estimated Yield</p>
                      <p className={`text-5xl font-extrabold mt-2 transition-colors duration-300 ${
                        theme === 'light'
                          ? 'text-gray-900'
                          : 'text-white'
                      }`}>
                        {creditSummary.potential_revenue !== null
                          ? `$${creditSummary.potential_revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                          : "N/A"}
                      </p>
                      <p className={`text-sm mt-2 font-mono transition-colors duration-300 ${
                        theme === 'light'
                          ? 'text-gray-600'
                          : 'text-[#94a3b8]'
                      }`}>USD</p>
                    </Card>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <Card className="p-6 bg-black/20 border border-white/5 rounded-2xl">
                      <p className="text-sm text-[#64748b] font-mono">NET UNITS</p>
                      <p className="text-3xl font-bold text-[#334155] mt-2 font-mono">--.---</p>
                    </Card>
                    <Card className="p-6 bg-black/20 border border-white/5 rounded-2xl">
                      <p className="text-sm text-[#64748b] font-mono">BUFFER RESERVE</p>
                      <p className="text-3xl font-bold text-[#334155] mt-2 font-mono">--%</p>
                    </Card>
                    <Card className="p-6 bg-black/20 border border-white/5 rounded-2xl">
                      <p className="text-sm text-[#64748b] font-mono">ESTIMATED YIELD</p>
                      <p className="text-3xl font-bold text-[#334155] mt-2 font-mono">$ --</p>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reports" className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-6">
                <p className="text-[#94a3b8] font-light">
                  Extract formatted intelligence reports ready for regulatory auditing.
                </p>
                <div className="flex flex-wrap gap-4 mt-8">
                  <Button variant="outline" className="border-[#0ea5e9]/30 text-[#0ea5e9] bg-black/40 hover:bg-[#0ea5e9]/20 hover:border-[#0ea5e9] rounded-xl px-6 py-6 h-auto flex flex-col items-center justify-center gap-3 transition-all group">
                    <div className="p-3 bg-[#0ea5e9]/10 rounded-full group-hover:scale-110 transition-transform">
                      <Download className="h-6 w-6" />
                    </div>
                    <span className="font-mono text-sm tracking-wide">ECOLOGICAL REPORT</span>
                  </Button>
                  <Button variant="outline" className="border-purple-500/30 text-purple-400 bg-black/40 hover:bg-purple-500/20 hover:border-purple-500 rounded-xl px-6 py-6 h-auto flex flex-col items-center justify-center gap-3 transition-all group">
                    <div className="p-3 bg-purple-500/10 rounded-full group-hover:scale-110 transition-transform">
                      <Download className="h-6 w-6" />
                    </div>
                    <span className="font-mono text-sm tracking-wide">ASSET STATEMENT</span>
                  </Button>
                  <Button variant="outline" className="border-[#10b981]/30 text-[#10b981] bg-black/40 hover:bg-[#10b981]/20 hover:border-[#10b981] rounded-xl px-6 py-6 h-auto flex flex-col items-center justify-center gap-3 transition-all group">
                    <div className="p-3 bg-[#10b981]/10 rounded-full group-hover:scale-110 transition-transform">
                      <Download className="h-6 w-6" />
                    </div>
                    <span className="font-mono text-sm tracking-wide">REDD+ AUDIT DATA</span>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CarbonDashboard;
