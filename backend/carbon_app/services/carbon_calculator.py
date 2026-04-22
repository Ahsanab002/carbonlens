"""
Carbon stock and credit calculation service
"""
from datetime import date
from decimal import Decimal
from django.shortcuts import get_object_or_404

from lidar_app.models import ForestCompartment, BiomassEstimate
from carbon_app.models import CarbonStock, CarbonSequestration, CarbonCredit


class CarbonCalculator:
    """Handles carbon stock calculations and credit estimation"""
    
    # Carbon fraction of dry biomass (IPCC default)
    CARBON_FRACTION = 0.47
    
    # CO2 to carbon molecular weight ratio
    CO2_TO_CARBON_RATIO = 3.67  # 44/12
    
    def calculate_carbon_stock(self, biomass_estimate):
        """
        Calculate carbon stock from biomass estimate
        
        Args:
            biomass_estimate: BiomassEstimate object
            
        Returns:
            CarbonStock object
        """
        compartment = biomass_estimate.compartment
        
        # Convert biomass to carbon (tonnes/ha)
        agb_carbon = biomass_estimate.above_ground_biomass * self.CARBON_FRACTION
        bgb_carbon = (biomass_estimate.below_ground_biomass or 0) * self.CARBON_FRACTION
        
        # Create or update carbon stock
        carbon_stock, created = CarbonStock.objects.update_or_create(
            compartment=compartment,
            measurement_date=date.today(),
            defaults={
                'above_ground_carbon': agb_carbon,
                'below_ground_carbon': bgb_carbon,
                'estimation_method': f'LiDAR + {biomass_estimate.model_name}',
                'confidence_level': biomass_estimate.confidence_score
            }
        )
        
        return carbon_stock
    
    def calculate_sequestration_rate(self, compartment, years=5):
        """
        Calculate annual carbon sequestration rate
        
        Args:
            compartment: ForestCompartment object
            years: Number of years for growth period
            
        Returns:
            CarbonSequestration object
        """
        # Get latest carbon stock
        try:
            current_stock = CarbonStock.objects.filter(
                compartment=compartment
            ).latest('measurement_date')
        except CarbonStock.DoesNotExist:
            raise ValueError("No carbon stock data available for this compartment")
        
        # Estimate annual sequestration rate based on forest type and age
        # This is simplified - real calculation would use historical data
        # Typical tropical forest: 2-5 t C/ha/year
        # Typical temperate forest: 1-3 t C/ha/year
        
        # Use current stock to estimate growth phase
        if current_stock.total_carbon_stock < 50:
            # Young, fast-growing forest
            rate = 3.5
        elif current_stock.total_carbon_stock < 100:
            # Mature forest
            rate = 2.0
        else:
            # Old-growth forest
            rate = 1.0
        
        sequestration, created = CarbonSequestration.objects.update_or_create(
            compartment=compartment,
            measurement_year=date.today().year,
            defaults={
                'annual_sequestration_rate': rate,
                'calculation_method': 'Biomass increment model',
                'confidence_level': 0.75
            }
        )
        
        return sequestration
    
    def calculate_credits(self, compartment_id, vintage_year, credit_standard,
                         buffer_percentage=20.0, estimated_price=None):
        """
        Calculate carbon credits for a compartment
        
        Args:
            compartment_id: ID of forest compartment
            vintage_year: Year of carbon sequestration
            credit_standard: Carbon credit standard (VCS, REDD+, etc.)
            buffer_percentage: Buffer reserve percentage
            estimated_price: Estimated price per credit (USD)
            
        Returns:
            CarbonCredit object
        """
        compartment = get_object_or_404(ForestCompartment, id=compartment_id)
        
        # Get sequestration data for the vintage year
        try:
            sequestration = CarbonSequestration.objects.get(
                compartment=compartment,
                measurement_year=vintage_year
            )
        except CarbonSequestration.DoesNotExist:
            raise ValueError(f"No sequestration data for year {vintage_year}")
        
        # Calculate verified carbon (use conservative estimate)
        verified_carbon = sequestration.annual_sequestration_total * 0.9  # 10% discount for uncertainty
        
        # Create carbon credit record
        credit = CarbonCredit.objects.create(
            compartment=compartment,
            credit_standard=credit_standard,
            vintage_year=vintage_year,
            verified_carbon_tonnes=verified_carbon,
            buffer_percentage=buffer_percentage,
            estimated_price_per_credit=Decimal(str(estimated_price)) if estimated_price else None,
            status='PROJECTED'
        )
        
        return credit
    
    def estimate_credit_price(self, credit_standard, vintage_year):
        """
        Estimate carbon credit price based on standard and vintage
        
        Args:
            credit_standard: Carbon credit standard
            vintage_year: Vintage year
            
        Returns:
            Estimated price per credit (USD)
        """
        # Base prices (USD per tonne CO2e) - simplified
        base_prices = {
            'VCS': 8.0,
            'REDD+': 12.0,
            'GOLD': 15.0,
            'CAR': 10.0,
            'OTHER': 5.0
        }
        
        base_price = base_prices.get(credit_standard, 5.0)
        
        # Recent vintages command premium
        current_year = date.today().year
        if vintage_year >= current_year - 2:
            base_price *= 1.2
        
        return base_price
    def estimate_credit_summary(self, total_co2e_tonnes, buffer_percentage=20.0, estimated_price=None):
        """
        Estimate credit values from aggregated CO2e tonnes.
        """
        eligible_credits = float(total_co2e_tonnes)
        net_credits = eligible_credits * (1 - buffer_percentage / 100.0)
        potential_revenue = None
        if estimated_price is not None:
            potential_revenue = float(net_credits) * float(estimated_price)

        return {
            'total_co2e_tonnes': eligible_credits,
            'buffer_percentage': float(buffer_percentage),
            'net_credits': float(net_credits),
            'estimated_price_per_credit': float(estimated_price) if estimated_price is not None else None,
            'potential_revenue': potential_revenue,
        }