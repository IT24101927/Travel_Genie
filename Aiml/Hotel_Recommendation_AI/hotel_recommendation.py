# -*- coding: utf-8 -*-
"""
Hotel Recommendation AI - Neon DB Version
Builds ranked hotel recommendations for a user and district.
"""

import ast
import json
import os
import re
from math import atan2, cos, radians, sin, sqrt

import numpy as np
import pandas as pd
import requests
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.exc import DBAPIError, PendingRollbackError

load_dotenv()


def get_engine():
    """Create SQLAlchemy engine from DATABASE_URL."""
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise ValueError(
            "DATABASE_URL environment variable is not set. "
            "Add it to .env before running the AI service."
        )

    url = re.sub(r"sslmode=verify-full", "sslmode=require", url)
    if "sslmode" not in url:
        connector = "&" if "?" in url else "?"
        url += f"{connector}sslmode=require"

    return create_engine(
        url,
        connect_args={"sslmode": "require", "connect_timeout": 10},
        pool_pre_ping=True,
        pool_recycle=1800,
        pool_reset_on_return="rollback",
    )


def _is_transient_db_error(exc):
    msg = str(exc).lower()
    transient_markers = (
        "can't reconnect until invalid transaction is rolled back",
        "server closed the connection unexpectedly",
        "connection reset",
        "connection timed out",
        "terminating connection",
        "ssl connection has been closed unexpectedly",
    )
    return any(marker in msg for marker in transient_markers)


def _read_sql_with_retry(engine, query, params=None, retries=1):
    """Run read-only SQL safely with a fresh connection and transient retry."""
    last_exc = None
    for attempt in range(retries + 1):
        try:
            with engine.connect() as conn:
                return pd.read_sql_query(text(query), conn, params=params)
        except (PendingRollbackError, DBAPIError, pd.errors.DatabaseError) as exc:
            last_exc = exc
            # Ensure this connection is cleanly reset before pool return.
            try:
                with engine.connect() as conn:
                    conn.rollback()
            except Exception:
                pass

            if attempt < retries and _is_transient_db_error(exc):
                # Drop potentially stale pooled connections and retry once.
                engine.dispose()
                continue
            raise

    raise last_exc


def clean_text(value):
    try:
        if pd.isna(value):
            return ""
    except (TypeError, ValueError):
        pass
    return str(value).strip().lower()


def parse_json_safe(value, default=None):
    if default is None:
        default = {}

    try:
        if pd.isna(value):
            return default
    except (TypeError, ValueError):
        pass

    if isinstance(value, (dict, list)):
        return value

    s = str(value).strip()
    if not s:
        return default

    try:
        return json.loads(s)
    except Exception:
        try:
            return ast.literal_eval(s)
        except Exception:
            return default


def split_comma_text(value):
    try:
        if pd.isna(value):
            return []
    except (TypeError, ValueError):
        pass

    s = str(value).strip()
    if not s:
        return []

    return [clean_text(x) for x in s.split(",") if clean_text(x)]


def parse_amenities(value):
    data = parse_json_safe(value, default=[])
    if not isinstance(data, list):
        return []

    out = []
    for item in data:
        if isinstance(item, str):
            key = clean_text(item).replace(" ", "_").replace("-", "_")
            if key:
                out.append(key)
    return sorted(set(out))


def haversine_km(lat1, lon1, lat2, lon2):
    if pd.isna(lat1) or pd.isna(lon1) or pd.isna(lat2) or pd.isna(lon2):
        return np.nan

    radius = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return radius * c


