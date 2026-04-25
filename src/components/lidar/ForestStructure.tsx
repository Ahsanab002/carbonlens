import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ForestStructureProps {
  compartments: any[];
}

const ForestStructure = ({ compartments }: ForestStructureProps) => {
  const total = compartments.length;
  const emergentCount = compartments.filter(
    (comp) => comp.properties.canopy_height_max > 30
  ).length;
  const canopyCount = compartments.filter(
    (comp) => comp.properties.canopy_height_max <= 30 && comp.properties.canopy_height_max > 15
  ).length;
  const understoryCount = compartments.filter(
    (comp) => comp.properties.canopy_height_max <= 15
  ).length;

  const layers = [
    {
      name: "Emergent Layer",
      height: "> 30m",
      coverage: total ? Math.round((emergentCount / total) * 100) : 0,
    },
    {
      name: "Canopy Layer",
      height: "15-30m",
      coverage: total ? Math.round((canopyCount / total) * 100) : 0,
    },
    {
      name: "Understory",
      height: "5-15m",
      coverage: total ? Math.round((understoryCount / total) * 100) : 0,
    },
  ];

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-xl font-semibold mb-4 text-foreground">Forest Structure</h3>
      <div className="space-y-4">
        {layers.map((layer) => (
          <div key={layer.name} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-medium">{layer.name}</span>
              <span className="text-muted-foreground">{layer.height}</span>
            </div>
            <Progress value={layer.coverage} className="h-2" />
            <div className="text-right text-xs text-primary">{layer.coverage}% coverage</div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ForestStructure;
