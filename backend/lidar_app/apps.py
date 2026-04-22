from django.apps import AppConfig


class LidarAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'lidar_app'
    verbose_name = 'LiDAR Data Processing'
    
    def ready(self):
        """
        Import signals when app is loaded
        """
        import lidar_app.signals
