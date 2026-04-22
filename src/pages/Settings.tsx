import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Bell, Database, Shield, Palette } from "lucide-react";

const Settings = () => {
  const { toast } = useToast();
  const [autoProcess, setAutoProcess] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your application preferences</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger value="general">
              <User className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="processing">
              <Database className="h-4 w-4 mr-2" />
              Processing
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="p-6 bg-card border-border">
              <h3 className="text-xl font-semibold text-foreground mb-6">General Settings</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="organization">Organization Name</Label>
                    <Input
                      id="organization"
                      defaultValue="Forest Research Institute"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact">Contact Email</Label>
                    <Input
                      id="contact"
                      type="email"
                      defaultValue="contact@forest-research.org"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="default-location">Default Location</Label>
                  <Input
                    id="default-location"
                    placeholder="Enter coordinates or address"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="utc">
                    <SelectTrigger id="timezone" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern Time</SelectItem>
                      <SelectItem value="pst">Pacific Time</SelectItem>
                      <SelectItem value="cet">Central European Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="units">Measurement Units</Label>
                  <Select defaultValue="metric">
                    <SelectTrigger id="units" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metric">Metric (m, kg, ha)</SelectItem>
                      <SelectItem value="imperial">Imperial (ft, lb, ac)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="processing">
            <Card className="p-6 bg-card border-border">
              <h3 className="text-xl font-semibold text-foreground mb-6">Processing Settings</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-process" className="text-base">
                      Auto-process Uploads
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically process LiDAR files after upload
                    </p>
                  </div>
                  <Switch
                    id="auto-process"
                    checked={autoProcess}
                    onCheckedChange={setAutoProcess}
                  />
                </div>

                <div>
                  <Label htmlFor="processing-priority">Processing Priority</Label>
                  <Select defaultValue="normal">
                    <SelectTrigger id="processing-priority" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="normal">Normal Priority</SelectItem>
                      <SelectItem value="high">High Priority (Extra Cost)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="point-density">Point Cloud Density Threshold</Label>
                  <Input
                    id="point-density"
                    type="number"
                    defaultValue="50"
                    className="mt-1"
                    placeholder="Points per m²"
                  />
                </div>

                <div>
                  <Label htmlFor="height-threshold">Minimum Tree Height (m)</Label>
                  <Input
                    id="height-threshold"
                    type="number"
                    defaultValue="2.0"
                    className="mt-1"
                    step="0.1"
                  />
                </div>

                <div>
                  <Label htmlFor="ml-model">Biomass Prediction Model</Label>
                  <Select defaultValue="xgboost">
                    <SelectTrigger id="ml-model" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random-forest">Random Forest</SelectItem>
                      <SelectItem value="xgboost">XGBoost (Recommended)</SelectItem>
                      <SelectItem value="ensemble">Ensemble Model</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="p-6 bg-card border-border">
              <h3 className="text-xl font-semibold text-foreground mb-6">Notification Preferences</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enable-notifications" className="text-base">
                      Enable Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about processing status
                    </p>
                  </div>
                  <Switch
                    id="enable-notifications"
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                </div>

                {notifications && (
                  <>
                    <div className="space-y-3 pl-6 border-l-2 border-border">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm text-foreground">Upload completed</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm text-foreground">Processing finished</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm text-foreground">Processing errors</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm text-foreground">Weekly summary reports</span>
                      </label>
                    </div>

                    <div>
                      <Label htmlFor="notification-email">Notification Email</Label>
                      <Input
                        id="notification-email"
                        type="email"
                        defaultValue="user@example.com"
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card className="p-6 bg-card border-border">
              <h3 className="text-xl font-semibold text-foreground mb-6">Appearance Settings</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="dark-mode" className="text-base">
                      Dark Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">Use dark color scheme</p>
                  </div>
                  <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
                </div>

                <div>
                  <Label htmlFor="chart-style">Chart Style</Label>
                  <Select defaultValue="modern">
                    <SelectTrigger id="chart-style" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="classic">Classic</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="map-style">Map Style</Label>
                  <Select defaultValue="satellite">
                    <SelectTrigger id="map-style" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satellite">Satellite</SelectItem>
                      <SelectItem value="terrain">Terrain</SelectItem>
                      <SelectItem value="street">Street Map</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="density">Interface Density</Label>
                  <Select defaultValue="comfortable">
                    <SelectTrigger id="density" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="p-6 bg-card border-border">
              <h3 className="text-xl font-semibold text-foreground mb-6">Security Settings</h3>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="api-key">API Key</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="api-key"
                      type="password"
                      value="••••••••••••••••"
                      readOnly
                      className="flex-1"
                    />
                    <Button variant="outline">Regenerate</Button>
                  </div>
                </div>

                <div>
                  <Label>Data Retention</Label>
                  <Select defaultValue="1year">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3months">3 Months</SelectItem>
                      <SelectItem value="6months">6 Months</SelectItem>
                      <SelectItem value="1year">1 Year</SelectItem>
                      <SelectItem value="forever">Forever</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-foreground">
                      Enable two-factor authentication
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm text-foreground">Encrypt uploaded data</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm text-foreground">
                      Require authentication for API access
                    </span>
                  </label>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline">Reset to Defaults</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
