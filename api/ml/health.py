import json
import os
import sys
from http.server import BaseHTTPRequestHandler


ML_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml"))
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

from model.risk_model import RouteRiskPredictor


predictor = RouteRiskPredictor()


class handler(BaseHTTPRequestHandler):
    def _send(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        self._send(200, {
            "status": "ok",
            "model_loaded": predictor.model_loaded,
            "model_type": predictor.model_type,
        })
