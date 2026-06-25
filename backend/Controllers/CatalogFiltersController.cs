using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;

namespace MyMvcBackend.Controllers
{
    [ApiController]
    [Route("api/catalog-filters")]
    public class CatalogFiltersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CatalogFiltersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<object>> GetActive()
        {
            var items = await _context.CatalogFilters
                .AsNoTracking()
                .Where(f => f.IsActive)
                .OrderBy(f => f.Kind)
                .ThenBy(f => f.SortOrder)
                .ThenBy(f => f.Label)
                .Select(f => new { f.Id, f.Kind, f.Label, f.SortOrder })
                .ToListAsync();

            var genres = items.Where(i => i.Kind == "genre").Select(i => i.Label).ToList();
            var types = items.Where(i => i.Kind == "type").Select(i => i.Label).ToList();

            return Ok(new
            {
                genres,
                types,
            });
        }
    }
}
