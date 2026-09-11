import json, os, sys
from http.server import BaseHTTPRequestHandler
ML_DIR=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..','ml'))
if ML_DIR not in sys.path: sys.path.insert(0,ML_DIR)
from model.risk_model import RouteRiskPredictor
predictor=RouteRiskPredictor()
class handler(BaseHTTPRequestHandler):
    def send_json(self,status,payload):
        b=json.dumps(payload).encode(); self.send_response(status); self.send_header('Content-Type','application/json'); self.send_header('Access-Control-Allow-Origin','*'); self.send_header('Cache-Control','no-store'); self.end_headers(); self.wfile.write(b)
    def do_POST(self):
        try:
            n=int(self.headers.get('Content-Length','0'))
            if n>20000:return self.send_json(413,{'error':'Request too large.'})
            p=json.loads(self.rfile.read(n) or b'{}');
            if not predictor.model_loaded:return self.send_json(503,{'error':'Predictive model is not trained.','model_loaded':False})
            return self.send_json(200,predictor.predict(p.get('features') or {}))
        except Exception as e:return self.send_json(400,{'error':str(e)})
    def do_OPTIONS(self):self.send_response(204); self.send_header('Access-Control-Allow-Origin','*'); self.send_header('Access-Control-Allow-Methods','POST, OPTIONS'); self.send_header('Access-Control-Allow-Headers','Content-Type'); self.end_headers()
