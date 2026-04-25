import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import Navigation from "./components/Navigation";
import BackgroundEffect from "./components/BackgroundEffect";
import Index from "./pages/Index";
import LidarDashboard from "./pages/LidarDashboard";
import CarbonDashboard from "./pages/CarbonDashboard";
import Upload from "./pages/Upload";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="dark" storageKey="carbonlens-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <BackgroundEffect />
        <Navigation />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/lidar" element={<LidarDashboard />} />
          <Route path="/carbon" element={<CarbonDashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
