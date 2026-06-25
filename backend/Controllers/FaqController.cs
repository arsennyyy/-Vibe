using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;

namespace MyMvcBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FaqController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public FaqController(ApplicationDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var categories = await _context.FaqCategories.OrderBy(c => c.SortOrder).ToListAsync();
        var items = await _context.FaqItems.OrderBy(i => i.SortOrder).ToListAsync();

        return Ok(categories.Select(c => new
        {
            c.Id,
            c.Title,
            c.Description,
            items = items
                .Where(i => i.CategoryId == c.Id)
                .Select(i => new { i.Id, i.Question, i.Answer, i.SortOrder })
                .ToList(),
        }));
    }
}
