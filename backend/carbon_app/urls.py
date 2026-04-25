from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CarbonStockViewSet, CarbonSequestrationViewSet, CarbonCreditViewSet

router = DefaultRouter()
router.register(r'stock', CarbonStockViewSet, basename='carbon-stock')
router.register(r'sequestration', CarbonSequestrationViewSet, basename='carbon-sequestration')
router.register(r'credits', CarbonCreditViewSet, basename='carbon-credits')

urlpatterns = [
    path('', include(router.urls)),
]
