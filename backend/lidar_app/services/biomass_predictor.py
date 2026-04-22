"""
Biomass prediction service using ML models
"""
import numpy as np
import joblib
from pathlib import Path
from django.conf import settings
from lidar_app.models import BiomassEstimate


class BiomassPredictor:
    """Predicts biomass using trained ML models (Random Forest, XGBoost)"""
    
    def __init__(self):
        self.models_path = Path(settings.ML_MODELS_PATH)
        self.models_path.mkdir(parents=True, exist_ok=True)
        self.model = None
        self.model_name = 'random_forest'
        self.model_version = '1.0'
        self.load_model('random_forest')
    
    def load_model(self, model_type='random_forest'):
        """
        Load trained ML model
        
        Args:
            model_type: 'random_forest' or 'xgboost'
        """
        model_file = self.models_path / f'{model_type}_model.pkl'
        
        if model_file.exists():
            self.model = joblib.load(model_file)
            self.model_name = model_type
        else:
            self.model = None
            self.model_name = model_type
    
    def predict_from_features(self, features, model_type='random_forest'):
        """
        Predict biomass values from a feature dictionary.
        """
        if self.model is None or self.model_name != model_type:
            self.load_model(model_type)
        
        if self.model is not None:
            feature_array = self.prepare_feature_array(features)
            agb = float(self.model.predict(feature_array)[0])
            confidence = 0.85
        else:
            agb = self.simple_biomass_estimate(features)
            confidence = 0.60
        
        bgb = agb * 0.25
        total_biomass = agb + bgb
        return agb, bgb, total_biomass, confidence
    
    def predict(self, compartment, model_type='random_forest'):
        """
        Predict biomass for a forest compartment
        
        Args:
            compartment: ForestCompartment object
            model_type: 'random_forest' or 'xgboost'
            
        Returns:
            BiomassEstimate object
        """
        features = self.extract_features(compartment)
        agb, bgb, total_biomass, confidence = self.predict_from_features(features, model_type=model_type)
        
        biomass_estimate = BiomassEstimate.objects.create(
            compartment=compartment,
            above_ground_biomass=agb,
            below_ground_biomass=bgb,
            total_biomass=total_biomass,
            model_name=self.model_name,
            model_version=self.model_version,
            confidence_score=confidence,
            features_used=features
        )
        
        return biomass_estimate
    
    def extract_features(self, compartment):
        """
        Extract features for biomass prediction
        
        Features include:
        - Height percentiles (p95, p75, p50)
        - Canopy cover
        - Crown volume
        - Foliage height diversity
        """
        return {
            'height_p95': compartment.height_percentile_95 or 0,
            'height_p75': compartment.height_percentile_75 or 0,
            'height_p50': compartment.height_percentile_50 or 0,
            'canopy_height_mean': compartment.canopy_height_mean or 0,
            'canopy_height_max': compartment.canopy_height_max or 0,
            'canopy_cover': compartment.canopy_cover_percent or 0,
            'crown_volume': compartment.crown_volume or 0,
            'foliage_height_diversity': compartment.foliage_height_diversity or 0,
            'area': compartment.area_hectares
        }
    
    def prepare_feature_array(self, features):
        """Prepare feature array for model prediction"""
        feature_order = [
            'height_p95', 'height_p75', 'height_p50',
            'canopy_height_mean', 'canopy_height_max',
            'canopy_cover', 'crown_volume', 
            'foliage_height_diversity', 'area'
        ]
        return np.array([[features[f] for f in feature_order]])
    
    def simple_biomass_estimate(self, features):
        """
        Simple allometric equation for biomass estimation
        This is a placeholder - real models would be more sophisticated
        
        Based on: AGB = 0.5 * height^2 * canopy_cover * area
        """
        height = features['canopy_height_mean']
        canopy_cover = features['canopy_cover'] / 100  # Convert to fraction
        area = features['area']
        
        # Simplified equation (Mg/ha)
        agb_per_ha = 0.5 * (height ** 2) * canopy_cover
        
        return agb_per_ha
