using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;

namespace MyMvcBackend.Services
{
    public static class CatalogFilterSeed
    {
        private static readonly (string Kind, string Label, int Order)[] Defaults =
        [
            ("type", "Концерт", 0),
            ("genre", "Рок", 0),
            ("genre", "Инди", 1),
            ("genre", "Хип-хоп", 2),
            ("genre", "Рэп", 3),
            ("genre", "Трэп", 4),
            ("genre", "R&B", 5),
            ("genre", "Альтернатива", 6),
            ("genre", "Арт-рэп", 7),
            ("genre", "Поп", 8),
        ];

        public static async Task SeedAsync(ApplicationDbContext db)
        {
            if (await db.CatalogFilters.AnyAsync()) return;

            foreach (var (kind, label, order) in Defaults)
            {
                db.CatalogFilters.Add(new CatalogFilter
                {
                    Kind = kind,
                    Label = label,
                    SortOrder = order,
                    IsActive = true,
                });
            }

            await db.SaveChangesAsync();
        }
    }
}
