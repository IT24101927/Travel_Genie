# -*- coding: utf-8 -*-
"""Budget Recommendation AI - Neon DB Version."""

import ast
import json
from datetime import datetime

import numpy as np
import pandas as pd


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


def _safe_int_list(ids):
    out = []
    for item in ids or []:
        try:
            out.append(int(item))
        except (TypeError, ValueError):
            continue
    return sorted(set(out))


def _as_float(value, default=0.0):
    try:
        num = float(value)
        if np.isnan(num):
            return default
        return num
    except (TypeError, ValueError):
        return default


def _status_from_remaining(remaining):
    if remaining >= 0:
        return "within budget"
    if remaining >= -5000:
        return "slightly over budget"
    return "over budget"


def _build_input_breakdown(total_budget, hotel_budget, days):
    """Build user-facing budget split from input values.

    Rule:
      remaining = total - hotel
      remaining split = food 55%, transport 30%, activities/misc 15%
    """
    safe_total = max(_as_float(total_budget, 0.0), 0.0)
    safe_hotel = max(_as_float(hotel_budget, 0.0), 0.0)
    safe_days = max(int(days or 1), 1)

    remaining = max(safe_total - safe_hotel, 0.0)

    food = remaining * 0.55
    transport = remaining * 0.30
    activities_misc = remaining * 0.15

    def _pct(part, whole):
        if whole <= 0:
            return 0
        return int(round((part / whole) * 100))

    return {
        "total_budget": round(safe_total, 2),
        "hotel": {
            "amount": round(safe_hotel, 2),
            "percent_of_total": _pct(safe_hotel, safe_total),
        },
        "remaining": {
            "amount": round(remaining, 2),
            "percent_of_total": _pct(remaining, safe_total),
        },
        "food": {
            "amount": round(food, 2),
            "percent_of_total": _pct(food, safe_total),
            "percent_of_remaining": 55,
            "per_day": round(food / safe_days, 2),
        },
        "transport": {
            "amount": round(transport, 2),
            "percent_of_total": _pct(transport, safe_total),
            "percent_of_remaining": 30,
            "per_day": round(transport / safe_days, 2),
        },
        "activities_misc": {
            "amount": round(activities_misc, 2),
            "percent_of_total": _pct(activities_misc, safe_total),
            "percent_of_remaining": 15,
            "per_day": round(activities_misc / safe_days, 2),
        },
    }


def _normalize_percent_split(values):
    """Normalize dict values to integer percentages summing exactly to 100."""
    keys = ["food", "transport", "activities_misc"]
    sanitized = {k: max(_as_float(values.get(k), 0.0), 0.0) for k in keys}
    total = sum(sanitized.values())

    if total <= 0:
        return {"food": 55, "transport": 30, "activities_misc": 15}

    scaled = {k: (sanitized[k] / total) * 100.0 for k in keys}
    floors = {k: int(np.floor(v)) for k, v in scaled.items()}
    remainder = 100 - sum(floors.values())

    # Distribute remainder by highest fractional parts for deterministic rounding.
    fractions = sorted(
        ((scaled[k] - floors[k], k) for k in keys),
        key=lambda x: (-x[0], x[1]),
    )
    for i in range(max(remainder, 0)):
        _, k = fractions[i % len(fractions)]
        floors[k] += 1

    return floors


def _validate_custom_split(custom_split):
    """Validate optional custom split percentages from API caller."""
    if custom_split is None:
        return None

    keys = ["food", "transport", "activities_misc"]
    normalized = {}
    for key in keys:
        if key not in custom_split:
            raise ValueError(f"custom split missing '{key}'")

        value = _as_float(custom_split.get(key), np.nan)
        if np.isnan(value):
            raise ValueError(f"custom split '{key}' must be numeric")
        if value < 0:
            raise ValueError(f"custom split '{key}' cannot be negative")
        normalized[key] = float(value)

    total = normalized["food"] + normalized["transport"] + normalized["activities_misc"]
    if not np.isclose(total, 100.0, atol=0.01):
        raise ValueError("custom split percentages must sum to 100")

    return _normalize_percent_split(normalized)


