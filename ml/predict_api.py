"""
FastAPI ML Prediction Microservice
Run: uvicorn ml.predict_api:app --host 0.0.0.0 --port 8000 --reload
  OR: python -m uvicorn ml.predict_api:app --port 8000

Endpoint: POST /predict
"""

import os
import sys
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_FILE   = os.path.join(BASE_DIR, 'ml', 'model.pkl')
ENCODER_FILE = os.path.join(BASE_DIR, 'ml', 'label_encoders.pkl')

# ── Load Model on Startup ─────────────────────────────────────────────────────
if not os.path.exists(MODEL_FILE):
    print("❌ model.pkl not found. Run: python ml/train.py first.")
    sys.exit(1)

model    = joblib.load(MODEL_FILE)
encoders = joblib.load(ENCODER_FILE)
print("✅ ML Model loaded successfully")

# Feature columns — must match training order exactly
FEATURE_COLS = [
    'dayOfWeek',
    'hour',
    'month',
    'holiday',
    'weather',
    'googleETA_min',
    'distance_km',
    'junctionCount',
    'majorJunctionCount',
    'totalCongestionWeight',
]

CATEGORICAL_COLS = ['dayOfWeek', 'holiday', 'weather']

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Ambulance AI — Traffic Delay Prediction API",
    description="Predicts traffic delay (minutes) for ambulance routes using Random Forest",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request Schema ────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    dayOfWeek:             str   = Field(...,               description="Day name: Sunday, Monday ... Saturday")
    hour:                  int   = Field(..., ge=0, le=23,  description="Hour of day (0-23)")
    month:                 int   = Field(..., ge=1, le=12,  description="Month (1-12)")
    holiday:               int   = Field(..., ge=0, le=1,   description="0=No, 1=Yes")
    weather:               str   = Field(...,               description="Clear|Cloudy|Rainy|Foggy|Stormy")
    googleETA_min:         float = Field(..., gt=0,         description="Google ETA in minutes")
    distance_km:           float = Field(..., gt=0,         description="Route distance in km")
    junctionCount:         int   = Field(..., ge=0,         description="Total junctions on route")
    majorJunctionCount:    int   = Field(..., ge=0,         description="Major junctions on route")
    totalCongestionWeight: float = Field(..., ge=0,         description="Sum of junction congestion weights")

    class Config:
        json_schema_extra = {
            "example": {
                "dayOfWeek": "Thursday",
                "hour": 14,
                "month": 6,
                "holiday": 0,
                "weather": "Clear",
                "googleETA_min": 22.0,
                "distance_km": 13.6,
                "junctionCount": 6,
                "majorJunctionCount": 5,
                "totalCongestionWeight": 28.0,
            }
        }


# ── Response Schema ───────────────────────────────────────────────────────────
class PredictResponse(BaseModel):
    predictedDelay_min: float
    finalETA_hint_min:  float
    model:              str = "RandomForestRegressor"
    status:             str = "success"


# ── Helper: Encode input features ─────────────────────────────────────────────
def encode_input(data: dict) -> np.ndarray:
    encoded = []
    for col in FEATURE_COLS:
        val = data[col]
        if col in CATEGORICAL_COLS and col in encoders:
            le = encoders[col]
            str_val = str(val)
            if str_val in le.classes_:
                val = int(le.transform([str_val])[0])
            else:
                # Unknown category → use most frequent class (index 0)
                val = 0
        encoded.append(float(val))
    return np.array(encoded).reshape(1, -1)


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "running", "service": "Ambulance AI ML Prediction API", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy", "model_loaded": True}


@app.post("/predict", response_model=PredictResponse, tags=["Prediction"])
def predict(request: PredictRequest):
    try:
        data    = request.dict()
        X       = encode_input(data)
        delay   = float(model.predict(X)[0])
        delay   = max(0.0, round(delay, 2))
        final   = round(data['googleETA_min'] + delay, 2)

        return PredictResponse(
            predictedDelay_min=delay,
            finalETA_hint_min=final,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