def load_hotels(engine):
    """Load active hotels with joined place and district fields."""
    query = """
        SELECT
            h.hotel_id,
            h.place_id,
            h.nearby_place_id,
            h.name AS hotel_name,
            h.hotel_type,
            h.price_per_night,
            h.star_class,
            h.rating AS hotel_rating,
            h.review_count AS hotel_review_count,
            h.amenities,
            h.image_url AS hotel_image_url,
            p.district_id,
            p.name AS place_name,
            p.description AS place_description,
            p.address_text,
            p.lat AS place_lat,
            p.lng AS place_lng,
            p.rating AS place_rating,
            p.review_count AS place_review_count,
            p.image_url AS place_image_url,
            np.name AS nearby_place_name,
            np.lat AS nearby_lat,
            np.lng AS nearby_lng,
            d.name AS district_name,
            d.province
        FROM hotels h
        INNER JOIN places p ON p.place_id = h.place_id
        LEFT JOIN places np ON np.place_id = h.nearby_place_id
        LEFT JOIN districts d ON d.district_id = p.district_id
        WHERE p."isActive" = true
    """
    hotels = _read_sql_with_retry(engine, query, retries=1)

    text_cols = [
        "hotel_name", "hotel_type", "place_name", "place_description", "address_text",
        "nearby_place_name", "district_name", "province",
    ]
    for col in text_cols:
        if col in hotels.columns:
            hotels[col] = hotels[col].fillna("")

    num_cols = [
        "price_per_night", "star_class", "hotel_rating", "hotel_review_count",
        "place_rating", "place_review_count", "place_lat", "place_lng", "nearby_lat", "nearby_lng",
    ]
    for col in num_cols:
        if col in hotels.columns:
            hotels[col] = pd.to_numeric(hotels[col], errors="coerce").fillna(0)

    hotels["amenities_list"] = hotels["amenities"].apply(parse_amenities)
    hotels["amenity_names"] = hotels["amenities_list"].apply(lambda xs: ", ".join(xs))
    hotels["amenity_count"] = hotels["amenities_list"].apply(len)

    hotels["hotel_proxy_lat"] = hotels["nearby_lat"].replace(0, np.nan).fillna(hotels["place_lat"])
    hotels["hotel_proxy_lng"] = hotels["nearby_lng"].replace(0, np.nan).fillna(hotels["place_lng"])

    hotels["rating"] = hotels["hotel_rating"].where(hotels["hotel_rating"] > 0, hotels["place_rating"])
    hotels["review_count"] = hotels["hotel_review_count"].where(
        hotels["hotel_review_count"] > 0, hotels["place_review_count"]
    )

    hotels["image_url"] = hotels["hotel_image_url"].fillna("")
    hotels["image_url"] = hotels["image_url"].where(hotels["image_url"].str.len() > 0, hotels["place_image_url"])

    return hotels


def load_trip_context(engine, user_id, district_id):
    """Load latest trip for this user and district to derive preference context."""
    query = """
        SELECT
            trip_id,
            user_id,
            district_id,
            num_days,
            num_people,
            hotel_budget,
            selected_places,
            selected_hotels,
            preferences,
            "updatedAt",
            "createdAt"
        FROM trip_itineraries
        WHERE user_id = :user_id AND district_id = :district_id
        ORDER BY "updatedAt" DESC, "createdAt" DESC
        LIMIT 1
    """

    trips = _read_sql_with_retry(
        engine,
        query,
        params={"user_id": user_id, "district_id": district_id},
        retries=1,
    )
    if trips.empty:
        return None

    row = trips.iloc[0]
    preferences = parse_json_safe(row.get("preferences"), default={})
    selected_places = parse_json_safe(row.get("selected_places"), default=[])
    selected_hotels = parse_json_safe(row.get("selected_hotels"), default=[])

    num_days = float(row.get("num_days", 0) or 0)
    estimated_nights = max(int(num_days) - 1, 1) if num_days > 0 else 1

    hotel_budget = float(row.get("hotel_budget", 0) or 0)
    budget_per_night = hotel_budget / estimated_nights if estimated_nights > 0 else 0

    pref_hotel_type = clean_text(preferences.get("hotelType", "any"))
    if not pref_hotel_type:
        pref_hotel_type = "any"

    place_points = []
    if isinstance(selected_places, list):
        for item in selected_places:
            if isinstance(item, dict):
                lat = item.get("lat")
                lng = item.get("lng")
                try:
                    lat = float(lat)
                    lng = float(lng)
                    place_points.append((lat, lng))
                except (TypeError, ValueError):
                    continue

    centroid_lat = np.nan
    centroid_lng = np.nan
    if place_points:
        centroid_lat = float(np.mean([p[0] for p in place_points]))
        centroid_lng = float(np.mean([p[1] for p in place_points]))

    selected_hotel_ids = []
    if isinstance(selected_hotels, list):
        for item in selected_hotels:
            if not isinstance(item, dict):
                continue
            hid = item.get("hotel_id") or item.get("id")
            try:
                selected_hotel_ids.append(int(hid))
            except (TypeError, ValueError):
                continue

    return {
        "trip_id": int(row["trip_id"]),
        "user_id": int(row["user_id"]),
        "district_id": int(row["district_id"]),
        "pref_hotel_type": pref_hotel_type,
        "hotel_budget_per_night": float(budget_per_night),
        "estimated_nights": int(estimated_nights),
        "centroid_lat": centroid_lat,
        "centroid_lng": centroid_lng,
        "selected_hotel_ids": selected_hotel_ids,
    }


