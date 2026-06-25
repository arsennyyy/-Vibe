/** Форматирует дату + время мероприятия без сдвига UTC (date — календарный день, time — HH:mm). */
export function formatEventDateTime(dateRaw?: string, timeRaw?: string): string {
  if (!dateRaw) return "Дата не указана";
  const datePart = dateRaw.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!m) {
    try {
      const d = new Date(dateRaw);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
    } catch {
      /* fall through */
    }
    return "Дата не указана";
  }
  const time = (timeRaw ?? "").trim().slice(0, 5) || "00:00";
  const [hh, mm] = time.split(":").map((x) => parseInt(x, 10) || 0);
  const local = new Date(
    parseInt(m[1], 10),
    parseInt(m[2], 10) - 1,
    parseInt(m[3], 10),
    hh,
    mm
  );
  return local.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
