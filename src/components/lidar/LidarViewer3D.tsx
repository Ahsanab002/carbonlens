import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei";
import { Suspense } from "react";
import PointCloud from "./PointCloud";

interface LidarViewer3DProps {
  onPointSelect?: (point: any) => void;
  datasetId?: number;
  datasetMinHeight?: number;
  datasetMaxHeight?: number;
  colorMode?: "height" | "elevation" | "intensity";
  pointSize?: number;
}

const LidarViewer3D = ({
  onPointSelect,
  datasetId,
  datasetMinHeight,
  datasetMaxHeight,
  colorMode = "height",
  pointSize = 0.15,
}: LidarViewer3DProps) => {
  const legendTitle =
    colorMode === "height"
      ? "Height above ground"
      : colorMode === "elevation"
      ? "Elevation"
      : "Intensity";

  return (
    <div className="relative w-full h-[500px] bg-background rounded-lg overflow-hidden">
      <Canvas className="h-full">
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 5, 10]} />
          <OrbitControls enableDamping dampingFactor={0.05} />
          
          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} color="#7fbf9a" />
          
          {/* Stars background */}
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          {/* Point Cloud - Now with real data */}
          <PointCloud
            onPointSelect={onPointSelect}
            datasetId={datasetId}
            colorMode={colorMode}
            pointSize={pointSize}
          />
          
          {/* Ground grid */}
          <gridHelper args={[20, 20, "#7fbf9a", "#0f172a"]} />
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute right-4 top-4 z-10 flex flex-col items-end gap-3">
        <div className="w-24 rounded-2xl border border-white/10 bg-slate-950/80 p-3 text-white shadow-xl shadow-black/40 backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">{legendTitle}</p>
          <div className="mt-3 h-28 w-10 rounded-lg border border-white/15 bg-gradient-to-t from-blue-600 via-lime-300 to-red-500" />
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-300">
            <span>{datasetMinHeight !== undefined ? `${datasetMinHeight.toFixed(1)}m` : "Low"}</span>
            <span>{datasetMaxHeight !== undefined ? `${datasetMaxHeight.toFixed(1)}m` : "High"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LidarViewer3D;
