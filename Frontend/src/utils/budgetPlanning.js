export const DAILY_SPLIT_DEFAULT = { food: 55, transport: 30, activities_misc: 15 }

export function normalizeDailySplit(split) {
  const keys = ['food', 'transport', 'activities_misc']
  const raw = keys.map((key) => Math.max(Number(split?.[key]) || 0, 0))
  const total = raw.reduce((sum, value) => sum + value, 0)

  if (total <= 0) return { ...DAILY_SPLIT_DEFAULT }

  const scaled = raw.map((value) => (value / total) * 100)
  const base = scaled.map((value) => Math.floor(value))
  let remainder = 100 - base.reduce((sum, value) => sum + value, 0)

  const order = scaled
    .map((value, idx) => ({ idx, frac: value - base[idx] }))
    .sort((a, b) => (b.frac - a.frac) || (a.idx - b.idx))

  let i = 0
  while (remainder > 0) {
    base[order[i % order.length].idx] += 1
    remainder -= 1
    i += 1
  }

  return {
    food: base[0],
    transport: base[1],
    activities_misc: base[2],
  }
}

export function deriveAiFallbackSplit({ ruleDays, hotelNights, selectedHotelsCount, plannedRemaining }) {
  const safeDays = Math.max(Number(ruleDays) || 1, 1)
  const safeNights = Math.max(Number(hotelNights) || 1, 1)
  const safeHotelsCount = Math.max(Number(selectedHotelsCount) || 0, 0)
  const safeRemaining = Math.max(Number(plannedRemaining) || 0, 0)

  return normalizeDailySplit({
    food: 56 + Math.min(Math.floor(safeDays / 3), 6),
    transport: 27 + Math.min(Math.floor(safeNights / 4), 5) + (safeHotelsCount > 1 ? 2 : 0),
    activities_misc: 17 + (safeRemaining > 0 && (safeRemaining / safeDays) > 10000 ? 3 : 0),
  })
}

export function validateStartToBudgetHandoff(handoff) {
  const issues = []
  const districtId = Number(handoff?.selectedDistrict?.district_id)
  if (!Number.isFinite(districtId) || districtId <= 0) {
    issues.push('selectedDistrict.district_id missing or invalid')
  }

  const prefs = handoff?.tripPreferences || null
  if (!prefs || !Number.isFinite(Number(prefs.days)) || Number(prefs.days) <= 0) {
    issues.push('tripPreferences.days missing or invalid')
  }

  const hotels = Array.isArray(handoff?.selectedHotels) ? handoff.selectedHotels : []
  const singleHotel = handoff?.selectedHotel || null
  if (hotels.length === 0 && !singleHotel) {
    issues.push('no selected hotel payload found')
  }

  const totalHotelNights = hotels.reduce((sum, h) => sum + Math.max(1, Number(h?.nights) || 1), 0)
  if (hotels.length > 0 && totalHotelNights <= 0) {
    issues.push('selectedHotels present but total nights invalid')
  }

  return {
    ok: issues.length === 0,
    issues,
  }
}
