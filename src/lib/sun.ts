// The time of day from the real sun: SunCalc works out how high it is for the player's rough place,
// which comes from their time zone (no location permission). Sunrise and sunset then follow the
// seasons and daylight saving anywhere in the world.
import { getPosition, getTimes } from "suncalc";

import { dayPhase, type DayPhase } from "@/constants/hospital";
import { TIMEZONE_PLACES } from "@/constants/timezones";

/** The sun this far above or below the horizon (degrees) is full day or full night; between is sunrise or sunset. */
const TWILIGHT_DEG = 6;

/** The player's rough [latitude, longitude] from their time zone, or null if it isn't a place (UTC, say). */
export function timeZonePlace(): [number, number] | null {
  try {
    return TIMEZONE_PLACES[Intl.DateTimeFormat().resolvedOptions().timeZone] ?? null;
  } catch {
    return null;
  }
}

/**
 * Sunrise, day, sunset or night at `date` for `place`: night while the sun is more than 6 degrees
 * below the horizon, day once it's 6 above, and sunrise or sunset in between (before or after noon).
 * Without a place it falls back to the clock (sunrise 5-7, day 7-17, sunset 17-19).
 */
export function sunPhase(date: Date, place: [number, number] | null = timeZonePlace()): DayPhase {
  if (!place) return dayPhase(date.getHours());
  const [lat, lng] = place;
  // Degrees (SunCalc 2 gives degrees; version 1 gave radians).
  const { altitude } = getPosition(date, lat, lng);
  if (altitude <= -TWILIGHT_DEG) return "night";
  if (altitude >= TWILIGHT_DEG) return "day";
  return date.getTime() < getTimes(date, lat, lng).solarNoon.getTime() ? "sunrise" : "sunset";
}
