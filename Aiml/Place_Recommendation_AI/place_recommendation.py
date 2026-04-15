# -*- coding: utf-8 -*-
"""
Place Recommendation AI – Neon DB Version
Reads all data directly from the PostgreSQL (Neon) database instead of Google Drive CSVs.
"""

import os
import re
import json
import ast

from datetime import datetime, timezone
import numpy as np
import pandas as pd
import requests
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sklearn.preprocessing import MultiLabelBinarizer, MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity

load_dotenv()

# ===== DATABASE CONNECTION =====

def get_engine():
    """Create a SQLAlchemy engine from DATABASE_URL env var."""
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise ValueError(
            "DATABASE_URL environment variable is not set. "
            "Add it to a .env file or export it before running."
        )
    # Neon DB requires SSL.
    # Replace verify-full with require so psycopg2 on Windows does not need a root cert file.
    url = re.sub(r"sslmode=verify-full", "sslmode=require", url)
    if "sslmode" not in url:
        connector = "&" if "?" in url else "?"
        url += f"{connector}sslmode=require"
    return create_engine(url, connect_args={"sslmode": "require"})


# ===== HELPER FUNCTIONS =====

def clean_text(x):
    try:
        if pd.isna(x):
            return ""
    except (TypeError, ValueError):
        pass
    return str(x).strip().lower()


def parse_json_safe(x, default=None):
    if default is None:
        default = {}
    try:
        if pd.isna(x):
            return default
    except (TypeError, ValueError):
        pass
    if isinstance(x, (dict, list)):
        return x
    s = str(x).strip()
    if not s:
        return default
    try:
        return json.loads(s)
    except Exception:
        try:
            return ast.literal_eval(s)
        except Exception:
            return default


def split_comma_tags(x):
    try:
        if pd.isna(x):
            return []
    except (TypeError, ValueError):
        pass
    s = str(x).strip()
    if not s:
        return []
    return [clean_text(i) for i in s.split(",") if clean_text(i)]


def parse_duration_to_hours(text):
    try:
        if pd.isna(text):
            return np.nan
    except (TypeError, ValueError):
        pass
    s = str(text).lower().strip()
    s = s.replace("\u2013", "-").replace("\u2014", "-")
    if "full day" in s:
        return 8.0
    if "half day" in s:
        return 4.0
    nums = [float(n) for n in re.findall(r"\d+(?:\.\d+)?", s)]
    if not nums:
        return np.nan
    if len(nums) == 1:
        return nums[0]
    return sum(nums[:2]) / 2


# ===== LOAD DATA FROM NEON DB =====

def load_data(engine):
    """
    Load all required tables from Neon DB.
    Returns: user_preferences, user_interests, travel_styles, tags,
             places, place_tags, districts DataFrames.
    """
    user_preferences = pd.read_sql(
        "SELECT user_id, style_id, preferred_weather, trip_defaults "
        "FROM user_preferences",
        engine,
    )
    user_interests = pd.read_sql(
        "SELECT user_id, tag_id FROM user_interests",
        engine,
    )
    travel_styles = pd.read_sql(
        "SELECT style_id, style_name FROM travel_styles",
        engine,
    )
    tags = pd.read_sql(
        "SELECT tag_id, tag_name FROM tags",
        engine,
    )
    # Only active places; quote camelCase column name for PostgreSQL
    places = pd.read_sql(
        'SELECT place_id, district_id, name, description, address_text, '
        '       lat, lng, type, duration, rating, review_count, image_url '
        'FROM places '
        'WHERE "isActive" = true',
        engine,
    )
    place_tags = pd.read_sql(
        "SELECT place_id, tag_id, weight FROM place_tags",
        engine,
    )
    districts = pd.read_sql(
        "SELECT district_id, name, province FROM districts",
        engine,
    )
    return user_preferences, user_interests, travel_styles, tags, places, place_tags, districts


# ===== BUILD USER PROFILES =====

