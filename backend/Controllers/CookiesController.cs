using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;
using MyMvcBackend.Services;

namespace MyMvcBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CookiesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public CookiesController(ApplicationDbContext context) => _context = context;

    [HttpPost("consent")]
    public async Task<IActionResult> SaveConsent([FromBody] CookieConsentRequest body)
    {
        await DatabaseSchemaHelper.EnsureCookieConsentsTableAsync(_context);

        if (string.IsNullOrWhiteSpace(body.VisitorId))
            return BadRequest(new { message = "Некорректный идентификатор" });

        var visitorId = body.VisitorId.Trim();
        int? userId = null;
        if (User.Identity?.IsAuthenticated == true
            && int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var uid))
        {
            userId = uid;
        }

        var ua = Request.Headers.UserAgent.ToString();
        if (ua.Length > 512) ua = ua[..512];
        var ipHash = HashIp(HttpContext.Connection.RemoteIpAddress?.ToString());

        var existing = await _context.CookieConsents
            .FirstOrDefaultAsync(c => c.VisitorId == visitorId);

        var now = DateTime.UtcNow;
        if (existing == null)
        {
            _context.CookieConsents.Add(new CookieConsent
            {
                VisitorId = visitorId,
                UserId = userId,
                Essential = true,
                Analytics = body.Analytics,
                Marketing = body.Marketing,
                UserAgent = ua,
                IpHash = ipHash,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }
        else
        {
            existing.UserId = userId ?? existing.UserId;
            existing.Analytics = body.Analytics;
            existing.Marketing = body.Marketing;
            existing.UserAgent = ua;
            existing.IpHash = ipHash;
            existing.UpdatedAt = now;
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Согласие сохранено" });
    }

    private static string? HashIp(string? ip)
    {
        if (string.IsNullOrWhiteSpace(ip)) return null;
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(ip.Trim()));
        return Convert.ToHexString(bytes)[..16];
    }
}

public class CookieConsentRequest
{
    public string VisitorId { get; set; } = "";
    public bool Analytics { get; set; }
    public bool Marketing { get; set; }
}
