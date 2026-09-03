"""
NER SmartLogix — Route Risk Model
Loads trained RandomForest model if available, else uses rule-based fallback.
"""
import os
import numpy as np

try:
    import joblib
    JOBLIB_AVAILABLE = True
except ImportError:
    JOBLIB_AVAILABLE = False

MODEL_PATH = os.path.join(os.path.dirname(__file__), "saved", "risk_model.pkl")


class RouteRiskPredictor:
    def __init__(self):
        self.model = None
        self.model_loaded = False
        self.model_type = "rule-based"
        self._try_load_model()

    def _try_load_model(self):
        if not JOBLIB_AVAILABLE:
            return
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                self.model_loaded = True
                self.model_type = "random-forest"
                print("[ML] Trained model loaded from", MODEL_PATH)
            except Exception as e:
                print(f"[ML] Failed to load model: {e}. Using rule-based fallback.")

    def predict(self, features: dict) -> dict:
        if self.model_loaded and self.model is not None:
            return self._ml_predict(features)
        return self._rule_predict(features)

    def _ml_predict(self, features: dict) -> dict:
        try:
            vec = self._to_vector(features)
            X = np.array([vec])
            pred = self.model.predict(X)[0]
            prob = self.model.predict_proba(X)[0]
            risk_map = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}
            risk = risk_map.get(int(pred), "MEDIUM")
            score = float(prob[int(pred)])
            return {
                "risk": risk,
                "score": round(score, 3),
                "reason": self._build_reason(features, risk),
                "source": "ml-model",
                "confidence": round(score, 3)
            }
        except Exception as e:
            print(f"[ML] Prediction error: {e}. Falling back to rule-based.")
            return self._rule_predict(features)

    def _rule_predict(self, features: dict) -> dict:
        score = 0.0
        reasons = []

        rainfall = features.get("rainfall_mm", 0) or 0
        flood_index = features.get("flood_index", 0) or 0
        alert_count = features.get("alert_count_on_route", 0) or 0
        landslide = features.get("active_landslide_alerts", 0) or 0
        road_disruption = features.get("road_disruption_count", 0) or 0
        vehicle_weight = features.get("vehicle_type_weight", 1.0) or 1.0

        if rainfall > 100:
            score += 0.35
            reasons.append(f"Very heavy rainfall ({rainfall:.0f}mm) detected.")
        elif rainfall > 50:
            score += 0.20
            reasons.append(f"Heavy rainfall ({rainfall:.0f}mm) detected.")
        elif rainfall > 20:
            score += 0.10

        if flood_index > 0.7:
            score += 0.30
            reasons.append("High flood risk index in the region.")
        elif flood_index > 0.4:
            score += 0.15

        if landslide > 0:
            score += 0.25 * min(landslide, 3)
            reasons.append(f"{landslide} active landslide alert(s) near route.")

        if road_disruption > 0:
            score += 0.15 * min(road_disruption, 3)
            reasons.append(f"{road_disruption} road disruption(s) reported.")

        if alert_count > 3:
            score += 0.20
            reasons.append(f"{alert_count} active alerts in corridor.")
        elif alert_count > 0:
            score += 0.10

        # Heavy vehicles have slightly higher risk
        if vehicle_weight > 1.5:
            score *= 1.10

        score = min(score, 1.0)

        if score >= 0.65:
            risk = "HIGH"
        elif score >= 0.35:
            risk = "MEDIUM"
        else:
            risk = "LOW"

        if not reasons:
            reasons.append("No significant hazards detected along this route.")

        return {
            "risk": risk,
            "score": round(score, 3),
            "reason": " ".join(reasons),
            "source": "rule-based",
            "confidence": None
        }

    def _to_vector(self, features: dict) -> list:
        return [
            features.get("rainfall_mm", 0) or 0,
            features.get("flood_index", 0) or 0,
            features.get("alert_count_on_route", 0) or 0,
            features.get("active_landslide_alerts", 0) or 0,
            features.get("road_disruption_count", 0) or 0,
            features.get("historical_risk_score", 0.3) or 0.3,
            features.get("vehicle_type_weight", 1.0) or 1.0
        ]

    def _build_reason(self, features: dict, risk: str) -> str:
        parts = []
        rainfall = features.get("rainfall_mm", 0) or 0
        if rainfall > 50:
            parts.append(f"Heavy rainfall ({rainfall:.0f}mm) detected.")
        if features.get("active_landslide_alerts", 0):
            parts.append("Active landslide alerts near route.")
        if features.get("road_disruption_count", 0):
            parts.append("Road disruptions reported on corridor.")
        if not parts:
            parts.append(f"Route assessed as {risk} risk based on current weather and alert conditions.")
        return " ".join(parts)
