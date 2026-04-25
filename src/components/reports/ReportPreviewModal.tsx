import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileText, CheckCircle2, Loader2, Target, BarChart3, TrendingUp, TreePine } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateType: string | null;
}

const mockReportData = {
  lidarParams: {
    totalPoints: "14.2M",
    density: "45 pts/m²",
    avgHeight: "18.5m",
    maxHeight: "32.1m",
    canopyCover: "78%"
  },
  carbonParams: {
    totalBiomass: "1,245 t",
    carbonStock: "622.5 tC",
    co2Equivalent: "2,284 tCO₂e",
    sequestrationRate: "4.2 tC/ha/yr"
  }
};

const ReportPreviewModal = ({ isOpen, onClose, templateType }: ReportPreviewModalProps) => {
  const { theme } = useTheme();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsGenerating(true);
      setIsDownloaded(false);
      // Simulate data gathering and report generation
      const timer = setTimeout(() => {
        setIsGenerating(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleDownload = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      setIsDownloaded(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }, 2500);
  };

  const getTemplateTitle = () => {
    switch (templateType) {
      case "annual": return "Annual Biomass Assessment Report";
      case "quarterly": return "Quarterly Review & Metrics";
      case "audit": return "Comprehensive Carbon Audit";
      default: return "Custom Intelligence Report";
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-4xl max-h-[90vh] p-0 flex flex-col overflow-hidden border ${
        theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-[#0a0f0d] border-white/10'
      }`}>
        <DialogHeader className={`p-6 border-b ${
          theme === 'light' ? 'bg-white border-gray-200' : 'bg-black/40 border-white/10'
        }`}>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                theme === 'light' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#10b981]/10 text-[#10b981]'
              }`}>
                <FileText className="h-5 w-5" />
              </div>
              <span className={`text-xl font-bold ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}>
                {isGenerating ? "Synthesizing Data..." : getTemplateTitle()}
              </span>
            </div>
            {!isGenerating && (
              <Button 
                onClick={handleDownload} 
                disabled={isDownloading || isDownloaded}
                className={`transition-all ${
                  isDownloaded 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                    : theme === 'light'
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'bg-[#10b981] text-black hover:bg-[#34d399]'
                }`}
              >
                {isDownloading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting PDF</>
                ) : isDownloaded ? (
                  <><CheckCircle2 className="mr-2 h-4 w-4" /> Export Complete</>
                ) : (
                  <><Download className="mr-2 h-4 w-4" /> Export PDF</>
                )}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[500px]">
             <div className="w-16 h-16 border-4 border-t-[#10b981] border-r-transparent border-b-[#0ea5e9] border-l-transparent rounded-full animate-spin mb-6"></div>
             <p className={`font-mono text-sm tracking-widest animate-pulse ${
               theme === 'light' ? 'text-gray-500' : 'text-[#94a3b8]'
             }`}>AGGREGATING_TELEMETRY_DATA...</p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-8 space-y-8">
              {/* Report Document Style Container */}
              <div className={`mx-auto max-w-3xl rounded-xl p-10 shadow-2xl transition-colors duration-300 ${
                theme === 'light' 
                  ? 'bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-gray-100' 
                  : 'bg-[#111827] shadow-[0_0_50px_rgba(16,185,129,0.05)] border border-white/5'
              }`}>
                
                {/* Document Header */}
                <div className="border-b-2 border-emerald-500/20 pb-8 mb-8 text-center space-y-4">
                  <div className="inline-block px-3 py-1 mb-2 text-xs font-mono tracking-widest text-[#10b981] bg-[#10b981]/10 rounded-full border border-[#10b981]/30">
                    CONFIDENTIAL / VERIFIED
                  </div>
                  <h1 className={`text-4xl font-extrabold tracking-tight ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}>
                    {getTemplateTitle()}
                  </h1>
                  <p className={`font-mono text-sm ${
                    theme === 'light' ? 'text-gray-500' : 'text-[#64748b]'
                  }`}>
                    Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

                {/* Executive Summary */}
                <section className="mb-10">
                  <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                    theme === 'light' ? 'text-gray-800' : 'text-[#e2e8f0]'
                  }`}>
                    <Target className="h-5 w-5 text-emerald-500" /> Executive Summary
                  </h2>
                  <p className={`leading-relaxed text-sm ${
                    theme === 'light' ? 'text-gray-600' : 'text-[#94a3b8]'
                  }`}>
                    This document provides a comprehensive synthesis of the latest structural and ecological metrics derived from our multispectral and LiDAR telemetry systems. The data herein validates current asset conditions, verifying carbon stock estimates against rigorous remote sensing standards. The integration of structural height profiles and density metrics confirms a robust growth trajectory, aligning with forecasted sequestration models.
                  </p>
                </section>

                {/* Visual Data Flow Block */}
                <section className="mb-10">
                  <h2 className={`text-xl font-bold mb-6 flex items-center gap-2 ${
                    theme === 'light' ? 'text-gray-800' : 'text-[#e2e8f0]'
                  }`}>
                    <BarChart3 className="h-5 w-5 text-blue-500" /> Integrated Telemetry Matrices
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Lidar Params */}
                    <div className={`p-5 rounded-xl border ${
                      theme === 'light' ? 'bg-blue-50/50 border-blue-100' : 'bg-[#0f172a] border-blue-500/20'
                    }`}>
                      <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${
                        theme === 'light' ? 'text-blue-800' : 'text-blue-400'
                      }`}>LiDAR Point Cloud Metrics</h3>
                      <ul className="space-y-3">
                        {Object.entries(mockReportData.lidarParams).map(([key, value]) => (
                          <li key={key} className="flex justify-between items-center text-sm font-mono">
                            <span className={theme === 'light' ? 'text-gray-600' : 'text-[#64748b]'}>
                              {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                            </span>
                            <span className={`font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Carbon Params */}
                    <div className={`p-5 rounded-xl border ${
                      theme === 'light' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-[#064e3b]/20 border-emerald-500/20'
                    }`}>
                      <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${
                        theme === 'light' ? 'text-emerald-800' : 'text-emerald-400'
                      }`}>Carbon & Biomass Stock</h3>
                      <ul className="space-y-3">
                        {Object.entries(mockReportData.carbonParams).map(([key, value]) => (
                          <li key={key} className="flex justify-between items-center text-sm font-mono">
                            <span className={theme === 'light' ? 'text-gray-600' : 'text-[#64748b]'}>
                              {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                            </span>
                            <span className={`font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Mock Visualizations */}
                <section className="mb-8">
                  <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                    theme === 'light' ? 'text-gray-800' : 'text-[#e2e8f0]'
                  }`}>
                    <TrendingUp className="h-5 w-5 text-purple-500" /> Spatial Distribution Models
                  </h2>
                  
                  <div className={`mt-4 h-48 rounded-xl flex overflow-hidden relative border ${
                    theme === 'light' ? 'bg-gray-100 border-gray-200' : 'bg-black/50 border-white/5'
                  }`}>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b9811a_1px,transparent_1px),linear-gradient(to_bottom,#10b9811a_1px,transparent_1px)] bg-[size:2rem_2rem]"></div>
                    <div className="flex-1 flex flex-col justify-center items-center z-10">
                      <TreePine className={`h-8 w-8 mb-2 opacity-50 ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`} />
                      <p className={`font-mono text-xs ${theme === 'light' ? 'text-gray-500' : 'text-[#64748b]'}`}>BIOMASS_DENSITY_MAP_RENDERED</p>
                    </div>
                    <div className="w-1/3 border-l border-white/5 flex flex-col justify-center px-6 z-10 bg-black/20">
                      <div className="space-y-4">
                        <div>
                          <div className="h-2 w-full bg-gradient-to-r from-emerald-900 to-emerald-400 rounded-full mb-1"></div>
                          <p className={`text-[10px] font-mono ${theme === 'light' ? 'text-gray-500' : 'text-[#64748b]'}`}>HIGH DENSITY ZONES</p>
                        </div>
                        <div>
                          <div className="h-2 w-full bg-gradient-to-r from-blue-900 to-blue-400 rounded-full mb-1"></div>
                          <p className={`text-[10px] font-mono ${theme === 'light' ? 'text-gray-500' : 'text-[#64748b]'}`}>CARBON SINKS</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Footer Notes */}
                <div className={`mt-12 pt-6 border-t text-xs font-mono text-center ${
                  theme === 'light' ? 'border-gray-200 text-gray-400' : 'border-white/10 text-[#475569]'
                }`}>
                  DOCUMENT ID: RX-{Math.random().toString(36).substr(2, 9).toUpperCase()} | VERIFIED BY ADVANCED ALGORITHMIC MODELS
                </div>

              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReportPreviewModal;
