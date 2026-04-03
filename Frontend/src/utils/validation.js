/**
 * Shared validation utilities for TravelGenie forms.
 * Used across Signup, Profile, Admin CRUD, etc.
 */

/**
 * Validate a person's name.
 * Allows letters (including accented/unicode), spaces, hyphens, apostrophes, and periods.
 * Rejects @, #, $, %, digits, and other special symbols.
 * @param {string} value
 * @returns {{ valid: boolean, message: string }}
 */
export function validateName(value) {
  if (!value || !value.trim()) {
    return { valid: false, message: 'Name is required.' }
  }
  const trimmed = value.trim()
  if (trimmed.length < 2) {
    return { valid: false, message: 'Name must be at least 2 characters.' }
  }
  if (trimmed.length > 100) {
    return { valid: false, message: 'Name must be less than 100 characters.' }
  }
  // Only allow letters (unicode), spaces, hyphens, apostrophes, periods
  if (/[^a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s.\-']/.test(trimmed)) {
    return { valid: false, message: 'Name can only contain letters, spaces, hyphens, apostrophes, and periods. Special characters like @, #, $ are not allowed.' }
  }
  return { valid: true, message: '' }
}

/**
 * Validate a generic title/label (e.g., hotel name, destination name, trip title).
 * More permissive than person names — allows letters, digits, spaces, common punctuation.
 * Rejects @, #, $, %, and other code-like symbols.
 * @param {string} value
 * @param {string} fieldLabel - e.g. 'Hotel name', 'Destination name'
 * @returns {{ valid: boolean, message: string }}
 */
export function validateTitle(value, fieldLabel = 'Title') {
  if (!value || !value.trim()) {
    return { valid: false, message: `${fieldLabel} is required.` }
  }
  const trimmed = value.trim()
  if (trimmed.length < 2) {
    return { valid: false, message: `${fieldLabel} must be at least 2 characters.` }
  }
  if (trimmed.length > 200) {
    return { valid: false, message: `${fieldLabel} must be less than 200 characters.` }
  }
  // Block dangerous special chars but allow common punctuation (parentheses, comma, &, etc.)
  if (/[@#$%^*={}[\]|\\<>]/.test(trimmed)) {
    return { valid: false, message: `${fieldLabel} contains invalid special characters. Characters like @, #, $, % are not allowed.` }
  }
  return { valid: true, message: '' }
}

/**
 * Normalize a phone number — strip non-digits, cap at 10 characters.
 * @param {string} value
 * @returns {string}
 */
export function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 10)
}

/**
 * Validate a Sri Lankan phone number.
 * Must be exactly 10 digits starting with 0.
 * Empty values are considered valid (phone is optional).
 * @param {string} value
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePhone(value) {
  if (!value) return { valid: true, message: '' }
  if (!/^0\d{9}$/.test(value)) {
    return { valid: false, message: 'Phone number must be exactly 10 digits and start with 0 (e.g., 0771234567).' }
  }
  return { valid: true, message: '' }
}

/**
 * Validate a Sri Lankan NIC number.
 * Accepts: 12 digits OR 9 digits followed by V/v/X/x.
 * Empty values are considered valid (NIC is optional).
 * @param {string} value
 * @returns {{ valid: boolean, message: string }}
 */
export function validateNic(value) {
  if (!value) return { valid: true, message: '' }
  const nic = value.trim()
  if (!/^\d{12}$/.test(nic) && !/^\d{9}[VvXx]$/.test(nic)) {
    return { valid: false, message: 'NIC must be either 12 digits (e.g., 200012345678) or 9 digits followed by V/X (e.g., 991234567V).' }
  }
  return { valid: true, message: '' }
}

/**
 * Validate an email address.
 * @param {string} value
 * @returns {{ valid: boolean, message: string }}
 */
