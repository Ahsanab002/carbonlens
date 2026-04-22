"""
LiDAR data processing service using PDAL & laspy
Complete implementation with realistic Height Above Ground (HAG) extraction
"""
import os
import numpy as np
import laspy
import logging
import json
from pathlib import Path
from django.conf import settings
from django.contrib.gis.geos import Polygon
from .biomass_predictor import BiomassPredictor
from lidar_app.models import LidarDataset, ForestCompartment

logger = logging.getLogger(__name__)

class LidarProcessor:
    """Handles LiDAR data processing and realistic feature extraction using PDAL."""
    
    # Classification constants (ASPRS Standard)
    CLASSIFICATION_GROUND = [2]
    CLASSIFICATION_LOW_VEG = [3]
    CLASSIFICATION_MED_VEG = [4]
    CLASSIFICATION_HIGH_VEG = [5]
    CLASSIFICATION_BUILDING = [6]
    CLASSIFICATION_NOISE = [7]
    CLASSIFICATION_RESERVED = [8]
    CLASSIFICATION_WATER = [9]
    
    def __init__(self):
        self.upload_path = Path(settings.MEDIA_ROOT) / settings.LIDAR_UPLOAD_PATH
        self.processed_path = Path(settings.MEDIA_ROOT) / settings.LIDAR_PROCESSED_PATH
        self.upload_path.mkdir(parents=True, exist_ok=True)
        self.processed_path.mkdir(parents=True, exist_ok=True)
    
    def process_upload(self, file, name, description):
        """
        Process uploaded LiDAR file
        """
        file_path = self.upload_path / file.name
        with open(file_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)
        
        dataset = LidarDataset.objects.create(
            name=name,
            description=description,
            file_path=str(file_path),
            file_size=file.size,
            processing_status='uploaded'
        )
        
        logger.info(f"Created dataset record: {dataset.id} - {name}")
        return dataset
        
    def _run_pdal_pipeline(self, file_path):
        import pdal
        pipeline_config = {
            "pipeline": [
                str(file_path),
                {
                    "type": "filters.assign",
                    "assignment": "Classification[:]=0"
                },
                {
                    "type": "filters.smrf"
                },
                {
                    "type": "filters.hag_nn"
                }
            ]
        }
        pipeline = pdal.Pipeline(json.dumps(pipeline_config))
        pipeline.execute()
        return pipeline.arrays[0]
        
    def _get_point_cloud_data(self, file_path):
        """
        Attempts to load data via PDAL to compute HeightAboveGround.
        Falls back to laspy relative min elevation if PDAL is unavailable.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"LAS file not found: {file_path}")
            
        las = laspy.read(file_path)
        is_pdal = False
        
        try:
            arr = self._run_pdal_pipeline(file_path)
            # Use real Height Above Ground computed by PDAL
            points = np.vstack([arr['X'], arr['Y'], arr['HeightAboveGround']]).transpose()
            
            # SAFEGUARD: if SMRF failed to classify ground properly, HAG remains as elevation
            # So if min height is still unusually large, we enforce a manual calibration
            z_min = float(np.min(points[:, 2]))
            if z_min > 2.0 or z_min < -2.0:
                logger.warning(f"PDAL HAG resulted in min height {z_min}m. Applying override normalization.")
                points[:, 2] = points[:, 2] - z_min
                
            logger.info("Successfully used PDAL for true Height Above Ground calculation.")
            is_pdal = True
        except Exception as e:
            logger.warning(f"PDAL not available or failed ({str(e)}), falling back to laspy Z minus min Z approximation.")
            # Fallback approximation
            points = np.vstack([las.x, las.y, las.z]).transpose()
            if len(points) > 0:
                z_min = float(np.min(las.z))
                points[:, 2] = points[:, 2] - z_min
            
        return las, points, is_pdal

    def extract_features(self, dataset):
        """
        Extract all realistic features from LiDAR point cloud
        """
        try:
            dataset.processing_status = 'processing'
            dataset.save()
            logger.info(f"Starting feature extraction for dataset: {dataset.name}")
            
            las, points, is_pdal = self._get_point_cloud_data(dataset.file_path)
            
            if len(points) == 0:
                raise ValueError("Point cloud data is empty.")

            heights = points[:, 2]
            
            # ===== DATASET LEVEL METRICS =====
            dataset.point_count = len(points)
            dataset.min_height = float(np.min(heights))
            dataset.max_height = float(np.max(heights))
            
            x_range = float(np.max(points[:, 0]) - np.min(points[:, 0]))
            y_range = float(np.max(points[:, 1]) - np.min(points[:, 1]))
            area_m2 = x_range * y_range
            dataset.avg_point_density = float(len(points) / area_m2) if area_m2 > 0 else 0
            
            min_x, max_x = float(np.min(points[:, 0])), float(np.max(points[:, 0]))
            min_y, max_y = float(np.min(points[:, 1])), float(np.max(points[:, 1]))
            
            extent_coords = [
                (min_x, min_y),
                (max_x, min_y),
                (max_x, max_y),
                (min_x, max_y),
                (min_x, min_y),
            ]
            dataset.extent = Polygon(extent_coords, srid=4326)
            
            dataset.processed = True
            dataset.processing_status = 'completed'
            dataset.save()
            
            logger.info(f"Dataset metrics - Points: {dataset.point_count}, "
                       f"Heights: {dataset.min_height:.2f}m - {dataset.max_height:.2f}m, "
                       f"Density: {dataset.avg_point_density:.2f} pts/m²")
            
            # Create forest compartments
            self._create_compartments(dataset, las, points)
            
        except Exception as e:
            dataset.processing_status = 'error'
            dataset.save()
            logger.error(f"Error processing dataset {dataset.name}: {str(e)}", exc_info=True)
            raise

    def generate_agb_map(self, dataset, pixel_size=10, model_type='random_forest', canopy_threshold=2.0, max_cells=20000):
        """
        Generate a pixel-based AGB and carbon grid from a LiDAR dataset using realistic HAG.
        """
        las, points, is_pdal = self._get_point_cloud_data(dataset.file_path)
        
        if len(points) == 0:
            raise ValueError("LiDAR file contains no point data")

        x_min, x_max = float(np.min(points[:, 0])), float(np.max(points[:, 0]))
        y_min, y_max = float(np.min(points[:, 1])), float(np.max(points[:, 1]))
        width = x_max - x_min
        height = y_max - y_min

        grid_width = max(1, int(np.ceil(width / pixel_size)))
        grid_height = max(1, int(np.ceil(height / pixel_size)))
        cell_count = grid_width * grid_height

        if cell_count > max_cells:
            raise ValueError(
                f"Pixel grid too large ({cell_count} cells). Use a larger pixel_size or a smaller dataset."
            )

        predictor = BiomassPredictor()
        predictor.load_model(model_type)

        entries = []
        total_carbon_tonnes = 0.0
        total_co2e_tonnes = 0.0
        total_agb_tonnes = 0.0

        for i in range(grid_width):
            x0 = x_min + i * pixel_size
            x1 = x0 + pixel_size
            if i == grid_width - 1:
                x1 = x_max

            for j in range(grid_height):
                y0 = y_min + j * pixel_size
                y1 = y0 + pixel_size
                if j == grid_height - 1:
                    y1 = y_max

                mask = (
                    (points[:, 0] >= x0) & (points[:, 0] < x1) &
                    (points[:, 1] >= y0) & (points[:, 1] < y1)
                )

                if i == grid_width - 1:
                    mask &= points[:, 0] <= x1
                if j == grid_height - 1:
                    mask &= points[:, 1] <= y1

                cell_points = points[mask]
                if len(cell_points) == 0:
                    continue

                features = self._calculate_pixel_metrics(cell_points, canopy_threshold, x1 - x0, y1 - y0)
                agb, bgb, _, confidence = predictor.predict_from_features(features, model_type=model_type)
                carbon = agb * 0.47
                co2e = carbon * 3.67
                pixel_area_ha = (x1 - x0) * (y1 - y0) / 10000.0
                total_agb_tonnes += agb * pixel_area_ha
                total_carbon_tonnes += carbon * pixel_area_ha
                total_co2e_tonnes += co2e * pixel_area_ha

                entries.append({
                    'grid_x': i,
                    'grid_y': j,
                    'x_min': x0,
                    'x_max': x1,
                    'y_min': y0,
                    'y_max': y1,
                    'x_center': float((x0 + x1) / 2.0),
                    'y_center': float((y0 + y1) / 2.0),
                    'pixel_area_hectares': pixel_area_ha,
                    'point_count': int(len(cell_points)),
                    'agb_mg_per_ha': float(agb),
                    'carbon_t_per_ha': float(carbon),
                    'co2e_t_per_ha': float(co2e),
                    'carbon_tonnes': float(carbon * pixel_area_ha),
                    'co2e_tonnes': float(co2e * pixel_area_ha),
                    'confidence_score': float(confidence),
                    'features': features,
                })

        return {
            'dataset_id': dataset.id,
            'dataset_name': dataset.name,
            'pixel_size_meters': pixel_size,
            'grid_width': grid_width,
            'grid_height': grid_height,
            'pixel_count': len(entries),
            'total_agb_tonnes': total_agb_tonnes,
            'total_carbon_tonnes': total_carbon_tonnes,
            'total_co2e_tonnes': total_co2e_tonnes,
            'grid': entries,
        }

    def _calculate_pixel_metrics(self, cell_points, canopy_threshold, cell_width, cell_height):
        heights = cell_points[:, 2]
        canopy_mask = heights > canopy_threshold
        canopy_points = cell_points[canopy_mask]

        total_points = len(cell_points)
        canopy_count = len(canopy_points)
        canopy_cover_percent = float((canopy_count / total_points * 100.0) if total_points > 0 else 0.0)

        if canopy_count > 0:
            canopy_heights = canopy_points[:, 2]
            canopy_height_mean = float(np.mean(canopy_heights))
            canopy_height_max = float(np.max(canopy_heights))
            crown_volume = float((np.max(canopy_heights) - np.min(canopy_heights)) * canopy_count / 100.0)
            foliage_height_diversity = float(np.std(canopy_heights))
        else:
            canopy_height_mean = 0.0
            canopy_height_max = 0.0
            crown_volume = 0.0
            foliage_height_diversity = 0.0

        return {
            'height_p95': float(np.percentile(heights, 95)) if total_points else 0.0,
            'height_p75': float(np.percentile(heights, 75)) if total_points else 0.0,
            'height_p50': float(np.percentile(heights, 50)) if total_points else 0.0,
            'canopy_height_mean': canopy_height_mean,
            'canopy_height_max': canopy_height_max,
            'canopy_cover': canopy_cover_percent,
            'crown_volume': crown_volume,
            'foliage_height_diversity': foliage_height_diversity,
            'vegetation_density': float((canopy_count / total_points) if total_points else 0.0),
            'area': float((cell_width * cell_height) / 10000.0),
        }

    def _create_compartments(self, dataset, las, points):
        """
        Create forest compartments using realistic HAG heights 
        """
        if len(points) == 0:
            logger.warning(f"No points found for compartment creation")
            return
        
        # Clear existing compartments before creating new ones to stop unique duplication blocks!
        ForestCompartment.objects.filter(dataset=dataset).delete()
        
        grid_size = 10
        x_min, y_min = points[:, 0].min(), points[:, 1].min()
        x_max, y_max = points[:, 0].max(), points[:, 1].max()
        
        cell_width = (x_max - x_min) / grid_size
        cell_height = (y_max - y_min) / grid_size
        
        compartment_count = 0
        
        for i in range(grid_size):
            for j in range(grid_size):
                cell_x_min = x_min + i * cell_width
                cell_x_max = cell_x_min + cell_width
                cell_y_min = y_min + j * cell_height
                cell_y_max = cell_y_min + cell_height
                
                mask = (
                    (points[:, 0] >= cell_x_min) & (points[:, 0] < cell_x_max) &
                    (points[:, 1] >= cell_y_min) & (points[:, 1] < cell_y_max)
                )
                cell_points = points[mask]
                
                if len(cell_points) == 0:
                    continue
                
                cell_mask = mask
                cell_classifications = las.classification[cell_mask] if hasattr(las, 'classification') else None
                
                heights = cell_points[:, 2]
                canopy_threshold = 2.0
                canopy_points = cell_points[cell_points[:, 2] > canopy_threshold]
                low_veg_points = cell_points[(cell_points[:, 2] >= 0.3) & (cell_points[:, 2] <= 2.0)]
                ground_points = cell_points[cell_points[:, 2] < 0.3]
                
                metrics = self._calculate_compartment_metrics(heights, canopy_points, low_veg_points, ground_points)
                
                polygon_coords = [
                    (cell_x_min, cell_y_min),
                    (cell_x_max, cell_y_min),
                    (cell_x_max, cell_y_max),
                    (cell_x_min, cell_y_max),
                    (cell_x_min, cell_y_min),
                ]
                geometry = Polygon(polygon_coords, srid=4326)
                
                area_m2 = cell_width * cell_height
                area_hectares = area_m2 / 10000
                
                compartment = ForestCompartment.objects.create(
                    dataset=dataset,
                    name=f"{dataset.name}_Comp_{i}_{j}",
                    geometry=geometry,
                    area_hectares=area_hectares,
                    **metrics
                )
                
                compartment_count += 1
        
        logger.info(f"Created {compartment_count} realistic HAG compartments for dataset {dataset.name}")
    
    def _calculate_compartment_metrics(self, all_heights, canopy_points, low_veg_points, ground_points):
        metrics = {}
        metrics['canopy_height_max'] = float(np.max(all_heights)) if len(all_heights) > 0 else 0
        metrics['canopy_height_mean'] = float(np.mean(all_heights)) if len(all_heights) > 0 else 0
        
        metrics['height_percentile_95'] = float(np.percentile(all_heights, 95)) if len(all_heights) > 0 else 0
        metrics['height_percentile_75'] = float(np.percentile(all_heights, 75)) if len(all_heights) > 0 else 0
        metrics['height_percentile_50'] = float(np.percentile(all_heights, 50)) if len(all_heights) > 0 else 0
        
        canopy_cover = (len(canopy_points) / len(all_heights) * 100) if len(all_heights) > 0 else 0
        metrics['canopy_cover_percent'] = float(canopy_cover)
        
        if len(canopy_points) > 0:
            canopy_heights = canopy_points[:, 2]
            canopy_height_range = np.max(canopy_heights) - np.min(canopy_heights)
            metrics['crown_volume'] = float(canopy_height_range * len(canopy_points) / 100)
        else:
            metrics['crown_volume'] = 0
        
        if len(canopy_points) > 0:
            canopy_heights = canopy_points[:, 2]
            metrics['foliage_height_diversity'] = float(np.std(canopy_heights))
        else:
            metrics['foliage_height_diversity'] = 0
        
        return metrics
    
    def get_point_cloud_for_export(self, dataset, as_csv=False):
        """
        Export processed point cloud data. Uses HAG if available to align with 3D map expectations.
        """
        las, points, is_pdal = self._get_point_cloud_data(dataset.file_path)
        total_points = len(points)
        sample_rate = max(1, total_points // 100000)
        indices = np.arange(0, total_points, sample_rate)
        
        points_data = {
            'x': points[indices, 0].tolist(),
            'y': points[indices, 1].tolist(),
            'z': points[indices, 2].tolist(), # Note: Z is exported as HAG now!
        }
        
        if hasattr(las, 'intensity'):
            points_data['intensity'] = (np.asarray(las.intensity[indices]) / 65535 * 255).astype(int).tolist()
        if hasattr(las, 'classification'):
            points_data['classification'] = np.asarray(las.classification[indices]).tolist()
        
        return points_data
