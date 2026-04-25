"""
Django signals for LiDAR app
Auto-triggers processing when datasets are uploaded
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.files.base import ContentFile
from .models import LidarDataset
from .services.lidar_processor import LidarProcessor
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=LidarDataset)
def process_lidar_on_upload(sender, instance, created, **kwargs):
    """
    Signal handler to automatically process LiDAR data after upload
    Triggered when a new LidarDataset is created with status 'uploaded'
    """
    if created and instance.processing_status == 'uploaded':
        try:
            logger.info(f"Signal triggered: Starting auto-processing for dataset {instance.id}")
            processor = LidarProcessor()
            processor.extract_features(instance)
            logger.info(f"Successfully auto-processed dataset: {instance.name}")
        except Exception as e:
            instance.processing_status = 'error'
            instance.save()
            logger.error(f"Error in auto-processing dataset {instance.name}: {str(e)}", exc_info=True)