def load_user_weather_preference(engine, user_id):
    query = """
        SELECT preferred_weather
        FROM user_preferences
        WHERE user_id = :user_id
        LIMIT 1
    """
    try:
        rows = _read_sql_with_retry(engine, query, params={"user_id": user_id}, retries=1)
        if rows.empty:
            return "any"
        return clean_text(rows.iloc[0].get("preferred_weather", "any")) or "any"
    except Exception:
        return "any"


def normalize_weather_pref(value):
    token = clean_text(value)
    if token in ("", "any", "no preference", "no pref"):
        return "any"
    if token in ("sunny", "good", "clear"):
        return "sunny"
    if token in ("rainy", "storm/rain", "storm", "rain"):
        return "rainy"
    if token in ("cold", "snow", "snow/ice", "ice"):
        return "cold"
    if token in ("mild", "mixed", "cloudy", "foggy", "overcast"):
        return "mild"
    return "any"


def normalize_weather_label(value):
    token = clean_text(value)
    if token in ("good", "sunny", "clear"):
        return "sunny"
    if token in ("rainy", "storm/rain", "storm", "rain"):
        return "rainy"
    if token in ("snow/ice", "snow", "ice", "cold"):
        return "cold"
    if token in ("mixed", "foggy", "cloudy", "overcast", "mild"):
        return "mild"
    return "unknown"


def hotel_preference_match(pref_type, hotel_type, price_per_night, star_class, budget_per_night):
    pref_type = clean_text(pref_type)
    hotel_type = clean_text(hotel_type)

    if pref_type in ("", "any", "midrange"):
        # Midrange is treated as a neutral preference in current UX.
        return 1.0 if pref_type in ("", "any") else 0.7

    if pref_type == "budget":
        score = 0.0
        if hotel_type in ("guesthouse", "hostel", "motel"):
            score += 0.5
        elif hotel_type == "hotel":
            score += 0.3

        if budget_per_night > 0 and price_per_night <= budget_per_night:
            score += 0.3

        if star_class <= 3:
            score += 0.2
        return min(score, 1.0)

    if pref_type == "luxury":
        score = 0.0
        if hotel_type in ("resort", "hotel", "villa", "boutique"):
            score += 0.4
        if star_class >= 4:
            score += 0.4
        if budget_per_night > 0 and price_per_night <= budget_per_night * 1.2:
            score += 0.2
        return min(score, 1.0)

    if pref_type == "family":
        score = 0.0
        if hotel_type in ("hotel", "resort", "guesthouse", "apartment", "villa"):
            score += 0.5
        if star_class >= 3:
            score += 0.3
        if budget_per_night > 0 and price_per_night <= budget_per_night:
            score += 0.2
        return min(score, 1.0)

    if pref_type == "boutique":
        return 1.0 if hotel_type == "boutique" else 0.2

    if pref_type == "villa":
        return 1.0 if hotel_type == "villa" else 0.2

    return 0.5


def budget_fit(price_per_night, budget_per_night):
    if budget_per_night <= 0:
        return 0.5
    if pd.isna(price_per_night):
        return 0.5
    if price_per_night <= budget_per_night:
        return 1.0
    return max(budget_per_night / price_per_night, 0.0)


def build_reason(row):
    reasons = []
    if row["budget_fit_score"] >= 0.95:
        reasons.append("within budget")
    if row["proximity_score"] >= 0.70:
        reasons.append("near your selected places")
    if row["similarity_score"] >= 0.70:
        reasons.append("matches your hotel preference")
    if row["star_score"] >= 0.80:
        reasons.append("good star class")
    if row["quality_score"] >= 0.75:
        reasons.append("well rated")
    return ", ".join(reasons) if reasons else "district hotel match"


