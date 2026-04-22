import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader, AlertCircle, Download, Activity, Layers, Expand, Database, Target, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import LidarViewer3D from "@/components/lidar/LidarViewer3D";
import DataMetrics from "@/components/lidar/DataMetrics";
import { lidarApi } from "@/services/lidarApi";

const LidarDashboard = () => {
  const { theme } = useTheme();
  const [dataset, setDataset] = useState<any>(null);
  const [compartments, setCompartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [agbMap, setAgbMap] = useState<any | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [pixelSize, setPixelSize] = useState<number>(10);
  const [creditStandard, setCreditStandard] = useState<string>("VCS");
  const [vintageYear, setVintageYear] = useState<number>(new Date().getFullYear());
  const [estimatedPrice, setEstimatedPrice] = useState<number>(10);
  const [colorMode, setColorMode] = useState<"height" | "elevation" | "intensity">("height");
  const [pointSize, setPointSize] = useState<number>(0.15);
  const [totalArea, setTotalArea] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all datasets
      const datasetsResponse = await lidarApi.getDatasets();
      const datasets = datasetsResponse.results;

      if (datasets && datasets.length > 0) {
        const ds = datasets[0];
        setDataset(ds);

        // Get compartments for this dataset
        const compsResponse = await lidarApi.getCompartments(ds.id);
        const comps = compsResponse?.compartments?.features || compsResponse?.compartments || [];
        setCompartments(comps);
        
        const rawAreaHa = ds.avg_point_density > 0 ? (ds.point_count / ds.avg_point_density) / 10000 : 0;
        setTotalArea(rawAreaHa);
      } else {
        setError("No datasets found. Please upload a LAS file first.");
      }
    } catch (err: any) {
      const errorMsg = err.message || "Failed to load data";
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAgbMap = async () => {
    if (!dataset) return;

    try {
      setMapLoading(true);
      setError(null);
      setAgbMap(null);

      const result = await lidarApi.generateAgbMap(dataset.id, {
        pixel_size: pixelSize,
        model_type: "random_forest",
        credit_standard: creditStandard,
        vintage_year: vintageYear,
        buffer_percentage: 20,
        estimated_price: estimatedPrice,
      });

      setAgbMap(result);
      // Cache result locally so Analytics map can reuse exact verified metrics instantly
      localStorage.setItem(`cachedAgbMap_${dataset.id}`, JSON.stringify(result));
      
      toast({
        title: "AGB map generated",
        description: "The AGB raster and carbon summary are ready.",
      });
    } catch (err: any) {
      const errorMsg = err.message || "Failed to generate AGB map";
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setMapLoading(false);
    }
  };

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportCSV = () => {
    if (!dataset) return toast({ title: "No data", description: "No dataset available.", variant: "destructive" });
    
    // Dataset level headers
    const headers = ["Dataset_Name", "Total_Points", "Area_Hectares", "Avg_Point_Density", "Min_Height_m", "Max_Height_m", "Total_AGB_tonnes", "Total_Carbon_tonnes", "Net_Carbon_Credits"];
    
    const row = [
      dataset.name || "N/A",
      dataset.point_count || 0,
      totalArea?.toFixed(2) || 0,
      dataset.avg_point_density?.toFixed(2) || 0,
      dataset.min_height?.toFixed(2) || 0,
      dataset.max_height?.toFixed(2) || 0,
      agbMap?.total_agb_tonnes?.toFixed(2) || "Not Calculated",
      agbMap?.total_carbon_tonnes?.toFixed(2) || "Not Calculated",
      agbMap?.credit_summary?.net_credits?.toFixed(2) || "Not Calculated"
    ].join(",");
    
    downloadFile([headers.join(","), row].join("\n"), `${dataset.name || "dataset"}_single_metrics.csv`, "text/csv");
  };

  const exportGeoJSON = () => {
    if (!dataset) return toast({ title: "No data", description: "No dataset available.", variant: "destructive" });
    
    // Naively parse Django GEOSGeometry WKT Polygon into GeoJSON coordinates
    let coordinates: number[][][] = [];
    if (dataset.extent) {
      try {
        const match = String(dataset.extent).match(/\(\((.*?)\)\)/);
        if (match) {
           coordinates = [match[1].split(',').map(pair => {
             const [x, y] = pair.trim().split(/\s+/);
             return [parseFloat(x), parseFloat(y)];
           })];
        }
      } catch (e) {
        console.warn("WKT parsing for dataset extent failed.");
      }
    }

    const featureCollection = { 
      type: "FeatureCollection", 
      features: [{
        type: "Feature",
        geometry: coordinates.length > 0 ? { type: "Polygon", coordinates } : null,
        properties: {
          name: dataset.name,
          total_points: dataset.point_count,
          area_hectares: totalArea,
          avg_point_density: dataset.avg_point_density,
          min_height_m: dataset.min_height,
          max_height_m: dataset.max_height,
          total_agb: agbMap?.total_agb_tonnes || 0,
          total_carbon: agbMap?.total_carbon_tonnes || 0,
          net_credits: agbMap?.credit_summary?.net_credits || 0
        }
      }] 
    };
    
    downloadFile(JSON.stringify(featureCollection, null, 2), `${dataset.name || "dataset"}_boundary.geojson`, "application/json");
  };

  const exportPDFReport = () => {
    if (!dataset) return toast({ title: "No data", description: "No dataset available." });
    const printWindow = window.open('', '', 'width=800,height=900');
    if (!printWindow) return toast({ title: "Popup blocked", description: "Please allow popups to generate PDF report." });
    
    const html = `
      <html>
        <head>
          <title>LiDAR & Carbon Report - ${dataset.name}</title>
          <style>
            body { font-family: system-ui, sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; }
            h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { padding: 10px; border: 1px solid #cbd5e1; text-align: left; }
            th { background: #f8fafc; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px; }
            .card { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .value { font-size: 20px; font-weight: bold; margin-top: 5px; }
          </style>
        </head>
        <body>
          <h1>LiDAR Analytics Report</h1>
          <div class="grid">
            <div class="card">Dataset Name<div class="value">${dataset.name}</div></div>
            <div class="card">Area (ha)<div class="value">${totalArea.toFixed(2)}</div></div>
            <div class="card">Total AGB<div class="value">${agbMap?.total_agb_tonnes?.toFixed(2) ?? "Not calc"} t</div></div>
            <div class="card">Net Credits<div class="value">${agbMap?.credit_summary?.net_credits?.toFixed(0) ?? "Not calc"}</div></div>
          </div>
          <h2 style="margin-top: 30px;">Compartments Data</h2>
          <table>
            <tr><th>Name</th><th>Area (ha)</th><th>Avg Height (m)</th><th>Canopy Cover (%)</th></tr>
            ${compartments.map(c => `<tr><td>${c.properties.name}</td><td>${c.properties.area_hectares?.toFixed(2)}</td><td>${c.properties.canopy_height_mean?.toFixed(1)}</td><td>${c.properties.canopy_cover_percent?.toFixed(1)}</td></tr>`).join('')}
          </table>
          <p style="text-align: center; margin-top: 40px; color: #94a3b8; font-size: 12px;">Generated by Biomass Vision on ${new Date().toLocaleDateString()}</p>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const exportPointCloud = () => {
    if (!dataset?.file_path) return toast({ title: "Not available", description: "Raw LAS file path not found." });
    const filename = dataset.file_path.split(/[/\\]/).pop();
    const a = document.createElement("a");
    a.href = `/media/lidar_datasets/${filename}`;
    a.download = filename;
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              LiDAR Analysis Dashboard
            </h1>
            {dataset && (
              <p className="text-muted-foreground mt-2">
                Dataset: {dataset.name} • {dataset.point_count.toLocaleString()} points
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <Loader className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Error</p>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card className="p-12 bg-card border-border">
            <div className="flex items-center justify-center gap-3">
              <Loader className="h-6 w-6 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading dataset...</p>
            </div>
          </Card>
        )}

        {/* Main Content */}
        {!loading && dataset && (
          <>
            {/* Dataset Level Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {[
                { label: "Total Points", icon: Database, value: (dataset.point_count / 1e6).toFixed(2), unit: "M" },
                { label: "Point Density", icon: Activity, value: dataset.avg_point_density.toFixed(1), unit: "pts/m²" },
                { label: "Min Height", icon: Target, value: dataset.min_height.toFixed(1), unit: "m" },
                { label: "Max Height", icon: Expand, value: dataset.max_height.toFixed(1), unit: "m" },
                { label: "Compartments", icon: Layers, value: compartments.length, unit: "units" },
                { label: "Total Area", icon: Map, value: totalArea.toFixed(2), unit: "ha" },
              ].map((metric, idx) => {
                const Icon = metric.icon;
                return (
                  <Card key={idx} className={`relative overflow-hidden p-6 rounded-2xl group transition-all duration-500 hover:-translate-y-1 ${
                    theme === 'light'
                      ? 'bg-gray-200/80 backdrop-blur-xl border border-gray-300/50 hover:shadow-[0_10px_40px_rgba(107,114,128,0.15)]'
                      : 'bg-[#0f172a]/60 backdrop-blur-xl border border-white/5 hover:shadow-[0_10px_40px_rgba(16,185,129,0.15)]'
                  }`}>
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex-1">
                        <div className={`flex items-center gap-3 mb-4 border-b pb-3 transition-colors duration-300 ${
                          theme === 'light'
                            ? 'border-gray-300/50'
                            : 'border-white/5'
                        }`}>
                          <div className={`p-2 rounded-lg transition-all duration-300 ${
                            theme === 'light'
                              ? 'bg-emerald-200/50 text-emerald-700'
                              : 'bg-[#10b981]/10 text-[#10b981]'
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
                          theme === 'light'
                            ? 'text-emerald-700 bg-emerald-200/50 border-emerald-300/50'
                            : 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                            theme === 'light'
                              ? 'bg-emerald-700'
                              : 'bg-[#10b981]'
                          }`}></span>
                          LIVE_TELEMETRY
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 3D Viewer */}
              <Card className="lg:col-span-2 p-6 bg-card border-border">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground">3D Point Cloud Viewer</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Visualize the current dataset with live color mode and point size controls.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
                    <div>
                      <Label htmlFor="color-mode" className="text-sm font-medium">Color by</Label>
                      <Select value={colorMode} onValueChange={(value) => setColorMode(value as any)}>
                        <SelectTrigger id="color-mode" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="height">Height above ground</SelectItem>
                          <SelectItem value="elevation">Elevation</SelectItem>
                          <SelectItem value="intensity">Intensity</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="point-size" className="text-sm font-medium">Point size</Label>
                      <Input
                        id="point-size"
                        type="range"
                        min={0.05}
                        max={0.5}
                        step={0.01}
                        value={pointSize}
                        onChange={(e) => setPointSize(Number(e.target.value))}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{pointSize.toFixed(2)} units</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg overflow-hidden bg-background/50">
                  <LidarViewer3D
                    onPointSelect={setSelectedPoint}
                    datasetId={dataset.id}
                    datasetMinHeight={dataset.min_height}
                    datasetMaxHeight={dataset.max_height}
                    colorMode={colorMode}
                    pointSize={pointSize}
                  />
                </div>
              </Card>

              {/* Metrics Panel */}
              <div className="space-y-6">
                <DataMetrics
                  dataset={dataset}
                  compartments={compartments}
                  selectedPoint={selectedPoint}
                  totalArea={totalArea}
                />
              </div>
            </div>

            {/* Detailed Analysis Tabs */}
            <Card className="p-6 bg-card border-border">
              <Tabs defaultValue="compartments" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-muted">
                  <TabsTrigger value="compartments">Compartments</TabsTrigger>
                  <TabsTrigger value="statistics">Statistics</TabsTrigger>
                  <TabsTrigger value="export">Export</TabsTrigger>
                </TabsList>

                {/* Compartments Tab */}
                <TabsContent value="compartments" className="mt-6">
                  {compartments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 font-medium text-foreground">
                              Compartment
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-foreground">
                              Area (ha)
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-foreground">
                              Avg Height (m)
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-foreground">
                              Max Height (m)
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-foreground">
                              Canopy Cover (%)
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-foreground">
                              P95 (m)
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-foreground">
                              Diversity
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {compartments.map((comp, idx) => {
                            const props = comp.properties;
                            return (
                              <tr
                                key={idx}
                                className="border-b border-border hover:bg-muted/50 transition-all"
                              >
                                <td className="py-3 px-4 text-muted-foreground">
                                  {props.name}
                                </td>
                                <td className="text-right py-3 px-4 text-foreground">
                                  {props.area_hectares.toFixed(2)}
                                </td>
                                <td className="text-right py-3 px-4 text-foreground">
                                  {props.canopy_height_mean.toFixed(1)}
                                </td>
                                <td className="text-right py-3 px-4 text-foreground">
                                  {props.canopy_height_max.toFixed(1)}
                                </td>
                                <td className="text-right py-3 px-4 text-foreground">
                                  {props.canopy_cover_percent.toFixed(1)}
                                </td>
                                <td className="text-right py-3 px-4 text-foreground">
                                  {props.height_percentile_95.toFixed(1)}
                                </td>
                                <td className="text-right py-3 px-4 text-foreground">
                                  {props.foliage_height_diversity.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No compartments found
                    </div>
                  )}
                </TabsContent>

                {/* Statistics Tab */}
                <TabsContent value="statistics" className="mt-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {compartments.length > 0 && (
                      <>
                        <Card className="p-4 bg-muted border-border">
                          <p className="text-sm text-muted-foreground">Avg Canopy Height</p>
                          <p className="text-2xl font-bold text-foreground mt-2">
                            {(
                              compartments.reduce(
                                (sum, c) => sum + c.properties.canopy_height_mean,
                                0
                              ) / compartments.length
                            ).toFixed(1)}
                            m
                          </p>
                        </Card>
                        <Card className="p-4 bg-muted border-border">
                          <p className="text-sm text-muted-foreground">Avg Canopy Cover</p>
                          <p className="text-2xl font-bold text-foreground mt-2">
                            {(
                              compartments.reduce(
                                (sum, c) => sum + c.properties.canopy_cover_percent,
                                0
                              ) / compartments.length
                            ).toFixed(1)}
                            %
                          </p>
                        </Card>
                        <Card className="p-4 bg-muted border-border">
                          <p className="text-sm text-muted-foreground">Total Area</p>
                          <p className="text-2xl font-bold text-foreground mt-2">
                            {compartments
                              .reduce((sum, c) => sum + c.properties.area_hectares, 0)
                              .toFixed(2)}
                            ha
                          </p>
                        </Card>
                        <Card className="p-4 bg-muted border-border">
                          <p className="text-sm text-muted-foreground">Max Crown Volume</p>
                          <p className="text-2xl font-bold text-foreground mt-2">
                            {Math.max(
                              ...compartments.map((c) => c.properties.crown_volume)
                            ).toFixed(0)}
                            m³
                          </p>
                        </Card>
                        <Card className="p-4 bg-muted border-border">
                          <p className="text-sm text-muted-foreground">Avg Diversity</p>
                          <p className="text-2xl font-bold text-foreground mt-2">
                            {(
                              compartments.reduce(
                                (sum, c) => sum + c.properties.foliage_height_diversity,
                                0
                              ) / compartments.length
                            ).toFixed(2)}
                          </p>
                        </Card>
                        <Card className="p-4 bg-muted border-border">
                          <p className="text-sm text-muted-foreground">P95 Avg</p>
                          <p className="text-2xl font-bold text-foreground mt-2">
                            {(
                              compartments.reduce(
                                (sum, c) => sum + c.properties.height_percentile_95,
                                0
                              ) / compartments.length
                            ).toFixed(1)}
                            m
                          </p>
                        </Card>
                      </>
                    )}
                  </div>
                </TabsContent>

                {/* Export Tab */}
                <TabsContent value="export" className="mt-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="p-4 bg-muted border-border">
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            AGB Raster Map Settings
                          </p>
                          <div className="grid gap-3">
                            <div className="grid gap-2">
                              <Label htmlFor="pixel-size" className="text-foreground">
                                Pixel Size (m)
                              </Label>
                              <Input
                                id="pixel-size"
                                type="number"
                                min={5}
                                value={pixelSize}
                                onChange={(e) => setPixelSize(Number(e.target.value))}
                                className="bg-background"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="credit-standard" className="text-foreground">
                                Credit Standard
                              </Label>
                              <Input
                                id="credit-standard"
                                type="text"
                                value={creditStandard}
                                onChange={(e) => setCreditStandard(e.target.value)}
                                className="bg-background"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="vintage-year" className="text-foreground">
                                Vintage Year
                              </Label>
                              <Input
                                id="vintage-year"
                                type="number"
                                min={2000}
                                max={new Date().getFullYear()}
                                value={vintageYear}
                                onChange={(e) => setVintageYear(Number(e.target.value))}
                                className="bg-background"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="estimated-price" className="text-foreground">
                                Price per Credit (USD)
                              </Label>
                              <Input
                                id="estimated-price"
                                type="number"
                                min={0}
                                value={estimatedPrice}
                                onChange={(e) => setEstimatedPrice(Number(e.target.value))}
                                className="bg-background"
                              />
                            </div>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-4 bg-muted border-border">
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Generate AGB Map & Carbon Credits
                          </p>
                          <Button
                            className="w-full bg-primary hover:bg-primary/90"
                            disabled={!dataset || mapLoading}
                            onClick={generateAgbMap}
                          >
                            {mapLoading ? (
                              <>
                                <Loader className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              "Generate AGB Map"
                            )}
                          </Button>
                          <div className="grid gap-2">
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Current dataset</span>
                              <span>{dataset?.name ?? "None"}</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Pixel size</span>
                              <span>{pixelSize} m</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {agbMap && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card className="p-4 bg-muted border-border">
                          <h3 className="text-lg font-semibold text-foreground mb-3">
                            AGB & Carbon Summary
                          </h3>
                          <div className="grid gap-3">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total AGB</span>
                              <span className="text-foreground">{agbMap.total_agb_tonnes.toFixed(2)} t</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Carbon</span>
                              <span className="text-foreground">{agbMap.total_carbon_tonnes.toFixed(2)} t</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total CO₂e</span>
                              <span className="text-foreground">{agbMap.total_co2e_tonnes.toFixed(2)} t</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Map cells</span>
                              <span className="text-foreground">{agbMap.pixel_count}</span>
                            </div>
                          </div>
                        </Card>
                        <Card className="p-4 bg-muted border-border">
                          <h3 className="text-lg font-semibold text-foreground mb-3">
                            Credit Summary
                          </h3>
                          {agbMap.credit_summary ? (
                            <div className="grid gap-3">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Net Credits</span>
                                <span className="text-foreground">{agbMap.credit_summary.net_credits.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Buffer</span>
                                <span className="text-foreground">{agbMap.credit_summary.buffer_percentage}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Price / Credit</span>
                                <span className="text-foreground">${agbMap.credit_summary.estimated_price_per_credit?.toFixed(2) ?? "-"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Revenue</span>
                                <span className="text-foreground">${agbMap.credit_summary.potential_revenue?.toFixed(2) ?? "-"}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-muted-foreground">Generate the AGB map to calculate credits.</p>
                          )}
                        </Card>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" className="border-primary/50" onClick={exportCSV}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                      </Button>
                      <Button variant="outline" className="border-primary/50" onClick={exportGeoJSON}>
                        <Download className="mr-2 h-4 w-4" />
                        Export GeoJSON
                      </Button>
                      <Button variant="outline" className="border-primary/50" onClick={exportPDFReport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export PDF Report
                      </Button>
                      <Button variant="outline" className="border-primary/50" onClick={exportPointCloud}>
                        <Download className="mr-2 h-4 w-4" />
                        Point Cloud (LAS)
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default LidarDashboard;
