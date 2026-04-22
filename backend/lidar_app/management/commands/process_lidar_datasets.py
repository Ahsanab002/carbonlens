"""
Management command to process unprocessed LiDAR datasets
Usage: python manage.py process_lidar_datasets [--all]
"""
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q
from lidar_app.models import LidarDataset
from lidar_app.services.lidar_processor import LidarProcessor
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process unprocessed or failed LiDAR datasets'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Reprocess all datasets, including already processed ones',
        )
        parser.add_argument(
            '--dataset-id',
            type=int,
            help='Process specific dataset by ID',
        )
    
    def handle(self, *args, **options):
        try:
            processor = LidarProcessor()
            
            if options['dataset_id']:
                # Process specific dataset
                try:
                    dataset = LidarDataset.objects.get(id=options['dataset_id'])
                    self.stdout.write(
                        self.style.WARNING(
                            f'Processing dataset {dataset.id}: {dataset.name}'
                        )
                    )
                    processor.extract_features(dataset)
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Successfully processed dataset: {dataset.name}'
                        )
                    )
                except LidarDataset.DoesNotExist:
                    raise CommandError(f'Dataset with ID {options["dataset_id"]} not found')
            else:
                # Process unprocessed or failed datasets
                if options['all']:
                    datasets = LidarDataset.objects.all()
                    self.stdout.write('Processing ALL datasets...')
                else:
                    datasets = LidarDataset.objects.filter(
                        Q(processed=False) | Q(processing_status='error')
                    )
                    self.stdout.write(
                        self.style.WARNING(
                            f'Found {datasets.count()} unprocessed or failed datasets'
                        )
                    )
                
                if not datasets.exists():
                    self.stdout.write(self.style.SUCCESS('No datasets to process'))
                    return
                
                processed_count = 0
                failed_count = 0
                
                for dataset in datasets:
                    try:
                        self.stdout.write(f'Processing: {dataset.name}')
                        processor.extract_features(dataset)
                        processed_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'  ✓ Successfully processed'
                            )
                        )
                    except Exception as e:
                        failed_count += 1
                        self.stdout.write(
                            self.style.ERROR(
                                f'  ✗ Failed: {str(e)}'
                            )
                        )
                        logger.error(f'Error processing {dataset.name}: {str(e)}', exc_info=True)
                
                summary = (
                    f'\n\n=== Processing Summary ===\n'
                    f'Total datasets: {len(datasets)}\n'
                    f'Successfully processed: {processed_count}\n'
                    f'Failed: {failed_count}'
                )
                
                self.stdout.write(self.style.SUCCESS(summary))
        
        except Exception as e:
            raise CommandError(f'Error during processing: {str(e)}')