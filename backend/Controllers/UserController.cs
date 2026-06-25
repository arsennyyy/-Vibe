using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;
using MyMvcBackend.Services;

namespace MyMvcBackend.Controllers;

[ApiController]
[Route("api/user")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _env;
    private readonly ImageOptimizationService _images;

    public UserController(ApplicationDbContext context, IWebHostEnvironment env, ImageOptimizationService images)
    {
        _context = context;
        _env = env;
        _images = images;
    }

    private async Task<User?> CurrentUserAsync()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (claim == null || !int.TryParse(claim, out var id)) return null;
        return await _context.Users.FindAsync(id);
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await CurrentUserAsync();
        if (user == null) return Unauthorized();
        return Ok(new
        {
            user.Id,
            user.Name,
            user.Email,
            joinedDate = user.CreatedAt,
            user.IsAdmin,
            user.IsOrganizer,
            avatarUrl = user.AvatarUrl,
            notifyOrderEmail = user.NotifyOrderEmail,
            notifyOrganizerEvents = user.NotifyOrganizerEvents,
            notifySite = user.NotifySite,
            qrSessionStartedAt = user.QrSessionStartedAt,
        });
    }

    [HttpPut("notification-prefs")]
    public async Task<IActionResult> UpdateNotificationPrefs([FromBody] NotificationPrefsRequest model)
    {
        var user = await CurrentUserAsync();
        if (user == null) return Unauthorized();

        if (model.NotifyOrderEmail.HasValue) user.NotifyOrderEmail = model.NotifyOrderEmail.Value;
        if (model.NotifyOrganizerEvents.HasValue) user.NotifyOrganizerEvents = model.NotifyOrganizerEvents.Value;
        if (model.NotifySite.HasValue) user.NotifySite = model.NotifySite.Value;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new
        {
            notifyOrderEmail = user.NotifyOrderEmail,
            notifyOrganizerEvents = user.NotifyOrganizerEvents,
            notifySite = user.NotifySite,
        });
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest model)
    {
        var user = await CurrentUserAsync();
        if (user == null) return Unauthorized();

        var name = model.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { message = "Укажите имя" });
        if (name.Length > 100)
            return BadRequest(new { message = "Имя не длиннее 100 символов" });

        user.Name = name;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { name = user.Name });
    }

    [HttpPost("avatar")]
    [RequestSizeLimit(3_000_000)]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        var user = await CurrentUserAsync();
        if (user == null) return Unauthorized();
        if (file == null || file.Length == 0) return BadRequest(new { message = "Файл не выбран" });
        if (file.Length > 4_000_000) return BadRequest(new { message = "Максимум 4 МБ" });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png" or ".webp" or ".gif"))
            return BadRequest(new { message = "Допустимы JPG, PNG, WebP, GIF" });

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var optimized = await _images.SaveOptimizedAsync(file, webRoot, "avatars", 512, 512, 85);
        var fileName = Path.GetFileName(optimized.PhysicalPath);
        user.AvatarUrl = $"{optimized.RelativePath}?v={DateTime.UtcNow.Ticks}";
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { avatarUrl = user.AvatarUrl });
    }

    [HttpDelete("avatar")]
    public async Task<IActionResult> DeleteAvatar()
    {
        var user = await CurrentUserAsync();
        if (user == null) return Unauthorized();

        if (!string.IsNullOrEmpty(user.AvatarUrl))
        {
            var pathPart = user.AvatarUrl.Split('?')[0].TrimStart('/');
            var fullPath = Path.Combine(_env.WebRootPath ?? "wwwroot", pathPart.Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(fullPath))
            {
                try { System.IO.File.Delete(fullPath); } catch { /* ignore */ }
            }
        }

        user.AvatarUrl = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { avatarUrl = (string?)null });
    }
}

public class NotificationPrefsRequest
{
    public bool? NotifyOrderEmail { get; set; }
    public bool? NotifyOrganizerEvents { get; set; }
    public bool? NotifySite { get; set; }
}

public class UpdateProfileRequest
{
    public string? Name { get; set; }
}
