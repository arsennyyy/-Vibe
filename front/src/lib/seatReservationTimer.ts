const PREFIX = "vibe_seat_timer_";

export function getReservationDeadline(eventId: number): number | null {
  const raw = sessionStorage.getItem(`${PREFIX}${eventId}`);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function startReservationTimer(eventId: number, minutes = 10): number {
  const deadline = Date.now() + minutes * 60 * 1000;
  sessionStorage.setItem(`${PREFIX}${eventId}`, String(deadline));
  return deadline;
}

export function clearReservationTimer(eventId: number) {
  sessionStorage.removeItem(`${PREFIX}${eventId}`);
}

export function remainingSeconds(eventId: number): number {
  const d = getReservationDeadline(eventId);
  if (!d) return 0;
  return Math.max(0, Math.floor((d - Date.now()) / 1000));
}
