# Route Risk Dataset Format

## File Location
Place dataset at: `ml/training/data/route_risk_dataset.csv`

## Required Columns

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `rainfall_mm` | float | Daily total rainfall in millimeters | `85.5` |
| `flood_index` | float | Flood risk index (0.0 = no risk, 1.0 = maximum) | `0.65` |
| `alert_count_on_route` | int | Active alerts along this route | `3` |
| `active_landslide_alerts` | int | Landslide alerts active near route | `1` |
| `road_disruption_count` | int | Road disruptions reported | `2` |
| `historical_risk_score` | float | Historical average risk for this corridor (0.0–1.0) | `0.45` |
| `vehicle_type_weight` | float | Vehicle weight factor (see below) | `1.8` |
| `risk_level` | string | **Label**: LOW, MEDIUM, or HIGH | `HIGH` |

## Vehicle Type Weights

| Vehicle | Weight |
|---------|--------|
| Pickup | 0.8 |
| Cargo Van | 0.9 |
| Mini Truck | 1.0 |
| Truck | 1.2 |
| Refrigerated Truck | 1.3 |
| Tanker | 1.6 |
| Heavy Truck | 1.8 |

## Sample Row
```csv
rainfall_mm,flood_index,alert_count_on_route,active_landslide_alerts,road_disruption_count,historical_risk_score,vehicle_type_weight,risk_level
92.5,0.72,3,1,1,0.55,1.8,HIGH
15.0,0.12,0,0,0,0.20,1.0,LOW
48.3,0.38,1,0,1,0.35,1.2,MEDIUM
```

## Data Sources
1. **IMD** (mausam.imd.gov.in) — historical rainfall data for NER districts
2. **NDMA** (ndma.gov.in) — disaster event records and landslide history
3. **Historical trip data** — past trip risk outcomes for NER routes
4. **State PWD records** — road condition and disruption history

## Minimum Requirements
- **At least 500 records** recommended for reliable predictions
- **Class balance**: Aim for roughly equal LOW/MEDIUM/HIGH distribution
- **NER routes only**: Data should be from Northeast India routes

## Training
Once dataset is ready:
```bash
cd ml
python training/train.py
```

The model will be saved to `ml/model/saved/risk_model.pkl`.
Restart the ML service to load the new model.
