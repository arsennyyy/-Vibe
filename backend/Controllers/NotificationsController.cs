using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;
using MyMvcBackend.Services;

namespace MyMvcBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public NotificationsController(ApplicationDbContext context) => _context = context;

    private int? UserId =>
        int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : null;

    [Authorize]
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int limit = 30)
    {
        var uid = UserId;
        if (uid == null) return Unauthorized();

        var items = await _context.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == uid)
            .OrderByDescending(n => n.CreatedAt)
            .Take(Math.Clamp(limit, 1, 100))
            .Select(n => new
            {
                n.Id,
                n.Title,
                n.Message,
                n.Type,
                n.IsRead,
                n.CreatedAt,
                n.RelatedEventId,
                n.RelatedTicketId,
            })
            .ToListAsync();

        return Ok(items);
    }

    [Authorize]
    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount()
    {
        var uid = UserId;
        if (uid == null) return Unauthorized();
        var count = await _context.Notifications.CountAsync(n => n.UserId == uid && !n.IsRead);
        return Ok(new { count });
    }

    [Authorize]
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var uid = UserId;
        if (uid == null) return Unauthorized();
        var n = await _context.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == uid);
        if (n == null) return NotFound();
        n.IsRead = true;
        n.ReadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok();
    }

    [Authorize]
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var uid = UserId;
        if (uid == null) return Unauthorized();
        var unread = await _context.Notifications.Where(n => n.UserId == uid && !n.IsRead).ToListAsync();
        var now = DateTime.UtcNow;
        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAt = now;
        }
        await _context.SaveChangesAsync();
        return Ok(new { updated = unread.Count });
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var uid = UserId;
        if (uid == null) return Unauthorized();
        var n = await _context.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == uid);
        if (n == null) return NotFound();
        _context.Notifications.Remove(n);
        await _context.SaveChangesAsync();
        return Ok();
    }

    [Authorize]
    [HttpDelete]
    public async Task<IActionResult> DeleteAll()
    {
        var uid = UserId;
        if (uid == null) return Unauthorized();
        var all = await _context.Notifications.Where(n => n.UserId == uid).ToListAsync();
        _context.Notifications.RemoveRange(all);
        await _context.SaveChangesAsync();
        return Ok(new { deleted = all.Count });
    }
}
