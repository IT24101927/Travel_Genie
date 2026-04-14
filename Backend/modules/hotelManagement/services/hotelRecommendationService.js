/**
 * Hotel recommendation scoring service.
 * Scores a list of hotel candidates based on proximity, budget, type, rating, and stars.
 *
 * Weights:
 *  - proximity   35%
 *  - budget fit  30%
 *  - hotel type  15%
 *  - rating      10%
 *  - star class  10%
 */

/**
 * @param {Array}  candidates  - Hotel objects (already shaped by withLegacyPlaceImages)
 * @param {Object} context
 * @param {number[]} context.centroidLat  - Average latitude of selected places
 * @param {number[]} context.centroidLng  - Average longitude of selected places
 * @param {string}   context.hotelType   - Preferred hotel type (e.g. 'budget', 'luxury')
 * @param {number}   context.budgetLKR   - Nightly hotel budget in LKR (0 = not set)
 * @param {number}   context.nights      - Number of nights
 * @returns {Array}  Hotels sorted by recommendation_score DESC, annotated with metadata
 */
function scoreHotels(candidates, context) {
  const { centroidLat, centroidLng, hotelType, budgetLKR, nights } = context;

  const hasCentroid = centroidLat != null && centroidLng != null &&
                      !isNaN(centroidLat) && !isNaN(centroidLng);
  const hasBudget   = budgetLKR > 0;
  const hasType     = !!hotelType;

  // Compute raw distances for normalisation
  const distances = hasCentroid
    ? candidates.map(h => {
        const hLat = parseFloat(h.place?.lat);
        const hLng = parseFloat(h.place?.lng);
        return (!isNaN(hLat) && !isNaN(hLng))
          ? haversineKm(centroidLat, centroidLng, hLat, hLng)
          : null;
      })
    : candidates.map(() => null);

  const validDists = distances.filter(d => d !== null);
  const maxDist    = validDists.length ? Math.max(...validDists) : 1;

  // Collect ratings for normalisation
  const ratings = candidates.map(h => parseFloat(h.rating) || 0);
  const maxRating = Math.max(...ratings, 1);

  const scored = candidates.map((hotel, i) => {
    let proximityScore = 0;
    let budgetScore    = 0;
    let typeScore      = 0;
    let ratingScore    = 0;
    let starScore      = 0;

    const dist = distances[i];
    const priceMin = hotel.priceRange?.min || hotel.price_per_night || 0;
    const priceMax = hotel.priceRange?.max || hotel.price_per_night || 0;
    const stars    = parseInt(hotel.star_class || hotel.starRating) || 0;
    const rating   = parseFloat(hotel.rating) || 0;

    // ── Proximity (35%) ─────────────────────────────────────────────────
    if (hasCentroid && dist !== null) {
      proximityScore = maxDist > 0 ? 1 - dist / maxDist : 1;
    } else {
      proximityScore = 0.5; // neutral when no centroid
    }

    // ── Budget fit (30%) ─────────────────────────────────────────────────
    // within_budget = priceMin <= budget
    // Score ramps from 0 (way over) to 1 (well within)
    if (hasBudget) {
      if (priceMin <= budgetLKR) {
        // Within budget — reward how much room is left (up to 2× budget = 0)
        budgetScore = Math.min(1, (budgetLKR - priceMin) / budgetLKR + 0.5);
        budgetScore = Math.min(1, budgetScore);
      } else {
        // Over budget — penalise proportionally
        const overRatio = (priceMin - budgetLKR) / budgetLKR;
        budgetScore = Math.max(0, 1 - overRatio);
      }
    } else {
      budgetScore = 0.5;
    }

    // ── Hotel type (15%) ─────────────────────────────────────────────────
    if (hasType) {
      typeScore = (hotel.hotel_type || '').toLowerCase() === hotelType.toLowerCase() ? 1 : 0;
    } else {
      typeScore = 0.5;
    }

    // ── Rating (10%) ─────────────────────────────────────────────────────
    ratingScore = maxRating > 0 ? rating / maxRating : 0;

    // ── Star class (10%) ─────────────────────────────────────────────────
    starScore = stars / 5;

    const score =
      0.35 * proximityScore +
      0.30 * budgetScore    +
      0.15 * typeScore      +
      0.10 * ratingScore    +
      0.10 * starScore;

    // ── Badges ───────────────────────────────────────────────────────────
    const badges = [];
    if (hasCentroid && dist !== null && dist <= 5)      badges.push('Near itinerary');
    if (hasBudget && priceMin <= budgetLKR)             badges.push('Within budget');
    if (hasType && (hotel.hotel_type || '').toLowerCase() === hotelType.toLowerCase()) badges.push('Matches type');
    if (rating >= 4.0)                                  badges.push('Highly rated');
    if (stars >= 4)                                     badges.push(`${stars}★ hotel`);

    return {
      ...hotel,
      recommendation_score:  Math.round(score * 100) / 100,
      distance_km:           dist !== null ? Math.round(dist * 10) / 10 : null,
      within_budget:         hasBudget ? priceMin <= budgetLKR : null,
      matches_type:          hasType   ? (hotel.hotel_type || '').toLowerCase() === hotelType.toLowerCase() : null,
      recommendation_badges: badges,
      recommendation_note:   'Coming soon',
    };
  });

  return scored.sort((a, b) => b.recommendation_score - a.recommendation_score);
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat  = toRad(lat2 - lat1);
  const dLng  = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { scoreHotels };
