/** Склонение «место / места / мест» по числу */
export function pluralSeats(count: number): string {
  const n = Math.abs(Math.floor(count));
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} место`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} места`;
  return `${n} мест`;
}

/** Склонение «билет / билета / билетов» по числу */
export function pluralTickets(count: number): string {
  const n = Math.abs(Math.floor(count));
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} билет`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} билета`;
  return `${n} билетов`;
}
