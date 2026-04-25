from django.contrib.gis.db import models
from django.core.validators import MinValueValidator
from lidar_app.models import ForestCompartment


class CarbonStock(models.Model):
    """Carbon stock estimates for forest compartments"""
    compartment = models.ForeignKey(ForestCompartment, on_delete=models.CASCADE, related_name='carbon_stocks')
    
    # Carbon stock (tonnes per hectare)
    above_ground_carbon = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text="Above-ground carbon stock in tonnes/ha"
    )
    below_ground_carbon = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text="Below-ground carbon stock in tonnes/ha"
    )
    soil_organic_carbon = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(0)],
        help_text="Soil organic carbon in tonnes/ha"
    )
    dead_wood_carbon = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(0)],
        help_text="Dead wood carbon in tonnes/ha"
    )
    total_carbon_stock = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text="Total carbon stock in tonnes/ha"
    )
    
    # Total carbon for entire compartment
    total_carbon_tonnes = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text="Total carbon in tonnes for the entire compartment"
    )
    
    # CO2 equivalent
    co2_equivalent = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text="CO2 equivalent in tonnes (carbon * 3.67)"
    )
    
    # Metadata
    measurement_date = models.DateField()
    estimation_method = models.CharField(max_length=100, default='LiDAR + ML Model')
    confidence_level = models.FloatField(
        validators=[MinValueValidator(0), MinValueValidator(1)],
        default=0.8
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-measurement_date']
        get_latest_by = 'measurement_date'
        
    def save(self, *args, **kwargs):
        # Calculate total carbon stock per hectare
        self.total_carbon_stock = (
            self.above_ground_carbon + 
            self.below_ground_carbon +
            (self.soil_organic_carbon or 0) +
            (self.dead_wood_carbon or 0)
        )
        
        # Calculate total carbon for entire compartment
        self.total_carbon_tonnes = self.total_carbon_stock * self.compartment.area_hectares
        
        # Calculate CO2 equivalent (molecular weight ratio: 44/12 = 3.67)
        self.co2_equivalent = self.total_carbon_tonnes * 3.67
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Carbon stock for {self.compartment.name}: {self.total_carbon_stock:.2f} t/ha"


class CarbonSequestration(models.Model):
    """Annual carbon sequestration rates"""
    compartment = models.ForeignKey(ForestCompartment, on_delete=models.CASCADE, related_name='sequestration_rates')
    
    # Annual sequestration rate (tonnes per hectare per year)
    annual_sequestration_rate = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text="Annual carbon sequestration rate in tonnes/ha/year"
    )
    
    # Total annual sequestration for compartment
    annual_sequestration_total = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text="Total annual sequestration in tonnes/year"
    )
    
    # CO2 equivalent annual sequestration
    annual_co2_sequestration = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text="Annual CO2 sequestration in tonnes/year"
    )
    
    # Time period
    measurement_year = models.IntegerField()
    growth_period_months = models.IntegerField(default=12)
    
    # Method and confidence
    calculation_method = models.CharField(max_length=100, default='Biomass increment + mortality')
    confidence_level = models.FloatField(
        validators=[MinValueValidator(0), MinValueValidator(1)],
        default=0.75
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-measurement_year']
        unique_together = ['compartment', 'measurement_year']
        
    def save(self, *args, **kwargs):
        # Calculate totals
        self.annual_sequestration_total = (
            self.annual_sequestration_rate * self.compartment.area_hectares
        )
        self.annual_co2_sequestration = self.annual_sequestration_total * 3.67
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Sequestration {self.measurement_year} - {self.compartment.name}: {self.annual_sequestration_rate:.2f} t/ha/yr"


class CarbonCredit(models.Model):
    """Carbon credit calculations and tracking"""
    
    CREDIT_STANDARD_CHOICES = [
        ('VCS', 'Verified Carbon Standard'),
        ('REDD+', 'REDD+'),
        ('GOLD', 'Gold Standard'),
        ('CAR', 'Climate Action Reserve'),
        ('OTHER', 'Other'),
    ]
    
    compartment = models.ForeignKey(ForestCompartment, on_delete=models.CASCADE, related_name='carbon_credits')
    
    # Credit details
    credit_standard = models.CharField(max_length=20, choices=CREDIT_STANDARD_CHOICES)
    vintage_year = models.IntegerField(help_text="Year of carbon sequestration")
    
    # Carbon amounts
    verified_carbon_tonnes = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text="Verified carbon sequestered in tonnes"
    )
    co2_equivalent_tonnes = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text="CO2 equivalent in tonnes"
    )
    
    # Credits calculation
    eligible_credits = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text="Number of eligible carbon credits (1 credit = 1 tonne CO2e)"
    )
    buffer_percentage = models.FloatField(
        default=20.0,
        validators=[MinValueValidator(0), MinValueValidator(100)],
        help_text="Buffer reserve percentage (typically 10-20%)"
    )
    net_credits = models.FloatField(
        validators=[MinValueValidator(0)],
        help_text="Net credits after buffer deduction"
    )
    
    # Financial estimates
    estimated_price_per_credit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True, blank=True,
        help_text="Estimated market price per credit in USD"
    )
    potential_revenue = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True, blank=True,
        help_text="Potential revenue in USD"
    )
    
    # Status tracking
    STATUS_CHOICES = [
        ('PROJECTED', 'Projected'),
        ('VERIFIED', 'Verified'),
        ('ISSUED', 'Issued'),
        ('SOLD', 'Sold'),
        ('RETIRED', 'Retired'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PROJECTED')
    
    verification_date = models.DateField(null=True, blank=True)
    issuance_date = models.DateField(null=True, blank=True)
    
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-vintage_year']
        
    def save(self, *args, **kwargs):
        # Calculate CO2 equivalent if not provided
        if not self.co2_equivalent_tonnes:
            self.co2_equivalent_tonnes = self.verified_carbon_tonnes * 3.67
        
        # Calculate eligible credits (1 credit = 1 tonne CO2e)
        self.eligible_credits = self.co2_equivalent_tonnes
        
        # Calculate net credits after buffer
        buffer_amount = self.eligible_credits * (self.buffer_percentage / 100)
        self.net_credits = self.eligible_credits - buffer_amount
        
        # Calculate potential revenue if price is set
        if self.estimated_price_per_credit:
            self.potential_revenue = float(self.net_credits) * float(self.estimated_price_per_credit)
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.credit_standard} {self.vintage_year} - {self.compartment.name}: {self.net_credits:.2f} credits"
