using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;
using MyMvcBackend.Services;
using System.Security.Claims;

namespace MyMvcBackend.Controllers;

[ApiController]
[Route("api/support")]
[Authorize]
public class SupportChatController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IAiChatService _ai;
    private readonly CaptchaService _captcha;

    public SupportChatController(ApplicationDbContext db, IAiChatService ai, CaptchaService captcha)
    {
        _db = db;
        _ai = ai;
        _captcha = captcha;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("thread")]
    public async Task<ActionResult<object>> GetThread()
    {
        var thread = await GetOrCreateThreadAsync();
        var messages = await _db.SupportMessages
            .Where(m => m.ThreadId == thread.Id)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new { m.Id, m.SenderRole, m.Content, m.CreatedAt })
            .ToListAsync();
        return Ok(new
        {
            thread.Id,
            thread.Status,
            thread.UserRole,
            messages,
            aiEnabled = _ai.IsConfigured,
        });
    }

    [HttpPost("message")]
    public async Task<ActionResult<object>> SendMessage([FromBody] ChatMessageRequest body)
    {
        if (!body.Escalate && string.IsNullOrWhiteSpace(body.Content))
            return BadRequest(new { message = "Введите сообщение" });

        var thread = await GetOrCreateThreadAsync();
        var isFirst = !await _db.SupportMessages.AnyAsync(m => m.ThreadId == thread.Id);
        if ((isFirst || body.Escalate) && !_captcha.ConsumeToken(body.CaptchaToken))
            return BadRequest(new { message = "Пройдите проверку «Я не робот»" });
        var text = body.Content.Trim();

        _db.SupportMessages.Add(new SupportMessage
        {
            ThreadId = thread.Id,
            SenderRole = "user",
            Content = text,
            CreatedAt = DateTime.UtcNow,
        });
        thread.UpdatedAt = DateTime.UtcNow;

        string? aiReply = null;

        if (body.Escalate)
        {
            thread.Status = "awaiting_admin";
            aiReply = "Опишите вашу проблему, чтобы наша служба поддержки смогла помочь вам в скором времени.";
            _db.SupportMessages.Add(new SupportMessage
            {
                ThreadId = thread.Id,
                SenderRole = "ai",
                Content = aiReply,
                CreatedAt = DateTime.UtcNow,
            });
        }
        else if (thread.Status == "awaiting_admin")
        {
            var user = await _db.Users.FindAsync(UserId);
            await NotificationHelper.NotifyAdminsAsync(
                _db,
                "Чат поддержки",
                $"{(user?.IsOrganizer == true ? "Организатор" : "Пользователь")} {user?.Name}: {text}",
                "info");

            const string thankYou =
                "Спасибо за обращение! Мы получили ваше сообщение и скоро ответим на ваш вопрос.";
            var alreadyThanked = await _db.SupportMessages
                .AnyAsync(m => m.ThreadId == thread.Id && m.SenderRole == "ai" && m.Content == thankYou);
            if (!alreadyThanked)
            {
                aiReply = thankYou;
                _db.SupportMessages.Add(new SupportMessage
                {
                    ThreadId = thread.Id,
                    SenderRole = "ai",
                    Content = thankYou,
                    CreatedAt = DateTime.UtcNow,
                });
            }
        }
        else if (thread.Status is "ai" or "answered")
        {
            var historyRows = await _db.SupportMessages
                .Where(m => m.ThreadId == thread.Id)
                .OrderBy(m => m.CreatedAt)
                .Select(m => new { m.SenderRole, m.Content })
                .ToListAsync();
            var history = historyRows.Select(m => (m.SenderRole, m.Content)).ToList();
            aiReply = await _ai.ReplyAsync(text, history);
            _db.SupportMessages.Add(new SupportMessage
            {
                ThreadId = thread.Id,
                SenderRole = "ai",
                Content = aiReply,
                CreatedAt = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { aiReply, threadStatus = thread.Status });
    }

    [HttpPost("escalate")]
    public async Task<ActionResult<object>> Escalate([FromBody] ChatMessageRequest body)
    {
        body.Escalate = true;
        return await SendMessage(body);
    }

    private async Task<SupportThread> GetOrCreateThreadAsync()
    {
        var uid = UserId;
        var thread = await _db.SupportThreads
            .Where(t => t.UserId == uid && t.Status != "closed")
            .OrderByDescending(t => t.UpdatedAt)
            .FirstOrDefaultAsync();

        if (thread != null) return thread;

        var user = await _db.Users.FindAsync(uid);
        var role = user?.IsOrganizer == true ? "organizer" : "visitor";
        thread = new SupportThread
        {
            UserId = uid,
            UserRole = role,
            Status = "ai",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.SupportThreads.Add(thread);
        await _db.SaveChangesAsync();
        return thread;
    }
}

public class ChatMessageRequest
{
    public string Content { get; set; } = "";
    public bool Escalate { get; set; }
    public string? CaptchaToken { get; set; }
}
