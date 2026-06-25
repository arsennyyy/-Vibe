using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;

namespace MyMvcBackend.Services;

/// <summary>
/// Демо-события для защиты / онлайн-демо, если каталог пуст.
/// </summary>
public static class DefenseDemoSeed
{
    public static async Task SeedAsync(ApplicationDbContext db, IConfiguration config, ILogger logger)
    {
        if (!config.GetValue("Platform:SeedDemoEvents", true)) return;
        if (await db.Events.AnyAsync(e => e.Status == EventStatus.Published)) return;

        var layout = await db.HallLayouts
            .Include(l => l.Hall)
            .ThenInclude(h => h!.Venue)
            .OrderBy(l => l.Id)
            .FirstOrDefaultAsync();
        if (layout?.Hall?.Venue == null)
        {
            logger.LogWarning("DefenseDemoSeed: нет схем залов — пропуск.");
            return;
        }

        var adminId = await db.Users
            .Where(u => u.IsAdmin)
            .Select(u => (int?)u.Id)
            .FirstOrDefaultAsync();

        var demos = new[]
        {
            new DemoSpec(
                "Макс Корж — Live в Минске",
                "Рок",
                "/images/event_1.jpg",
                true,
                45),
            new DemoSpec(
                "Хип-хоп вечер: Молодой Платон",
                "Хип-хоп",
                "/images/event_2.jpg",
                false,
                30),
            new DemoSpec(
                "Инди-сцена: NaviBand acoustic",
                "Инди",
                "/images/event_3.jpg",
                false,
                21),
        };

        logger.LogInformation("Создание {Count} демо-событий для каталога…", demos.Length);

        foreach (var demo in demos)
        {
            var eventDate = DateTime.UtcNow.Date.AddDays(demo.DaysAhead);
            var evt = new Event
            {
                Title = demo.Title,
                Image = demo.Image,
                Date = eventDate,
                Time = "19:00",
                Location = layout.Hall.Venue.Name,
                Address = layout.Hall.Venue.Address,
                Price = "от 35 BYN",
                Category = "Концерт",
                Genre = demo.Genre,
                Description =
                    "Демонстрационное событие платформы +Vibe для защиты дипломного проекта. " +
                    "Полный цикл: схема зала, бронирование, оплата и электронный билет.",
                EventType = "Концерт",
                Lineup = """[{"name":"Главный артист","role":"vocals"}]""",
                IsFeatured = demo.Featured,
                Status = EventStatus.Published,
                OrganizerId = adminId,
                VenueId = layout.Hall.VenueId,
                HallId = layout.HallId,
                HallLayoutId = layout.Id,
                PublishedAt = DateTime.UtcNow,
                AllowTicketTransfer = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            db.Events.Add(evt);
            await db.SaveChangesAsync();

            db.TicketTypes.AddRange(
                new TicketType { EventId = evt.Id, Name = "Стандарт", Price = 35, Available = true },
                new TicketType { EventId = evt.Id, Name = "VIP", Price = 75, Available = true },
                new TicketType { EventId = evt.Id, Name = "Для инвалидов", Price = 25, Available = true });
            await db.SaveChangesAsync();

            var layoutSeats = await db.HallLayoutSeats
                .Where(s => s.HallLayoutId == layout.Id)
                .ToListAsync();
            foreach (var ls in layoutSeats)
            {
                db.Seats.Add(LayoutSeatMapper.ToEventSeat(ls, evt.Id, evt.HallThemeJson));
            }

            await db.SaveChangesAsync();
            logger.LogInformation("  + «{Title}» — {Seats} мест", demo.Title, layoutSeats.Count);
        }
    }

    private sealed record DemoSpec(string Title, string Genre, string Image, bool Featured, int DaysAhead);
}
