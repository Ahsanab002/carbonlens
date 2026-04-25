from django.contrib.gis import admin
from .models import LidarDataset, ForestCompartment, BiomassEstimate, TreeSpecies


@admin.register(LidarDataset)
class LidarDatasetAdmin(admin.ModelAdmin):
    list_display = ['name', 'upload_date', 'processed', 'processing_status', 'point_count']
    list_filter = ['processed', 'processing_status', 'upload_date']
    search_fields = ['name', 'description']
    readonly_fields = ['upload_date', 'point_count', 'min_height', 'max_height']


@admin.register(ForestCompartment)
class ForestCompartmentAdmin(admin.GISModelAdmin):
    list_display = ['name', 'dataset', 'area_hectares', 'canopy_height_mean', 'canopy_cover_percent']
    list_filter = ['dataset']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(BiomassEstimate)
class BiomassEstimateAdmin(admin.ModelAdmin):
    list_display = ['compartment', 'total_biomass', 'model_name', 'confidence_score', 'estimation_date']
    list_filter = ['model_name', 'estimation_date']
    search_fields = ['compartment__name']
    readonly_fields = ['estimation_date']


@admin.register(TreeSpecies)
class TreeSpeciesAdmin(admin.ModelAdmin):
    list_display = ['common_name', 'scientific_name', 'wood_density', 'carbon_fraction']
    search_fields = ['common_name', 'scientific_name']
