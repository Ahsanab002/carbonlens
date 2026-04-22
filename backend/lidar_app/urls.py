from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LidarDatasetViewSet, ForestCompartmentViewSet,
    BiomassEstimateViewSet, TreeSpeciesViewSet
)

router = DefaultRouter()
router.register(r'datasets', LidarDatasetViewSet, basename='lidar-dataset')
router.register(r'compartments', ForestCompartmentViewSet, basename='forest-compartment')
router.register(r'biomass', BiomassEstimateViewSet, basename='biomass-estimate')
router.register(r'species', TreeSpeciesViewSet, basename='tree-species')

urlpatterns = [
    path('', include(router.urls)),
]