def _build_category_explanations(pct, hotel_share, selected_hotel_count, safe_days):
    """Generate concise, deterministic explanations per split category."""
    food_text = "baseline daily essentials"
    if pct["food"] >= 40:
        food_text = "longer duration and higher stay spend increase daily essentials"
    elif safe_days <= 2:
        food_text = "short trip keeps food allocation moderate"

    transport_text = "standard local transfers"
    if selected_hotel_count > 1:
        transport_text = "multiple selected hotels increase movement between stays"
    elif safe_days >= 7:
        transport_text = "longer trip usually needs more inter-city/local transport"

    activities_text = "discretionary experiences and extras"
    if hotel_share < 0.35:
        activities_text = "lower hotel share leaves more room for experiences"
    elif hotel_share > 0.6:
        activities_text = "higher hotel share keeps activities allocation conservative"

    return {
        "food": food_text,
        "transport": transport_text,
        "activities_misc": activities_text,
    }


def _build_ai_daily_plan(
    non_hotel_budget,
    safe_days,
    hotel_nightly_estimate,
    hotel_nights,
    selected_hotel_count,
    total_budget,
    hotel_budget,
    custom_split=None,
):
    """Create deterministic AI-assisted daily split from budget + hotel signals."""
    safe_remaining = max(_as_float(non_hotel_budget, 0.0), 0.0)
    safe_days = max(int(safe_days or 1), 1)
    safe_hotel_nights = max(int(hotel_nights or 0), 1)
    safe_total_budget = max(_as_float(total_budget, 0.0), 0.0)
    safe_hotel_budget = max(_as_float(hotel_budget, 0.0), 0.0)

    hotel_share = (safe_hotel_budget / safe_total_budget) if safe_total_budget > 0 else 0.0
    per_day_remaining = safe_remaining / safe_days if safe_days > 0 else 0.0
    nightly_pressure = (safe_hotel_nights / safe_days) if safe_days > 0 else 1.0

    # Heuristic scoring using only available planner inputs and hotel context.
    food_score = 1.0
    food_score += min(max(hotel_nightly_estimate / 12000.0, 0.0), 0.35)
    food_score += min(max(safe_days / 12.0, 0.0), 0.18)

    transport_score = 1.0
    transport_score += min(max(safe_days / 14.0, 0.0), 0.22)
    transport_score += 0.12 if selected_hotel_count > 1 else 0.05
    transport_score += min(max(nightly_pressure - 0.5, 0.0), 0.10)

    activities_score = 1.0
    activities_score += min(max(per_day_remaining / 7000.0, 0.0), 0.35)
    activities_score += min(max((1.0 - hotel_share), 0.0), 0.15)

    pct = _validate_custom_split(custom_split)
    if pct is None:
        pct = _normalize_percent_split({
            "food": food_score,
            "transport": transport_score,
            "activities_misc": activities_score,
        })

    def _amt(p):
        return round((safe_remaining * p) / 100.0, 2)

    food_amount = _amt(pct["food"])
    transport_amount = _amt(pct["transport"])
    # Keep exact balance so category totals always equal remaining budget.
    activities_amount = round(max(safe_remaining - food_amount - transport_amount, 0.0), 2)

    explanations = _build_category_explanations(
        pct=pct,
        hotel_share=hotel_share,
        selected_hotel_count=selected_hotel_count,
        safe_days=safe_days,
    )

    return {
        "model": "deterministic-ai-daily-v1",
        "confidence": "high" if custom_split is None else "validated-custom",
        "percentages": {
            "food": pct["food"],
            "transport": pct["transport"],
            "activities_misc": max(0, 100 - pct["food"] - pct["transport"]),
        },
        "explanations": explanations,
        "daily": {
            "food": round(food_amount / safe_days, 2),
            "transport": round(transport_amount / safe_days, 2),
            "activities_misc": round(activities_amount / safe_days, 2),
            "total": round(safe_remaining / safe_days, 2),
        },
        "totals": {
            "food": food_amount,
            "transport": transport_amount,
            "activities_misc": activities_amount,
            "remaining_budget": round(safe_remaining, 2),
        },
        "signals": {
            "trip_days": safe_days,
            "hotel_nights": int(safe_hotel_nights),
            "selected_hotels": int(selected_hotel_count),
            "hotel_share_of_total_budget": round(hotel_share, 4),
            "per_day_remaining_budget": round(per_day_remaining, 2),
            "hotel_nightly_estimate": round(_as_float(hotel_nightly_estimate, 0.0), 2),
        },
    }


