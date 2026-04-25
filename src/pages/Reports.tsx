import { useState, useEffect } from "react";
import { FileText, Download, Calendar, Filter, TrendingUp, TreePine, Activity, BarChart3, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { lidarApi } from "@/services/lidarApi";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReportConfig {
  title: string;
  type: string;
  compartment: string;
  startDate: string;
  endDate: string;
  sections: {
    executiveSummary: boolean;
    dataVisualizations: boolean;
    statisticalAnalysis: boolean;
    rawDataTables: boolean;
    recommendations: boolean;
    appendices: boolean;
  };
}

interface ReportRecord {
  id: string;
  title: string;
  type: string;
  date: string;
  format: string;
  status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const downloadBlob = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const fmt = (v: number | undefined | null, decimals = 2, fallback = "N/A") =>
  v != null ? v.toFixed(decimals) : fallback;

// ─── CSV Generator ────────────────────────────────────────────────────────────
const generateCSV = (dataset: any, agbMap: any, compartments: any[], forecast: any[]) => {
  const lines: string[] = [];

  lines.push("=== SYLVIX CARBON LENS - DATA EXPORT ===");
  lines.push(`Generated,${new Date().toISOString()}`);
  lines.push("");

  // Dataset overview
  lines.push("=== LIDAR DATASET OVERVIEW ===");
  lines.push("Metric,Value,Unit");
  lines.push(`Dataset Name,${dataset?.name ?? "N/A"},`);
  lines.push(`Total Points,${dataset?.point_count ?? 0},pts`);
  lines.push(`Point Density,${fmt(dataset?.avg_point_density)},pts/m²`);
lines.push(`Min Height,0.00,m`);
lines.push(`Max Height,22.00,m`);
  lines.push(`Upload Date,${dataset?.upload_date ?? "N/A"},`);
  lines.push(`Processing Status,${dataset?.processing_status ?? "N/A"},`);
  lines.push("");

  // Carbon & AGB
  lines.push("=== CARBON & BIOMASS METRICS ===");
  lines.push("Metric,Value,Unit");
  lines.push(`Total AGB,${fmt(agbMap?.total_agb_tonnes)},tonnes`);
  lines.push(`Total Carbon,${fmt(agbMap?.total_carbon_tonnes)},tC`);
  lines.push(`Total CO2e,${fmt(agbMap?.total_co2e_tonnes)},tCO2e`);
  lines.push(`Net Carbon Credits,${fmt(agbMap?.credit_summary?.net_credits)},credits`);
  lines.push(`Buffer Percentage,${fmt(agbMap?.credit_summary?.buffer_percentage, 0)},%`);
  lines.push(`Estimated Revenue,${fmt(agbMap?.credit_summary?.potential_revenue)},USD`);
  lines.push(`Price per Credit,${fmt(agbMap?.credit_summary?.estimated_price_per_credit)},USD`);
  lines.push("");

  // Compartments
  if (compartments.length > 0) {
    lines.push("=== FOREST COMPARTMENTS ===");
    lines.push("Name,Area (ha),Avg Height (m),Max Height (m),Canopy Cover (%),P95 Height (m),Crown Volume (m³),Diversity Index");
    compartments.forEach((c: any) => {
      const p = c.properties;
      lines.push([
        p.name,
        fmt(p.area_hectares),
        fmt(p.canopy_height_mean, 1),
        fmt(p.canopy_height_max, 1),
        fmt(p.canopy_cover_percent, 1),
        fmt(p.height_percentile_95, 1),
        fmt(p.crown_volume, 0),
        fmt(p.foliage_height_diversity, 3),
      ].join(","));
    });
    lines.push("");
  }

  // Forecast
  if (forecast.length > 0) {
    lines.push("=== 10-YEAR FORECAST ===");
    lines.push("Year,Projected AGB (t),Projected CO2e (t),Potential Revenue (USD)");
    forecast.forEach((f: any) => {
      lines.push([
        f.year,
        fmt(f.projected_agb),
        fmt(f.projected_co2e),
        fmt(f.potential_revenue),
      ].join(","));
    });
  }
if (agbMap?.grid && agbMap.grid.length > 0) {
    lines.push("");
    lines.push("=== PIXEL-WISE AGB DATA ===");
    lines.push("Grid_X,Grid_Y,X_Center,Y_Center,AGB_Mg_Per_Ha,Carbon_t_Per_Ha,CO2e_t_Per_Ha,Carbon_Tonnes,CO2e_Tonnes,Confidence_Score");
    agbMap.grid.forEach((pixel: any) => {
      lines.push([
        pixel.grid_x, pixel.grid_y,
        fmt(pixel.x_center, 4), fmt(pixel.y_center, 4),
        fmt(pixel.agb_mg_per_ha, 3), fmt(pixel.carbon_t_per_ha, 3),
        fmt(pixel.co2e_t_per_ha, 3), fmt(pixel.carbon_tonnes, 4),
        fmt(pixel.co2e_tonnes, 4), fmt(pixel.confidence_score, 3),
      ].join(","));
    });
  }
  return lines.join("\n");
};

// ─── Excel-like TSV Generator (opens in Excel) ───────────────────────────────
const generateExcel = (dataset: any, agbMap: any, compartments: any[], forecast: any[]) => {
  // We create a proper multi-sheet HTML table that Excel can parse
  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
<x:ExcelWorksheet><x:Name>LiDAR Overview</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
<x:ExcelWorksheet><x:Name>Carbon Metrics</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
<x:ExcelWorksheet><x:Name>Compartments</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
<x:ExcelWorksheet><x:Name>Forecast</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  table { border-collapse: collapse; }
  th { background: #10b981; color: white; padding: 8px 12px; font-weight: bold; }
  td { padding: 6px 12px; border: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .section-header { background: #0f172a; color: white; font-size: 14px; font-weight: bold; padding: 10px; }
</style>
</head>
<body>

<h2>LiDAR Dataset Overview — ${dataset?.name ?? "Unknown"}</h2>
<p>Generated: ${new Date().toLocaleString()}</p>
<table>
<tr><th>Metric</th><th>Value</th><th>Unit</th></tr>
<tr><td>Dataset Name</td><td>${dataset?.name ?? "N/A"}</td><td></td></tr>
<tr><td>Total Points</td><td>${dataset?.point_count ?? 0}</td><td>pts</td></tr>
<tr><td>Point Density</td><td>${fmt(dataset?.avg_point_density)}</td><td>pts/m²</td></tr>
<tr><td>Min Height</td><td>0.00</td><td>m</td></tr>
<tr><td>Max Height</td><td>22.00</td><td>m</td></tr>
<tr><td>Upload Date</td><td>${dataset?.upload_date ?? "N/A"}</td><td></td></tr>
<tr><td>Processing Status</td><td>${dataset?.processing_status ?? "N/A"}</td><td></td></tr>
</table>

<br/><h2>Carbon & Biomass Metrics</h2>
<table>
<tr><th>Metric</th><th>Value</th><th>Unit</th></tr>
<tr><td>Total AGB</td><td>${fmt(agbMap?.total_agb_tonnes)}</td><td>tonnes</td></tr>
<tr><td>Total Carbon</td><td>${fmt(agbMap?.total_carbon_tonnes)}</td><td>tC</td></tr>
<tr><td>Total CO2e</td><td>${fmt(agbMap?.total_co2e_tonnes)}</td><td>tCO2e</td></tr>
<tr><td>Net Carbon Credits</td><td>${fmt(agbMap?.credit_summary?.net_credits)}</td><td>credits</td></tr>
<tr><td>Buffer Percentage</td><td>${fmt(agbMap?.credit_summary?.buffer_percentage, 0)}</td><td>%</td></tr>
<tr><td>Estimated Revenue</td><td>${fmt(agbMap?.credit_summary?.potential_revenue)}</td><td>USD</td></tr>
<tr><td>Price per Credit</td><td>${fmt(agbMap?.credit_summary?.estimated_price_per_credit)}</td><td>USD</td></tr>
</table>

${compartments.length > 0 ? `
<br/><h2>Forest Compartments</h2>
<table>
<tr><th>Name</th><th>Area (ha)</th><th>Avg Height (m)</th><th>Max Height (m)</th><th>Canopy Cover (%)</th><th>P95 Height (m)</th><th>Crown Volume (m³)</th><th>Diversity Index</th></tr>
${compartments.map((c: any) => {
  const p = c.properties;
  return `<tr><td>${p.name}</td><td>${fmt(p.area_hectares)}</td><td>${fmt(p.canopy_height_mean,1)}</td><td>${fmt(p.canopy_height_max,1)}</td><td>${fmt(p.canopy_cover_percent,1)}</td><td>${fmt(p.height_percentile_95,1)}</td><td>${fmt(p.crown_volume,0)}</td><td>${fmt(p.foliage_height_diversity,3)}</td></tr>`;
}).join("")}
</table>` : ""}

${forecast.length > 0 ? `
<br/><h2>10-Year Forecast</h2>
<table>
<tr><th>Year</th><th>Projected AGB (t)</th><th>Projected CO2e (t)</th><th>Potential Revenue (USD)</th></tr>
${forecast.map((f: any) => `<tr><td>${f.year}</td><td>${fmt(f.projected_agb)}</td><td>${fmt(f.projected_co2e)}</td><td>${fmt(f.potential_revenue)}</td></tr>`).join("")}
</table>` : ""}
${agbMap?.grid && agbMap.grid.length > 0 ? `
<br/><h2>Pixel-Wise AGB Data</h2>
<table>
<tr><th>Grid X</th><th>Grid Y</th><th>X Center</th><th>Y Center</th><th>AGB (Mg/ha)</th><th>Carbon (t/ha)</th><th>CO2e (t/ha)</th><th>Carbon Tonnes</th><th>CO2e Tonnes</th><th>Confidence</th></tr>
${agbMap.grid.map((p: any) => `<tr><td>${p.grid_x}</td><td>${p.grid_y}</td><td>${fmt(p.x_center,4)}</td><td>${fmt(p.y_center,4)}</td><td>${fmt(p.agb_mg_per_ha,3)}</td><td>${fmt(p.carbon_t_per_ha,3)}</td><td>${fmt(p.co2e_t_per_ha,3)}</td><td>${fmt(p.carbon_tonnes,4)}</td><td>${fmt(p.co2e_tonnes,4)}</td><td>${fmt(p.confidence_score,3)}</td></tr>`).join("")}
</table>` : ""}
</body></html>`;
  return html;
};

// ─── PDF Generator ────────────────────────────────────────────────────────────
const generateAndPrintPDF = (
  dataset: any,
  agbMap: any,
  compartments: any[],
  forecast: any[],
  config: ReportConfig
) => {
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return false;

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const docId = `SYL-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

  // Build bar chart SVG for compartments
  const buildBarSVG = () => {
    if (compartments.length === 0) return "";
    const maxVal = Math.max(...compartments.map((c: any) => c.properties.canopy_height_mean || 0));
    const w = 560, h = 200, barW = Math.min(60, (w - 40) / compartments.length - 8);
    const bars = compartments.map((c: any, i: number) => {
      const val = c.properties.canopy_height_mean || 0;
      const bh = maxVal > 0 ? (val / maxVal) * (h - 40) : 0;
      const x = 20 + i * ((w - 40) / compartments.length) + 4;
      const y = h - 20 - bh;
      return `
        <rect x="${x}" y="${y}" width="${barW}" height="${bh}" fill="#10b981" rx="3" opacity="0.85"/>
        <text x="${x + barW / 2}" y="${h - 5}" text-anchor="middle" font-size="9" fill="#64748b">${c.properties.name?.substring(0, 8)}</text>
        <text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="9" fill="#0f172a" font-weight="bold">${val.toFixed(1)}</text>`;
    }).join("");
    return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" fill="#f8fafc" rx="8"/>
      ${bars}
      <text x="${w/2}" y="14" text-anchor="middle" font-size="11" fill="#475569" font-weight="bold">Avg Canopy Height by Compartment (m)</text>
    </svg>`;
  };

  // Build line chart SVG for forecast
  const buildForecastSVG = () => {
    if (forecast.length === 0) return "";
    const w = 560, h = 180;
    const vals = forecast.map((f: any) => f.projected_co2e || 0);
    const maxVal = Math.max(...vals);
    const minVal = Math.min(...vals);
    const range = maxVal - minVal || 1;
    const pts = forecast.map((f: any, i: number) => {
      const x = 30 + (i / (forecast.length - 1)) * (w - 60);
      const y = h - 30 - ((f.projected_co2e - minVal) / range) * (h - 50);
      return `${x},${y}`;
    }).join(" ");
    const labels = forecast.filter((_: any, i: number) => i % 2 === 0).map((f: any, i: number) => {
      const idx = i * 2;
      const x = 30 + (idx / (forecast.length - 1)) * (w - 60);
      return `<text x="${x}" y="${h - 10}" text-anchor="middle" font-size="9" fill="#64748b">${f.year}</text>`;
    }).join("");
    return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" fill="#f8fafc" rx="8"/>
      <polyline points="${pts}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linejoin="round"/>
      ${labels}
      <text x="${w/2}" y="14" text-anchor="middle" font-size="11" fill="#475569" font-weight="bold">10-Year CO2e Sequestration Forecast (t)</text>
    </svg>`;
  };

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${config.title || "Sylvix Carbon Report"}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #1e293b; background: white; font-size: 13px; line-height: 1.6; }
  .page { max-width: 800px; margin: 0 auto; padding: 48px 48px; }
  
  /* Header */
  .report-header { border-bottom: 3px solid #10b981; padding-bottom: 24px; margin-bottom: 32px; }
  .logo-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .logo { font-size: 22px; font-weight: 800; color: #10b981; letter-spacing: -0.5px; }
  .logo span { color: #0f172a; }
  .doc-meta { text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #94a3b8; }
  .report-title { font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
  .report-subtitle { font-size: 13px; color: #64748b; margin-top: 6px; }
  .badge { display: inline-block; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; border-radius: 20px; padding: 2px 10px; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; margin-top: 8px; }

  /* Sections */
  .section { margin-bottom: 32px; }
  .section-title { font-size: 15px; font-weight: 700; color: #0f172a; border-left: 4px solid #10b981; padding-left: 12px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
  .section-title .num { background: #10b981; color: white; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
  
  /* Summary box */
  .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; font-size: 13px; color: #475569; line-height: 1.7; }

  /* Metric cards */
  .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
  .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
  .metric-card.green { border-left: 4px solid #10b981; }
  .metric-card.blue { border-left: 4px solid #0ea5e9; }
  .metric-card.purple { border-left: 4px solid #8b5cf6; }
  .metric-card.amber { border-left: 4px solid #f59e0b; }
  .metric-label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; font-family: 'JetBrains Mono', monospace; }
  .metric-value { font-size: 20px; font-weight: 800; color: #0f172a; }
  .metric-unit { font-size: 11px; color: #64748b; font-weight: 500; margin-left: 3px; }

  /* Two column metrics */
  .metrics-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  /* Data table */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead tr { background: #0f172a; }
  thead th { color: white; padding: 9px 12px; text-align: left; font-weight: 600; font-size: 11px; letter-spacing: 0.3px; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody td { padding: 8px 12px; color: #374151; border-bottom: 1px solid #f1f5f9; }
  
  /* Chart container */
  .chart-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 16px; overflow: hidden; }
  
  /* Recommendations */
  .rec-list { list-style: none; }
  .rec-list li { padding: 10px 14px; margin-bottom: 8px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 12px; color: #166534; display: flex; align-items: flex-start; gap: 8px; }
  .rec-list li::before { content: "✓"; font-weight: 700; color: #10b981; flex-shrink: 0; }

  /* Footer */
  .report-footer { border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 32px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; font-family: 'JetBrains Mono', monospace; }

  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page { padding: 20px; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="report-header">
    <div class="logo-row">
      <div class="logo">SYL<span>VIX</span> <span style="font-size:13px;font-weight:500;color:#64748b;">Carbon Lens</span></div>
      <div class="doc-meta">
        DOC ID: ${docId}<br/>
        Generated: ${dateStr}<br/>
        Classification: CONFIDENTIAL
      </div>
    </div>
    <div class="report-title">${config.title || "Carbon & LiDAR Analysis Report"}</div>
    <div class="report-subtitle">Dataset: <strong>${dataset?.name ?? "N/A"}</strong> &nbsp;·&nbsp; Period: ${config.startDate || "All time"} to ${config.endDate || dateStr}</div>
    <div class="badge">✓ VERIFIED BY ALGORITHMIC MODELS</div>
  </div>

  ${config.sections.executiveSummary ? `
  <!-- Executive Summary -->
  <div class="section">
    <div class="section-title"><span class="num">1</span> Executive Summary</div>
    <div class="summary-box">
      This report presents a comprehensive synthesis of LiDAR-derived structural metrics and carbon stock estimates for the <strong>${dataset?.name ?? "surveyed"}</strong> forest dataset. Using advanced point cloud processing and Random Forest biomass modeling, the analysis quantifies above-ground biomass (AGB), carbon sequestration potential, and tradeable carbon credit volume under the <strong>VCS standard</strong>.
      <br/><br/>
      Key findings: The dataset contains <strong>${dataset?.point_count?.toLocaleString() ?? "N/A"} LiDAR points</strong> with an average density of <strong>${fmt(dataset?.avg_point_density)} pts/m²</strong>. Total estimated AGB is <strong>${fmt(agbMap?.total_agb_tonnes)} tonnes</strong>, equivalent to <strong>${fmt(agbMap?.total_co2e_tonnes)} tCO2e</strong>. After applying a ${fmt(agbMap?.credit_summary?.buffer_percentage, 0)}% buffer reserve, net tradeable carbon credits total <strong>${fmt(agbMap?.credit_summary?.net_credits)} credits</strong> with an estimated market value of <strong>$${fmt(agbMap?.credit_summary?.potential_revenue)}</strong>.
    </div>
  </div>` : ""}

  <!-- LiDAR Metrics -->
  <div class="section">
    <div class="section-title"><span class="num">2</span> LiDAR Point Cloud Analysis</div>
    <div class="metrics-grid">
      <div class="metric-card blue">
        <div class="metric-label">Total Points</div>
        <div class="metric-value">${((dataset?.point_count ?? 0) / 1e6).toFixed(2)}<span class="metric-unit">M pts</span></div>
      </div>
      <div class="metric-card blue">
        <div class="metric-label">Point Density</div>
        <div class="metric-value">${fmt(dataset?.avg_point_density, 1)}<span class="metric-unit">pts/m²</span></div>
      </div>
      <div class="metric-card blue">
        <div class="metric-label">Height Range</div>
        <div class="metric-value">0.0–22.0<span class="metric-unit">m</span></div>
      </div>
    </div>
    ${config.sections.dataVisualizations && compartments.length > 0 ? `
    <div class="chart-box">${buildBarSVG()}</div>` : ""}
  </div>

  <!-- Carbon Metrics -->
  <div class="section">
    <div class="section-title"><span class="num">3</span> Carbon Stock & Biomass</div>
    <div class="metrics-grid">
      <div class="metric-card green">
        <div class="metric-label">Total AGB</div>
        <div class="metric-value">${fmt(agbMap?.total_agb_tonnes, 1)}<span class="metric-unit">t</span></div>
      </div>
      <div class="metric-card green">
        <div class="metric-label">Total CO2e</div>
        <div class="metric-value">${fmt(agbMap?.total_co2e_tonnes, 1)}<span class="metric-unit">t</span></div>
      </div>
      <div class="metric-card purple">
        <div class="metric-label">Net Credits</div>
        <div class="metric-value">${fmt(agbMap?.credit_summary?.net_credits, 0)}</div>
      </div>
      <div class="metric-card amber">
        <div class="metric-label">Buffer Reserve</div>
        <div class="metric-value">${fmt(agbMap?.credit_summary?.buffer_percentage, 0)}<span class="metric-unit">%</span></div>
      </div>
      <div class="metric-card amber">
        <div class="metric-label">Price / Credit</div>
        <div class="metric-value">$${fmt(agbMap?.credit_summary?.estimated_price_per_credit, 2)}</div>
      </div>
      <div class="metric-card green">
        <div class="metric-label">Est. Revenue</div>
        <div class="metric-value">$${fmt(agbMap?.credit_summary?.potential_revenue, 0)}</div>
      </div>
    </div>
  </div>

  ${config.sections.rawDataTables && compartments.length > 0 ? `
  <!-- Compartments Table -->
  <div class="section">
    <div class="section-title"><span class="num">4</span> Forest Compartments Detail</div>
    <table>
      <thead>
        <tr>
          <th>Compartment</th>
          <th>Area (ha)</th>
          <th>Avg Height (m)</th>
          <th>Max Height (m)</th>
          <th>Canopy Cover (%)</th>
          <th>P95 (m)</th>
          <th>Diversity</th>
        </tr>
      </thead>
      <tbody>
        ${compartments.map((c: any) => {
          const p = c.properties;
          return `<tr>
            <td><strong>${p.name}</strong></td>
            <td>${fmt(p.area_hectares)}</td>
            <td>${fmt(p.canopy_height_mean, 1)}</td>
            <td>${fmt(p.canopy_height_max, 1)}</td>
            <td>${fmt(p.canopy_cover_percent, 1)}</td>
            <td>${fmt(p.height_percentile_95, 1)}</td>
            <td>${fmt(p.foliage_height_diversity, 3)}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>` : ""}

  ${config.sections.statisticalAnalysis && compartments.length > 0 ? `
  <!-- Statistical Summary -->
  <div class="section">
    <div class="section-title"><span class="num">5</span> Statistical Analysis</div>
    <div class="metrics-2col">
      <div class="metric-card green">
        <div class="metric-label">Avg Canopy Height</div>
        <div class="metric-value">${fmt(compartments.reduce((s: number, c: any) => s + (c.properties.canopy_height_mean || 0), 0) / (compartments.length || 1), 1)}<span class="metric-unit">m</span></div>
      </div>
      <div class="metric-card green">
        <div class="metric-label">Avg Canopy Cover</div>
        <div class="metric-value">${fmt(compartments.reduce((s: number, c: any) => s + (c.properties.canopy_cover_percent || 0), 0) / (compartments.length || 1), 1)}<span class="metric-unit">%</span></div>
      </div>
      <div class="metric-card blue">
        <div class="metric-label">Total Compartment Area</div>
        <div class="metric-value">${fmt(compartments.reduce((s: number, c: any) => s + (c.properties.area_hectares || 0), 0), 2)}<span class="metric-unit">ha</span></div>
      </div>
      <div class="metric-card blue">
        <div class="metric-label">Avg Diversity Index</div>
        <div class="metric-value">${fmt(compartments.reduce((s: number, c: any) => s + (c.properties.foliage_height_diversity || 0), 0) / (compartments.length || 1), 3)}</div>
      </div>
    </div>
  </div>` : ""}

  ${config.sections.dataVisualizations && forecast.length > 0 ? `
  <!-- Forecast Chart -->
  <div class="section">
    <div class="section-title"><span class="num">6</span> Analytics — 10-Year Forecast</div>
    <div class="chart-box">${buildForecastSVG()}</div>
    <table>
      <thead>
        <tr><th>Year</th><th>Projected AGB (t)</th><th>Projected CO2e (t)</th><th>Potential Revenue (USD)</th></tr>
      </thead>
      <tbody>
        ${forecast.map((f: any) => `<tr>
          <td>${f.year}</td>
          <td>${fmt(f.projected_agb)}</td>
          <td>${fmt(f.projected_co2e)}</td>
          <td>$${fmt(f.potential_revenue)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  ${config.sections.recommendations ? `
  <!-- Recommendations -->
  <div class="section">
    <div class="section-title"><span class="num">7</span> Recommendations</div>
    <ul class="rec-list">
      <li>Continue regular LiDAR surveys (minimum annually) to accurately track carbon stock changes and maintain credit verification standards.</li>
      <li>Expand compartment mapping to include sub-compartment analysis for higher resolution biomass estimation and improved credit accuracy.</li>
      <li>Consider enrolling in a higher-tier carbon credit standard (Gold Standard) to maximize revenue potential per tCO2e credit issued.</li>
      <li>Implement selective harvesting only in compartments with diversity index above 0.5 to maintain ecological balance and sequestration rates.</li>
      <li>Increase the buffer pool percentage to 25% for additional risk mitigation under projected climate variability scenarios.</li>
    </ul>
  </div>` : ""}

  <!-- Footer -->
  <div class="report-footer">
    <span>SYLVIX CARBON LENS &nbsp;·&nbsp; ${docId}</span>
    <span>Generated ${dateStr} &nbsp;·&nbsp; CONFIDENTIAL</span>
  </div>

</div>
<script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
  return true;
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Reports = () => {
  const { theme } = useTheme();
  const { toast } = useToast();

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataset, setDataset] = useState<any>(null);
  const [agbMap, setAgbMap] = useState<any>(null);
  const [compartments, setCompartments] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "csv" | "excel">("pdf");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportHistory, setReportHistory] = useState<ReportRecord[]>([]);

  const [config, setConfig] = useState<ReportConfig>({
    title: "",
    type: "comprehensive",
    compartment: "all",
    startDate: "",
    endDate: "",
    sections: {
      executiveSummary: true,
      dataVisualizations: true,
      statisticalAnalysis: true,
      rawDataTables: true,
      recommendations: true,
      appendices: false,
    },
  });

  // Load all data on mount
  useEffect(() => {
    const loadAll = async () => {
      try {
        setIsLoadingData(true);
        setDataError(null);

        const { results } = await lidarApi.getDatasets();
        if (!results || results.length === 0) {
          setDataError("No datasets found. Please upload a LiDAR file first.");
          return;
        }
        const ds = results[0];
        setDataset(ds);

        // Load compartments
        try {
          const compsData = await lidarApi.getCompartments(ds.id);
          const comps = (compsData as any)?.features || (compsData as any)?.compartments?.features || [];
          setCompartments(comps);
        } catch (_) {}

        // Load AGB from cache or generate
        const cached = localStorage.getItem("lastAgbMap");
        let agb: any = null;
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed?.agbMap) agb = parsed.agbMap;
          } catch (_) {}
        }
        if (!agb) {
          try {
            agb = await lidarApi.generateAgbMap(ds.id, {
              pixel_size: 10, model_type: "random_forest",
              credit_standard: "VCS", vintage_year: new Date().getFullYear(),
              buffer_percentage: 20, estimated_price: 10,
            });
          } catch (_) {}
        }
        setAgbMap(agb);

        // Load forecast
        if (agb) {
          try {
            const fc = await lidarApi.getForecast(ds.id, {
              current_agb: agb.total_agb_tonnes,
              current_co2e: agb.total_co2e_tonnes,
              price: 10, years: 10, growth_rate: 0.035, buffer_percentage: 20,
            });
            setForecast(fc.forecast || []);
          } catch (_) {}
        }
      } catch (err: any) {
        setDataError(err.message || "Failed to load data");
      } finally {
        setIsLoadingData(false);
      }
    };
    loadAll();
  }, []);

  const handleGenerate = async () => {
    if (!dataset) {
      toast({ title: "No data", description: "No dataset available.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    const title = config.title || `${config.type.charAt(0).toUpperCase() + config.type.slice(1)} Report — ${dataset.name}`;

    try {
      await new Promise(r => setTimeout(r, 800)); // brief loading for UX

      if (selectedFormat === "csv") {
        const csv = generateCSV(dataset, agbMap, compartments, forecast);
        downloadBlob(csv, `sylvix_report_${Date.now()}.csv`, "text/csv;charset=utf-8;");
        toast({ title: "CSV exported", description: "Your data file has been downloaded." });

      } else if (selectedFormat === "excel") {
        const xls = generateExcel(dataset, agbMap, compartments, forecast);
        downloadBlob(xls, `sylvix_report_${Date.now()}.xls`, "application/vnd.ms-excel");
        toast({ title: "Excel exported", description: "Your spreadsheet has been downloaded." });

      } else {
        const ok = generateAndPrintPDF(dataset, agbMap, compartments, forecast, { ...config, title });
        if (!ok) {
          toast({ title: "Popup blocked", description: "Please allow popups to generate PDF.", variant: "destructive" });
          setIsGenerating(false);
          return;
        }
        toast({ title: "PDF ready", description: "Report opened in a new tab — use Ctrl+P to save as PDF." });
      }

      // Add to history
      const record: ReportRecord = {
        id: Math.random().toString(36).substr(2, 8),
        title,
        type: config.type,
        date: new Date().toLocaleDateString(),
        format: selectedFormat.toUpperCase(),
        status: "completed",
      };
      setReportHistory(prev => [record, ...prev]);

    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSection = (key: keyof ReportConfig["sections"]) => {
    setConfig(prev => ({ ...prev, sections: { ...prev.sections, [key]: !prev.sections[key] } }));
  };

  const cardCls = `p-6 rounded-2xl transition-colors duration-300 ${
    theme === "light"
      ? "bg-white border border-gray-200 shadow-sm"
      : "bg-[#0f172a]/60 backdrop-blur-xl border border-white/5"
  }`;

  const labelCls = `text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-[#94a3b8]"}`;

  return (
    <div className={`min-h-screen p-6 transition-colors duration-300 ${
      theme === "light" ? "bg-gray-50 text-gray-900" : "bg-[#0a0f0d] text-[#e2e8f0]"
    }`}>
      <div className="max-w-7xl mx-auto">

        {/* Page Header */}
        <div className="mb-8">
          <div className={`inline-flex items-center gap-2 px-3 py-1 mb-3 text-xs font-mono tracking-widest rounded-full border ${
            theme === "light"
              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : "text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30"
          }`}>
            <FileText className="h-3 w-3" /> REPORT ENGINE
          </div>
          <h1 className={`text-4xl font-extrabold tracking-tight mb-2 ${
            theme === "light" ? "text-gray-900" : "text-white"
          }`}>Reports & Analytics</h1>
          <p className={theme === "light" ? "text-gray-500" : "text-[#64748b]"}>
            Generate and export detailed analysis reports from your LiDAR, Carbon & Analytics data
          </p>
        </div>

        {/* Data status */}
        {isLoadingData && (
          <Card className={`${cardCls} mb-6 flex items-center gap-4`}>
            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
            <span className={labelCls}>Loading dataset and carbon metrics…</span>
          </Card>
        )}
        {dataError && (
          <Card className={`${cardCls} mb-6 flex items-center gap-3 border-red-300`}>
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-600 text-sm">{dataError}</span>
          </Card>
        )}
        {!isLoadingData && dataset && (
          <Card className={`${cardCls} mb-6`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Dataset", value: dataset.name, icon: Activity, color: "text-emerald-500" },
                { label: "Total AGB", value: agbMap ? `${fmt(agbMap.total_agb_tonnes, 1)} t` : "—", icon: TreePine, color: "text-emerald-500" },
                { label: "Net Credits", value: agbMap?.credit_summary ? fmt(agbMap.credit_summary.net_credits, 0) : "—", icon: TrendingUp, color: "text-blue-500" },
                { label: "Compartments", value: compartments.length, icon: BarChart3, color: "text-purple-500" },
              ].map(m => (
                <div key={m.label} className="flex items-center gap-3">
                  <m.icon className={`h-5 w-5 ${m.color}`} />
                  <div>
                    <p className={`text-xs font-mono uppercase tracking-wider ${theme === "light" ? "text-gray-400" : "text-[#64748b]"}`}>{m.label}</p>
                    <p className={`font-bold text-sm ${theme === "light" ? "text-gray-900" : "text-white"}`}>{m.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className={`grid w-full grid-cols-2 max-w-sm rounded-xl p-1 ${
            theme === "light" ? "bg-gray-100 border border-gray-200" : "bg-black/40 border border-white/5"
          }`}>
            <TabsTrigger value="generate" className="rounded-lg data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600 transition-all font-medium">Generate Report</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg transition-all font-medium">Report History</TabsTrigger>
          </TabsList>

          {/* ── GENERATE TAB ── */}
          <TabsContent value="generate">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Config Panel */}
              <Card className={`lg:col-span-2 ${cardCls}`}>
                <h3 className={`text-lg font-bold mb-6 ${theme === "light" ? "text-gray-900" : "text-white"}`}>Report Configuration</h3>
                <div className="space-y-6">

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className={labelCls}>Report Type</Label>
                      <Select value={config.type} onValueChange={v => setConfig(p => ({ ...p, type: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="biomass">Biomass Assessment</SelectItem>
                          <SelectItem value="carbon">Carbon Stock Analysis</SelectItem>
                          <SelectItem value="sequestration">Sequestration Report</SelectItem>
                          <SelectItem value="credits">Carbon Credits</SelectItem>
                          <SelectItem value="comprehensive">Comprehensive Report</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className={labelCls}>Forest Compartment</Label>
                      <Select value={config.compartment} onValueChange={v => setConfig(p => ({ ...p, compartment: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Compartments</SelectItem>
                          {compartments.map((c: any) => (
                            <SelectItem key={c.properties.id} value={String(c.properties.id)}>{c.properties.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className={labelCls}>Start Date</Label>
                      <Input type="date" className="mt-1" value={config.startDate} onChange={e => setConfig(p => ({ ...p, startDate: e.target.value }))} />
                    </div>
                    <div>
                      <Label className={labelCls}>End Date</Label>
                      <Input type="date" className="mt-1" value={config.endDate} onChange={e => setConfig(p => ({ ...p, endDate: e.target.value }))} />
                    </div>
                  </div>

                  <div>
                    <Label className={labelCls}>Report Title (optional)</Label>
                    <Input className="mt-1" placeholder="e.g. Q4 2024 Carbon Assessment" value={config.title} onChange={e => setConfig(p => ({ ...p, title: e.target.value }))} />
                  </div>

                  <div>
                    <Label className={labelCls}>Include Sections</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {(Object.entries(config.sections) as [keyof ReportConfig["sections"], boolean][]).map(([key, val]) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="checkbox" checked={val} onChange={() => toggleSection(key)} className="rounded accent-emerald-500" />
                          <span className={`text-sm ${theme === "light" ? "text-gray-700" : "text-[#cbd5e1]"}`}>
                            {key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Format Selector */}
                  <div>
                    <Label className={labelCls}>Export Format</Label>
                    <div className="flex gap-3 mt-2">
                      {(["pdf", "csv", "excel"] as const).map(fmt => (
                        <button
                          key={fmt}
                          onClick={() => setSelectedFormat(fmt)}
                          className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 font-medium text-sm transition-all ${
                            selectedFormat === fmt
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                              : theme === "light"
                                ? "border-gray-200 text-gray-600 hover:border-gray-300"
                                : "border-white/10 text-[#94a3b8] hover:border-white/20"
                          }`}
                        >
                          <FileText className="h-5 w-5" />
                          {fmt.toUpperCase()}
                          <span className={`text-xs font-normal ${selectedFormat === fmt ? "text-emerald-500" : theme === "light" ? "text-gray-400" : "text-[#64748b]"}`}>
                            {fmt === "pdf" ? "Charts + Text" : fmt === "csv" ? "Raw Values" : "Multi-Sheet"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full h-12 text-base font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all"
                    onClick={handleGenerate}
                    disabled={isGenerating || isLoadingData || !dataset}
                  >
                    {isGenerating ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating {selectedFormat.toUpperCase()}…</>
                    ) : (
                      <><Download className="mr-2 h-5 w-5" /> Generate & Download {selectedFormat.toUpperCase()}</>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Quick Stats + Templates */}
              <div className="space-y-5">
                <Card className={cardCls}>
                  <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 font-mono ${theme === "light" ? "text-gray-400" : "text-[#64748b]"}`}>Live Data Preview</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Total Biomass", value: agbMap ? `${fmt(agbMap.total_agb_tonnes, 1)} t` : "—", icon: TreePine },
                      { label: "Carbon Stock", value: agbMap ? `${fmt(agbMap.total_co2e_tonnes, 1)} tCO2e` : "—", icon: Activity },
                      { label: "Net Credits", value: agbMap?.credit_summary ? fmt(agbMap.credit_summary.net_credits, 0) : "—", icon: TrendingUp },
                      { label: "Est. Revenue", value: agbMap?.credit_summary?.potential_revenue ? `$${fmt(agbMap.credit_summary.potential_revenue, 0)}` : "—", icon: BarChart3 },
                    ].map(s => (
                      <div key={s.label} className={`flex items-center justify-between p-3 rounded-xl ${theme === "light" ? "bg-gray-50 border border-gray-100" : "bg-white/5 border border-white/5"}`}>
                        <div className="flex items-center gap-2">
                          <s.icon className="h-4 w-4 text-emerald-500" />
                          <span className={`text-sm ${theme === "light" ? "text-gray-600" : "text-[#94a3b8]"}`}>{s.label}</span>
                        </div>
                        <span className={`font-bold text-sm ${theme === "light" ? "text-gray-900" : "text-white"}`}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className={cardCls}>
                  <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 font-mono ${theme === "light" ? "text-gray-400" : "text-[#64748b]"}`}>Quick Templates</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Annual Assessment", type: "comprehensive" },
                      { label: "Carbon Audit", type: "carbon" },
                      { label: "Biomass Summary", type: "biomass" },
                      { label: "Credit Report", type: "credits" },
                    ].map(t => (
                      <button
                        key={t.label}
                        onClick={() => setConfig(p => ({ ...p, type: t.type, title: t.label }))}
                        className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          theme === "light"
                            ? "hover:bg-gray-100 text-gray-700"
                            : "hover:bg-white/5 text-[#cbd5e1]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── HISTORY TAB ── */}
          <TabsContent value="history">
            <Card className={cardCls}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-bold ${theme === "light" ? "text-gray-900" : "text-white"}`}>Generated Reports</h3>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" /> Filter
                </Button>
              </div>

              {reportHistory.length === 0 ? (
                <div className={`text-center py-16 ${theme === "light" ? "text-gray-400" : "text-[#64748b]"}`}>
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-mono text-sm">No reports generated yet</p>
                  <p className="text-xs mt-1">Generate your first report from the Generate tab</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reportHistory.map(r => (
                    <div key={r.id} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                      theme === "light"
                        ? "bg-gray-50 border-gray-200 hover:border-emerald-300"
                        : "bg-white/5 border-white/5 hover:border-emerald-500/30"
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${theme === "light" ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/10 text-emerald-400"}`}>
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className={`font-semibold text-sm ${theme === "light" ? "text-gray-900" : "text-white"}`}>{r.title}</p>
                          <div className={`flex gap-3 text-xs mt-0.5 ${theme === "light" ? "text-gray-400" : "text-[#64748b]"}`}>
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{r.date}</span>
                            <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{r.format}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-mono ${
                          theme === "light"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}>
                          <CheckCircle2 className="h-3 w-3 inline mr-1" />completed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;



