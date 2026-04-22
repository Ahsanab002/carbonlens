import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface CarbonMapProps {
  mapData?: {
    pixel_size_meters: number;
    grid_width: number;
    grid_height: number;
    grid: Array<{
      grid_x: number;
      grid_y: number;
      agb_mg_per_ha: number;
      co2e_t_per_ha: number;
      carbon_tonnes: number;
      co2e_tonnes: number;
    }>;
  } | null;
}

const CarbonMap = ({ mapData }: CarbonMapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"agb" | "credits">("agb");

  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    data: any;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (mapData && mapData.grid.length > 0) {
      const gridWidth = mapData.grid_width;
      const gridHeight = mapData.grid_height;
      const cellWidth = width / Math.max(gridWidth, 1);
      const cellHeight = height / Math.max(gridHeight, 1);

      const isAgb = viewMode === "agb";
      const values = mapData.grid.map((item) => isAgb ? item.agb_mg_per_ha : item.co2e_tonnes);
      const maxValue = Math.max(...values);
      const minValue = Math.min(...values);

      const getAgbColor = (ratio: number) => {
        const hue = 140 - ratio * 80;
        const saturation = 70;
        const lightness = 35 + ratio * 30;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      };

      const getCreditColor = (ratio: number) => {
        const hue = 220 - ratio * 40; // Blue spectrum for credits
        const saturation = 80;
        const lightness = 40 + ratio * 30;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      };

      const getColor = isAgb ? getAgbColor : getCreditColor;

      mapData.grid.forEach((entry) => {
        const value = isAgb ? entry.agb_mg_per_ha : entry.co2e_tonnes;
        const normalized = maxValue > minValue
          ? (value - minValue) / (maxValue - minValue)
          : 0;
        ctx.fillStyle = getColor(normalized);
        ctx.fillRect(
          entry.grid_x * cellWidth,
          (gridHeight - entry.grid_y - 1) * cellHeight,
          cellWidth,
          cellHeight
        );
      });

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= gridWidth; x += 1) {
        ctx.beginPath();
        ctx.moveTo(x * cellWidth, 0);
        ctx.lineTo(x * cellWidth, height);
        ctx.stroke();
      }
      for (let y = 0; y <= gridHeight; y += 1) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellHeight);
        ctx.lineTo(width, y * cellHeight);
        ctx.stroke();
      }

      const legendWidth = 200;
      const legendHeight = 20;
      const legendX = width - legendWidth - 20;
      const legendY = height - legendHeight - 20;
      const legendGradient = ctx.createLinearGradient(legendX, legendY, legendX + legendWidth, legendY);
      legendGradient.addColorStop(0, getColor(0));
      legendGradient.addColorStop(1, getColor(1));
      ctx.fillStyle = legendGradient;
      ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1;
      ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);
      ctx.fillStyle = "hsl(0, 0%, 100%)";
      ctx.font = "12px sans-serif";
      ctx.fillText(isAgb ? "Low AGB" : "Low Credits", legendX, legendY - 6);
      ctx.fillText(isAgb ? "High AGB" : "High Credits", legendX + legendWidth - 75, legendY - 6);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "hsl(150, 8%, 6%)");
      gradient.addColorStop(1, "hsl(150, 10%, 10%)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "hsl(0, 0%, 80%)";
      ctx.font = "14px sans-serif";
      ctx.fillText("Waiting for AGB map generation...", 20, 30);
    }
  }, [mapData, viewMode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!mapData || !mapData.grid || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gridWidth = mapData.grid_width;
    const gridHeight = mapData.grid_height;
    const cellWidth = canvasRef.current.width / Math.max(gridWidth, 1);
    const cellHeight = canvasRef.current.height / Math.max(gridHeight, 1);

    const gridX = Math.floor(x / cellWidth);
    const gridY = gridHeight - 1 - Math.floor(y / cellHeight); // Invert Y

    const cellData = mapData.grid.find(
      (cell) => cell.grid_x === gridX && cell.grid_y === gridY
    );

    if (cellData) {
      setHoverInfo({ x: e.clientX, y: e.clientY, data: cellData });
    } else {
      setHoverInfo(null);
    }
  };

  return (
    <div className="relative w-full h-[500px]" ref={containerRef}>
      {mapData && mapData.grid.length > 0 && (
        <div className="absolute top-4 left-4 flex gap-2 z-10 bg-background/80 backdrop-blur-md p-1 rounded-lg border border-border">
          <button
            onClick={() => setViewMode("agb")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === "agb" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            Biomass (AGB)
          </button>
          <button
            onClick={() => setViewMode("credits")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === "credits" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            Carbon Credits (CO₂e)
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverInfo(null)}
        className="w-full h-full rounded-lg cursor-crosshair"
        style={{ width: "100%", height: "100%" }}
      />
      
      {!mapData && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Carbon map will render here once an AGB map is generated.
        </div>
      )}
      
      {mapData && mapData.grid?.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          No AGB grid cells were generated for this dataset.
        </div>
      )}

      {hoverInfo && (
        <div 
          className="fixed pointer-events-none z-50 bg-card border border-border p-3 rounded-lg shadow-xl"
          style={{ top: hoverInfo.y + 15, left: hoverInfo.x + 15, width: '220px' }}
        >
          <div className="space-y-1">
            <h4 className="font-semibold text-foreground text-sm border-b border-border pb-1 mb-2">
              Pixel Info Matrix ({hoverInfo.data.grid_x}, {hoverInfo.data.grid_y})
            </h4>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">AGB</span>
              <span className="font-medium text-foreground">{hoverInfo.data.agb_mg_per_ha.toFixed(2)} t/ha</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Carbon</span>
              <span className="font-medium text-foreground">{(hoverInfo.data.carbon_tonnes).toFixed(2)} t</span>
            </div>
            <div className="flex justify-between text-xs mt-1 pt-1 border-t border-border/50">
              <span className="text-muted-foreground font-semibold">Credits (CO₂e)</span>
              <span className="font-bold text-primary">{(hoverInfo.data.co2e_tonnes).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarbonMap;