def _load_latest_trip_context(engine, user_id, district_id):
    query = """
        SELECT
            trip_id,
            num_days,
            total_budget,
            hotel_budget,
            budget_currency,
            selected_places,
            selected_hotels,
            preferences,
            "updatedAt",
            "createdAt"
        FROM trip_itineraries
        WHERE user_id = %(user_id)s AND district_id = %(district_id)s
        ORDER BY "updatedAt" DESC, "createdAt" DESC
        LIMIT 1
    """
    trips = pd.read_sql(query, engine, params={"user_id": user_id, "district_id": district_id})
    if trips.empty:
        return None

    row = trips.iloc[0]
    selected_places = parse_json_safe(row.get("selected_places"), default=[])
    selected_hotels = parse_json_safe(row.get("selected_hotels"), default=[])

    place_ids = []
    if isinstance(selected_places, list):
        for item in selected_places:
            if not isinstance(item, dict):
                continue
            pid = item.get("place_id") or item.get("id")
            try:
                place_ids.append(int(pid))
            except (TypeError, ValueError):
                continue

    hotel_ids = []
    hotel_nights_total = 0
    if isinstance(selected_hotels, list):
        for item in selected_hotels:
            if not isinstance(item, dict):
                continue
            hid = item.get("hotel_id") or item.get("id")
            try:
                hotel_ids.append(int(hid))
            except (TypeError, ValueError):
                continue

            # Nights can be stored under different keys in persisted selections.
            nights_val = item.get("nights") or item.get("hotelNights") or item.get("hotel_nights")
            try:
                parsed_nights = int(nights_val)
                if parsed_nights > 0:
                    hotel_nights_total += parsed_nights
                    continue
            except (TypeError, ValueError):
                pass

            # Fallback: infer nights from check-in/check-out dates if available.
            check_in = item.get("checkIn") or item.get("check_in")
            check_out = item.get("checkOut") or item.get("check_out")
            if check_in and check_out:
                try:
                    in_dt = datetime.strptime(str(check_in), "%Y-%m-%d")
                    out_dt = datetime.strptime(str(check_out), "%Y-%m-%d")
                    inferred = max((out_dt - in_dt).days, 0)
                    if inferred > 0:
                        hotel_nights_total += inferred
                except (TypeError, ValueError):
                    pass

    return {
        "trip_id": int(row.get("trip_id")),
        "num_days": _as_float(row.get("num_days"), 0),
        "total_budget": _as_float(row.get("total_budget"), 0),
        "hotel_budget": _as_float(row.get("hotel_budget"), 0),
        "budget_currency": (row.get("budget_currency") or "LKR").upper(),
        "place_ids": _safe_int_list(place_ids),
        "hotel_ids": _safe_int_list(hotel_ids),
        "hotel_nights_total": int(hotel_nights_total),
    }


