/**
 * sessionLog.js
 * Append-only per-user study-session log. Source of truth for weekly hours & streak.
 */

import { getDaysElapsed, REFERENCE_DATE } from "./decayEngine";

/** Build one session record. */
export const makeSession = (topicId, minutes, date) => ({
  id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  topicId,
  date, // YYYY-MM-DD (local)
  minutes: Math.max(0, Number(minutes) || 0),
});

/**
 * Backfill: topics logged before the session log existed still count.
 * For every topic with no session yet, synthesize one from lastStudied + duration.
 */
export const withDerivedSessions = (sessions, topics) => {
  const covered = new Set((sessions || []).map((s) => s.topicId));
  const derived = (topics || [])
    .filter((t) => t.lastStudied && !covered.has(t.id))
    .map((t) => ({
      id: `derived-${t.id}`,
      topicId: t.id,
      date: t.lastStudied,
      minutes: Math.max(0, Number(t.duration) || 0),
    }));
  return [...(sessions || []), ...derived];
};

// Parse YYYY-MM-DD at noon so the weekday label is immune to timezone shifts.
const atNoon = (dateStr) => new Date(`${dateStr}T12:00:00`);
const JS_DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Last-7-days stats for the dashboard: { weekHours, barData, todayLabel }. */
export const weeklyStats = (sessions, referenceDate = REFERENCE_DATE) => {
  const hoursByDay = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  let weekMinutes = 0;

  (sessions || []).forEach((s) => {
    if (!s.date) return;
    if (getDaysElapsed(s.date, referenceDate) > 6) return; // rolling 7-day window
    const minutes = Math.max(0, Number(s.minutes) || 0);
    weekMinutes += minutes;
    hoursByDay[JS_DAY_LABEL[atNoon(s.date).getDay()]] += minutes / 60;
  });

  const weekOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    weekHours: Number((weekMinutes / 60).toFixed(1)),
    barData: weekOrder.map((day) => ({ day, hours: Math.round(hoursByDay[day] * 10) / 10 })),
    todayLabel: JS_DAY_LABEL[atNoon(referenceDate).getDay()],
  };
};

/** Consecutive-day streak over session dates. */
export const computeStreak = (sessions, referenceDate = REFERENCE_DATE) => {
  const days = new Set((sessions || []).map((s) => s.date).filter(Boolean));
  if (days.size === 0) return 0;

  const isoOf = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  let cursor = atNoon(referenceDate);
  if (!days.has(isoOf(cursor))) {
    const latest = [...days].sort().reverse()[0];
    cursor = atNoon(latest);
  }
  let streak = 0;
  while (days.has(isoOf(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};