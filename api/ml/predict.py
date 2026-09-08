import asyncio
import json
import os
import sys
from http.server import BaseHTTPRequestHandler


ML_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml"))
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

from model.feature_engineering import build_features
from model.risk_model import RouteRiskPredictor


predictor = RouteRiskPredictor()


class handler(BaseHTTPRequestHandler):
    def _send(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size > 10000:
                return self._send(413, {"error": "Request body is too large."})

            payload = json.loads(self.rfile.read(size) or b"{}")
            origin = str(payload.get("origin", "")).strip()
            destination = str(payload.get("destination", "")).strip()
            if not origin or not destination:
                return self._send(400, {"error": "Origin and destination are required."})

            features = asyncio.run(build_features(
                origin=origin,
                destination=destination,
                vehicle_type=payload.get("vehicle_type") or "Truck",
                rainfall_mm_override=payload.get("rainfall_mm"),
                active_alerts_override=payload.get("active_alerts"),
            ))
            return self._send(200, predictor.predict(features))
        except Exception as exc:
            return self._send(500, {"error": f"ML prediction failed: {exc}"})