def score_hotels(hotels_df, trip_context):
    district_id = trip_context["district_id"]
    pref_type = trip_context["pref_hotel_type"]
    budget_per_night = trip_context["hotel_budget_per_night"]
    centroid_lat = trip_context["centroid_lat"]
    centroid_lng = trip_context["centroid_lng"]

    rec = hotels_df[hotels_df["district_id"] == district_id].copy()

    if rec.empty:
        return rec

    rec["similarity_score"] = rec.apply(
        lambda r: hotel_preference_match(
            pref_type,
            r.get("hotel_type", ""),
            float(r.get("price_per_night", 0) or 0),
            float(r.get("star_class", 0) or 0),
            budget_per_night,
        ),
        axis=1,
    )

    rec["distance_km"] = rec.apply(
        lambda row: haversine_km(
            centroid_lat,
            centroid_lng,
            row.get("hotel_proxy_lat", np.nan),
            row.get("hotel_proxy_lng", np.nan),
        ),
        axis=1,
    )

    if rec["distance_km"].notna().any():
        max_dist = rec["distance_km"].dropna().max()
        if max_dist == 0:
            rec["proximity_score"] = 1.0
        else:
            rec["proximity_score"] = 1 - (rec["distance_km"].fillna(max_dist) / max_dist)
    else:
        rec["proximity_score"] = 0.5

    rec["budget_fit_score"] = rec["price_per_night"].apply(lambda x: budget_fit(x, budget_per_night))

    rec["star_score"] = rec["star_class"].fillna(0).clip(lower=0, upper=5) / 5.0

    rec["quality_score"] = np.where(
        rec["rating"].fillna(0) > 0,
        rec["rating"].fillna(0) / 5.0,
        rec["place_rating"].fillna(0) / 5.0,
    )

    # Weighted blend of itinerary proximity, budget fit, preference type, and quality.
    rec["final_score"] = (
        rec["proximity_score"] * 0.35
        + rec["budget_fit_score"] * 0.30
        + rec["similarity_score"] * 0.15
        + rec["star_score"] * 0.10
        + rec["quality_score"] * 0.10
    )

    rec["recommendation_reason"] = rec.apply(build_reason, axis=1)

    rec["recommendation_badges"] = rec.apply(
        lambda row: [
            badge
            for badge, include in [
                ("Near itinerary", row["proximity_score"] >= 0.7),
                ("Within budget", row["budget_fit_score"] >= 0.95),
                ("Matches type", row["similarity_score"] >= 0.7),
                ("Highly rated", row["quality_score"] >= 0.8),
            ]
            if include
        ],
        axis=1,
    )

    # Frontend currently expects this field name in recommended cards.
    rec["recommendation_score"] = rec["final_score"]

    return rec.sort_values("final_score", ascending=False)


def fetch_weather_for_district(hotels_df, district_id):
    district_hotels = hotels_df[hotels_df["district_id"] == district_id].copy()
    district_hotels = district_hotels.dropna(subset=["hotel_proxy_lat", "hotel_proxy_lng"])

    if district_hotels.empty:
        return {
            "weather_label": "unknown",
            "weather_ok_score": 1.0,
            "temperature": None,
            "weather_code": None,
        }

    lat = float(district_hotels["hotel_proxy_lat"].mean())
    lng = float(district_hotels["hotel_proxy_lng"].mean())

    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lng}&current=temperature_2m,weather_code"
    )

    weather_timeout_seconds = float(os.environ.get("HOTEL_WEATHER_TIMEOUT_SECONDS", "10"))
    weather_retries = int(os.environ.get("HOTEL_WEATHER_RETRIES", "1"))

    for attempt in range(weather_retries + 1):
        try:
            response = requests.get(url, timeout=weather_timeout_seconds)
            if response.status_code != 200:
                raise ValueError(f"bad status {response.status_code}")

            current = response.json().get("current", {})
            code = current.get("weather_code", np.nan)
            temp = current.get("temperature_2m", np.nan)

            if pd.isna(code):
                label, score = "unknown", 1.0
            elif code in [0, 1, 2, 3]:
                label, score = "good", 1.0
            elif code in [45, 48]:
                label, score = "foggy", 0.8
            elif 51 <= code <= 67:
                label, score = "rainy", 0.5
            elif 71 <= code <= 77:
                label, score = "snow/ice", 0.4
            elif code >= 80:
                label, score = "storm/rain", 0.3
            else:
                label, score = "mixed", 0.7

            return {
                "weather_label": label,
                "weather_ok_score": float(score),
                "temperature": None if pd.isna(temp) else float(temp),
                "weather_code": None if pd.isna(code) else int(code),
            }
        except Exception:
            if attempt >= weather_retries:
                return {
                    "weather_label": "unknown",
                    "weather_ok_score": 1.0,
                    "temperature": None,
                    "weather_code": None,
                }


