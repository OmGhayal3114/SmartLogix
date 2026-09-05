# NER SmartLogix — Logistics Intelligence Platform

A full-stack logistics intelligence platform for the **North Eastern Region (NER) of India**. Provides real-time route planning, AI-driven risk assessment, NER disaster alerts, nearby facilities, and multilingual support.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla JS SPA (ES Modules), HTML, CSS |
| Backend | Node.js + Express + MongoDB (Mongoose) |
| ML Service | Python + FastAPI + scikit-learn |
| Maps | Google Maps JavaScript API (key served by backend) |
| Weather | Open-Meteo (free, no key required) |
| Auth | JWT (jsonwebtoken + bcryptjs) |

---

## Quick Start

### Prerequisites
- Node.js v18+
- MongoDB running locally (`mongod`)
- Python 3.9+ (optional — for ML service)

### 1. Clone & Setup

```bash
git clone <your-repo-url>
cd smartlogix
```

### 2. Configure Environment

The `.env` file is already created with your Google Maps API key. To change any values:

```bash
# Edit .env
GOOGLE_MAPS_API_KEY=AIzaSyBA_Y-csOWhduDCxDyph7CVmIFZeo_x_68
MONGODB_URI=mongodb://localhost:27017/nersmartlogix
JWT_SECRET=ner_smartlogix_super_secret_jwt_key_change_in_production
PORT=5000
FRONTEND_URL=http://localhost:3000
ML_SERVICE_URL=http://localhost:8000
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Start MongoDB

```bash
mongod
```

### 5. Start the Backend

```bash
cd backend
npm start
# Or for development with auto-reload:
npm run dev
```

The backend will start on **http://localhost:5000**.

On first startup, it will automatically seed 10 NER sample alerts into the database.

### 6. Start the Frontend

```bash
cd frontend
npx serve . -p 3000
```

Open **http://localhost:3000** in your browser.

---

## ML Service (Optional)

The ML service provides more accurate route risk prediction. Without it, the backend uses a rule-based fallback.

### Setup

```bash
cd ml
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

The ML service starts on **http://localhost:8000** using **rule-based prediction** until a trained model is available.

### Training Your Own Model

1. Create a dataset (see `ml/training/data/dataset_format.md`)
2. Place it at `ml/training/data/route_risk_dataset.csv`
3. Run:

```bash
cd ml
python training/train.py
```

4. Restart the ML service

---

## Google APIs Required

Enable these APIs in [Google Cloud Console](https://console.cloud.google.com/apis/):

| API | Purpose |
|-----|---------|
| Maps JavaScript API | Interactive map display |
| Directions API | Route calculation (server-side) |
| Places API | Nearby facilities search |
| Geocoding API | City name → coordinates |

Your API key (---) is stored in `.env` and **never sent to the browser**. It is served via `/api/config/maps-key` which returns the key for Google Maps to load.

---

## Features

### Plan Trip
- Select logistics vehicle (Truck, Heavy Truck, Mini Truck, Cargo Van, Pickup, Refrigerated Truck, Tanker)
- Enter origin and destination
- View route alternatives with distance, duration, and traffic ETA
- Select a route → instantly opens Live Network

### Live Network
- Real Google Maps with dark theme matching the app
- Route displayed with teal polyline
- ML-powered risk assessment (LOW / MEDIUM / HIGH)
- Active alerts affecting your route
- Nearby hospitals, hotels, and fuel stations
- Save trip to your account (login required)

### NER Alerts
- Top 10 active alerts for all 8 NER states
- Updated daily at 6:00 AM IST via cron job
- Sources: IMD (India Meteorological Department)
- Sample alerts seeded when external APIs are unavailable (clearly labeled)

### My Trip
- Login required
- View all saved trips with risk level and status
- Trip detail with origin, destination, vehicle, distance, risk reason
- Delete trips

### Facilities
- Requires a route to be selected
- Hospitals, hotels, fuel stations along the route
- Rating and open/closed status from Google Places API

### Help & Safety
- Quick action shortcuts (emergency, facilities, contacts, share trip)
- Pre-departure logistics checklist
- NER emergency numbers (112, 108, 1033 NHAI, 1078 NDMA)
- NER terrain-specific logistics safety tips

### Feedback
- Submit route issues, facility issues, alert issues, or general feedback
- Works for both logged-in and anonymous users

### Multilingual
- 11 languages: English, Hindi, Assamese, Bengali, Bodo, Meitei (Manipuri), Khasi, Garo, Mizo, Nepali, Kokborok
- Language preference saved in browser and synced to account when logged in

---

## Project Structure

```
smartlogix/
├── .env                          # Environment variables (not committed)
├── .env.example                  # Template for environment variables
├── .gitignore
├── package.json                  # Root convenience scripts
│
├── frontend/
│   ├── index.html
│   ├── css/main.css
│   ├── js/
│   │   ├── app.js                # Entry point
│   │   ├── state.js              # Centralized state
│   │   ├── api.js                # Backend API client
│   │   ├── i18n.js               # Translation engine
│   │   ├── auth.js               # Auth modal
│   │   ├── maps.js               # Google Maps integration
│   │   ├── render.js             # Main render engine
│   │   ├── router.js             # Page router
│   │   └── pages/
│   │       ├── plan.js
│   │       ├── live.js
│   │       ├── mytrip.js
│   │       ├── alerts.js
│   │       ├── facilities.js
│   │       ├── feedback.js
│   │       └── help.js
│   └── locales/
│       ├── en.json, hi.json, as.json, bn.json, brx.json
│       ├── mni.json, kha.json, grt.json, lus.json, ne.json, kok.json
│
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── models/          User.js, Trip.js, Alert.js, Feedback.js
│   ├── middleware/      auth.js, errorHandler.js
│   ├── routes/          auth.js, trips.js, routes.js, facilities.js, alerts.js, ml.js, feedback.js, config.js
│   ├── controllers/     authController.js, tripController.js, routeController.js, facilityController.js, alertController.js, mlController.js, feedbackController.js
│   ├── services/        googleMaps.js, alertAggregator.js
│   └── jobs/            alertCron.js
│
└── ml/
    ├── app.py                    # FastAPI entry point
    ├── requirements.txt
    ├── model/
    │   ├── risk_model.py         # RandomForest + rule-based predictor
    │   ├── feature_engineering.py # Open-Meteo weather + feature building
    │   └── saved/                # Trained model saved here
    ├── prediction/predictor.py
    └── training/
        ├── train.py              # Training script
        └── data/dataset_format.md
```

---

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/signup` | Create account | No |
| POST | `/api/auth/login` | Login | No |
| GET | `/api/auth/me` | Get current user | Yes |
| POST | `/api/routes` | Calculate routes | No |
| GET | `/api/alerts/top10` | Top 10 NER alerts | No |
| GET | `/api/alerts/route?origin=&destination=` | Route-specific alerts | No |
| GET | `/api/facilities/near-route?origin=&destination=` | Facilities along route | No |
| POST | `/api/ml/route-risk` | Predict route risk | No |
| POST | `/api/trips` | Save trip | Yes |
| GET | `/api/trips` | My trips | Yes |
| DELETE | `/api/trips/:id` | Delete trip | Yes |
| POST | `/api/feedback` | Submit feedback | Optional |
| GET | `/api/config/maps-key` | Get Maps API key | No |
| GET | `/api/health` | Health check | No |