def build_user_profiles(user_preferences, user_interests, travel_styles, tags):
    """Merge tables into a clean user-profile DataFrame."""
    tags = tags.copy()
    tags["tag_name"] = tags["tag_name"].apply(clean_text)

    travel_styles = travel_styles.copy()
    travel_styles["style_name"] = travel_styles["style_name"].apply(clean_text)

    # Merge interests → tag names
    ui = user_interests.merge(tags[["tag_id", "tag_name"]], on="tag_id", how="left")
    ui["tag_name"] = ui["tag_name"].fillna("").apply(clean_text)
    ui = ui[ui["tag_name"] != ""].copy()

    interest_agg = (
        ui.groupby("user_id")["tag_name"]
        .apply(lambda s: ", ".join(sorted(set(x for x in s if x))))
        .reset_index()
        .rename(columns={"tag_name": "interest_tags"})
    )

    # Merge preferences → travel styles
    up = user_preferences.merge(travel_styles, on="style_id", how="left")
    up["style_name"] = up["style_name"].fillna("").apply(clean_text)
    up["preferred_weather"] = up["preferred_weather"].fillna("").apply(clean_text)

    # Expand trip_defaults JSON
    trip_defaults = up["trip_defaults"].apply(lambda x: parse_json_safe(x, default={}))
    up["default_days"] = trip_defaults.apply(lambda d: d.get("days", np.nan))
    up["default_people"] = trip_defaults.apply(lambda d: d.get("people", np.nan))
    up["default_trip_type"] = trip_defaults.apply(lambda d: clean_text(d.get("tripType", "")))
    up["default_hotel_type"] = trip_defaults.apply(lambda d: clean_text(d.get("hotelType", "")))

    # Union of all known user IDs
    all_user_ids = sorted(
        set(user_preferences["user_id"].dropna().tolist())
        | set(user_interests["user_id"].dropna().tolist())
    )
    user_base = pd.DataFrame({"user_id": all_user_ids})

    profiles = (
        user_base
        .merge(
            up[["user_id", "style_id", "style_name", "preferred_weather",
                "default_days", "default_people", "default_trip_type", "default_hotel_type"]],
            on="user_id",
            how="left",
        )
        .merge(interest_agg, on="user_id", how="left")
    )

    for col in ["style_name", "preferred_weather", "default_trip_type",
                "default_hotel_type", "interest_tags"]:
        if col in profiles.columns:
            profiles[col] = profiles[col].fillna("")

    profiles["interest_count"] = profiles["interest_tags"].apply(
        lambda x: len(split_comma_tags(x))
    )
    return profiles


# ===== BUILD PLACE DATA =====

def build_place_data(places, place_tags, tags, districts):
    """Merge place tables into a clean place-profile DataFrame."""
    tags = tags.copy()
    tags["tag_name"] = tags["tag_name"].apply(clean_text)

    districts = districts.copy()
    districts["name"] = districts["name"].apply(clean_text)
    districts["province"] = districts["province"].apply(clean_text)

    places = places.copy()
    places["name"] = places["name"].apply(clean_text)
    places["type"] = places["type"].fillna("").apply(clean_text)
    places["description"] = places["description"].fillna("")
    places["address_text"] = places["address_text"].fillna("")

    # Aggregate tags per place
    pt = place_tags.merge(tags[["tag_id", "tag_name"]], on="tag_id", how="left")
    pt["tag_name"] = pt["tag_name"].fillna("").apply(clean_text)

    tag_agg = (
        pt.groupby("place_id")
        .agg(
            tag_names=("tag_name", lambda s: ", ".join(sorted(set(x for x in s if x)))),
            tag_count=("tag_id", "count"),
            avg_tag_weight=("weight", "mean"),
        )
        .reset_index()
    )

    # Merge: places ← districts ← tag_agg
    merged = (
        places
        .merge(districts[["district_id", "name", "province"]], on="district_id", how="left")
        .merge(tag_agg, on="place_id", how="left")
    )

    merged = merged.rename(columns={
        "name_x": "place_name",
        "name_y": "district_name",
        "description": "place_description",
    })

    for col in ["district_name", "province", "place_name", "type",
                "address_text", "place_description", "tag_names"]:
        if col in merged.columns:
            merged[col] = merged[col].fillna("").apply(clean_text)

    merged["tag_count"] = merged["tag_count"].fillna(0)
    merged["avg_tag_weight"] = merged["avg_tag_weight"].fillna(0)
    merged["rating"] = merged["rating"].fillna(0)
    merged["review_count"] = merged["review_count"].fillna(0)
    merged["duration_hours"] = merged["duration"].apply(parse_duration_to_hours)

    keep_cols = [
        "place_id", "district_id", "district_name", "province",
        "place_name", "place_description", "address_text",
        "lat", "lng", "rating", "review_count", "type",
        "duration", "image_url", "tag_names", "tag_count",
        "avg_tag_weight", "duration_hours",
    ]
    return merged[[c for c in keep_cols if c in merged.columns]].copy()