def recommend_budget(
    user_id,
    district_id,
    total_budget,
    hotel_budget,
    num_days,
    hotel_nights,
    currency,
    selected_place_ids,
    selected_hotel_ids,
    custom_split,
    engine,
):
    """Build budget guidance for the trip planner."""
    if total_budget <= 0:
        raise ValueError("total_budget must be greater than 0")

    if hotel_budget < 0:
        raise ValueError("hotel_budget cannot be negative")

    safe_days = max(int(num_days or 1), 1)

    context = _load_latest_trip_context(engine, user_id, district_id)
    place_ids = _safe_int_list(selected_place_ids)
    hotel_ids = _safe_int_list(selected_hotel_ids)

    # Fall back to latest saved trip selections when request does not send explicit IDs.
    if not place_ids and context:
        place_ids = context.get("place_ids", [])
    if not hotel_ids and context:
        hotel_ids = context.get("hotel_ids", [])

    # Hotel nights are independent from full trip days.
    try:
        safe_hotel_nights = int(hotel_nights or 0)
    except (TypeError, ValueError):
        safe_hotel_nights = 0

    if safe_hotel_nights <= 0 and context:
        safe_hotel_nights = int(context.get("hotel_nights_total") or 0)

    if safe_hotel_nights <= 0:
        safe_hotel_nights = max(safe_days - 1, 1)

    hotels_query = """
        SELECT h.hotel_id, h.price_per_night, p.district_id, p.name AS place_name
        FROM hotels h
        INNER JOIN places p ON p.place_id = h.place_id
        WHERE p."isActive" = true
          AND p.district_id = %(district_id)s
    """
    hotels_df = pd.read_sql(hotels_query, engine, params={"district_id": district_id})
    if hotels_df.empty:
        raise ValueError("No hotel data found for district")

    hotels_df["price_per_night"] = pd.to_numeric(hotels_df["price_per_night"], errors="coerce").fillna(0)

    selected_hotels_df = hotels_df[hotels_df["hotel_id"].isin(hotel_ids)].copy() if hotel_ids else pd.DataFrame()
    district_median_nightly = float(hotels_df["price_per_night"].median()) if not hotels_df.empty else 0.0
    district_min_nightly = float(hotels_df["price_per_night"].min()) if not hotels_df.empty else 0.0

    if not selected_hotels_df.empty:
        hotel_nightly_estimate = float(selected_hotels_df["price_per_night"].mean())
        hotel_basis = "selected_hotels"
    else:
        hotel_nightly_estimate = district_median_nightly
        hotel_basis = "district_median"

    estimated_hotel_cost = max(hotel_nightly_estimate, 0.0) * safe_hotel_nights

    place_price_query = """
        SELECT pr.place_id, pr.price, p.district_id
        FROM price_records pr
        INNER JOIN places p ON p.place_id = pr.place_id
        WHERE p.district_id = %(district_id)s
          AND pr.price IS NOT NULL
    """
    place_price_df = pd.read_sql(place_price_query, engine, params={"district_id": district_id})
    place_price_df["price"] = pd.to_numeric(place_price_df["price"], errors="coerce").fillna(0)

    district_place_avg = float(place_price_df["price"].mean()) if not place_price_df.empty else 0.0
    selected_place_price_df = (
        place_price_df[place_price_df["place_id"].isin(place_ids)].copy() if place_ids else pd.DataFrame()
    )
    selected_place_avg = float(selected_place_price_df["price"].mean()) if not selected_place_price_df.empty else 0.0

    place_count = len(place_ids) if place_ids else max(min(safe_days, 4), 2)
    per_place_estimate = selected_place_avg if selected_place_avg > 0 else district_place_avg
    estimated_place_cost = max(per_place_estimate, 0.0) * max(place_count, 1)

    # Estimate food/transport/misc with day sensitivity.
    # This ensures that increasing full trip days meaningfully changes the AI estimate.
    non_hotel_budget = max(total_budget - hotel_budget, 0.0)

    # Daily base spend inferred from district/place price signals.
    # Uses conservative lower bounds to avoid under-estimation when price records are sparse.
    daily_base_from_district = max(district_place_avg * 0.28, 1200.0)
    daily_base_from_selection = max(per_place_estimate * 0.22, 900.0)
    estimated_daily_other = max(daily_base_from_district, daily_base_from_selection)

    # Blend budget-proportional and data-driven day scaling, then keep a place-driven floor.
    # - non_hotel_budget * 0.45 keeps user-plan sensitivity
    # - estimated_daily_other * safe_days makes longer trips cost more
    # - estimated_place_cost * 0.6 avoids unrealistically low totals for high-ticket itineraries
    estimated_other_cost = max(
        (non_hotel_budget * 0.45) + (estimated_daily_other * safe_days),
        estimated_place_cost * 0.6,
    )

    estimated_total_cost = estimated_hotel_cost + estimated_place_cost + estimated_other_cost
    remaining_budget = total_budget - estimated_total_cost
    status = _status_from_remaining(remaining_budget)

    recommended_hotel_budget = max(estimated_hotel_cost, district_min_nightly * safe_hotel_nights)
    recommended_total_budget = max(estimated_total_cost, total_budget)

    summary = {
        "estimated_hotel_cost": round(estimated_hotel_cost, 2),
        "estimated_place_cost": round(estimated_place_cost, 2),
        "estimated_other_cost": round(estimated_other_cost, 2),
        "estimated_total_cost": round(estimated_total_cost, 2),
        "remaining_budget": round(remaining_budget, 2),
        "recommended_total_budget": round(recommended_total_budget, 2),
        "recommended_hotel_budget": round(recommended_hotel_budget, 2),
        "hotel_nightly_estimate": round(hotel_nightly_estimate, 2),
        "nights": safe_hotel_nights,
        "days": safe_days,
    }

    input_breakdown = _build_input_breakdown(total_budget, hotel_budget, safe_days)
    ai_daily_plan = _build_ai_daily_plan(
        non_hotel_budget=non_hotel_budget,
        safe_days=safe_days,
        hotel_nightly_estimate=hotel_nightly_estimate,
        hotel_nights=safe_hotel_nights,
        selected_hotel_count=len(hotel_ids),
        total_budget=total_budget,
        hotel_budget=hotel_budget,
        custom_split=custom_split,
    )

    recommendations = []
    if hotel_budget < estimated_hotel_cost:
        recommendations.append({
            "type": "hotel",
            "title": "Increase hotel budget",
            "message": f"Your current hotel budget is below the estimated stay cost for {safe_hotel_nights} night(s).",
            "suggested_value": round(recommended_hotel_budget, 2),
        })

    if total_budget < estimated_total_cost:
        recommendations.append({
            "type": "total",
            "title": "Adjust total trip budget",
            "message": "Estimated trip cost is higher than your current total budget.",
            "suggested_value": round(recommended_total_budget, 2),
        })
    else:
        recommendations.append({
            "type": "status",
            "title": "Budget is healthy",
            "message": "Your current total budget can cover the estimated cost with a positive buffer.",
            "suggested_value": round(remaining_budget, 2),
        })

    insights = {
        "hotel_basis": hotel_basis,
        "used_selected_hotels": len(hotel_ids),
        "used_selected_places": len(place_ids),
        "district_hotel_median_per_night": round(district_median_nightly, 2),
        "district_place_avg": round(district_place_avg, 2),
        "estimated_daily_other": round(estimated_daily_other, 2),
    }

    return {
        "user_id": int(user_id),
        "district_id": int(district_id),
        "currency": (currency or "LKR").upper(),
        "input": {
            "total_budget": round(total_budget, 2),
            "hotel_budget": round(hotel_budget, 2),
            "days": safe_days,
            "hotel_nights": safe_hotel_nights,
            "selected_place_count": len(place_ids),
            "selected_hotel_count": len(hotel_ids),
            "custom_split": _validate_custom_split(custom_split),
        },
        "summary": summary,
        "breakdown": input_breakdown,
        "ai_daily_plan": ai_daily_plan,
        "status": status,
        "insights": insights,
        "recommendations": recommendations,
    }
