using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;

namespace MyMvcBackend.Services;

public class TicketTransferService
{
    public const int TransferWindowMinutes = 10;

    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _configuration;

    public TicketTransferService(ApplicationDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    public async Task ExpireStaleAsync(DateTime utcNow)
    {
        var expired = await _db.TicketTransfers
            .Where(t => t.Status == "pending" && t.ExpiresAt <= utcNow)
            .ToListAsync();
        if (expired.Count == 0) return;
        foreach (var t in expired)
        {
            t.Status = "expired";
            t.RespondedAt = utcNow;
        }
        await _db.SaveChangesAsync();
    }

    public async Task<(bool Ok, string? Error, TicketTransfer? Transfer)> InitiateAsync(
        int senderUserId, int ticketId, string recipientEmail)
    {
        await DatabaseSchemaHelper.EnsureTicketTransferSchemaAsync(_db);
        var utcNow = DateTime.UtcNow;
        await ExpireStaleAsync(utcNow);

        var email = recipientEmail.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(email))
            return (false, "Укажите email друга", null);

        var recipient = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
        if (recipient == null)
            return (false, "Пользователь с таким email не зарегистрирован на +Vibe", null);
        if (recipient.Id == senderUserId)
            return (false, "Нельзя передать билет самому себе", null);

        var ticket = await _db.UserTickets
            .Include(t => t.Event)
            .Include(t => t.Seat)
            .FirstOrDefaultAsync(t => t.Id == ticketId && t.UserId == senderUserId);
        if (ticket == null) return (false, "Билет не найден", null);
        if (ticket.IsRefunded) return (false, "Билет возвращён", null);
        if (ticket.IsUsed) return (false, "Билет уже использован", null);
        if (ticket.Event == null) return (false, "Событие не найдено", null);
        if (!ticket.Event.AllowTicketTransfer)
            return (false, "Организатор отключил передачу билетов на это мероприятие", null);
        if (ticket.Event.Status == EventStatus.Cancelled)
            return (false, "Концерт отменён", null);
        if (EventCatalog.IsEventPast(ticket.Event, utcNow))
            return (false, "Мероприятие уже прошло", null);

        var hours = EventDateTimeHelper.HoursUntil(ticket.Event, utcNow);
        if (hours.HasValue && hours.Value <= 24)
            return (false, "Передача недоступна менее чем за 24 часа до начала", null);

        var pendingRefund = await _db.TicketRefundRequests
            .AnyAsync(r => r.UserTicketId == ticketId && r.Status == "pending");
        if (pendingRefund) return (false, "Сначала дождитесь решения по заявке на возврат", null);

        var pendingTransfer = await _db.TicketTransfers
            .AnyAsync(t => t.UserTicketId == ticketId && t.Status == "pending" && t.ExpiresAt > utcNow);
        if (pendingTransfer) return (false, "По этому билету уже есть активная передача", null);

        var transfer = new TicketTransfer
        {
            UserTicketId = ticket.Id,
            SenderUserId = senderUserId,
            RecipientUserId = recipient.Id,
            RecipientEmail = email,
            Price = ticket.Price,
            Status = "pending",
            ExpiresAt = utcNow.AddMinutes(TransferWindowMinutes),
            CreatedAt = utcNow,
        };
        _db.TicketTransfers.Add(transfer);
        await _db.SaveChangesAsync();

        var sender = await _db.Users.FindAsync(senderUserId);
        await NotificationHelper.CreateAsync(
            _db,
            recipient.Id,
            "Вам передали билет",
            $"{sender?.Name ?? "Друг"} хочет передать билет на «{ticket.Event.Title}» по номинальной цене {ticket.Price:0} BYN. У вас {TransferWindowMinutes} мин на принятие и оплату.",
            "info",
            ticket.EventId,
            ticket.Id);

        return (true, null, transfer);
    }

