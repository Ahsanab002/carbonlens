"""
API tests for LiDAR endpoints
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
import os
import tempfile
import numpy as np
import laspy
from lidar_app.models import LidarDataset, ForestCompartment


class LidarAPITestCase(TestCase):
    """Test LiDAR API endpoints"""
    
    def setUp(self):
        """Set up test client and data"""
        self.client = APIClient()
        self.las_file = self._create_test_las_file()
    
    def _create_test_las_file(self):
        """Generate a test LAS file"""
        temp_file = tempfile.NamedTemporaryFile(suffix='.las', delete=False)
        
        header = laspy.create(point_format=2)
        num_points = 500
        header.x = np.random.uniform(0, 100, num_points)
        header.y = np.random.uniform(0, 100, num_points)
        header.z = np.random.uniform(0, 50, num_points)
        header.classification = np.random.randint(1, 5, num_points)
        header.intensity = np.random.randint(0, 65536, num_points, dtype=np.uint16)
        
        header.write(temp_file.name)
        temp_file.close()
        
        return temp_file.name
    
    def tearDown(self):
        """Clean up"""
        if os.path.exists(self.las_file):
            os.remove(self.las_file)
    
    def test_list_datasets(self):
        """Test listing LiDAR datasets"""
        url = reverse('lidar-dataset-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_upload_dataset(self):
        """Test uploading a LiDAR dataset"""
        url = reverse('lidar-dataset-upload')
        
        with open(self.las_file, 'rb') as f:
            data = {
                'file': f,
                'name': 'Test Upload',
                'description': 'API test upload'
            }
            response = self.client.post(url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['name'], 'Test Upload')
        # Processing status may be 'uploaded' or 'completed' depending on signal timing
        self.assertIn(response.data['processing_status'], ['uploaded', 'completed', 'processing'])
    
    def test_invalid_file_format(self):
        """Test that non-LAS files are rejected"""
        url = reverse('lidar-dataset-upload')
        
        # Create a text file instead of LAS
        temp_file = tempfile.NamedTemporaryFile(suffix='.txt', delete=False)
        temp_file.write(b"This is not a LAS file")
        temp_file.close()
        
        try:
            with open(temp_file.name, 'rb') as f:
                data = {
                    'file': f,
                    'name': 'Invalid File',
                }
                response = self.client.post(url, data, format='multipart')
            
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('error', response.data)
        finally:
            os.remove(temp_file.name)
    
    def test_get_dataset_status(self):
        """Test getting dataset processing status"""
        # Create a dataset
        dataset = LidarDataset.objects.create(
            name="Status Test Dataset",
            description="Test",
            file_path=self.las_file,
            file_size=os.path.getsize(self.las_file),
            processing_status='completed',
            processed=True,
            point_count=1000,
            min_height=0.0,
            max_height=50.0,
            avg_point_density=10.0
        )
        
        url = reverse('lidar-dataset-status', args=[dataset.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], dataset.id)
        self.assertEqual(response.data['processing_status'], 'completed')
        self.assertEqual(response.data['metrics']['point_count'], 1000)
    
    def test_get_compartments(self):
        """Test getting compartments for a dataset"""
        dataset = LidarDataset.objects.create(
            name="Compartment Test",
            file_path=self.las_file,
            file_size=os.path.getsize(self.las_file),
            processing_status='completed',
            processed=True
        )
        
        url = reverse('lidar-dataset-compartments', args=[dataset.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('compartments', response.data)
        self.assertEqual(response.data['dataset_id'], dataset.id)
