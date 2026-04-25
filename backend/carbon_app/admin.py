from django.contrib import admin
from .models import CarbonStock, CarbonSequestration, CarbonCredit


@admin.register(CarbonStock)
class CarbonStockAdmin(admin.ModelAdmin):
    list_display = ['compartment', 'total_carbon_stock', 'co2_equivalent', 
                   'measurement_date', 'confidence_level']
    list_filter = ['measurement_date', 'estimation_method']
    search_fields = ['compartment__name']
    readonly_fields = ['total_carbon_stock', 'total_carbon_tonnes', 
                      'co2_equivalent', 'created_at', 'updated_at']


@admin.register(CarbonSequestration)
class CarbonSequestrationAdmin(admin.ModelAdmin):
    list_display = ['compartment', 'measurement_year', 'annual_sequestration_rate',
                   'annual_co2_sequestration']
    list_filter = ['measurement_year', 'calculation_method']
    search_fields = ['compartment__name']
    readonly_fields = ['annual_sequestration_total', 'annual_co2_sequestration', 'created_at']


@admin.register(CarbonCredit)
class CarbonCreditAdmin(admin.ModelAdmin):
    list_display = ['compartment', 'credit_standard', 'vintage_year', 
                   'net_credits', 'status', 'potential_revenue']
    list_filter = ['credit_standard', 'status', 'vintage_year']
    search_fields = ['compartment__name']
    readonly_fields = ['co2_equivalent_tonnes', 'eligible_credits', 
                      'net_credits', 'potential_revenue', 'created_at', 'updated_at']
