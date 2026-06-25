using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Models;

namespace MyMvcBackend.Services
{
    public static class EventCatalog
    {
        /// <summary>Событие видно в публичном каталоге концертов.</summary>
        public static bool IsPubliclyVisible(Event e, DateTime utcNow)
        {
            if (e.ScheduledUnpublishAt.HasValue && e.ScheduledUnpublishAt.Value <= utcNow)
                return false;

            if (e.Status == EventStatus.Passed || e.Status == EventStatus.Cancelled)
                return false;

            if (e.Status == EventStatus.Published)
                return true;

            if (e.Status == EventStatus.Approved
                && e.ScheduledPublishAt.HasValue
                && e.ScheduledPublishAt.Value <= utcNow)
                return true;

            return false;
        }

        public static async Task ProcessScheduleAsync(Data.ApplicationDbContext context, DateTime utcNow)
        {
            var duePublish = await context.Events
                .Where(e => e.Status == EventStatus.Approved
                    && e.ScheduledPublishAt != null
                    && e.ScheduledPublishAt <= utcNow
                    && (e.ScheduledUnpublishAt == null || e.ScheduledUnpublishAt > utcNow))
                .ToListAsync();

            foreach (var evt in duePublish)
            {
                evt.Status = EventStatus.Published;
                evt.PublishedAt = utcNow;
                evt.UpdatedAt = utcNow;
            }

            var dueUnpublish = await context.Events
                .Where(e => e.ScheduledUnpublishAt != null
                    && e.ScheduledUnpublishAt <= utcNow
                    && (e.Status == EventStatus.Published
                        || (e.Status == EventStatus.Approved && e.ScheduledPublishAt != null && e.ScheduledPublishAt <= utcNow)))
                .ToListAsync();

            foreach (var evt in dueUnpublish)
            {
                evt.Status = EventStatus.Approved;
                evt.PublishedAt = null;
                evt.ScheduledPublishAt = null;
                evt.UpdatedAt = utcNow;
            }

            var toPass = await context.Events
                .Where(e => e.Status == EventStatus.Published || e.Status == EventStatus.Approved)
                .ToListAsync();

            var passedAny = false;
            foreach (var evt in toPass)
            {
                if (!IsEventPast(evt, utcNow)) continue;
                evt.Status = EventStatus.Passed;
                evt.UpdatedAt = utcNow;
                passedAny = true;
            }

            if (duePublish.Count > 0 || dueUnpublish.Count > 0 || passedAny)
                await context.SaveChangesAsync();
        }

        public static bool IsEventPast(Event e, DateTime utcNow)
        {
            var day = e.Date.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(e.Date, DateTimeKind.Utc)
                : e.Date.ToUniversalTime();
            var eventDay = day.Date;
            if (eventDay < utcNow.Date) return true;
            if (eventDay > utcNow.Date) return false;
            if (TryParseEventTime(e.Time, out var minutes))
                return utcNow.TimeOfDay.TotalMinutes > minutes + 180;
            return utcNow.TimeOfDay.TotalMinutes > 23 * 60;
        }

        private static bool TryParseEventTime(string? time, out double totalMinutes)
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

        [Obsolete("Use ProcessScheduleAsync")]
        public static Task PromoteScheduledEventsAsync(Data.ApplicationDbContext context, DateTime utcNow) =>
            ProcessScheduleAsync(context, utcNow);

        /// <summary>Есть ли у события места или категории билетов, доступные для покупки.</summary>
        public static bool HasBookableAvailability(
            Event e,
            IReadOnlyDictionary<int, int> availableSeatCounts,
            IReadOnlySet<int> eventsWithSeats)
        {
            if (eventsWithSeats.Contains(e.Id))
                return availableSeatCounts.GetValueOrDefault(e.Id, 0) > 0;

            if (e.TicketTypes.Any(t => t.Available))
                return true;

            if (e.HallLayoutId.HasValue || e.HallId.HasValue || e.TicketTypes.Count > 0)
                return true;

            return false;
        }

        public static async Task EnrichSoldOutAsync(Data.ApplicationDbContext context, IEnumerable<Event> events)
        {
            var list = events.ToList();
            if (list.Count == 0) return;

            var ids = list.Select(e => e.Id).ToList();
            var availableSeatCounts = await context.Seats
                .Where(s => ids.Contains(s.EventId) && s.Status == "available")
                .GroupBy(s => s.EventId)
                .Select(g => new { EventId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.EventId, x => x.Count);

            var eventsWithSeats = await context.Seats
                .Where(s => ids.Contains(s.EventId))
                .Select(s => s.EventId)
                .Distinct()
                .ToListAsync();
            var seatSet = eventsWithSeats.ToHashSet();

            foreach (var e in list)
                e.IsSoldOut = !HasBookableAvailability(e, availableSeatCounts, seatSet);
        }
    }
}
