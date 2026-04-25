import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload as UploadIcon, Loader, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { lidarApi } from "@/services/lidarApi";

interface UploadedFile {
  name: string;
  size: number;
  status: "uploading" | "processing" | "completed" | "error";
  progress: number;
  dataset?: any;
  error?: string;
}

const Upload = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [datasetName, setDatasetName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [agbMap, setAgbMap] = useState<any | null>(null);
  const [pixelSize, setPixelSize] = useState(10);
  const [creditStandard, setCreditStandard] = useState("VCS");
  const [vintageYear, setVintageYear] = useState<number>(new Date().getFullYear());
  const [estimatedPrice, setEstimatedPrice] = useState<number>(10);
  const [mapLoading, setMapLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      if (isValidFile(file)) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid file",
          description: "Please upload a .las or .laz file",
          variant: "destructive",
        });
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (isValidFile(file)) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid file",
          description: "Please upload a .las or .laz file",
          variant: "destructive",
        });
      }
    }
  };

  const isValidFile = (file: File): boolean => {
    return file.name.endsWith(".las") || file.name.endsWith(".laz");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file",
        variant: "destructive",
      });
      return;
    }

    if (!datasetName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a dataset name",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    const newFile: UploadedFile = {
      name: selectedFile.name,
      size: selectedFile.size,
      status: "uploading",
      progress: 0,
    };

    setFiles((prev) => [...prev, newFile]);
    const fileIndex = files.length;

    try {
      // Update progress
      const updateProgress = (progress: number, status: UploadedFile["status"]) => {
        setFiles((prev) => {
          const updated = [...prev];
          if (updated[fileIndex]) {
            updated[fileIndex].progress = progress;
            updated[fileIndex].status = status;
          }
          return updated;
        });
      };

      // Start upload
      updateProgress(25, "uploading");

      const dataset = await lidarApi.uploadDataset(
        selectedFile,
        datasetName,
        description
      );

      updateProgress(50, "processing");

      const agbResult = await lidarApi.generateAgbMap(dataset.id, {
        pixel_size: pixelSize,
        model_type: "random_forest",
        credit_standard: creditStandard,
        vintage_year: vintageYear,
        buffer_percentage: 20,
        estimated_price: estimatedPrice,
      });

      updateProgress(100, "completed");
      setAgbMap(agbResult);

      const lastAgbMap = { datasetId: dataset.id, agbMap: agbResult };
      localStorage.setItem("lastAgbMap", JSON.stringify(lastAgbMap));

      // Update file with dataset info
      setFiles((prev) => {
        const updated = [...prev];
        if (updated[fileIndex]) {
          updated[fileIndex].dataset = dataset;
        }
        return updated;
      });

      toast({
        title: "Success!",
        description: `Dataset processed and AGB map generated: ${dataset.point_count.toLocaleString()} points`,
      });

      // Reset form
      setSelectedFile(null);
      setDatasetName("");
      setDescription("");
      navigate("/carbon", { state: { lastAgbMap } });

    } catch (error: any) {
      const errorMessage = error.message || "Upload failed";

      setFiles((prev) => {
        const updated = [...prev];
        if (updated[fileIndex]) {
          updated[fileIndex].status = "error";
          updated[fileIndex].error = errorMessage;
        }
        return updated;
      });

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const generateAgbMap = async (datasetId: number) => {
    setMapLoading(true);
    setAgbMap(null);

    try {
      const result = await lidarApi.generateAgbMap(datasetId, {
        pixel_size: pixelSize,
        model_type: "random_forest",
        credit_standard: creditStandard,
        vintage_year: vintageYear,
        buffer_percentage: 20,
        estimated_price: estimatedPrice,
      });
      setAgbMap(result);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate AGB map",
        variant: "destructive",
      });
    } finally {
      setMapLoading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Upload LiDAR Data
          </h1>
          <p className="text-muted-foreground">
            Upload and process LAS/LAZ files. Metrics will be automatically calculated.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Drop Zone */}
            <Card className="p-8 bg-card border-border">
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
                  dragActive
                    ? "border-primary bg-primary/10"
                    : "border-muted-foreground/30 bg-muted/30"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <UploadIcon className="h-16 w-16 mx-auto mb-4 text-primary opacity-80" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Drag & Drop Your LAS File
                </h3>
                <p className="text-muted-foreground mb-6">
                  or click to browse
                </p>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileInput}
                  accept=".las,.laz"
                  disabled={uploading}
                />
                <label htmlFor="file-upload">
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    disabled={uploading}
                    asChild
                  >
                    <span>Browse Files</span>
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground mt-4">
                  Supported: LAS, LAZ (Max 500MB)
                </p>
              </div>

              {selectedFile && !uploading && (
                <div className="mt-6 p-4 bg-muted rounded-lg border border-primary/30">
                  <p className="text-sm font-medium text-foreground">Selected File:</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                </div>
              )}
            </Card>

            {/* Uploaded Files List */}
            {files.length > 0 && (
              <Card className="p-6 bg-card border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Processing History</h3>
                <div className="space-y-3">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="p-4 bg-muted rounded-lg border border-border hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                              file.status === "completed"
                                ? "bg-green-500/20"
                                : file.status === "error"
                                ? "bg-red-500/20"
                                : "bg-blue-500/20"
                            }`}
                          >
                            {file.status === "completed" && (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                            {file.status === "error" && (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            )}
                            {(file.status === "uploading" || file.status === "processing") && (
                              <Loader className="h-5 w-5 text-blue-500 animate-spin" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)} • {file.status}
                            </p>
                          </div>
                        </div>
                        {file.status === "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span className="capitalize">{file.status}</span>
                          <span>{file.progress}%</span>
                        </div>
                        <Progress value={file.progress} className="h-2" />
                      </div>

                      {/* Dataset Info */}
                      {file.dataset && (
                        <div className="mt-3 pt-3 border-t border-border text-xs space-y-1">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Points:</span>
                            <span className="text-foreground font-medium">
                              {file.dataset.point_count.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Density:</span>
                            <span className="text-foreground font-medium">
                              {file.dataset.avg_point_density.toFixed(1)} pts/m²
                            </span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Height Range:</span>
                            <span className="text-foreground font-medium">
                              {file.dataset.min_height.toFixed(1)}m - {file.dataset.max_height.toFixed(1)}m
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Error Message */}
                      {file.error && (
                        <div className="mt-3 pt-3 border-t border-border bg-red-500/10 text-red-500 text-xs rounded p-2">
                          {file.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Dataset Info Form */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Dataset Details</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="dataset-name" className="text-sm font-medium">
                    Dataset Name *
                  </Label>
                  <Input
                    id="dataset-name"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    placeholder="e.g., Forest_Plot_01"
                    className="mt-2"
                    disabled={uploading}
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional: Add notes about this dataset..."
                    className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground mt-2 disabled:opacity-50"
                    disabled={uploading}
                  />
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || !datasetName.trim() || uploading}
                  className="w-full bg-primary hover:bg-primary/90 mt-4"
                >
                  {uploading ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <UploadIcon className="mr-2 h-4 w-4" />
                      Upload & Process
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Model & Carbon Workflow */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">AGB & Carbon Workflow</h3>
              <div className="space-y-4">
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="pixel-size" className="text-sm font-medium">
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
                    <Label htmlFor="credit-standard" className="text-sm font-medium">
                      Credit Standard
                    </Label>
                    <Input
                      id="credit-standard"
                      value={creditStandard}
                      onChange={(e) => setCreditStandard(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vintage-year" className="text-sm font-medium">
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
                    <Label htmlFor="estimated-price" className="text-sm font-medium">
                      Estimated Price / Credit (USD)
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
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const last = files[files.length - 1];
                    if (last?.dataset) {
                      generateAgbMap(last.dataset.id);
                    }
                  }}
                  disabled={mapLoading || !files.length || !files[files.length - 1]?.dataset}
                >
                  {mapLoading ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Updating AGB Map...
                    </>
                  ) : (
                    "Recalculate AGB & Carbon"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  After upload, the model predicts per-pixel AGB and carbon stock, then estimates net credits.
                </p>
              </div>
            </Card>

            {/* AGB Map Summary */}
            {agbMap && (
              <Card className="p-6 bg-card border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">AGB Map Summary</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Total AGB</span>
                    <span className="text-foreground">{agbMap.total_agb_tonnes.toFixed(2)} t</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Total Carbon</span>
                    <span className="text-foreground">{agbMap.total_carbon_tonnes.toFixed(2)} t</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Total CO₂e</span>
                    <span className="text-foreground">{agbMap.total_co2e_tonnes.toFixed(2)} t</span>
                  </div>
                  {agbMap.credit_summary && (
                    <>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Net Credits</span>
                        <span className="text-foreground">{agbMap.credit_summary.net_credits.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Revenue</span>
                        <span className="text-foreground">
                          {agbMap.credit_summary.potential_revenue !== null
                            ? `$${agbMap.credit_summary.potential_revenue.toFixed(2)}`
                            : "N/A"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* What Gets Calculated */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Metrics Calculated</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Point count & density</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Height statistics</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Canopy cover %</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Crown volume</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Forest compartments</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
