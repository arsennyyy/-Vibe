using MyMvcBackend.Models;

namespace MyMvcBackend.Services;

/// <summary>
/// Дата/время мероприятий хранятся как календарная дата (date) + строка time (HH:mm) в часовом поясе площадки.
/// </summary>
public static class EventDateTimeHelper
{
    public static DateTime EventDateOnly(DateTime value) =>
        DateTime.SpecifyKind(value.Date, DateTimeKind.Unspecified);

    public static string NormalizeTime(string? time)
    {
        var t = (time ?? "").Trim();
        return t.Length >= 5 ? t[..5] : t;
    }

    public static string FormatWhen(DateTime date, string? time)
    {
        var d = EventDateOnly(date);
        var t = NormalizeTime(time);
        return string.IsNullOrEmpty(t) ? $"{d:dd.MM.yyyy}" : $"{d:dd.MM.yyyy} {t}";
    }

    public static double? HoursUntil(Event e, DateTime utcNow)
    {
        var day = e.Date.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(e.Date, DateTimeKind.Utc)
            : e.Date.ToUniversalTime();
        var eventUtc = day.Date;
        if (TryParseTime(e.Time, out var mins))
            eventUtc = eventUtc.AddMinutes(mins);
        return (eventUtc - utcNow).TotalHours;
    }

    private static bool TryParseTime(string? time, out double totalMinutes)
    {
        totalMinutes = 0;
        if (string.IsNullOrWhiteSpace(time)) return false;
        var normalized = time.Trim().Replace('.', ':');
        if (TimeSpan.TryParse(normalized, out var ts))
        {
            totalMinutes = ts.TotalMinutes;
            return true;
        }
        return false;
    }
}
