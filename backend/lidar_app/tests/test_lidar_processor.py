"""
Test cases for LiDAR processor and feature extraction
"""
import os
import tempfile
import numpy as np
import laspy
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db.models.signals import post_save
from pathlib import Path
from lidar_app.models import LidarDataset, ForestCompartment
from lidar_app.services.lidar_processor import LidarProcessor
import logging

logger = logging.getLogger(__name__)


class LidarProcessorTestCase(TestCase):
    """Test cases for LiDAR processor"""
    
    def setUp(self):
        """Create test LAS file"""
        self.processor = LidarProcessor()
        self.las_file = self._create_test_las_file()
    
    def _create_test_las_file(self):
        """Generate a test LAS file with mock LiDAR data"""
        temp_file = tempfile.NamedTemporaryFile(suffix='.las', delete=False)
        
        # Create LAS writer
        header = laspy.create(point_format=2)
        
        # Generate mock point cloud data (1000 points)
        num_points = 1000
        header.x = np.random.uniform(0, 100, num_points)
        header.y = np.random.uniform(0, 100, num_points)
        header.z = np.random.uniform(0, 50, num_points)
        
        # Add classification (2 = ground, 1 = unclassified, 3+ = vegetation)
        header.classification = np.random.randint(1, 5, num_points)
        
        # Add intensity (0-65535)
        header.intensity = np.random.randint(0, 65536, num_points, dtype=np.uint16)
        
        header.write(temp_file.name)
        temp_file.close()
        
        return temp_file.name
    
    def tearDown(self):
        """Clean up test files"""
        if os.path.exists(self.las_file):
            os.remove(self.las_file)
    
    def test_process_upload(self):
        """Test uploading a LAS file"""
        # Disconnect signal temporarily to test just the upload
        from lidar_app.signals import process_lidar_on_upload
        post_save.disconnect(process_lidar_on_upload, sender=LidarDataset)
        
        try:
            with open(self.las_file, 'rb') as f:
                uploaded_file = SimpleUploadedFile(
                    "test.las",
                    f.read(),
                    content_type="application/octet-stream"
                )
            
            dataset = self.processor.process_upload(
                uploaded_file,
                name="Test Dataset",
                description="Test LAS file"
            )
            
            self.assertIsNotNone(dataset.id)
            self.assertEqual(dataset.name, "Test Dataset")
            # Dataset should have 'uploaded' status immediately after process_upload
            self.assertEqual(dataset.processing_status, "uploaded")
            self.assertTrue(os.path.exists(dataset.file_path))
        finally:
            # Reconnect signal
            post_save.connect(process_lidar_on_upload, sender=LidarDataset)
    
    def test_extract_features(self):
        """Test extracting features from LAS file"""
        dataset = LidarDataset.objects.create(
            name="Test Dataset",
            description="Test",
            file_path=self.las_file,
            file_size=os.path.getsize(self.las_file),
            processing_status='uploaded'
        )
        
        # Extract features
        self.processor.extract_features(dataset)
        
        # Refresh from database
        dataset.refresh_from_db()
        
        # Assert statistics were calculated
        self.assertEqual(dataset.processing_status, 'completed')
        self.assertTrue(dataset.processed)
        self.assertGreater(dataset.point_count, 0)
        self.assertIsNotNone(dataset.min_height)
        self.assertIsNotNone(dataset.max_height)
        self.assertGreater(dataset.avg_point_density, 0)
        self.assertIsNotNone(dataset.extent)
        
        logger.info(f"Dataset metrics - Points: {dataset.point_count}, "
                   f"Heights: {dataset.min_height}-{dataset.max_height}, "
                   f"Density: {dataset.avg_point_density}")
    
    def test_compartment_creation(self):
        """Test that compartments are created from point cloud"""
        dataset = LidarDataset.objects.create(
            name="Test Dataset",
            description="Test",
            file_path=self.las_file,
            file_size=os.path.getsize(self.las_file),
            processing_status='uploaded'
        )
        
        # Extract features (which creates compartments)
        self.processor.extract_features(dataset)
        
        # Check compartments were created
        compartments = ForestCompartment.objects.filter(dataset=dataset)
        self.assertGreater(compartments.count(), 0)
        
        # Check compartment metrics
        for compartment in compartments:
            self.assertGreater(compartment.canopy_height_max, 0)
            self.assertGreater(compartment.area_hectares, 0)
            self.assertIsNotNone(compartment.geometry)
            # Metrics should be calculated
            self.assertIsNotNone(compartment.canopy_cover_percent)
            self.assertIsNotNone(compartment.foliage_height_diversity)
    
    def test_height_metrics_calculation(self):
        """Test height metrics calculation"""
        heights = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 10.0, 15.0, 20.0, 25.0, 30.0])
        
        metrics = self.processor.calculate_height_metrics(heights)
        
        self.assertIn('p95', metrics)
        self.assertIn('p75', metrics)
        self.assertIn('p50', metrics)
        self.assertIn('mean', metrics)
        self.assertIn('max', metrics)
        self.assertEqual(metrics['max'], 30.0)
        self.assertGreater(metrics['mean'], 0)
        self.assertGreater(metrics['std'], 0)
    
    def test_canopy_metrics_calculation(self):
        """Test canopy metrics calculation"""
        points = np.array([
            [0, 0, 0.5],    # ground
            [1, 1, 0.8],    # ground
            [2, 2, 3.0],    # canopy
            [3, 3, 5.0],    # canopy
            [4, 4, 8.0],    # canopy
        ])
        
        metrics = self.processor.calculate_canopy_metrics(points, threshold=2.0)
        
        self.assertIn('canopy_cover', metrics)
        self.assertIn('canopy_height_mean', metrics)
        self.assertIn('canopy_height_max', metrics)
        self.assertIn('canopy_point_count', metrics)
        self.assertIn('vegetation_density', metrics)
        
        # 3 out of 5 points are canopy = 60%
        self.assertEqual(metrics['canopy_cover'], 60.0)
        self.assertEqual(metrics['canopy_point_count'], 3)
    
    def test_point_cloud_export(self):
        """Test point cloud export for visualization"""
        dataset = LidarDataset.objects.create(
            name="Test Dataset",
            description="Test",
            file_path=self.las_file,
            file_size=os.path.getsize(self.las_file),
            processing_status='uploaded'
        )
        
        # Extract features first
        self.processor.extract_features(dataset)
        dataset.refresh_from_db()
        
        # Export point cloud
        point_cloud_data = self.processor.get_point_cloud_for_export(dataset)
        
        self.assertIn('x', point_cloud_data)
        self.assertIn('y', point_cloud_data)
        self.assertIn('z', point_cloud_data)
        self.assertEqual(len(point_cloud_data['x']), len(point_cloud_data['y']))
        self.assertEqual(len(point_cloud_data['x']), len(point_cloud_data['z']))
        
        # Should have at least some points
        self.assertGreater(len(point_cloud_data['x']), 0)
