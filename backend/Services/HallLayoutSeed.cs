using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;
using MyMvcBackend.Services.HallLayouts;

namespace MyMvcBackend.Services;

public static class HallLayoutSeed
{
    private sealed record VenueSeed(
        string Name,
        string City,
        string Address,
        string HallName,
        int Capacity,
        string LayoutName,
        Func<List<LayoutSeatBlueprint>> Build);

    private static readonly VenueSeed[] Catalog =
    [
        new(
            "Re:public",
            "Минск",
            "ул. Притыцкого, 62",
            "Основной зал",
            400,
            "Клубная схема",
            MinskHallLayoutBuilders.BuildRePublic),
        new(
            "Белгосфилармония",
            "Минск",
            "пр-т Независимости, 50",
            "Большой зал",
            688,
            "Концертная рассадка",
            MinskHallLayoutBuilders.BuildPhilharmonic),
        new(
            "КЗ Минск",
            "Минск",
            "ул. Октябрьская, 5",
            "Большой зал",
            1329,
            "Сектора A–E + партер",
            MinskHallLayoutBuilders.BuildKzMinsk),
        new(
            "Prime Hall",
            "Минск",
            "пр-т Победителей, 65",
            "Концертный зал",
            1400,
            "Партер + амфитеатр + балкон",
            MinskHallLayoutBuilders.BuildPrimeHall),
        new(
            "Дворец Республики",
            "Минск",
            "пл. Октябрьская, 1",
            "Большой зал",
            2700,
            "Партер + амфитеатр + балкон",
            MinskHallLayoutBuilders.BuildPalaceOfRepublic),
        new(
            "Falcon Club Arena",
            "Минск",
            "пр-т Победителей, 20",
            "Арена",
            1500,
            "Партер + сектора",
            MinskHallLayoutBuilders.BuildFalconClub),
        new(
            "Дворец спорта",
            "Минск",
            "пр-т Победителей, 4",
            "Большая арена",
            4500,
            "Арена-концерт",
            MinskHallLayoutBuilders.BuildSportsPalace),
        new(
            "МКСК Минск-Арена",
            "Минск",
            "пр-т Победителей, 111",
            "Арена",
            3800,
            "Трибуны + танцпол",
            MinskHallLayoutBuilders.BuildMinskArena),
    ];

    private const int ExpectedLayouts = 8;

    public static async Task SeedAsync(ApplicationDbContext db, ILogger logger)
    {
        if (!await NeedsCatalogReseed(db))
        {
            logger.LogInformation("Каталог схем залов актуален ({Count} схем).", ExpectedLayouts);
            await LogSummaryAsync(db, logger);
            return;
        }

        var catalogNames = Catalog.Select(c => c.Name).Distinct().ToList();
        var existing = await db.Venues
            .Where(v => catalogNames.Contains(v.Name) || v.Name.Contains("Динамо"))
            .ToListAsync();
        if (existing.Count > 0)
        {
            logger.LogWarning("Пересоздаём каталог площадок ({Count} записей, включая устаревшие)…", existing.Count);
            db.Venues.RemoveRange(existing);
            await db.SaveChangesAsync();
        }

        logger.LogInformation("Загрузка рядовых схем залов (seed v7)…");

        foreach (var item in Catalog)
        {
            var venue = new Venue
            {
                Name = item.Name,
                City = item.City,
                Address = item.Address,
            };
            db.Venues.Add(venue);
            await db.SaveChangesAsync();

            var hall = new Hall
            {
                Name = item.HallName,
                VenueId = venue.Id,
                Capacity = item.Capacity,
            };
            db.Halls.Add(hall);
            await db.SaveChangesAsync();

            var blueprints = item.Build();
            hall.Capacity = blueprints.Count;

            var layout = new HallLayout
            {
                Name = $"{item.LayoutName} ({blueprints.Count} мест)",
                HallId = hall.Id,
                IsActive = true,
            };
            db.HallLayouts.Add(layout);
            await db.SaveChangesAsync();

            await BulkInsertSeatsAsync(db, layout.Id, blueprints);

            logger.LogInformation(
                "  + {Venue} / {Layout}: {Seats} seats",
                item.Name,
                layout.Name,
                blueprints.Count);
        }

        logger.LogInformation("Каталог схем залов загружен.");
        await LogSummaryAsync(db, logger);
    }

    private static async Task<bool> NeedsCatalogReseed(ApplicationDbContext db)
    {
        if (await db.Venues.AnyAsync(v => v.Name.Contains("Динамо"))) return true;
        if (await db.HallLayouts.CountAsync() != ExpectedLayouts) return true;

        var totalSeats = await db.HallLayoutSeats.CountAsync();
        if (totalSeats is < 800 or > 2500) return true;

        if (await db.HallLayoutSeats.AnyAsync(s => s.PosX != null)) return true;

        if (await db.HallLayoutSeats.AnyAsync(s => s.Sector == "Сектор A")) return true;

        var danceFloorLayouts = await (
            from s in db.HallLayoutSeats
            join l in db.HallLayouts on s.HallLayoutId equals l.Id
            where s.IsGa && s.Sector == "Танцпол"
            select l.Id).Distinct().CountAsync();
        if (danceFloorLayouts < ExpectedLayouts) return true;
        return false;
    }

    private static async Task LogSummaryAsync(ApplicationDbContext db, ILogger logger)
    {
        var rows = await db.HallLayouts
            .Include(l => l.Hall)
            .ThenInclude(h => h!.Venue)
            .OrderBy(l => l.Hall!.Venue!.Name)
            .ThenBy(l => l.Name)
            .Select(l => new
            {
                Venue = l.Hall!.Venue!.Name,
                Layout = l.Name,
                Seats = l.Seats.Count,
            })
            .ToListAsync();

        logger.LogInformation("=== Каталог залов ({Count} схем) ===", rows.Count);
        foreach (var row in rows)
        {
            logger.LogInformation("  {Venue}: {Layout} — {Seats} мест", row.Venue, row.Layout, row.Seats);
        }
    }

    private static async Task BulkInsertSeatsAsync(
        ApplicationDbContext db,
        int layoutId,
        List<LayoutSeatBlueprint> blueprints)
    {
        const int chunkSize = 400;
        for (var offset = 0; offset < blueprints.Count; offset += chunkSize)
        {
            var chunk = blueprints.Skip(offset).Take(chunkSize).ToList();
            var values = new List<string>(chunk.Count);
            foreach (var b in chunk)
            {
                var sector = EscapeSql(b.Sector);
                var row = EscapeSql(b.Row);
                var type = EscapeSql(b.Type);
                var tier = EscapeSql(b.PriceTier);
                var xSql = b.X.HasValue ? b.X.Value.ToString(System.Globalization.CultureInfo.InvariantCulture) : "NULL";
                var ySql = b.Y.HasValue ? b.Y.Value.ToString(System.Globalization.CultureInfo.InvariantCulture) : "NULL";
                var price = b.Price.ToString(System.Globalization.CultureInfo.InvariantCulture);
                values.Add(
                    $"({layoutId}, '{sector}', '{row}', {b.Number}, '{type}', {price}, '{tier}', {xSql}, {ySql}, {(b.IsGa ? "TRUE" : "FALSE")})");
            }

            var sql = $"""
                INSERT INTO halllayoutseats
                    (halllayoutid, sector, row, number, type, price, pricetier, posx, posy, isga)
                VALUES {string.Join(",\n", values)};
                """;

            await db.Database.ExecuteSqlRawAsync(sql);
        }
    }

    private static string EscapeSql(string value) => value.Replace("'", "''");
}