export function validateEmail(value) {
  if (!value || !value.trim()) {
    return { valid: false, message: 'Email is required.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return { valid: false, message: 'Please enter a valid email address.' }
  }
  return { valid: true, message: '' }
}

/**
 * Validate a password.
 * Requires: min 8 characters, 1 uppercase, 1 lowercase, 1 digit, 1 special character.
 * @param {string} value
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePassword(value) {
  if (!value) {
    return { valid: false, message: 'Password is required.' }
  }
  if (value.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters.' }
  }
  if (!/[A-Z]/.test(value)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' }
  }
  if (!/[a-z]/.test(value)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter.' }
  }
  if (!/\d/.test(value)) {
    return { valid: false, message: 'Password must contain at least one number.' }
  }
  if (!/[!@#$%^&*()\-_=+\[\]{};:'",.<>?/\\|`~]/.test(value)) {
    return { valid: false, message: 'Password must contain at least one special character (e.g. !@#$%).' }
  }
  return { valid: true, message: '' }
}

/**
 * Validate that a numeric value is positive (> 0).
 * @param {number|string} value
 * @param {string} fieldLabel
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePositiveNumber(value, fieldLabel = 'Amount') {
  const num = parseFloat(value)
  if (isNaN(num) || num <= 0) {
    return { valid: false, message: `${fieldLabel} must be greater than 0.` }
  }
  return { valid: true, message: '' }
}

/**
 * Validate a website URL.
 * Must start with http:// or https:// and have a valid domain.
 * Empty values are considered valid (field is optional).
 * @param {string} value
 * @returns {{ valid: boolean, message: string }}
 */
export function validateUrl(value) {
  if (!value || !value.trim()) return { valid: true, message: '' }
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false, message: 'Website URL must start with http:// or https://.' }
    }
    if (!url.hostname.includes('.')) {
      return { valid: false, message: 'Please enter a valid website URL (e.g., https://www.hotel.com).' }
    }
    return { valid: true, message: '' }
  } catch {
    return { valid: false, message: 'Please enter a valid website URL (e.g., https://www.hotel.com).' }
  }
}

/**
 * Validate a date of birth.
 * If provided, must not be in the future, and age must be between 13 and 120.
 * Empty values are considered valid (field is optional).
 * @param {string} value - ISO date string (YYYY-MM-DD)
 * @returns {{ valid: boolean, message: string }}
 */
export function validateDateOfBirth(value) {
  if (!value) return { valid: true, message: '' }
  const dob = new Date(value)
  if (isNaN(dob.getTime())) {
    return { valid: false, message: 'Please enter a valid date of birth.' }
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (dob > today) {
    return { valid: false, message: 'Date of birth cannot be in the future.' }
  }
  const yearDiff = today.getFullYear() - dob.getFullYear()
  const hadBirthday =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate())
  const age = hadBirthday ? yearDiff : yearDiff - 1
  if (age < 13) {
    return { valid: false, message: 'You must be at least 13 years old.' }
  }
  if (age > 120) {
    return { valid: false, message: 'Please enter a valid date of birth.' }
  }
  return { valid: true, message: '' }
}

/**
 * Validate a trip or expense date.
 * Must be a valid date and not more than maxFutureYears years in the future.
 * @param {string} value - ISO date string (YYYY-MM-DD)
 * @param {number} maxFutureYears - how many years ahead is allowed (default 5)
 * @returns {{ valid: boolean, message: string }}
 */
export function validateTripDate(value, maxFutureYears = 5) {
  if (!value) return { valid: false, message: 'Date is required.' }
  const date = new Date(value)
  if (isNaN(date.getTime())) {
    return { valid: false, message: 'Please enter a valid date.' }
  }
  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() + maxFutureYears)
  if (date > maxDate) {
    return { valid: false, message: `Date cannot be more than ${maxFutureYears} year${maxFutureYears === 1 ? '' : 's'} in the future.` }
  }
  return { valid: true, message: '' }
}

/**
 * Validate that an end date is not before a start date.
 * @param {string} start - ISO date string
 * @param {string} end   - ISO date string
 * @returns {{ valid: boolean, message: string }}
 */
export function validateDateRange(start, end) {
  if (!start || !end) return { valid: true, message: '' }
  const s = new Date(start)
  const e = new Date(end)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return { valid: true, message: '' }
  if (e < s) {
    return { valid: false, message: 'End date must be on or after the start date.' }
  }
  return { valid: true, message: '' }
}
