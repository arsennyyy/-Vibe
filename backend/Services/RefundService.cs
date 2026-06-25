using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;

namespace MyMvcBackend.Services;

public class RefundService
{
    private readonly ApplicationDbContext _db;
    private readonly IEmailService _email;
    private readonly IConfiguration _config;
    private readonly ILogger<RefundService> _logger;

    public RefundService(
        ApplicationDbContext db,
        IEmailService email,
        IConfiguration config,
        ILogger<RefundService> logger)
    {
        _db = db;
        _email = email;
        _config = config;
        _logger = logger;
    }

    public async Task<RefundBatchResult> RefundOrderAsync(int orderId, string reason, bool notify = true)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == orderId);
        if (order == null) return RefundBatchResult.Fail("Заказ не найден");
        if (order.Status is "refunded" or "cancelled")
            return RefundBatchResult.Fail("Заказ уже возвращён или отменён");

        var utcNow = DateTime.UtcNow;
        await ApplyRefundToOrderAsync(order, reason, utcNow);

        if (notify && order.UserId > 0)
            await NotifyRefundAsync(order.UserId, order, reason, utcNow);

        await _db.SaveChangesAsync();
        return RefundBatchResult.Ok(1, order.TotalAmount);
    }

    public async Task<RefundBatchResult> CancelEventAndRefundAllAsync(int eventId, string? reason = null)
    {
        var evt = await _db.Events.FindAsync(eventId);
        if (evt == null) return RefundBatchResult.Fail("Мероприятие не найдено");
        if (evt.Status == EventStatus.Cancelled)
            return RefundBatchResult.Fail("Мероприятие уже отменено");

        var utcNow = DateTime.UtcNow;
        var cancelReason = string.IsNullOrWhiteSpace(reason)
            ? "Мероприятие отменено организатором площадки."
            : reason.Trim();

        evt.Status = EventStatus.Cancelled;
        evt.ScheduledUnpublishAt = utcNow;
        evt.PublishedAt = null;
        evt.UpdatedAt = utcNow;

        var orders = await _db.Orders
            .Where(o => o.EventId == eventId && o.Status == "paid")
            .ToListAsync();

        decimal total = 0;
        var notifiedUsers = new HashSet<int>();

        foreach (var order in orders)
        {
            await ApplyRefundToOrderAsync(order, cancelReason, utcNow);
            total += order.TotalAmount;
            if (notifiedUsers.Add(order.UserId))
                await NotifyEventCancelledAsync(order.UserId, evt, cancelReason, utcNow);
        }

        var seats = await _db.Seats.Where(s => s.EventId == eventId).ToListAsync();
        foreach (var seat in seats)
        {
            seat.Status = "available";
            seat.ReservedByUserId = null;
            seat.ReservationExpiresAt = null;
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("Event {EventId} cancelled, refunds={Count}, seats reset={Seats}",
            eventId, orders.Count, seats.Count);

        return RefundBatchResult.Ok(orders.Count, total);
    }

    public async Task<RefundBatchResult> RefundSingleTicketAsync(int ticketId, string reason, bool notify = true)
    {
        var ticket = await _db.UserTickets
            .Include(t => t.Seat)
            .Include(t => t.Event)
            .FirstOrDefaultAsync(t => t.Id == ticketId);

        if (ticket == null) return RefundBatchResult.Fail("Билет не найден");
        if (ticket.IsRefunded) return RefundBatchResult.Fail("Билет уже возвращён");
        if (ticket.IsUsed) return RefundBatchResult.Fail("Билет уже использован на входе");
        if (ticket.Event != null && ticket.Event.Status == EventStatus.Cancelled)
            return RefundBatchResult.Fail("Концерт отменён — возврат оформляется автоматически");

        var utcNow = DateTime.UtcNow;
        ticket.IsRefunded = true;
        ticket.RefundedAt = utcNow;

        if (ticket.Seat != null && ticket.Seat.Status == "sold")
        {
            ticket.Seat.Status = "available";
            ticket.Seat.ReservedByUserId = null;
            ticket.Seat.ReservationExpiresAt = null;
        }

        await _db.SaveChangesAsync();

        if (notify && ticket.UserId > 0)
        {
            var user = await _db.Users.FindAsync(ticket.UserId);
            if (user != null)
            {
                var title = ticket.Event?.Title ?? "мероприятие";
                await NotificationHelper.CreateAsync(
                    _db,
                    ticket.UserId,
                    "Возврат билета",
                    $"Билет на «{title}» возвращён. {reason}",
                    "warning",
                    ticket.EventId);

                await TrySendOrderEmailAsync(user, () => _email.SendOrderRefundedAsync(
                    user.Email,
                    user.Name,
                    title,
                    $"T-{ticket.Id}",
                    ticket.Price,
                    reason));
            }
        }

        return RefundBatchResult.Ok(1, ticket.Price);
    }

    public async Task NotifyEventRescheduledAsync(Event evt, DateTime oldDate, string oldTime, DateTime newDate, string newTime)
    {
        var tickets = await _db.UserTickets
            .Where(t => t.EventId == evt.Id && !t.IsRefunded)
            .ToListAsync();

        var userIds = tickets.Select(t => t.UserId).Distinct().ToList();
        var utcNow = DateTime.UtcNow;
        var newEventDate = EventDateTimeHelper.EventDateOnly(newDate);

        foreach (var ticket in tickets)
            ticket.EventDate = newEventDate;

        foreach (var userId in userIds)
            await NotifyRescheduleAsync(userId, evt, oldDate, oldTime, evt.Date, evt.Time, utcNow);

        await _db.SaveChangesAsync();
    }

    private async Task ApplyRefundToOrderAsync(Order order, string reason, DateTime utcNow)
    {
        order.Status = "refunded";
        order.CompletedAt = utcNow;

        var payments = await _db.Payments
            .Where(p => p.OrderId == order.Id && p.Status == "completed")
            .ToListAsync();
        foreach (var p in payments)
            p.Status = "refunded";

        var ticketsQuery = _db.UserTickets
            .Include(t => t.Seat)
            .Where(t => t.UserId == order.UserId && t.EventId == order.EventId && !t.IsRefunded);

        if (!string.IsNullOrWhiteSpace(order.SeatLabel))
        {
            var label = order.SeatLabel.Trim();
            ticketsQuery = ticketsQuery.Where(t =>
                t.Seat != null && (t.Seat.Row + t.Seat.Number.ToString()) == label);
        }

        var tickets = await ticketsQuery.ToListAsync();
        foreach (var ticket in tickets)
        {
            ticket.IsRefunded = true;
            ticket.RefundedAt = utcNow;
            if (ticket.Seat != null && ticket.Seat.Status == "sold")
            {
                ticket.Seat.Status = "available";
                ticket.Seat.ReservedByUserId = null;
                ticket.Seat.ReservationExpiresAt = null;
            }
        }
    }

    private async Task NotifyRefundAsync(int userId, Order order, string reason, DateTime utcNow)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return;

        var title = "Возврат средств";
        var message = $"Заказ {order.OrderNumber} на «{order.EventTitle}» возвращён. Сумма: {order.TotalAmount:0.00} BYN. {reason}";

        await NotificationHelper.CreateAsync(_db, userId, title, message, "warning", order.EventId);

        await TrySendOrderEmailAsync(user, () => _email.SendOrderRefundedAsync(
            user.Email,
            user.Name,
            order.EventTitle ?? "мероприятие",
            order.OrderNumber,
            order.TotalAmount,
            reason));
    }

    private async Task NotifyEventCancelledAsync(int userId, Event evt, string reason, DateTime utcNow)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return;

        var title = "Мероприятие отменено";
        var message = $"«{evt.Title}» отменено. Средства по оплаченным билетам возвращены. {reason}";

        await NotificationHelper.CreateAsync(_db, userId, title, message, "error", evt.Id);
        await TrySendOrderEmailAsync(user, () => _email.SendEventCancelledRefundAsync(
            user.Email, user.Name, evt.Title, evt.Date, evt.Time, reason));
    }

    private async Task NotifyRescheduleAsync(
        int userId, Event evt, DateTime oldDate, string oldTime, DateTime newDate, string newTime, DateTime utcNow)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return;

        var title = "Концерт перенесён";
        var message = $"«{evt.Title}» перенесён: было {FormatEventWhen(oldDate, oldTime)}, стало {FormatEventWhen(newDate, newTime)}. "
                      + "Ваши билеты обновлены и остаются действительными.";

        await NotificationHelper.CreateAsync(_db, userId, title, message, "warning", evt.Id);
        await TrySendOrderEmailAsync(user, () => _email.SendEventRescheduledAsync(
            user.Email, user.Name, evt.Title, oldDate, oldTime, newDate, newTime));
    }

    private async Task TrySendOrderEmailAsync(User user, Func<Task<bool>> send)
    {
        if (string.IsNullOrWhiteSpace(user.Email))
        {
            _logger.LogWarning("Email skipped: user {UserId} has no address", user.Id);
            return;
        }
        if (!user.NotifyOrderEmail)
        {
            _logger.LogInformation("Email skipped: user {UserId} disabled order emails", user.Id);
            return;
        }
        try
        {
            var sent = await send();
            if (!sent)
                _logger.LogWarning("SMTP did not send email to {Email}", user.Email);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", user.Email);
        }
    }

    private static string FormatEventWhen(DateTime date, string time) =>
        EventDateTimeHelper.FormatWhen(date, time);
}

public record RefundBatchResult(bool Success, string? Error, int OrdersRefunded, decimal TotalAmount)
{
    public static RefundBatchResult Ok(int count, decimal total) => new(true, null, count, total);
    public static RefundBatchResult Fail(string error) => new(false, error, 0, 0);
}
