import { useState } from "react";
import { FileText, Download, Calendar, Filter, TrendingUp, TreePine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import ReportPreviewModal from "@/components/reports/ReportPreviewModal";

interface Report {
  id: string;
  title: string;
  type: string;
  date: string;
  compartment: string;
  status: string;
}

const Reports = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [reports] = useState<Report[]>([
    {
      id: "1",
      title: "Biomass Assessment Q4 2024",
      type: "Biomass",
      date: "2024-12-15",
      compartment: "Sector A",
      status: "completed",
    },
    {
      id: "2",
      title: "Carbon Stock Analysis",
      type: "Carbon",
      date: "2024-12-10",
      compartment: "Sector B",
      status: "completed",
    },
    {
      id: "3",
      title: "Sequestration Trends 2024",
      type: "Sequestration",
      date: "2024-11-28",
      compartment: "All Sectors",
      status: "completed",
    },
  ]);

  const handleGenerateReport = () => {
    toast({
      title: "Report generation started",
      description: "Your report will be ready in a few moments",
    });
  };

  const handleDownloadReport = (reportId: string) => {
    toast({
      title: "Downloading report",
      description: "Report is being downloaded...",
    });
  };

  const handleTemplateClick = (type: string) => {
    setSelectedTemplate(type);
    setIsReportModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate and export detailed analysis reports</p>
        </div>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="generate">Generate Report</TabsTrigger>
            <TabsTrigger value="history">Report History</TabsTrigger>
          </TabsList>

          <TabsContent value="generate">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6 bg-card border-border">
                <h3 className="text-xl font-semibold text-foreground mb-6">Report Configuration</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="report-type">Report Type</Label>
                      <Select>
                        <SelectTrigger id="report-type" className="mt-1">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
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
                      <Label htmlFor="compartment">Forest Compartment</Label>
                      <Select>
                        <SelectTrigger id="compartment" className="mt-1">
                          <SelectValue placeholder="Select compartment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Compartments</SelectItem>
                          <SelectItem value="a">Sector A</SelectItem>
                          <SelectItem value="b">Sector B</SelectItem>
                          <SelectItem value="c">Sector C</SelectItem>
                          <SelectItem value="d">Sector D</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input id="start-date" type="date" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="end-date">End Date</Label>
                      <Input id="end-date" type="date" className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="report-title">Report Title</Label>
                    <Input
                      id="report-title"
                      placeholder="Enter report title..."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Include Sections</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm text-foreground">Executive Summary</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm text-foreground">Data Visualizations</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm text-foreground">Statistical Analysis</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm text-foreground">Raw Data Tables</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm text-foreground">Recommendations</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm text-foreground">Appendices</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="format">Export Format</Label>
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" className="flex-1">
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <FileText className="h-4 w-4 mr-2" />
                        Excel
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <FileText className="h-4 w-4 mr-2" />
                        CSV
                      </Button>
                    </div>
                  </div>

                  <Button className="w-full" size="lg" onClick={handleGenerateReport}>
                    Generate Report
                  </Button>
                </div>
              </Card>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground mb-2 px-2">Quick Stats</h3>
                  
                  <Card className={`relative overflow-hidden p-6 rounded-2xl group transition-all duration-500 hover:-translate-y-1 ${
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
                            <TreePine className="h-4 w-4" />
                          </div>
                          <span className={`text-sm font-bold font-mono tracking-widest uppercase transition-colors duration-300 ${
                            theme === 'light'
                              ? 'text-gray-600'
                              : 'text-[#94a3b8]'
                          }`}>Total Biomass</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-5xl font-extrabold tracking-tight transition-colors duration-300 ${
                            theme === 'light'
                              ? 'text-gray-900'
                              : 'text-white'
                          }`}>1,245</span>
                          <span className={`text-base font-mono transition-colors duration-300 ${
                            theme === 'light'
                              ? 'text-gray-600'
                              : 'text-[#64748b]'
                          }`}>t</span>
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
                          HISTORICAL
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className={`relative overflow-hidden p-6 rounded-2xl group transition-all duration-500 hover:-translate-y-1 ${
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
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <span className={`text-sm font-bold font-mono tracking-widest uppercase transition-colors duration-300 ${
                            theme === 'light'
                              ? 'text-gray-600'
                              : 'text-[#94a3b8]'
                          }`}>Carbon Stock</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-5xl font-extrabold tracking-tight transition-colors duration-300 ${
                            theme === 'light'
                              ? 'text-gray-900'
                              : 'text-white'
                          }`}>622.5</span>
                          <span className={`text-base font-mono transition-colors duration-300 ${
                            theme === 'light'
                              ? 'text-gray-600'
                              : 'text-[#64748b]'
                          }`}>tC</span>
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
                          HISTORICAL
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className={`relative overflow-hidden p-6 rounded-2xl group transition-all duration-500 hover:-translate-y-1 ${
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
                            <Calendar className="h-4 w-4" />
                          </div>
                          <span className={`text-sm font-bold font-mono tracking-widest uppercase transition-colors duration-300 ${
                            theme === 'light'
                              ? 'text-gray-600'
                              : 'text-[#94a3b8]'
                          }`}>Last Survey</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-3xl font-extrabold tracking-tight transition-colors duration-300 ${
                            theme === 'light'
                              ? 'text-gray-900'
                              : 'text-white'
                          }`}>Dec 15, 2024</span>
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
                          HISTORICAL
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                <Card className="p-6 bg-card border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Report Templates</h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => handleTemplateClick('annual')}>
                      Annual Assessment
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => handleTemplateClick('quarterly')}>
                      Quarterly Review
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => handleTemplateClick('audit')}>
                      Carbon Audit
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => handleTemplateClick('custom')}>
                      Custom Template
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-foreground">Generated Reports</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 bg-muted rounded-lg border border-border hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1">{report.title}</h4>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {report.type}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {report.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <TreePine className="h-3 w-3" />
                            {report.compartment}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReport(report.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <ReportPreviewModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        templateType={selectedTemplate} 
      />
    </div>
  );
};

export default Reports;
