/**
 * Clears all per-user localStorage data.
 * Call this on logout OR when a different user logs in.
 */
export function clearUserData() {
  // Named user-specific keys
  const named = [
    'myTrips',
    'savedDestinations',
    'selectedDistrict',
    'scrollToPlace',
    'editingTripId',
    'selectedPlaces',
    'tripPreferences',
    'selectedHotel',
    'selectedHotels',
    'tripBudget',
    'tripBudgets',
    'expenseTrends',
    'placeNamesMap',
    'et_displayCurrency',
  ]
  named.forEach(k => localStorage.removeItem(k))

  // Dynamic keys: expenses_trip_*, reviews_*
  const dynamic = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith('expenses_trip_') || k?.startsWith('reviews_')) {
      dynamic.push(k)
    }
  }
  dynamic.forEach(k => localStorage.removeItem(k))
}
