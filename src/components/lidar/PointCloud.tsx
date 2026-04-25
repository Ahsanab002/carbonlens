import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { lidarApi } from "@/services/lidarApi";

interface PointCloudProps {
  onPointSelect?: (point: any) => void;
  datasetId?: number;
  colorMode?: "height" | "elevation" | "intensity";
  pointSize?: number;
}

const getJetColor = (ratio: number) => {
  // Apply a root curve to heavily stretch the lower height ranges
  // This breaks up the "blue gap" near the ground, forcing height bumps to cycle colors rapidly!
  const t = Math.pow(Math.min(Math.max(ratio, 0), 1), 0.6);
  
  // 6 narrow, bright color bands for razor-sharp differentiation
  if (t < 0.1) {
    const f = t / 0.1;
    return [0.0, 0.0, 0.5 + f * 0.5]; // Deep Blue -> Bright Blue
  } else if (t < 0.25) {
    const f = (t - 0.1) / 0.15;
    return [0.0, f * 0.9, 1.0]; // Blue -> Cyan
  } else if (t < 0.45) {
    const f = (t - 0.25) / 0.20;
    return [0.0, 0.9 + f * 0.1, 1.0 - f]; // Cyan -> Green
  } else if (t < 0.65) {
    const f = (t - 0.45) / 0.20;
    return [f, 1.0, 0.0]; // Green -> Yellow
  } else if (t < 0.85) {
    const f = (t - 0.65) / 0.20;
    return [1.0, 1.0 - f * 0.5, 0.0]; // Yellow -> Orange
  } else {
    const f = (t - 0.85) / 0.15;
    return [1.0, 0.5 - f * 0.5, 0.0]; // Orange -> Red
  }
};

const getTerrainColor = (ratio: number) => {
  const t = Math.min(Math.max(ratio, 0), 1);
  // Realistic topographical map interpolation
  if (t < 0.2) return [0.1 + t, 0.4 + t, 0.1]; // Lowlands: Dark green
  if (t < 0.5) return [0.3 + t * 0.5, 0.6 + t * 0.3, 0.1]; // Mid: Light green
  if (t < 0.8) return [0.6 + t * 0.3, 0.7 - t * 0.3, 0.15]; // High: Brown/Yellow
  return [0.6 + t * 0.4, 0.6 + t * 0.4, 0.6 + t * 0.4]; // Peaks: Grey/White
};

