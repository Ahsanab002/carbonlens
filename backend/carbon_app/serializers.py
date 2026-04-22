from rest_framework import serializers
from .models import CarbonStock, CarbonSequestration, CarbonCredit


class CarbonStockSerializer(serializers.ModelSerializer):
    compartment_name = serializers.CharField(source='compartment.name', read_only=True)
    compartment_area = serializers.FloatField(source='compartment.area_hectares', read_only=True)
    
    class Meta:
        model = CarbonStock
        fields = '__all__'
        read_only_fields = ['total_carbon_stock', 'total_carbon_tonnes', 
                           'co2_equivalent', 'created_at', 'updated_at']


class CarbonSequestrationSerializer(serializers.ModelSerializer):
    compartment_name = serializers.CharField(source='compartment.name', read_only=True)
    
    class Meta:
        model = CarbonSequestration
        fields = '__all__'
        read_only_fields = ['annual_sequestration_total', 
                           'annual_co2_sequestration', 'created_at']


class CarbonCreditSerializer(serializers.ModelSerializer):
    compartment_name = serializers.CharField(source='compartment.name', read_only=True)
    credit_standard_display = serializers.CharField(
        source='get_credit_standard_display', 
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    
    class Meta:
        model = CarbonCredit
        fields = '__all__'
        read_only_fields = ['co2_equivalent_tonnes', 'eligible_credits', 
                           'net_credits', 'potential_revenue', 
                           'created_at', 'updated_at']


class CarbonCreditCalculatorSerializer(serializers.Serializer):
    """Serializer for carbon credit calculator"""
    compartment_id = serializers.IntegerField()
    vintage_year = serializers.IntegerField()
    credit_standard = serializers.ChoiceField(choices=CarbonCredit.CREDIT_STANDARD_CHOICES)
    buffer_percentage = serializers.FloatField(default=20.0, min_value=0, max_value=100)
    estimated_price = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2,
        required=False,
        allow_null=True
    )
