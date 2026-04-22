import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Database, Leaf } from "lucide-react";
import { motion } from "framer-motion";

const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Background imagery effects: soft tree silhouettes */}
      <svg className="absolute left-0 bottom-0 w-1/3 opacity-10 pointer-events-none" viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0" stopColor="hsl(142 40% 36%)" stopOpacity="0.14" />
            <stop offset="1" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="600" height="200" fill="url(#g1)" />
        <g fill="hsl(142 40% 36%)">
          <path d="M30 160 C60 80, 120 80, 150 160 L30 160 Z" />
          <path d="M120 160 C150 90, 210 90, 240 160 L120 160 Z" />
        </g>
      </svg>
      {/* Decorative soft shapes */}
      <div className="absolute -left-24 -top-24 w-80 h-80 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl opacity-40 pointer-events-none" />
      <div className="absolute -right-24 top-16 w-64 h-64 rounded-full bg-gradient-to-tr from-primary/10 to-transparent blur-2xl opacity-30 pointer-events-none" />

      <div className="container mx-auto px-6 py-24 relative">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
        >
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">
              <span className="bg-gradient-primary bg-clip-text text-transparent">CARBON LENS</span>
              <br />
              <span className="text-foreground">LiDAR Biomass & Carbon Intelligence</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-6">
              Turn UAV LiDAR into actionable insights — accurate biomass estimation,
              spatial carbon stock maps, and streamlined credit calculation for
              sustainable forest management.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link to="/lidar">
                <Button size="lg" className="bg-gradient-primary border-0">
                  <Database className="mr-2 h-5 w-5" />
                  Explore LiDAR
                </Button>
              </Link>

              <Link to="/carbon">
                <Button size="lg" variant="outline" className="border-primary/30 hover:bg-primary/8">
                  <Leaf className="mr-2 h-5 w-5" />
                  View Carbon Maps
                </Button>
              </Link>
            </div>

            <div className="mt-6 text-sm text-muted-foreground">
              <span className="mr-2">Trusted by researchers, NGOs, and practitioners.</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9 }}
            className="order-first lg:order-last"
          >
            <div className="w-full rounded-lg overflow-hidden shadow-sm bg-card/60 border border-border">
              <div className="p-6">
                <div className="h-56 rounded-md overflow-hidden relative bg-neutral-900">
                  {/* Forest image (Unsplash) with subtle overlay and gentle motion */}
                  <motion.img
                    src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80"
                    alt="Forest canopy"
                    className="absolute inset-0 w-full h-full object-cover"
                    initial={{ scale: 1.03 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 12, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/6" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center text-primary-foreground">
                      <div className="text-2xl font-semibold">Interactive Preview</div>
                      <div className="text-sm mt-2 text-muted-foreground">Point clouds, carbon maps, and charts</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="p-3 bg-card rounded text-center">
                    <div className="text-sm font-bold text-muted-foreground">Point Density</div>
                    <div className="text-lg font-bold text-foreground">125.4 pts/m²</div>
                  </div>
                  <div className="p-3 bg-card rounded text-center">
                    <div className="text-sm font-bold text-muted-foreground">Carbon Stock</div>
                    <div className="text-lg font-bold text-foreground">1,523 tC/ha</div>
                  </div>
                  <div className="p-3 bg-card rounded text-center">
                    <div className="text-sm font-bold text-muted-foreground">Sequestration</div>
                    <div className="text-lg font-bold text-foreground">89.4 tCO₂/yr</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
