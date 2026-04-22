from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import CarbonStock, CarbonSequestration, CarbonCredit
from .serializers import (
    CarbonStockSerializer, CarbonSequestrationSerializer,
    CarbonCreditSerializer, CarbonCreditCalculatorSerializer
)
from lidar_app.models import ForestCompartment
from .services.carbon_calculator import CarbonCalculator


class CarbonStockViewSet(viewsets.ModelViewSet):
    """ViewSet for carbon stock data"""
    queryset = CarbonStock.objects.all()
    serializer_class = CarbonStockSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        compartment_id = self.request.query_params.get('compartment', None)
        if compartment_id:
            queryset = queryset.filter(compartment_id=compartment_id)
        return queryset


class CarbonSequestrationViewSet(viewsets.ModelViewSet):
    """ViewSet for carbon sequestration data"""
    queryset = CarbonSequestration.objects.all()
    serializer_class = CarbonSequestrationSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        compartment_id = self.request.query_params.get('compartment', None)
        year = self.request.query_params.get('year', None)
        
        if compartment_id:
            queryset = queryset.filter(compartment_id=compartment_id)
        if year:
            queryset = queryset.filter(measurement_year=year)
        
        return queryset


class CarbonCreditViewSet(viewsets.ModelViewSet):
    """ViewSet for carbon credits"""
    queryset = CarbonCredit.objects.all()
    serializer_class = CarbonCreditSerializer
    
    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """Calculate carbon credits for a compartment"""
        serializer = CarbonCreditCalculatorSerializer(data=request.data)
        
        if serializer.is_valid():
            calculator = CarbonCalculator()
            
            try:
                credit = calculator.calculate_credits(
                    compartment_id=serializer.validated_data['compartment_id'],
                    vintage_year=serializer.validated_data['vintage_year'],
                    credit_standard=serializer.validated_data['credit_standard'],
                    buffer_percentage=serializer.validated_data.get('buffer_percentage', 20.0),
                    estimated_price=serializer.validated_data.get('estimated_price')
                )
                
                return Response(
                    CarbonCreditSerializer(credit).data,
                    status=status.HTTP_201_CREATED
                )
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary of carbon credits by status"""
        summary = {}
        for status_choice, _ in CarbonCredit.STATUS_CHOICES:
            credits = CarbonCredit.objects.filter(status=status_choice)
            summary[status_choice] = {
                'count': credits.count(),
                'total_credits': sum(c.net_credits for c in credits),
                'potential_revenue': sum(
                    float(c.potential_revenue) for c in credits 
                    if c.potential_revenue
                )
            }
        
        return Response(summary)