# ===== BUILD FEATURE VECTORS =====

def build_user_vectors(users):
    """One-hot encode user preferences and interests into a feature matrix."""
    users = users.copy()
    users["interest_tag_list"] = users["interest_tags"].apply(split_comma_tags)

    mlb = MultiLabelBinarizer()
    interest_matrix = pd.DataFrame(
        mlb.fit_transform(users["interest_tag_list"]),
        columns=[f"tag_{c}" for c in mlb.classes_],
        index=users.index,
    )

    style_df = pd.get_dummies(users["style_name"], prefix="style")
    trip_type_df = pd.get_dummies(users["default_trip_type"], prefix="triptype")

    num_df = users[["user_id", "default_days", "default_people"]].copy()
    num_df["default_days"] = num_df["default_days"].fillna(0)
    num_df["default_people"] = num_df["default_people"].fillna(0)

    return pd.concat([num_df, style_df, trip_type_df, interest_matrix], axis=1).fillna(0)


def build_place_vectors(places):
    """One-hot encode place types/tags and scale numeric fields."""
    places = places.copy()
    places["tag_name_list"] = places["tag_names"].apply(split_comma_tags)

    mlb = MultiLabelBinarizer()
    place_tag_matrix = pd.DataFrame(
        mlb.fit_transform(places["tag_name_list"]),
        columns=[f"tag_{c}" for c in mlb.classes_],
        index=places.index,
    )

    type_df = pd.get_dummies(places["type"], prefix="type")

    num_cols = ["rating", "review_count", "tag_count", "avg_tag_weight", "duration_hours"]
    for col in num_cols:
        places[col] = places[col].fillna(0)

    scaler = MinMaxScaler()
    scaled_num = pd.DataFrame(
        scaler.fit_transform(places[num_cols]),
        columns=num_cols,
        index=places.index,
    )

    return pd.concat(
        [places[["place_id", "district_id", "place_name"]], type_df, place_tag_matrix, scaled_num],
        axis=1,
    ).fillna(0)


# ===== COSINE SIMILARITY =====

def compute_similarity(user_vectors, place_vectors):
    """
    Compute cosine similarity between all users and all places
    on the shared tag columns.
    Returns a candidate_scores DataFrame.
    """
    user_tag_cols = [c for c in user_vectors.columns if c.startswith("tag_")]
    place_tag_cols = [c for c in place_vectors.columns if c.startswith("tag_")]
    shared_cols = sorted(set(user_tag_cols) & set(place_tag_cols))

    results = []
    if shared_cols:
        sim_matrix = cosine_similarity(
            user_vectors[shared_cols].values,
            place_vectors[shared_cols].values,
        )
        for i, uid in enumerate(user_vectors["user_id"]):
            for j in range(len(place_vectors)):
                pv = place_vectors.iloc[j]
                results.append({
                    "user_id": int(uid),
                    "place_id": int(pv["place_id"]),
                    "district_id": int(pv["district_id"]),
                    "place_name": pv["place_name"],
                    "similarity_score": float(sim_matrix[i, j]),
                })
    else:
        # No shared tags – zero similarity for all pairs
        for uid in user_vectors["user_id"]:
            for j in range(len(place_vectors)):
                pv = place_vectors.iloc[j]
                results.append({
                    "user_id": int(uid),
                    "place_id": int(pv["place_id"]),
                    "district_id": int(pv["district_id"]),
                    "place_name": pv["place_name"],
                    "similarity_score": 0.0,
                })

    return pd.DataFrame(results)


# ===== SCORING =====

STYLE_TAG_MAP = {
    "adventure":   {"mountains", "nature", "wildlife", "adventure"},
    "relax":       {"beaches", "relax", "nature", "photography"},
    "culture":     {"historical", "cultural", "religious", "art"},
    "luxury":      {"beaches", "food", "shopping", "photography"},
    "budget":      {"historical", "nature", "adventure", "food"},
    "family":      {"beaches", "nature", "wildlife", "food"},
    "backpacker":  {"mountains", "nature", "historical", "adventure"},
}


