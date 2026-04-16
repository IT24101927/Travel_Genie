# -*- coding: utf-8 -*-
"""
TravelGenie AI Service
======================
Central Flask server that exposes all AI model endpoints.
Each AI model lives in its own subfolder; this file acts as
the single entry point for the Node.js backend.

Start:
    python app.py
    # or with gunicorn:
    gunicorn app:app --bind 0.0.0.0:5001

AI Models
---------
  /places/*   – Place Recommendation AI  (Place_Recommendation_AI/)
  /hotels/*   – Hotel Recommendation AI  (Hotel_Recommendation_AI/)
  /budget/*   – Budget Recommendation AI (Budget_Recommendation_AI/)
  (add new blueprints here as new models are built)
"""

import os

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from Place_Recommendation_AI.place_recommendation import get_engine, recommend_places_with_cache, preload_data
from Hotel_Recommendation_AI.hotel_recommendation import recommend_hotels, load_hotels
from Budget_Recommendation_AI.budget_recommendation import recommend_budget

load_dotenv()

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from the Node.js backend

# ───────────────────────────────────────────────
# Pre-load all data & feature vectors once at startup
# so individual /recommend calls are fast (< 5 s instead of 30+ s)
# ───────────────────────────────────────────────
print("[Place AI] Loading data from DB … (this happens once at startup)")
_engine       = get_engine()
_place_cache  = preload_data(_engine)
print("[Place AI] Data loaded and cached. Ready to serve requests.")
try:
    _ = load_hotels(_engine)
    print("[Hotel AI] Hotel data warm-up completed.")
except Exception as e:
    # Keep service up; request-time retry/refresh handles transient DB issues.
    print(f"[Hotel AI] Warm-up skipped due to startup error: {e}")
print("[Hotel AI] Ready to serve requests.")
print("[Budget AI] Ready to serve requests.")


# ───────────────────────────────────────────────
# Health check
# ───────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    """Simple liveness check."""
    return jsonify({"status": "ok", "service": "travelgenie-ai"})


# ───────────────────────────────────────────────
# Place Recommendation endpoints  (/recommend)
# ───────────────────────────────────────────────

