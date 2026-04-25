import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Database, Leaf, Home, Upload, BarChart3, FileText, Settings, Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

const Navigation = () => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-transparent backdrop-blur-lg border-b border-border/20">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Leaf className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              SYLVIX
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link to="/">
              <Button
                variant={isActive("/") ? "default" : "ghost"}
                className={isActive("/") ? "bg-gradient-primary" : ""}
                size="sm"
              >
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
            <Link to="/lidar">
              <Button
                variant={isActive("/lidar") ? "default" : "ghost"}
                className={isActive("/lidar") ? "bg-gradient-primary" : ""}
                size="sm"
              >
                <Database className="mr-2 h-4 w-4" />
                LiDAR
              </Button>
            </Link>
            <Link to="/carbon">
              <Button
                variant={isActive("/carbon") ? "default" : "ghost"}
                className={isActive("/carbon") ? "bg-gradient-primary" : ""}
                size="sm"
              >
                <Leaf className="mr-2 h-4 w-4" />
                Carbon
              </Button>
            </Link>
            <Link to="/upload">
              <Button
                variant={isActive("/upload") ? "default" : "ghost"}
                className={isActive("/upload") ? "bg-gradient-primary" : ""}
                size="sm"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </Link>
            <Link to="/analytics">
              <Button
                variant={isActive("/analytics") ? "default" : "ghost"}
                className={isActive("/analytics") ? "bg-gradient-primary" : ""}
                size="sm"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </Button>
            </Link>
            <Link to="/reports">
              <Button
                variant={isActive("/reports") ? "default" : "ghost"}
                className={isActive("/reports") ? "bg-gradient-primary" : ""}
                size="sm"
              >
                <FileText className="mr-2 h-4 w-4" />
                Reports
              </Button>
            </Link>
            <Link to="/settings">
              <Button
                variant={isActive("/settings") ? "default" : "ghost"}
                className={isActive("/settings") ? "bg-gradient-primary" : ""}
                size="sm"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </Link>
            <div className="mx-2 w-px h-6 bg-border/50"></div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="bg-transparent border-border/40 hover:bg-muted"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4 text-foreground" />}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