def _duration_fit(place_hours, pref_days):
    try:
        if pd.isna(place_hours) or pd.isna(pref_days):
            return 1.0
    except (TypeError, ValueError):
        return 1.0
    if pref_days <= 2 and place_hours <= 4:
        return 1.0
    if pref_days <= 2 and place_hours > 6:
        return 0.7
    return 1.0


def _style_bonus(place_tag_text, style_pref_tags):
    place_tags = set(split_comma_tags(place_tag_text))
    if not style_pref_tags or not place_tags:
        return 0.0
    overlap = len(place_tags & style_pref_tags)
    return min(overlap / len(style_pref_tags), 1.0)


def _build_reason(row):
    reasons = []
    if row["similarity_score"] > 0:
        reasons.append("matches your interests")
    if row["style_bonus"] > 0:
        reasons.append("fits your travel style")
    if row["duration_fit_score"] >= 1.0:
        reasons.append("good duration fit")
    if row["quality_score"] >= 0.7:
        reasons.append("good quality")
    return ", ".join(reasons) if reasons else "district match"


def score_recommendations(candidate_scores, place_data, users, user_id, district_id):
    """
    Filter candidates for (user_id, district_id) and compute final score.
    """
    current_user = users[users["user_id"] == user_id]
    if current_user.empty:
        raise ValueError(f"user_id {user_id} not found in user profiles.")

    u = current_user.iloc[0]
    pref_days = u.get("default_days", np.nan)
    style_name = clean_text(u.get("style_name", ""))
    style_pref_tags = STYLE_TAG_MAP.get(style_name, set())

    rec = candidate_scores.merge(
        place_data[[
            "place_id", "district_id", "place_name", "type",
            "duration_hours", "rating", "review_count", "tag_names", "image_url",
        ]],
        on=["place_id", "district_id", "place_name"],
        how="left",
    )

    rec = rec[
        (rec["user_id"] == user_id) & (rec["district_id"] == district_id)
    ].copy()

    rec["duration_fit_score"] = rec["duration_hours"].apply(
        lambda x: _duration_fit(x, pref_days)
    )
    rec["quality_score"] = np.where(
        rec["rating"] >= 4.0, 1.0,
        np.where(rec["rating"] >= 3.0, 0.7, 0.4),
    )
    rec["style_bonus"] = rec["tag_names"].apply(
        lambda x: _style_bonus(x, style_pref_tags)
    )
    rec["final_score"] = (
        rec["similarity_score"] * 0.70
        + rec["duration_fit_score"] * 0.10
        + rec["quality_score"] * 0.10
        + rec["style_bonus"] * 0.10
    )
    rec["match_reason"] = rec.apply(_build_reason, axis=1)

    return rec.sort_values("final_score", ascending=False)


# ===== WEATHER ENRICHMENT (Open-Meteo – no API key needed) =====

def fetch_weather(place_data):
    """Fetch current weather for each district using Open-Meteo."""
    weather_timeout = float(os.environ.get("PLACE_WEATHER_TIMEOUT_SECONDS", "6"))
    district_centers = (
        place_data.dropna(subset=["lat", "lng"])
        .groupby(["district_id", "district_name"], as_index=False)
        .agg({"lat": "mean", "lng": "mean"})
    )

    rows = []
    for _, row in district_centers.iterrows():
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={row['lat']}&longitude={row['lng']}"
            f"&current=temperature_2m,weather_code"
        )
        try:
            res = requests.get(url, timeout=weather_timeout)
            if res.status_code == 200:
                current = res.json().get("current", {})
                temp = current.get("temperature_2m", np.nan)
                code = current.get("weather_code", np.nan)

                try:
                    code_int = int(code)
                except (TypeError, ValueError):
                    code_int = None

                if code_int is None:
                    label, ok = "unknown", 1.0
                elif code_int in (0, 1, 2, 3):
                    label, ok = "good", 1.0
                elif code_int in (45, 48):
                    label, ok = "foggy", 0.8
                elif 51 <= code_int <= 67:
                    label, ok = "rainy", 0.5
                elif 71 <= code_int <= 77:
                    label, ok = "snow/ice", 0.4
                elif code_int >= 80:
                    label, ok = "storm/rain", 0.3
                else:
                    label, ok = "mixed", 0.7

                rows.append({
                    "district_id":    row["district_id"],
                    "district_name":  row["district_name"],
                    "temperature":    temp,
                    "weather_code":   code,
                    "weather_label":  label,
                    "weather_ok_score": ok,
                })
        except Exception as e:
            print(f"[weather] Failed for {row['district_name']}: {e}")

    return pd.DataFrame(rows)