@app.route("/recommend", methods=["GET"])
def recommend():
    """
    GET /recommend?user_id=<int>&district_id=<int>&top_n=<int>

    Returns JSON:
    {
      "user_id": 10,
      "district_id": 15,
      "count": 5,
      "recommendations": [ { place_id, name, final_score, ... }, ... ]
    }
    """
    user_id_str     = request.args.get("user_id")
    district_id_str = request.args.get("district_id")
    top_n_str       = request.args.get("top_n", "15")

    if not user_id_str or not district_id_str:
        return jsonify({"error": "user_id and district_id are required"}), 400

    try:
        user_id     = int(user_id_str)
        district_id = int(district_id_str)
        top_n       = int(top_n_str)
    except ValueError:
        return jsonify({"error": "user_id, district_id, and top_n must be integers"}), 400

    if top_n < 1 or top_n > 100:
        return jsonify({"error": "top_n must be between 1 and 100"}), 400

    try:
        results = recommend_places_with_cache(user_id, district_id, top_n, cached=_place_cache)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        app.logger.error("Place recommendation error: %s", e, exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

    return jsonify({
        "user_id":         user_id,
        "district_id":     district_id,
        "count":           len(results),
        "recommendations": results,
    })


# ───────────────────────────────────────────────
# Hotel Recommendation endpoints  (/hotels/recommend)
# ───────────────────────────────────────────────

@app.route("/hotels/recommend", methods=["GET"])
def recommend_hotels_endpoint():
    """
    GET /hotels/recommend?user_id=<int>&district_id=<int>&top_n=<int>
    """
    user_id_str = request.args.get("user_id")
    district_id_str = request.args.get("district_id")
    top_n_str = request.args.get("top_n", "12")

    if not user_id_str or not district_id_str:
        return jsonify({"error": "user_id and district_id are required"}), 400

    try:
        user_id = int(user_id_str)
        district_id = int(district_id_str)
        top_n = int(top_n_str)
    except ValueError:
        return jsonify({"error": "user_id, district_id, and top_n must be integers"}), 400

    if top_n < 1 or top_n > 100:
        return jsonify({"error": "top_n must be between 1 and 100"}), 400

    try:
        results = recommend_hotels(user_id, district_id, top_n, engine=_engine)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        app.logger.error("Hotel recommendation error: %s", e, exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

    return jsonify({
        "user_id": user_id,
        "district_id": district_id,
        "count": len(results),
        "recommendations": results,
    })


# ───────────────────────────────────────────────
# Budget Recommendation endpoints  (/budget/recommend)
# ───────────────────────────────────────────────

@app.route("/budget/recommend", methods=["GET"])
def recommend_budget_endpoint():
    """
    GET /budget/recommend?user_id=<int>&district_id=<int>&total_budget=<float>&hotel_budget=<float>&days=<int>
    Optional: hotel_nights=<int>&currency=<str>&selected_place_ids=1,2,3&selected_hotel_ids=10,11
              &split_food_pct=<float>&split_transport_pct=<float>&split_activities_pct=<float>
    """
    user_id_str = request.args.get("user_id")
    district_id_str = request.args.get("district_id")
    total_budget_str = request.args.get("total_budget")
    hotel_budget_str = request.args.get("hotel_budget", "0")
    days_str = request.args.get("days", "1")
    hotel_nights_str = request.args.get("hotel_nights", "0")
    split_food_pct = request.args.get("split_food_pct")
    split_transport_pct = request.args.get("split_transport_pct")
    split_activities_pct = request.args.get("split_activities_pct")
    currency = (request.args.get("currency", "LKR") or "LKR").upper()

    if not user_id_str or not district_id_str or total_budget_str is None:
        return jsonify({"error": "user_id, district_id and total_budget are required"}), 400

    try:
        user_id = int(user_id_str)
        district_id = int(district_id_str)
        total_budget = float(total_budget_str)
        hotel_budget = float(hotel_budget_str)
        days = int(days_str)
        hotel_nights = int(hotel_nights_str)
    except ValueError:
        return jsonify({"error": "user_id, district_id, total_budget, hotel_budget, days and hotel_nights must be numeric"}), 400

    selected_place_ids_raw = request.args.get("selected_place_ids", "")
    selected_hotel_ids_raw = request.args.get("selected_hotel_ids", "")

    selected_place_ids = [x.strip() for x in selected_place_ids_raw.split(",") if x.strip()]
    selected_hotel_ids = [x.strip() for x in selected_hotel_ids_raw.split(",") if x.strip()]

    custom_split = None
    if any(v is not None and str(v).strip() != "" for v in [split_food_pct, split_transport_pct, split_activities_pct]):
        custom_split = {
            "food": split_food_pct,
            "transport": split_transport_pct,
            "activities_misc": split_activities_pct,
        }

    try:
        result = recommend_budget(
            user_id=user_id,
            district_id=district_id,
            total_budget=total_budget,
            hotel_budget=hotel_budget,
            num_days=days,
            hotel_nights=hotel_nights,
            currency=currency,
            selected_place_ids=selected_place_ids,
            selected_hotel_ids=selected_hotel_ids,
            custom_split=custom_split,
            engine=_engine,
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        app.logger.error("Budget recommendation error: %s", e, exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

    return jsonify(result)


# ───────────────────────────────────────────────
# Add new AI model blueprints below, e.g.:
#   from Hotel_Recommendation_AI.hotel_recommendation import ...
#   @app.route("/hotels/recommend", methods=["GET"])
#   def recommend_hotels(): ...
# ───────────────────────────────────────────────


# ───────────────────────────────────────────────
# Entry point
# ───────────────────────────────────────────────

if __name__ == "__main__":
    port  = int(os.environ.get("AI_PORT", 5001))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
