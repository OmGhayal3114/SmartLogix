"""
NER SmartLogix — Feature Engineering
Fetches real weather data from Open-Meteo (free, no API key required).
Builds a 7-feature vector for route risk prediction.
"""
import httpx
from typing import Optional

# Vehicle type weights — heavier vehicles = higher risk factor
VEHICLE_WEIGHTS = {
    "Truck": 1.2,
    "Heavy Truck": 1.8,
    "Mini Truck": 1.0,
    "Cargo Van": 0.9,
    "Pickup": 0.8,
    "Refrigerated Truck": 1.3,
    "Tanker": 1.6
}

# Approximate coordinates for major NER cities
NER_CITY_COORDS = {
    "guwahati": (26.1445, 91.7362),
    "shillong": (25.5788, 91.8933),
    "imphal": (24.8170, 93.9368),
    "aizawl": (23.7307, 92.7173),
    "kohima": (25.6751, 94.1086),
    "agartala": (23.8315, 91.2868),
    "itanagar": (27.0844, 93.6053),
    "gangtok": (27.3389, 88.6065),
    "silchar": (24.8333, 92.7789),
    "dimapur": (25.9063, 93.7263),
    "jorhat": (26.7465, 94.2026),
    "dibrugarh": (27.4728, 94.9120),
    "tura": (25.5164, 90.2219),
    "churachandpur": (24.3333, 93.6833),
    "pasighat": (28.0667, 95.3333),
    "tezpur": (26.6338, 92.7931),
    "tawang": (27.5859, 91.8669),
    "nagaon": (26.3481, 92.6841),
    "mokokchung": (26.3243, 94.5126),
    "lunglei": (22.8854, 92.7315)
}


async def get_weather_data(lat: float, lng: float) -> dict:
    """Fetch weather data from Open-Meteo API (free, no key required)."""
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lng}"
            f"&current=precipitation,weathercode,windspeed_10m"
            f"&daily=precipitation_sum,precipitation_probability_max,weathercode"
            f"&forecast_days=1&timezone=Asia/Kolkata"
        )
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url)
            data = r.json()
            current = data.get("current", {})
            daily = data.get("daily", {})

            daily_rain = (daily.get("precipitation_sum", [0]) or [0])[0] or 0
            current_rain = current.get("precipitation", 0) or 0
            total_rainfall = daily_rain + current_rain

            precip_prob = (daily.get("precipitation_probability_max", [0]) or [0])[0] or 0
            weather_code = current.get("weathercode", 0) or 0

            return {
                "rainfall_mm": round(float(total_rainfall), 2),
                "precipitation_probability": float(precip_prob),
                "weather_code": int(weather_code)
            }
    except Exception as e:
        print(f"[Weather] Open-Meteo fetch failed: {e}")
        return {"rainfall_mm": 0.0, "precipitation_probability": 0.0, "weather_code": 0}


def get_coords_for_city(city: str):
    """Look up approximate NER coordinates for a city name."""
    return NER_CITY_COORDS.get(city.lower().strip())


def get_flood_index(rainfall_mm: float, precip_prob: float) -> float:
    """Compute a 0-1 flood index from rainfall and precipitation probability."""
    rain_factor = min(rainfall_mm / 200.0, 1.0)
    prob_factor = precip_prob / 100.0
    return round(rain_factor * 0.7 + prob_factor * 0.3, 3)


async def build_features(
    origin: str,
    destination: str,
    vehicle_type: Optional[str] = "Truck",
    rainfall_mm_override: Optional[float] = None,
    active_alerts_override: Optional[int] = None
) -> dict:
    """Build a 7-feature dict for risk prediction."""
    origin_coords = get_coords_for_city(origin)
    dest_coords = get_coords_for_city(destination)

    # Use midpoint of route for weather lookup
    if origin_coords and dest_coords:
        mid_lat = (origin_coords[0] + dest_coords[0]) / 2
        mid_lng = (origin_coords[1] + dest_coords[1]) / 2
    elif origin_coords:
        mid_lat, mid_lng = origin_coords
    elif dest_coords:
        mid_lat, mid_lng = dest_coords
    else:
        # Default to NER centroid
        mid_lat, mid_lng = 25.5, 92.5

    weather = await get_weather_data(mid_lat, mid_lng)

    rainfall = rainfall_mm_override if rainfall_mm_override is not None else weather["rainfall_mm"]
    flood_index = get_flood_index(rainfall, weather["precipitation_probability"])
    vehicle_weight = VEHICLE_WEIGHTS.get(vehicle_type or "Truck", 1.0)

    # WMO weather code >= 60 = rain/storm
    wcode = weather.get("weather_code", 0)
    is_severe_weather = 1 if wcode >= 60 else 0

    return {
        "rainfall_mm": round(rainfall, 2),
        "flood_index": flood_index,
        "alert_count_on_route": active_alerts_override if active_alerts_override is not None else 0,
        "active_landslide_alerts": 1 if (rainfall > 80 or flood_index > 0.6) else 0,
        "road_disruption_count": 1 if is_severe_weather else 0,
        "historical_risk_score": 0.3,  # Default until real historical data is available
        "vehicle_type_weight": vehicle_weight
    }
