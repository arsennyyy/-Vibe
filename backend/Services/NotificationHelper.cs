using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;

namespace MyMvcBackend.Services;

public static class NotificationHelper
{
    public static async Task CreateAsync(
        ApplicationDbContext db,
        int userId,
        string title,
        string message,
        string type = "info",
        int? relatedEventId = null,
        int? relatedTicketId = null)
    {
        var user = await db.Users.FindAsync(userId);
        if (user == null || !user.NotifySite) return;

        db.Notifications.Add(new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Type = type,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            RelatedEventId = relatedEventId,
            RelatedTicketId = relatedTicketId,
        });
        await db.SaveChangesAsync();
    }

    public static async Task NotifyAdminsAsync(
        ApplicationDbContext db,
        string title,
        string message,
        string type = "info",
        int? relatedEventId = null)
    {
        var adminIds = await db.Users
            .Where(u => u.IsAdmin && u.NotifySite)
            .Select(u => u.Id)
            .ToListAsync();
        if (adminIds.Count == 0) return;

        foreach (var adminId in adminIds)
        {
            db.Notifications.Add(new Notification
            {
                UserId = adminId,
                Title = title,
                Message = message,
                Type = type,
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
                RelatedEventId = relatedEventId,
            });
        }
        await db.SaveChangesAsync();
    }
}