const PointCloud = ({ onPointSelect, datasetId, colorMode = "height", pointSize = 0.15 }: PointCloudProps) => {
  const pointsRef = useRef<THREE.Points>(null);
  const [pointsData, setPointsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real point cloud data from backend
  useEffect(() => {
    const loadPointCloud = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!datasetId) {
          console.warn("No datasetId provided, using mock data");
          setPointsData(null);
          setLoading(false);
          return;
        }

        console.log(`[PointCloud] Fetching point cloud for dataset ${datasetId}...`);
        
        const response = await lidarApi.getPointCloud(datasetId);
        
        console.log("[PointCloud] Response received:", response);
        
        if (response && response.points) {
          setPointsData(response.points);
          console.log(`[PointCloud] Loaded ${response.point_count} points from dataset ${datasetId}`);
        } else {
          console.error("[PointCloud] Invalid response structure:", response);
          setPointsData(null);
        }
      } catch (err: any) {
        const errorMsg = err.message || "Failed to load point cloud";
        console.error("[PointCloud] Error:", errorMsg, err);
        setError(errorMsg);
        // Fall back to mock data if fetch fails
        setPointsData(null);
      } finally {
        setLoading(false);
      }
    };

    loadPointCloud();
  }, [datasetId]);

  // Generate point cloud data (either real or mock)
  const { positions, colors } = useMemo(() => {
    let count = 10000;
    let positions = new Float32Array(count * 3);
    let colors = new Float32Array(count * 3);

    // Use real data if available
    if (pointsData && pointsData.x && Array.isArray(pointsData.x)) {
      const { x, y, z } = pointsData;
      count = Math.min(x.length, 100000); // Cap at 100k points for performance

      console.log(`[PointCloud] Building geometry from ${count} real points`);

      positions = new Float32Array(count * 3);
      colors = new Float32Array(count * 3);

      if (count === 0) {
        console.warn("[PointCloud] No points found in dataset");
        return { positions, colors };
      }

      // Calculate min/max for normalization
      let minHeight = Infinity, maxHeight = -Infinity;
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      for (let i = 0; i < count; i++) {
        minHeight = Math.min(minHeight, z[i]);
        maxHeight = Math.max(maxHeight, z[i]);
        minX = Math.min(minX, x[i]);
        maxX = Math.max(maxX, x[i]);
        minY = Math.min(minY, y[i]);
        maxY = Math.max(maxY, y[i]);
      }

      const heightRange = maxHeight - minHeight || 1;
      const xCenter = (minX + maxX) / 2;
      const yCenter = (minY + maxY) / 2;
      const xScale = (maxX - minX) || 1;
      const yScale = (maxY - minY) || 1;

      console.log(
        `[PointCloud] Normalized bounds - Height: ${minHeight.toFixed(2)}-${maxHeight.toFixed(2)}m, ` +
        `X: ${minX.toFixed(2)}-${maxX.toFixed(2)}, Y: ${minY.toFixed(2)}-${maxY.toFixed(2)}`
      );

      let minIntensity = Infinity;
      let maxIntensity = -Infinity;
      const hasIntensity = Array.isArray(pointsData.intensity) && pointsData.intensity.length > 0;
      if (hasIntensity) {
        for (let i = 0; i < count; i++) {
          minIntensity = Math.min(minIntensity, pointsData.intensity[i]);
          maxIntensity = Math.max(maxIntensity, pointsData.intensity[i]);
        }
      }

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Normalize positions
        positions[i3] = ((x[i] - xCenter) / xScale) * 10; // X
        positions[i3 + 1] = ((z[i] - minHeight) / heightRange) * 10; // Y = height
        positions[i3 + 2] = ((y[i] - yCenter) / yScale) * 10; // Z

        const heightRatio = (z[i] - minHeight) / heightRange;
        let r = 0;
        let g = 0;
        let b = 0;

        if (colorMode === "height") {
          [r, g, b] = getJetColor(heightRatio);
        } else if (colorMode === "elevation") {
          [r, g, b] = getTerrainColor(heightRatio);
        } else if (colorMode === "intensity" && hasIntensity) {
          const intensity = pointsData.intensity[i];
          const rawRatio = maxIntensity > minIntensity ? (intensity - minIntensity) / (maxIntensity - minIntensity) : 0;
          // Apply an exponential lifting curve because LiDAR intensity suffers from heavy positive skewness (extreme outliers washing out details)
          const distinctBoost = Math.pow(Math.min(1, Math.max(0, rawRatio)), 0.35);
          
          r = distinctBoost;
          g = distinctBoost * 0.98; // Subtle warm grayscale
          b = distinctBoost * 0.90;
        } else {
          [r, g, b] = getJetColor(heightRatio);
        }

        colors[i3] = r;
        colors[i3 + 1] = g;
        colors[i3 + 2] = b;
      }

      console.log(`[PointCloud] Geometry built successfully`);
    } else {
      // Fallback: Generate mock LiDAR point cloud data
      console.log("[PointCloud] Using mock data");

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Create a forest-like structure with varying heights
        const x = (Math.random() - 0.5) * 15;
        const z = (Math.random() - 0.5) * 15;
        const y = Math.max(0, Math.random() * 8 - Math.abs(x * 0.2) - Math.abs(z * 0.2));

        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;

        // Color based on height (gradient from green to cyan)
        const heightRatio = y / 8;
        colors[i3] = 0.0 + heightRatio * 0.5; // R
        colors[i3 + 1] = 0.8 + heightRatio * 0.2; // G
        colors[i3 + 2] = 0.3 + heightRatio * 0.7; // B
      }
    }

    return { positions, colors };
  }, [pointsData, colorMode]);
  
  // Subtle animation
  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });
  
  return (
    <points ref={pointsRef} key={`${pointsData ? 'real' : 'mock'}-${positions.length}`}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={pointSize}
        vertexColors={true}
        transparent={true}
        opacity={0.92}
        sizeAttenuation={true}
        toneMapped={false}
      />
    </points>
  );
};

export default PointCloud;
