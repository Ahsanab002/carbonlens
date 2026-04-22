"""
LiDAR App Views - API endpoints for LiDAR processing
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db.models import Q
import logging

from .models import LidarDataset, ForestCompartment, BiomassEstimate, TreeSpecies
from .serializers import (
    LidarDatasetSerializer, ForestCompartmentSerializer,
    BiomassEstimateSerializer, TreeSpeciesSerializer,
    LidarProcessingSerializer
)
from .services.lidar_processor import LidarProcessor
from .services.biomass_predictor import BiomassPredictor
from carbon_app.services.carbon_calculator import CarbonCalculator

logger = logging.getLogger(__name__)


class LidarDatasetViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing LiDAR datasets
    
    Endpoints:
    - GET /api/lidar/datasets/ - List all datasets
    - POST /api/lidar/datasets/upload/ - Upload new LAS/LAZ file
    - GET /api/lidar/datasets/{id}/ - Get dataset details
    - POST /api/lidar/datasets/{id}/process/ - Trigger processing
    - GET /api/lidar/datasets/{id}/status/ - Get processing status
    - GET /api/lidar/datasets/{id}/point-cloud/ - Export point cloud for 3D viewer
    - GET /api/lidar/datasets/{id}/metrics/ - Get all dataset metrics
    - GET /api/lidar/datasets/{id}/compartments/ - Get all compartments in dataset
    - DELETE /api/lidar/datasets/{id}/ - Delete dataset
    """
    queryset = LidarDataset.objects.all().order_by('-upload_date')
    serializer_class = LidarDatasetSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['upload_date', 'name', 'processing_status']
    
    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request):
        """
        Upload a new LiDAR file (LAS/LAZ format)
        
        Expected data:
        - file: LAS or LAZ file
        - name: Dataset name
        - description: (optional) Dataset description
        
        Returns:
        - Dataset object with processing status
        """
        serializer = LidarProcessingSerializer(data=request.data)
        if serializer.is_valid():
            try:
                file = serializer.validated_data['file']
                name = serializer.validated_data['name']
                description = serializer.validated_data.get('description', '')
                
                logger.info(f"Upload initiated for file: {file.name}")
                
                # Validate file format
                if not file.name.lower().endswith(('.las', '.laz')):
                    return Response(
                        {'error': 'File must be LAS or LAZ format'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Process LiDAR file
                processor = LidarProcessor()
                dataset = processor.process_upload(file, name, description)
                
                # Signal will trigger processing automatically
                logger.info(f"Dataset created: {dataset.id}")
                
                return Response(
                    LidarDatasetSerializer(dataset).data,
                    status=status.HTTP_201_CREATED
                )
            except Exception as e:
                logger.error(f"Upload error: {str(e)}", exc_info=True)
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'], url_path='status')
    def status(self, request, pk=None):
        """
        Get processing status of a dataset
        
        Returns:
        - id, name, processing_status, metrics, error message (if any)
        """
        dataset = self.get_object()
        return Response({
            'id': dataset.id,
            'name': dataset.name,
            'processing_status': dataset.processing_status,
            'processed': dataset.processed,
            'upload_date': dataset.upload_date,
            'metrics': {
                'point_count': dataset.point_count,
                'min_height': dataset.min_height,
                'max_height': dataset.max_height,
                'avg_point_density': dataset.avg_point_density,
                'extent': str(dataset.extent) if dataset.extent else None,
            }
        })
    
    @action(detail=True, methods=['post'], url_path='process')
    def process(self, request, pk=None):
        """
        Manually trigger processing of a dataset
        (Usually done automatically via signals, but can be triggered manually)
        
        Returns:
        - Processing status and results
        """
        dataset = self.get_object()
        
        if dataset.processing_status == 'processing':
            return Response(
                {'error': 'Dataset is already being processed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        processor = LidarProcessor()
        
        try:
            logger.info(f"Manual processing triggered for dataset: {dataset.id}")
            processor.extract_features(dataset)
            dataset.refresh_from_db()
            
            return Response({
                'status': 'completed',
                'message': 'LiDAR processing completed successfully',
                'dataset': LidarDatasetSerializer(dataset).data
            })
        except Exception as e:
            logger.error(f"Processing error for dataset {dataset.id}: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], url_path='metrics')
    def metrics(self, request, pk=None):
        """
        Get all metrics for a dataset
        
        Returns:
        - Complete dataset and compartment metrics
        """
        dataset = self.get_object()
        compartments = ForestCompartment.objects.filter(dataset=dataset)
        
        # Aggregate compartment metrics
        agg_metrics = {
            'total_compartments': compartments.count(),
            'total_area_hectares': sum(c.area_hectares for c in compartments),
            'avg_canopy_height': sum(c.canopy_height_mean or 0 for c in compartments) / max(compartments.count(), 1),
            'max_canopy_height': max((c.canopy_height_max or 0 for c in compartments), default=0),
            'avg_canopy_cover': sum(c.canopy_cover_percent or 0 for c in compartments) / max(compartments.count(), 1),
            'avg_foliage_diversity': sum(c.foliage_height_diversity or 0 for c in compartments) / max(compartments.count(), 1),
        }
        
        return Response({
            'dataset': LidarDatasetSerializer(dataset).data,
            'aggregated_metrics': agg_metrics,
            'compartment_count': compartments.count(),
        })
    
    @action(detail=True, methods=['get'], url_path='point-cloud')
    def point_cloud(self, request, pk=None):
        """
        Export point cloud data for 3D visualization
        Downsamples to max 100k points for frontend
        
        Returns:
        - Point cloud data with x, y, z coordinates and optional intensity/classification
        """
        dataset = self.get_object()
        
        if not dataset.processed:
            return Response(
                {'error': 'Dataset has not been processed yet'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            processor = LidarProcessor()
            point_cloud_data = processor.get_point_cloud_for_export(dataset)
            
            return Response({
                'dataset_id': dataset.id,
                'dataset_name': dataset.name,
                'point_count': len(point_cloud_data['x']),
                'points': point_cloud_data
            })
        except Exception as e:
            logger.error(f"Error exporting point cloud: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='generate-agb-map')
    def generate_agb_map(self, request, pk=None):
        """
        Generate a pixel-level AGB map from a LiDAR dataset.
        """
        dataset = self.get_object()
        pixel_size = request.data.get('pixel_size', 10)
        model_type = request.data.get('model_type', 'random_forest')
        buffer_percentage = request.data.get('buffer_percentage', 20.0)
        credit_standard = request.data.get('credit_standard')
        vintage_year = request.data.get('vintage_year')
        estimated_price = request.data.get('estimated_price')

        try:
            pixel_size = float(pixel_size)
            buffer_percentage = float(buffer_percentage)
        except (TypeError, ValueError):
            return Response(
                {'error': 'pixel_size and buffer_percentage must be numeric'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            processor = LidarProcessor()
            map_result = processor.generate_agb_map(
                dataset,
                pixel_size=pixel_size,
                model_type=model_type
            )

            if credit_standard and vintage_year is not None:
                try:
                    vintage_year = int(vintage_year)
                except ValueError:
                    return Response(
                        {'error': 'vintage_year must be an integer'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                credit_summary = CarbonCalculator().estimate_credit_summary(
                    total_co2e_tonnes=map_result['total_co2e_tonnes'],
                    buffer_percentage=buffer_percentage,
                    estimated_price=estimated_price
                )
                map_result['credit_summary'] = credit_summary

            return Response(map_result)
        except Exception as e:
            logger.error(f"AGB map generation error for dataset {dataset.id}: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    @action(detail=True, methods=['post'], url_path='forecast')
    def forecast(self, request, pk=None):
        """
        Generate a linear projection forecast for future biomass and carbon credits.
        This provides a 10-year growth model that can be linked to more complex ML engines later.
        """
        dataset = self.get_object()
        try:
            current_agb = float(request.data.get('current_agb', 0))
            current_co2e = float(request.data.get('current_co2e', 0))
            price = float(request.data.get('price', 10.0))
            years = int(request.data.get('years', 10))
            growth_rate = float(request.data.get('growth_rate', 0.035)) # 3.5% default linear base
            buffer_percentage = float(request.data.get('buffer_percentage', 20.0))

            forecast_data = []
            import datetime
            current_year = datetime.datetime.now().year

            agb = current_agb
            co2e = current_co2e
            
            for i in range(years + 1):
                year = current_year + i
                net_tradable_co2e = co2e * (1 - (buffer_percentage / 100.0))
                
                forecast_data.append({
                    "year": str(year),
                    "projected_agb": round(agb, 2),
                    "projected_co2e": round(co2e, 2),
                    "net_trading_units": round(net_tradable_co2e, 2),
                    "potential_revenue": round(net_tradable_co2e * price, 2)
                })
                
                # Compound growth for next step
                agb += agb * growth_rate
                co2e += co2e * growth_rate
                
            return Response({
                "dataset_id": dataset.id,
                "dataset_name": dataset.name,
                "forecast": forecast_data,
                "growth_rate_used": growth_rate
            })
        except Exception as e:
            logger.error(f"Forecast generation error: {str(e)}", exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'], url_path='compartments')
    def compartments(self, request, pk=None):
        """
        Get all forest compartments for a dataset
        
        Returns:
        - List of compartments with geometries and metrics
        """
        dataset = self.get_object()
        compartments = ForestCompartment.objects.filter(dataset=dataset)
        
        serializer = ForestCompartmentSerializer(compartments, many=True)
        return Response({
            'dataset_id': dataset.id,
            'dataset_name': dataset.name,
            'compartments': serializer.data,
            'total_count': compartments.count(),
        })


class ForestCompartmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for forest compartments
    
    Endpoints:
    - GET /api/lidar/compartments/ - List all compartments
    - GET /api/lidar/compartments/{id}/ - Get compartment details
    - POST /api/lidar/compartments/{id}/predict-biomass/ - Predict biomass
    - GET /api/lidar/compartments/?dataset={id} - Filter by dataset
    - PATCH /api/lidar/compartments/{id}/ - Update compartment
    """
    queryset = ForestCompartment.objects.all()
    serializer_class = ForestCompartmentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'dataset__name']
    ordering_fields = ['name', 'area_hectares', 'canopy_cover_percent']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        dataset_id = self.request.query_params.get('dataset', None)
        if dataset_id:
            queryset = queryset.filter(dataset_id=dataset_id)
        return queryset
    
    @action(detail=True, methods=['post'], url_path='predict-biomass')
    def predict_biomass(self, request, pk=None):
        """
        Predict biomass for a compartment using ML models
        
        Returns:
        - Biomass estimate with confidence score
        """
        compartment = self.get_object()
        predictor = BiomassPredictor()
        
        try:
            logger.info(f"Biomass prediction initiated for compartment: {compartment.id}")
            biomass_estimate = predictor.predict(compartment)
            
            return Response(
                BiomassEstimateSerializer(biomass_estimate).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            logger.error(f"Biomass prediction error: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        """
        Get detailed metrics for a compartment
        """
        compartment = self.get_object()
        return Response({
            'id': compartment.id,
            'name': compartment.name,
            'area_hectares': compartment.area_hectares,
            'metrics': {
                'canopy_height_mean': compartment.canopy_height_mean,
                'canopy_height_max': compartment.canopy_height_max,
                'canopy_cover_percent': compartment.canopy_cover_percent,
                'height_percentile_95': compartment.height_percentile_95,
                'height_percentile_75': compartment.height_percentile_75,
                'height_percentile_50': compartment.height_percentile_50,
                'crown_volume': compartment.crown_volume,
                'foliage_height_diversity': compartment.foliage_height_diversity,
            }
        })


class BiomassEstimateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing biomass estimates
    
    Endpoints:
    - GET /api/lidar/biomass-estimates/ - List all estimates
    - GET /api/lidar/biomass-estimates/{id}/ - Get estimate details
    - GET /api/lidar/biomass-estimates/?compartment={id} - Filter by compartment
    """
    queryset = BiomassEstimate.objects.all().order_by('-estimation_date')
    serializer_class = BiomassEstimateSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['estimation_date', 'total_biomass', 'confidence_score']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        compartment_id = self.request.query_params.get('compartment', None)
        if compartment_id:
            queryset = queryset.filter(compartment_id=compartment_id)
        return queryset


class TreeSpeciesViewSet(viewsets.ModelViewSet):
    """
    ViewSet for tree species catalog
    
    Endpoints:
    - GET /api/lidar/tree-species/ - List all species
    - POST /api/lidar/tree-species/ - Add new species
    - GET /api/lidar/tree-species/{id}/ - Get species details
    """
    queryset = TreeSpecies.objects.all()
    serializer_class = TreeSpeciesSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['common_name', 'scientific_name']
