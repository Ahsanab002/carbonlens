import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Database, Leaf, TrendingUp, Cpu, Cloud, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import Hero from "@/components/Hero";

const Index = () => {
  const features = [
    {
      icon: Database,
      title: "3D Point Cloud Visualization",
      description: "Explore UAV-captured LiDAR data with interactive 3D visualization powered by Three.js",
    },
    {
      icon: Leaf,
      title: "Carbon Sequestration",
      description: "Real-time carbon stock monitoring and sequestration analysis with spatial mapping",
    },
    {
      icon: TrendingUp,
      title: "Biomass Estimation",
      description: "ML-powered AGB prediction using Random Forest and XGBoost models",
    },
    {
      icon: Cpu,
      title: "Real-time Processing",
      description: "Edge computing integration with field prototypes for instant data analysis",
    },
    {
      icon: Cloud,
      title: "Cloud Integration",
      description: "Seamless data sync from IoT devices to cloud storage and processing",
    },
    {
      icon: BarChart3,
      title: "Credit Calculation",
      description: "REDD+ compliant carbon credit calculation and reporting framework",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <Hero />

      {/* Features Section */}
      <section className="py-24 bg-card/20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4 text-foreground">
              Advanced Features
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools for forest monitoring and carbon management
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 40, scale: 0.98 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: index * 0.08 }}
                    viewport={{ once: true, amount: 0.2 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    whileTap={{ scale: 0.995 }}
                  >
                    <Card className="p-6 h-full bg-card border-border transition-all hover:border-primary/50">
                      <Icon className="h-12 w-12 text-primary mb-4" />
                      <h3 className="text-xl font-semibold mb-2 text-foreground">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </Card>
                  </motion.div>
                );
              })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-10" />
        <div className="container mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-4xl font-bold mb-6 text-foreground">
              Ready to Transform Forest Monitoring?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Start analyzing your LiDAR data and unlock carbon credit potential today
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/lidar">
                <Button size="lg" className="bg-gradient-primary shadow-glow-strong">
                  Get Started
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