def apply_weather(rec_df, weather, preferred_weather="any"):
    if rec_df.empty:
        return rec_df

    rec_df = rec_df.copy()
    rec_df["weather_label"] = weather["weather_label"]
    rec_df["weather_ok_score"] = weather["weather_ok_score"]
    rec_df["temperature"] = weather["temperature"]
    rec_df["weather_code"] = weather["weather_code"]

    preferred = normalize_weather_pref(preferred_weather)
    weather_group = normalize_weather_label(weather["weather_label"])
    if preferred == "any":
        rec_df["weather_preference_score"] = 1.0
        rec_df["weather_preference_match"] = False
    else:
        match = weather_group == preferred
        rec_df["weather_preference_score"] = 1.0 if match else 0.35
        rec_df["weather_preference_match"] = match

    rec_df["weather_effective_score"] = (
        rec_df["weather_ok_score"] * 0.70 + rec_df["weather_preference_score"] * 0.30
    )

    rec_df["weather_adjusted_score"] = (
        rec_df["final_score"] * 0.90 + rec_df["weather_effective_score"] * 0.10
    )

    rec_df["recommendation_score"] = rec_df["weather_adjusted_score"]

    return rec_df.sort_values("weather_adjusted_score", ascending=False)


def normalize_output(rec_df, trip_context, top_n):
    if rec_df.empty:
        return []

    top = rec_df.head(top_n).copy()

    top["name"] = top["hotel_name"].fillna("")
    top["description"] = top["place_description"].fillna("")
    top["lat"] = top["hotel_proxy_lat"]
    top["lng"] = top["hotel_proxy_lng"]

    output_cols = [
        "trip_id", "user_id", "district_id", "district_name", "province",
        "hotel_id", "place_id", "name", "hotel_name", "hotel_type",
        "description", "address_text", "price_per_night", "star_class", "rating", "review_count",
        "amenity_names", "amenities_list", "image_url", "nearby_place_name",
        "lat", "lng", "distance_km", "proximity_score", "budget_fit_score", "similarity_score",
        "star_score", "quality_score", "final_score", "weather_label", "weather_ok_score",
        "temperature", "weather_code", "weather_adjusted_score", "recommendation_score",
        "recommendation_reason", "recommendation_badges",
    ]

    available = [c for c in output_cols if c in top.columns]
    top = top[available]

    top["trip_id"] = trip_context["trip_id"]
    top["user_id"] = trip_context["user_id"]

    return top.replace({np.nan: None}).to_dict(orient="records")


def recommend_hotels(user_id, district_id, top_n=12, engine=None):
    if engine is None:
        engine = get_engine()

    hotels_df = load_hotels(engine)

    trip_context = load_trip_context(engine, user_id, district_id)
    if trip_context is None:
        # Fallback mode: still return district-level recommendations even when the
        # user has not saved a trip itinerary for this district yet.
        trip_context = {
            "trip_id": None,
            "user_id": int(user_id),
            "district_id": int(district_id),
            "pref_hotel_type": "any",
            "hotel_budget_per_night": 0.0,
            "estimated_nights": 1,
            "centroid_lat": np.nan,
            "centroid_lng": np.nan,
            "selected_hotel_ids": [],
        }

    scored = score_hotels(hotels_df, trip_context)
    weather = fetch_weather_for_district(hotels_df, district_id)
    user_pref_weather = load_user_weather_preference(engine, user_id)
    ranked = apply_weather(scored, weather, preferred_weather=user_pref_weather)

    return normalize_output(ranked, trip_context, top_n)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="TravelGenie - Hotel Recommendation AI")
    parser.add_argument("--user_id", type=int, required=True, help="Target user ID")
    parser.add_argument("--district_id", type=int, required=True, help="Target district ID")
    parser.add_argument("--top_n", type=int, default=12, help="Max results to return")
    args = parser.parse_args()

    recommendations = recommend_hotels(args.user_id, args.district_id, args.top_n)
    print(json.dumps(recommendations, indent=2, default=str))
