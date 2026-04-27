import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Database, Leaf } from "lucide-react";
import { motion } from "framer-motion";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-black">
      {/* Background Video */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          style={{ animationPlayState: 'running' }}
          onLoadedMetadata={(e) => { e.currentTarget.playbackRate = 1.25; }}
        >
          <source src="/videos/189813-887078786.mp4" type="video/mp4" />
          <source src="/videos/132793-754897675.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
      </div>

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
          className="max-w-2xl"
        >
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
          </motion.div>
      </div>
    </section>
  );
};

export default Hero;
