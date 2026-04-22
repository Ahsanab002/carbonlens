from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import LidarDataset, ForestCompartment, BiomassEstimate, TreeSpecies


class LidarDatasetSerializer(serializers.ModelSerializer):
    """Serializer for LiDAR datasets with all metrics"""
    
    class Meta:
        model = LidarDataset
        fields = [
            'id', 'name', 'description', 'file_path', 'file_size',
            'upload_date', 'processed', 'processing_status',
            'point_count', 'min_height', 'max_height', 'avg_point_density',
            'extent'
        ]
        read_only_fields = [
            'upload_date', 'processed', 'processing_status', 
            'point_count', 'min_height', 'max_height', 'avg_point_density', 'extent'
        ]


class ForestCompartmentSerializer(GeoFeatureModelSerializer):
    """Serializer for forest compartments with all metrics and geometry"""
    
    class Meta:
        model = ForestCompartment
        geo_field = 'geometry'
        fields = [
            'id', 'dataset', 'name', 'geometry', 'area_hectares',
            'canopy_height_mean', 'canopy_height_max', 'canopy_cover_percent',
            'height_percentile_95', 'height_percentile_75', 'height_percentile_50',
            'crown_volume', 'foliage_height_diversity',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class BiomassEstimateSerializer(serializers.ModelSerializer):
    """Serializer for biomass estimates with compartment reference"""
    compartment_name = serializers.CharField(source='compartment.name', read_only=True)
    dataset_name = serializers.CharField(
        source='compartment.dataset.name', read_only=True
    )
    
    class Meta:
        model = BiomassEstimate
        fields = [
            'id', 'compartment', 'compartment_name', 'dataset_name',
            'above_ground_biomass', 'below_ground_biomass', 'total_biomass',
            'model_name', 'model_version', 'confidence_score',
            'features_used', 'estimation_date'
        ]
        read_only_fields = ['estimation_date']


class TreeSpeciesSerializer(serializers.ModelSerializer):
    """Serializer for tree species catalog"""
    
    class Meta:
        model = TreeSpecies
        fields = '__all__'


class LidarProcessingSerializer(serializers.Serializer):
    """Serializer for LiDAR file upload and processing"""
    file = serializers.FileField(
        help_text="LAS or LAZ file format only"
    )
    name = serializers.CharField(
        max_length=255,
        help_text="Name for this LiDAR dataset"
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Optional description of the dataset"
    )
    process_immediately = serializers.BooleanField(
        default=True,
        help_text="Auto-process file after upload (recommended)"
    )
