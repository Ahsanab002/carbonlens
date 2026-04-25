from django.contrib.gis.db import models
from django.contrib.postgres.fields import ArrayField
from django.core.validators import MinValueValidator, MaxValueValidator


class LidarDataset(models.Model):
    """Stores metadata for uploaded LiDAR datasets"""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField()
    upload_date = models.DateTimeField(auto_now_add=True)
    processed = models.BooleanField(default=False)
    processing_status = models.CharField(max_length=50, default='pending')
    
    # Spatial extent
    extent = models.PolygonField(srid=4326, null=True, blank=True)
    
    # Dataset statistics
    point_count = models.BigIntegerField(null=True, blank=True)
    min_height = models.FloatField(null=True, blank=True)
    max_height = models.FloatField(null=True, blank=True)
    avg_point_density = models.FloatField(null=True, blank=True)
    
    class Meta:
        ordering = ['-upload_date']
        
    def __str__(self):
        return f"{self.name} - {self.upload_date.strftime('%Y-%m-%d')}"


class ForestCompartment(models.Model):
    """Represents a forest compartment or plot"""
    dataset = models.ForeignKey(LidarDataset, on_delete=models.CASCADE, related_name='compartments')
    name = models.CharField(max_length=100)
    geometry = models.PolygonField(srid=4326)
    area_hectares = models.FloatField(validators=[MinValueValidator(0)])
    
    # Forest structure metrics
    canopy_height_mean = models.FloatField(null=True, blank=True)
    canopy_height_max = models.FloatField(null=True, blank=True)
    canopy_cover_percent = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # LiDAR-derived metrics
    height_percentile_95 = models.FloatField(null=True, blank=True)
    height_percentile_75 = models.FloatField(null=True, blank=True)
    height_percentile_50 = models.FloatField(null=True, blank=True)
    crown_volume = models.FloatField(null=True, blank=True)
    foliage_height_diversity = models.FloatField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        
    def __str__(self):
        return f"{self.name} ({self.area_hectares} ha)"


class BiomassEstimate(models.Model):
    """Stores biomass predictions from ML models"""
    compartment = models.ForeignKey(ForestCompartment, on_delete=models.CASCADE, related_name='biomass_estimates')
    
    # Biomass estimates (Mg/ha)
    above_ground_biomass = models.FloatField(validators=[MinValueValidator(0)])
    below_ground_biomass = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    total_biomass = models.FloatField(validators=[MinValueValidator(0)])
    
    # Model information
    model_name = models.CharField(max_length=100)  # e.g., 'RandomForest', 'XGBoost'
    model_version = models.CharField(max_length=50)
    confidence_score = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Model prediction confidence (0-1)"
    )
    
    # Feature values used for prediction
    features_used = models.JSONField()
    
    estimation_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-estimation_date']
        get_latest_by = 'estimation_date'
        
    def __str__(self):
        return f"Biomass estimate for {self.compartment.name}: {self.total_biomass:.2f} Mg/ha"


class TreeSpecies(models.Model):
    """Catalog of tree species"""
    common_name = models.CharField(max_length=100)
    scientific_name = models.CharField(max_length=150)
    wood_density = models.FloatField(
        help_text="Wood density in g/cm³",
        validators=[MinValueValidator(0)]
    )
    carbon_fraction = models.FloatField(
        default=0.47,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Carbon fraction of dry biomass (typically 0.47)"
    )
    
    class Meta:
        verbose_name_plural = "Tree species"
        ordering = ['common_name']
        
    def __str__(self):
        return f"{self.common_name} ({self.scientific_name})"