def apply_weather(recommendations, weather_df):
    """Merge weather scores and compute weather-adjusted final score."""
    merged = recommendations.merge(
        weather_df[["district_id", "weather_label", "weather_ok_score", "temperature"]],
        on="district_id",
        how="left",
    )
    merged["weather_ok_score"] = merged["weather_ok_score"].fillna(1.0)
    merged["weather_adjusted_score"] = (
        merged["final_score"] * 0.90 + merged["weather_ok_score"] * 0.10
    )
    return merged.sort_values("weather_adjusted_score", ascending=False)


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


def apply_weather_preference(recommendations, preferred_weather):
    preferred = normalize_weather_pref(preferred_weather)
    out = recommendations.copy()

    out["weather_group"] = out["weather_label"].apply(normalize_weather_label)

    if preferred == "any":
        out["weather_preference_score"] = 1.0
        out["weather_preference_match"] = False
    else:
        out["weather_preference_score"] = np.where(out["weather_group"] == preferred, 1.0, 0.35)
        out["weather_preference_match"] = out["weather_group"] == preferred

    out["weather_effective_score"] = (
        out["weather_ok_score"].fillna(1.0) * 0.70
        + out["weather_preference_score"].fillna(1.0) * 0.30
    )
    out["weather_adjusted_score"] = (
        out["final_score"] * 0.90 + out["weather_effective_score"] * 0.10
    )

    def _reason(row):
        base = row.get("match_reason", "") or ""
        if row.get("weather_preference_match", False):
            return f"{base}, matches your weather preference" if base else "matches your weather preference"
        return base if base else "district match"

    out["match_reason"] = out.apply(_reason, axis=1)
    return out


# ===== PUBLIC API =====

OUTPUT_COLS = [
    "place_id", "place_name", "district_id", "district_name",
    "type", "duration_hours", "rating", "review_count",
    "tag_names", "image_url", "similarity_score",
    "duration_fit_score", "quality_score", "style_bonus",
    "final_score", "match_reason",
    "weather_label", "weather_ok_score", "temperature", "weather_adjusted_score",
]


def recommend_places_with_cache(
    user_id: int,
    district_id: int,
    top_n: int = 15,
    cached: dict = None,
) -> list:
    """
    Fast variant that accepts pre-loaded, pre-processed data via ``cached``.

    ``cached`` must contain the keys returned by ``preload_data()``:
        user_vecs, place_vecs, place_data, users

    Falls back to the slow (full-load) path when ``cached`` is None.
    """
    if cached is None:
        return recommend_places(user_id, district_id, top_n)

    user_vecs  = cached["user_vecs"]
    place_vecs = cached["place_vecs"]
    place_data = cached["place_data"]
    users      = cached["users"]
    weather_df = cached.get("weather_df", pd.DataFrame())
    weather_fetched_at = cached.get("weather_fetched_at")

    ttl_seconds = int(os.environ.get("PLACE_WEATHER_CACHE_TTL_SECONDS", "900"))
    now_utc = datetime.now(timezone.utc)
    should_refresh_weather = weather_df.empty

    if weather_fetched_at is not None:
        try:
            age = (now_utc - weather_fetched_at).total_seconds()
            if age > ttl_seconds:
                should_refresh_weather = True
        except Exception:
            should_refresh_weather = True
    else:
        should_refresh_weather = True

    if should_refresh_weather:
        weather_df = fetch_weather(place_data)
        cached["weather_df"] = weather_df
        cached["weather_fetched_at"] = now_utc

    candidate_scores = compute_similarity(user_vecs, place_vecs)
    recommendations  = score_recommendations(candidate_scores, place_data, users, user_id, district_id)

    user_pref_weather = "any"
    current_user = users[users["user_id"] == user_id]
    if not current_user.empty:
        user_pref_weather = current_user.iloc[0].get("preferred_weather", "any")

    if not weather_df.empty:
        recommendations = apply_weather(recommendations, weather_df)
        recommendations = apply_weather_preference(recommendations, user_pref_weather)
        score_col = "weather_adjusted_score"
    else:
        recommendations["weather_adjusted_score"] = recommendations["final_score"]
        score_col = "final_score"

    top = recommendations.sort_values(score_col, ascending=False).head(top_n)

    if "district_name" not in top.columns:
        top = top.merge(
            place_data[["place_id", "district_name"]].drop_duplicates("place_id"),
            on="place_id",
            how="left",
        )

    available = [c for c in OUTPUT_COLS if c in top.columns]
    return top[available].replace({np.nan: None}).to_dict(orient="records")


