"""
NER SmartLogix — ML Service (FastAPI)
Provides route risk prediction using a trained model or rule-based fallback.
Uses Open-Meteo (free, no key) for real weather data.
"""
import os
import sys

# Add the ml directory to path so we can import model/prediction packages
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from prediction.predictor import RouteRiskPredictor
from model.feature_engineering import build_features

app = FastAPI(
    title="NER SmartLogix ML Service",
    description="Route risk prediction for NER Logistics Intelligence Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

predictor = RouteRiskPredictor()


class PredictionRequest(BaseModel):
    origin: str
    destination: str
    vehicle_type: Optional[str] = "Truck"
    rainfall_mm: Optional[float] = None
    active_alerts: Optional[int] = None


class PredictionResponse(BaseModel):
    risk: str
    score: float
    reason: str
    source: str
    confidence: Optional[float] = None


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": predictor.model_loaded,
        "model_type": predictor.model_type
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(req: PredictionRequest):
    try:
        features = await build_features(
            origin=req.origin,
            destination=req.destination,
            vehicle_type=req.vehicle_type,
            rainfall_mm_override=req.rainfall_mm,
            active_alerts_override=req.active_alerts
        )
        result = predictor.predict(features)
        return PredictionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
