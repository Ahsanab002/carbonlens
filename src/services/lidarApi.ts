/**
 * LiDAR API Service
 * Handles all API calls to the Django backend for LiDAR data processing
 */

// Auto-detect backend URL
const getBackendUrl = (): string => {
  // Use environment variable if available, otherwise fall back to localhost for development
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return 'http://localhost:8000';
};

const API_BASE = `${getBackendUrl()}/api/lidar`;

export interface LidarDataset {
  id: number;
  name: string;
  description: string;
  file_size: number;
  upload_date: string;
  processed: boolean;
  processing_status: string;
  point_count: number;
  min_height: number;
  max_height: number;
  avg_point_density: number;
  extent: any;
}

export interface ForestCompartment {
  type: string;
  geometry: any;
  properties: {
    id: number;
    name: string;
    area_hectares: number;
    canopy_height_mean: number;
    canopy_height_max: number;
    canopy_cover_percent: number;
    height_percentile_95: number;
    height_percentile_75: number;
    height_percentile_50: number;
    crown_volume: number;
    foliage_height_diversity: number;
  };
}

export interface PointCloudData {
  x: number[];
  y: number[];
  z: number[];
  intensity?: number[];
  classification?: number[];
}

export interface PointCloudResponse {
  dataset_id: number;
  dataset_name: string;
  point_count: number;
  points: PointCloudData;
}

export interface GenerateAgbMapResponse {
  dataset_id: number;
  dataset_name: string;
  pixel_size_meters: number;
  grid_width: number;
  grid_height: number;
  pixel_count: number;
  total_agb_tonnes: number;
  total_carbon_tonnes: number;
  total_co2e_tonnes: number;
  grid: Array<{
    grid_x: number;
    grid_y: number;
    x_center: number;
    y_center: number;
    agb_mg_per_ha: number;
    carbon_t_per_ha: number;
    co2e_t_per_ha: number;
    carbon_tonnes: number;
    co2e_tonnes: number;
    confidence_score: number;
  }>;
  credit_summary?: {
    total_co2e_tonnes: number;
    buffer_percentage: number;
    net_credits: number;
    estimated_price_per_credit?: number;
    potential_revenue?: number;
  };
}

export const lidarApi = {
  /**
   * Upload a LAS/LAZ file and trigger processing
   */
  uploadDataset: async (
    file: File,
    name: string,
    description: string
  ): Promise<LidarDataset> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('description', description);

    const response = await fetch(`${API_BASE}/datasets/upload/`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  },

  /**
   * Get all datasets
   */
  getDatasets: async (): Promise<{ results: LidarDataset[] }> => {
    const response = await fetch(`${API_BASE}/datasets/`);

    if (!response.ok) {
      throw new Error('Failed to fetch datasets');
    }

    return response.json();
  },

  /**
   * Get a specific dataset with all details
   */
  getDataset: async (id: number): Promise<LidarDataset> => {
    const response = await fetch(`${API_BASE}/datasets/${id}/`);

    if (!response.ok) {
      throw new Error('Failed to fetch dataset');
    }

    return response.json();
  },

  /**
   * Get processing status of a dataset
   */
  getStatus: async (
    id: number
  ): Promise<{
    id: number;
    name: string;
    processing_status: string;
    processed: boolean;
    point_count: number;
    min_height: number;
    max_height: number;
  }> => {
    const response = await fetch(`${API_BASE}/datasets/${id}/status/`);

    if (!response.ok) {
      throw new Error('Failed to fetch status');
    }

    return response.json();
  },

  /**
   * Get point cloud data for 3D visualization
   * Returns downsampled points suitable for visualization
   */
  getPointCloud: async (id: number): Promise<PointCloudResponse> => {
    const response = await fetch(`${API_BASE}/datasets/${id}/point-cloud/`);

    if (!response.ok) {
      throw new Error('Failed to fetch point cloud');
    }

    return response.json();
  },

  /**
   * Get all compartments for a dataset as GeoJSON
   */
  getCompartments: async (
    datasetId: number
  ): Promise<{ type: string; features: ForestCompartment[] }> => {
    const response = await fetch(
      `${API_BASE}/compartments/?dataset=${datasetId}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch compartments');
    }

    return response.json();
  },

  /**
   * Get a specific compartment with metrics
   */
  getCompartment: async (id: number): Promise<ForestCompartment> => {
    const response = await fetch(`${API_BASE}/compartments/${id}/`);

    if (!response.ok) {
      throw new Error('Failed to fetch compartment');
    }

    return response.json();
  },

  /**
   * Predict biomass for a compartment
   */
  predictBiomass: async (
    compartmentId: number
  ): Promise<{
    id: number;
    compartment_name: string;
    above_ground_biomass: number;
    below_ground_biomass: number;
    total_biomass: number;
    model_name: string;
    confidence_score: number;
  }> => {
    const response = await fetch(
      `${API_BASE}/compartments/${compartmentId}/predict-biomass/`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      throw new Error('Biomass prediction failed');
    }

    return response.json();
  },

  /**
   * Get all biomass estimates
   */
  getBiomassEstimates: async (
    compartmentId?: number
  ): Promise<{
    results: Array<{
      id: number;
      compartment_name: string;
      above_ground_biomass: number;
      total_biomass: number;
      model_name: string;
      confidence_score: number;
    }>;
  }> => {
    const url = compartmentId
      ? `${API_BASE}/biomass-estimates/?compartment=${compartmentId}`
      : `${API_BASE}/biomass-estimates/`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch biomass estimates');
    }

    return response.json();
  },

  generateAgbMap: async (
    datasetId: number,
    options?: {
      pixel_size?: number;
      model_type?: string;
      credit_standard?: string;
      vintage_year?: number;
      buffer_percentage?: number;
      estimated_price?: number;
    }
  ): Promise<GenerateAgbMapResponse> => {
    const body = {
      pixel_size: options?.pixel_size ?? 10,
      model_type: options?.model_type ?? 'random_forest',
      credit_standard: options?.credit_standard,
      vintage_year: options?.vintage_year,
      buffer_percentage: options?.buffer_percentage ?? 20,
      estimated_price: options?.estimated_price,
    };

    const response = await fetch(`${API_BASE}/datasets/${datasetId}/generate-agb-map/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || 'Failed to generate AGB map');
    }

    return response.json();
  },

  /**
   * Manually trigger processing of a dataset
   */
  processDataset: async (id: number): Promise<LidarDataset> => {
    const response = await fetch(`${API_BASE}/datasets/${id}/process/`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Processing failed');
    }

    return response.json();
  },

  /**
   * Fetch a forecasting projection for future growth model
   */
  getForecast: async (
    datasetId: number,
    params: {
      current_agb: number;
      current_co2e: number;
      price?: number;
      years?: number;
      growth_rate?: number;
      buffer_percentage?: number;
    }
  ): Promise<{
    dataset_id: number;
    dataset_name: string;
    forecast: Array<{
      year: string;
      projected_agb: number;
      projected_co2e: number;
      potential_revenue: number;
    }>;
    growth_rate_used: number;
  }> => {
    const response = await fetch(`${API_BASE}/datasets/${datasetId}/forecast/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || 'Failed to generate forecast');
    }

    return response.json();
  },
};
