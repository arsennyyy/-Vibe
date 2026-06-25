using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;

namespace MyMvcBackend.Controllers;

[ApiController]
[Route("api/admin/faq")]
[Authorize(Roles = "Admin")]
public class AdminFaqController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AdminFaqController(ApplicationDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var categories = await _context.FaqCategories
            .OrderBy(c => c.SortOrder)
            .Select(c => new
            {
                c.Id,
                c.Title,
                c.Description,
                c.SortOrder,
                items = _context.FaqItems
                    .Where(i => i.CategoryId == c.Id)
                    .OrderBy(i => i.SortOrder)
                    .Select(i => new { i.Id, i.Question, i.Answer, i.SortOrder })
                    .ToList(),
            })
            .ToListAsync();
        return Ok(categories);
    }

    [HttpPut("categories/{id}")]
    public async Task<IActionResult> UpdateCategory(string id, [FromBody] FaqCategoryUpdateDto dto)
    {
        var cat = await _context.FaqCategories.FindAsync(id);
        if (cat == null) return NotFound();
        if (!string.IsNullOrWhiteSpace(dto.Title)) cat.Title = dto.Title.Trim();
        if (dto.Description != null) cat.Description = dto.Description.Trim();
        await _context.SaveChangesAsync();
        return Ok(cat);
    }

    [HttpPost("items")]
    public async Task<IActionResult> CreateItem([FromBody] FaqItemDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CategoryId)) return BadRequest();
        if (!await _context.FaqCategories.AnyAsync(c => c.Id == dto.CategoryId))
            return BadRequest(new { message = "Категория не найдена" });

        var maxOrder = await _context.FaqItems
            .Where(i => i.CategoryId == dto.CategoryId)
            .MaxAsync(i => (int?)i.SortOrder) ?? -1;

        var item = new FaqItem
        {
            CategoryId = dto.CategoryId,
            Question = dto.Question.Trim(),
            Answer = dto.Answer.Trim(),
            SortOrder = maxOrder + 1,
        };
        _context.FaqItems.Add(item);
        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [HttpPut("items/{id}")]
    public async Task<IActionResult> UpdateItem(int id, [FromBody] FaqItemDto dto)
    {
        var item = await _context.FaqItems.FindAsync(id);
        if (item == null) return NotFound();
        if (!string.IsNullOrWhiteSpace(dto.Question)) item.Question = dto.Question.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Answer)) item.Answer = dto.Answer.Trim();
        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("items/{id}")]
    public async Task<IActionResult> DeleteItem(int id)
    {
        var item = await _context.FaqItems.FindAsync(id);
        if (item == null) return NotFound();
        _context.FaqItems.Remove(item);
        await _context.SaveChangesAsync();
        return Ok();
    }
}

public class FaqCategoryUpdateDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
}

public class FaqItemDto
{
    public string CategoryId { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
}
