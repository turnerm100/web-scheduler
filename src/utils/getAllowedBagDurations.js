// src/utils/getAllowedBagDurations.js

/**
 * Returns an array representing the bag durations to use for a given span of days,
 * considering whether 5- and 6-day bag options are enabled.
 *
 * @param {number} days - The total number of days that need to be covered.
 * @param {boolean} enable5DayBags
 * @param {boolean} enable6DayBags
 * @returns {number[]} Array of bag durations (in days)
 */
export function getAllowedBagDurations(days, enable5DayBags, enable6DayBags) {
  if (days === 5) {
    if (enable5DayBags) return [5];
    return [2, 3];
  }
  if (days === 6) {
    if (enable6DayBags) return [6];
    return [3, 3];
  }
  // Extend logic for other cycles as needed!
  return [days];
}
