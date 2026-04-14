# TravelGenie AI Service (Aiml)

Python Flask service that powers recommendation endpoints for places, hotels, and budget planning.

## What This Service Does

- Serves Place recommendations by user + district
- Serves Hotel recommendations by user + district
- Serves Budget allocation recommendations using trip context
- Exposes a shared health endpoint used by backend AI monitors

## Folder Structure

```text
Aiml/
├── app.py
├── requirements.txt
├── Place_Recommendation_AI/
│   ├── __init__.py
│   └── place_recommendation.py
├── Hotel_Recommendation_AI/
│   ├── __init__.py
│   └── hotel_recommendation.py
└── Budget_Recommendation_AI/
    └── budget_recommendation.py
```

## Prerequisites

- Python 3.10+
- PostgreSQL access used by the recommendation models

## Setup

1. Create and activate a virtual environment.

```bash
cd Aiml
python -m venv .venv
.venv\Scripts\activate
```

2. Install dependencies.

```bash
pip install -r requirements.txt
```

3. Create `.env` in `Aiml/`.

```env
# AI service
AI_PORT=5001
FLASK_DEBUG=false

# Database for model data loading (required)
# Local PostgreSQL example:
# DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/travelgenie
# Cloud/Neon example:
# DATABASE_URL=postgresql://username:password@host.region.aws.neon.tech/database?sslmode=verify-full
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<dbname>

# Optional: weather cache TTL in seconds for place recommendations
PLACE_WEATHER_CACHE_TTL_SECONDS=900
```

## Run

```bash
python app.py
```

Service starts at `http://localhost:5001` by default.

Production-style run:

```bash
gunicorn app:app --bind 0.0.0.0:5001
```

## API Endpoints

### Health

- `GET /health`

Response:

```json
{
  "status": "ok",
  "service": "travelgenie-ai"
}
```

### Place Recommendation

- `GET /recommend`
- Required query: `user_id`, `district_id`
- Optional query: `top_n` (default `15`, range `1-100`)

### Hotel Recommendation

- `GET /hotels/recommend`
- Required query: `user_id`, `district_id`
- Optional query: `top_n` (default `12`, range `1-100`)

### Budget Recommendation

- `GET /budget/recommend`
- Required query: `user_id`, `district_id`, `total_budget`
- Optional query includes:
  - `hotel_budget`, `days`, `hotel_nights`, `currency`
  - `selected_place_ids`, `selected_hotel_ids`
  - `split_food_pct`, `split_transport_pct`, `split_activities_pct`

## Backend Integration

Node backend proxies user-authenticated requests to this service:

- `GET /api/places/ai-recommend` -> `GET /recommend`
- `GET /api/hotels/ai-recommend` -> `GET /hotels/recommend`
- `GET /api/budget/ai-recommend` -> `GET /budget/recommend`

Backend also uses `GET /health` for admin AI service monitoring.

## Notes

- Place AI preloads data during startup to reduce recommendation latency.
- If this service is down, backend returns controlled fallback errors (`503`/`504`) to frontend.
- Keep this service running with backend during local development to use AI-powered trip planning.
