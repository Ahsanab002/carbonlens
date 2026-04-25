# LiDAR Carbon Analysis Backend

Django backend for LiDAR-based biomass and carbon sequestration analysis.

## Features

- **LiDAR Data Processing**: Upload and process LiDAR point cloud data
- **Biomass Estimation**: ML-based biomass prediction using Random Forest and XGBoost
- **Carbon Stock Calculation**: Convert biomass to carbon stock estimates
- **Carbon Sequestration**: Track annual carbon sequestration rates
- **Carbon Credits**: Calculate potential carbon credits (VCS, REDD+, etc.)
- **Spatial Database**: PostGIS integration for geospatial queries
- **REST API**: Complete API for frontend integration

## Technology Stack

- **Framework**: Django 4.2 with Django REST Framework
- **Database**: PostgreSQL with PostGIS extension
- **LiDAR Processing**: PDAL, laspy
- **Machine Learning**: scikit-learn, XGBoost
- **Geospatial**: GDAL, Shapely, Fiona
- **Real-time**: Django Channels for WebSocket support

## Setup Instructions

### Prerequisites

1. Python 3.10+
2. PostgreSQL 14+ with PostGIS extension
3. GDAL libraries
4. (Optional) PDAL for advanced LiDAR processing

### Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a PostgreSQL database with PostGIS:
```sql
CREATE DATABASE lidar_carbon_db;
\c lidar_carbon_db
CREATE EXTENSION postgis;
```

4. Configure environment variables:
Create a `.env` file in the backend directory:
```
DEBUG=True
DJANGO_SECRET_KEY=your-secret-key-here
DB_NAME=lidar_carbon_db
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432
```

5. Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

6. Create a superuser:
```bash
python manage.py createsuperuser
```

7. Load initial data (optional):
```bash
python manage.py loaddata initial_species.json
```

8. Run the development server:
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`

## API Endpoints

### LiDAR Data
- `GET /api/lidar/datasets/` - List all LiDAR datasets
- `POST /api/lidar/datasets/upload/` - Upload LiDAR file
- `POST /api/lidar/datasets/{id}/process/` - Process LiDAR dataset
- `GET /api/lidar/compartments/` - List forest compartments
- `POST /api/lidar/compartments/{id}/predict_biomass/` - Predict biomass

### Carbon Data
- `GET /api/carbon/stock/` - List carbon stock data
- `GET /api/carbon/sequestration/` - List sequestration rates
- `GET /api/carbon/credits/` - List carbon credits
- `POST /api/carbon/credits/calculate/` - Calculate carbon credits
- `GET /api/carbon/credits/summary/` - Get credits summary

## Project Structure

```
backend/
├── config/              # Project settings
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── lidar_app/          # LiDAR processing app
│   ├── models.py       # Database models
│   ├── views.py        # API views
│   ├── serializers.py  # DRF serializers
│   ├── urls.py         # URL routing
│   ├── admin.py        # Django admin
│   └── services/       # Business logic
│       ├── lidar_processor.py
│       └── biomass_predictor.py
├── carbon_app/         # Carbon calculations app
│   ├── models.py
│   ├── views.py
│   ├── serializers.py
│   ├── urls.py
│   ├── admin.py
│   └── services/
│       └── carbon_calculator.py
├── ml_models/          # Trained ML models
├── media/              # Uploaded files
│   ├── lidar_uploads/
│   └── lidar_processed/
├── manage.py
└── requirements.txt
```

## Machine Learning Models

### Training Biomass Models

1. Prepare training data with LiDAR features and field-measured biomass
2. Run the training script:
```bash
python scripts/train_biomass_model.py --data training_data.csv --model random_forest
```

3. Models are saved to `ml_models/` directory

### Features Used for Prediction

- Height percentiles (95th, 75th, 50th)
- Canopy height (mean, max)
- Canopy cover percentage
- Crown volume
- Foliage height diversity
- Compartment area

## LiDAR Processing Pipeline

1. **Upload**: User uploads LAS/LAZ file
2. **Ground Classification**: Identify ground points using SMRF algorithm
3. **Height Normalization**: Calculate height above ground
4. **Canopy Metrics**: Extract canopy height, cover, and structure
5. **Biomass Prediction**: Apply ML model to predict AGB
6. **Carbon Calculation**: Convert biomass to carbon stock

## Carbon Credit Calculation

1. **Sequestration Rate**: Calculate annual carbon sequestration
2. **Additionality**: Ensure credits represent additional carbon removal
3. **Buffer Reserve**: Apply buffer (typically 10-20%) for risk mitigation
4. **Verification**: Generate reports for third-party verification
5. **Issuance**: Calculate net credits eligible for issuance

## Development

### Running Tests
```bash
python manage.py test
```

### Creating Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### Admin Interface
Access the Django admin at `http://localhost:8000/admin/`

## Production Deployment

1. Set `DEBUG=False` in settings
2. Configure allowed hosts
3. Use production database
4. Set up static file serving
5. Configure HTTPS
6. Use production WSGI server (Gunicorn)
7. Set up Celery for background tasks
8. Configure Redis for caching and Channels

## Integration with React Frontend

The backend provides a REST API that the React frontend consumes:

1. CORS is configured to allow requests from `http://localhost:5173`
2. WebSocket support for real-time updates
3. File upload endpoints for LiDAR data
4. GeoJSON responses for mapping

## License

This project is part of a research initiative for LiDAR-based biomass and carbon analysis.

## Support

For issues and questions, please contact the development team.