def preload_data(engine=None) -> dict:
    """
    Load all DB tables and pre-compute feature vectors once.
    Returns a dict that can be passed to recommend_places_with_cache().
    """
    if engine is None:
        engine = get_engine()
    user_prefs, user_interests, travel_styles, tags, places, place_tags, districts = load_data(engine)
    users      = build_user_profiles(user_prefs, user_interests, travel_styles, tags)
    place_data = build_place_data(places, place_tags, tags, districts)
    user_vecs  = build_user_vectors(users)
    place_vecs = build_place_vectors(place_data)
    weather_df = fetch_weather(place_data)
    return {
        "users":      users,
        "place_data": place_data,
        "user_vecs":  user_vecs,
        "place_vecs": place_vecs,
        "weather_df": weather_df,
        "weather_fetched_at": datetime.now(timezone.utc),
    }


def recommend_places(
    user_id: int,
    district_id: int,
    top_n: int = 15,
    engine=None,
) -> list:
    """
    Get place recommendations for a user in a given district.

    Parameters
    ----------
    user_id     : int  – target user
    district_id : int  – target district
    top_n       : int  – max results to return
    engine      : SQLAlchemy engine (created from DATABASE_URL if None)

    Returns
    -------
    List of recommendation dicts sorted by weather_adjusted_score.
    """
    if engine is None:
        engine = get_engine()

    # 1. Load raw tables
    user_prefs, user_interests, travel_styles, tags, places, place_tags, districts = load_data(engine)

    # 2. Build profiles
    users = build_user_profiles(user_prefs, user_interests, travel_styles, tags)
    place_data = build_place_data(places, place_tags, tags, districts)

    # 3. Feature vectors
    user_vecs = build_user_vectors(users)
    place_vecs = build_place_vectors(place_data)

    # 4. Cosine similarity
    candidate_scores = compute_similarity(user_vecs, place_vecs)

    # 5. Scoring
    recommendations = score_recommendations(
        candidate_scores, place_data, users, user_id, district_id
    )

    # 6. Weather enrichment
    weather_df = fetch_weather(place_data)
    if not weather_df.empty:
        recommendations = apply_weather(recommendations, weather_df)
        user_pref_weather = "any"
        current_user = users[users["user_id"] == user_id]
        if not current_user.empty:
            user_pref_weather = current_user.iloc[0].get("preferred_weather", "any")
        recommendations = apply_weather_preference(recommendations, user_pref_weather)
        score_col = "weather_adjusted_score"
    else:
        recommendations["weather_adjusted_score"] = recommendations["final_score"]
        score_col = "final_score"

    top = recommendations.sort_values(score_col, ascending=False).head(top_n)

    # Merge district_name into top if not already present
    if "district_name" not in top.columns:
        top = top.merge(
            place_data[["place_id", "district_name"]].drop_duplicates("place_id"),
            on="place_id",
            how="left",
        )

    available = [c for c in OUTPUT_COLS if c in top.columns]
    return top[available].replace({np.nan: None}).to_dict(orient="records")


# ===== CLI ENTRY POINT =====

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="TravelGenie – Place Recommendation AI")
    parser.add_argument("--user_id",     type=int, required=True,  help="Target user ID")
    parser.add_argument("--district_id", type=int, required=True,  help="Target district ID")
    parser.add_argument("--top_n",       type=int, default=15,     help="Max results (default 15)")
    args = parser.parse_args()

    results = recommend_places(args.user_id, args.district_id, args.top_n)
    print(json.dumps(results, indent=2, default=str))
