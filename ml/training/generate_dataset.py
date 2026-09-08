"""Generate a reproducible bootstrap dataset for the first route-risk model.

This is a development bootstrap only. Replace the generated CSV with labeled
IMD/NDMA/PWD/trip-history records before using the model for operational
decisions. The labels encode the same safety factors used by the fallback
assessor, with bounded noise around class boundaries.
"""
import csv
import os
import random


DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "route_risk_dataset.csv")
FIELDS = [
    "rainfall_mm",
    "flood_index",
    "alert_count_on_route",
    "active_landslide_alerts",
    "road_disruption_count",
    "historical_risk_score",
    "vehicle_type_weight",
    "risk_level",
]
VEHICLE_WEIGHTS = [0.8, 0.9, 1.0, 1.2, 1.3, 1.6, 1.8]


def risk_score(row):
    rainfall = min(row["rainfall_mm"] / 140.0, 1.0)
    alerts = min(row["alert_count_on_route"] / 6.0, 1.0)
    landslide = min(row["active_landslide_alerts"] / 2.0, 1.0)
    disruption = min(row["road_disruption_count"] / 3.0, 1.0)
    vehicle = (row["vehicle_type_weight"] - 0.8) / 1.0
    return (
        rainfall * 0.25
        + row["flood_index"] * 0.25
        + alerts * 0.15
        + landslide * 0.15
        + disruption * 0.10
        + row["historical_risk_score"] * 0.08
        + vehicle * 0.02
    )


def generate(count=1800, seed=20260908):
    rng = random.Random(seed)
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, "w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(output, fieldnames=FIELDS)
        writer.writeheader()
        for _ in range(count):
            rainfall = round(rng.triangular(0, 220, 35), 2)
            probability = rng.uniform(0, 100)
            flood_index = round(min(rainfall / 200.0, 1.0) * 0.7 + probability / 100.0 * 0.3, 3)
            row = {
                "rainfall_mm": rainfall,
                "flood_index": flood_index,
                "alert_count_on_route": rng.choices(range(0, 8), weights=[30, 25, 18, 12, 7, 4, 2, 1])[0],
                "active_landslide_alerts": rng.choices([0, 1, 2, 3], weights=[72, 20, 6, 2])[0],
                "road_disruption_count": rng.choices([0, 1, 2, 3], weights=[68, 22, 8, 2])[0],
                "historical_risk_score": round(rng.betavariate(2.2, 4.5), 3),
                "vehicle_type_weight": rng.choice(VEHICLE_WEIGHTS),
            }
            score = risk_score(row)
            # A small boundary band prevents the model from learning a single
            # brittle cutoff and better reflects uncertain field observations.
            score += rng.uniform(-0.025, 0.025)
            row["risk_level"] = "HIGH" if score >= 0.58 else "MEDIUM" if score >= 0.30 else "LOW"
            writer.writerow(row)

    print(f"Generated {count} bootstrap records at {DATA_PATH}")


if __name__ == "__main__":
    generate()