    public async Task<(bool Ok, string? Error, object? Dto)> PayAsync(int recipientUserId, int transferId)
    {
        await DatabaseSchemaHelper.EnsureTicketTransferSchemaAsync(_db);
        var utcNow = DateTime.UtcNow;
        await ExpireStaleAsync(utcNow);

        var transfer = await _db.TicketTransfers
            .Include(t => t.UserTicket).ThenInclude(ut => ut!.Event)
            .Include(t => t.UserTicket).ThenInclude(ut => ut!.Seat)
            .Include(t => t.Sender)
            .FirstOrDefaultAsync(t => t.Id == transferId);

        if (transfer == null) return (false, "Заявка не найдена", null);
        if (transfer.RecipientUserId != recipientUserId)
            return (false, "Нет доступа к этой передаче", null);
        if (transfer.Status != "pending")
            return (false, transfer.Status == "expired" ? "Время на оплату истекло" : "Передача уже обработана", null);
        if (transfer.ExpiresAt <= utcNow)
        {
            transfer.Status = "expired";
            transfer.RespondedAt = utcNow;
            await _db.SaveChangesAsync();
            return (false, "Время на оплату истекло (10 минут)", null);
        }

        var ticket = transfer.UserTicket;
        if (ticket == null || ticket.UserId != transfer.SenderUserId)
            return (false, "Билет недоступен для передачи", null);

        var evt = ticket.Event;
        var orderNumber = $"VT-{utcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
        var seatLabel = ticket.Seat != null ? SeatLabelHelper.Format(ticket.Seat) : "место";

        var order = new Order
        {
            UserId = recipientUserId,
            OrderNumber = orderNumber,
            TotalAmount = transfer.Price,
            Status = "paid",
            CreatedAt = utcNow,
            CompletedAt = utcNow,
            EventId = ticket.EventId,
            EventTitle = evt?.Title,
            SeatLabel = seatLabel,
        };
        _db.Orders.Add(order);

        ticket.UserId = recipientUserId;
        ticket.PurchaseDate = utcNow;
        ticket.QrRotationStartedAt = utcNow;
        ticket.QrCode = $"VT|{recipientUserId}|{ticket.EventId}|{ticket.SeatId}|{Guid.NewGuid():N}";

        transfer.Status = "completed";
        transfer.RespondedAt = utcNow;
        transfer.CompletedAt = utcNow;

        await _db.SaveChangesAsync();

        var commissionPercent = PlatformCommission.ResolvePercent(_configuration);
        var (platformFee, organizerPayout) = PlatformCommission.Split(transfer.Price, commissionPercent);
        var payment = new Payment
        {
            OrderId = order.Id,
            UserId = recipientUserId,
            Amount = transfer.Price,
            GrossAmount = transfer.Price,
            EventId = ticket.EventId,
            OrganizerId = evt?.OrganizerId,
            PlatformFee = platformFee,
            OrganizerPayout = organizerPayout,
            CommissionPercent = commissionPercent,
            PaymentMethod = "card",
            Status = "completed",
            TransactionId = $"TXN-{Guid.NewGuid():N}",
            PaymentDetails = JsonSerializer.Serialize(new
            {
                type = "ticket_transfer",
                transferId = transfer.Id,
                fromUserId = transfer.SenderUserId,
            }),
            CreatedAt = utcNow,
            CompletedAt = utcNow,
        };
        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        await NotificationHelper.CreateAsync(
            _db,
            transfer.SenderUserId,
            "Билет передан",
            $"Билет на «{evt?.Title}» ({seatLabel}) передан пользователю {transfer.RecipientEmail}.",
            "info",
            ticket.EventId,
            ticket.Id);

        await NotificationHelper.CreateAsync(
            _db,
            recipientUserId,
            "Билет получен",
            $"Вы приняли билет на «{evt?.Title}». QR-код в профиле обновляется каждые {RotatingQrService.WindowMinutes} мин.",
            "success",
            ticket.EventId,
            ticket.Id);

        return (true, null, new
        {
            orderId = order.Id,
            orderNumber = order.OrderNumber,
            ticketId = ticket.Id,
            total = transfer.Price,
        });
    }

    public static object MapTransferDto(TicketTransfer t, User? currentUser, DateTime utcNow)
    {
        var ticket = t.UserTicket;
        var evt = ticket?.Event;
        var seat = ticket?.Seat;
        var secondsLeft = t.Status == "pending"
            ? Math.Max(0, (int)Math.Ceiling((t.ExpiresAt - utcNow).TotalSeconds))
            : 0;

        return new
        {
            t.Id,
            t.Status,
            t.Price,
            t.RecipientEmail,
            expiresAt = t.ExpiresAt,
            secondsLeft,
            senderName = t.Sender?.Name,
            senderEmail = t.Sender?.Email,
            recipientName = t.Recipient?.Name,
            eventTitle = evt?.Title,
            eventId = evt?.Id,
            eventDate = evt?.Date,
            eventTime = evt?.Time,
            eventImage = evt?.Image,
            ticketType = ticket?.TicketType,
            seatRow = seat?.Row,
            seatNumber = seat?.Number,
            userTicketId = t.UserTicketId,
            isIncoming = currentUser != null && t.RecipientUserId == currentUser.Id,
            isOutgoing = currentUser != null && t.SenderUserId == currentUser.Id,
        };
    }
}
