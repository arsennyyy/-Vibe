using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;
using System.Security.Claims;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MyMvcBackend.Services;

namespace MyMvcBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SeatsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SeatsController> _logger;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly ITicketPdfGenerator _ticketPdfGenerator;
        private readonly CaptchaService _captcha;

        public SeatsController(
            ApplicationDbContext context,
            ILogger<SeatsController> logger,
            IConfiguration configuration,
            IEmailService emailService,
            ITicketPdfGenerator ticketPdfGenerator,
            CaptchaService captcha)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _emailService = emailService;
            _ticketPdfGenerator = ticketPdfGenerator;
            _captcha = captcha;
        }

        // GET: api/Seats/event/5/hall-map
        [HttpGet("event/{eventId}/hall-map")]
        public async Task<ActionResult<object>> GetEventHallMap(int eventId)
        {
            var evt = await _context.Events.AsNoTracking().FirstOrDefaultAsync(e => e.Id == eventId);
            if (evt == null) return NotFound();

            var seats = await _context.Seats
                .Where(s => s.EventId == eventId)
                .OrderBy(s => s.Id)
                .ToListAsync();

            if (!seats.Any())
            {
                seats = await InitializeHallLayout(eventId);
            }

            object? theme = null;
            if (!string.IsNullOrWhiteSpace(evt.HallThemeJson))
            {
                try
                {
                    theme = JsonSerializer.Deserialize<object>(evt.HallThemeJson);
                }
                catch
                {
                    theme = null;
                }
            }

            return Ok(new
            {
                seats,
                hallThemeJson = evt.HallThemeJson,
                theme,
                viewWidth = 1000,
                viewHeight = 820,
                stageY = 760,
            });
        }

        // GET: api/Seats/event/5
        [HttpGet("event/{eventId}")]
        public async Task<ActionResult<IEnumerable<Seat>>> GetEventSeats(int eventId)
        {
            var seats = await _context.Seats
                .Where(s => s.EventId == eventId)
                .ToListAsync();

            // Если мест нет, создаем схему зала
            if (!seats.Any())
            {
                seats = await InitializeHallLayout(eventId);
            }

            return seats;
        }

        // POST: api/Seats/reserve
        [Authorize]
        [HttpPost("reserve")]
        public async Task<ActionResult<Seat>> ReserveSeat(SeatReservationRequest request)
        {
            _logger.LogInformation($"[RESERVE] Request received: EventId={request?.EventId}, SeatId={request?.SeatId}");
            
            if (request == null)
            {
                _logger.LogWarning("[RESERVE] Request is null!");
                return BadRequest("Неверные параметры");
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                _logger.LogWarning("UserId claim not found in token!");
                return Unauthorized();
            }
            var userId = int.Parse(userIdClaim.Value);
            _logger.LogInformation($"[RESERVE] UserId from token: {userId}");

            var seat = await _context.Seats
                .FirstOrDefaultAsync(s => s.Id == request.SeatId && s.EventId == request.EventId);

            if (seat == null) 
            {
                _logger.LogWarning($"[RESERVE] Seat not found: EventId={request.EventId}, SeatId={request.SeatId}");
                return NotFound("Место не найдено");
            }
            if (seat.Status != "available") 
            {
                _logger.LogWarning($"[RESERVE] Seat status is not available: {seat.Status}");
                return BadRequest("Место уже занято");
            }

            // Проверяем, не истекло ли время бронирования других мест пользователя
            var userReservations = await _context.Seats
                .Where(s => s.ReservedByUserId == userId && s.EventId == request.EventId)
                .ToListAsync();

            foreach (var reservation in userReservations)
            {
                if (reservation.ReservationExpiresAt < DateTime.UtcNow)
                {
                    reservation.Status = "available";
                    reservation.ReservedByUserId = null;
                    reservation.ReservationExpiresAt = null;
                }
            }

            seat.Status = "reserved";
            seat.ReservedByUserId = userId;
            // Explicitly set as UTC for PostgreSQL compatibility
            seat.ReservationExpiresAt = DateTime.SpecifyKind(DateTime.UtcNow.AddMinutes(10), DateTimeKind.Utc);

            try
            {
                await _context.SaveChangesAsync();
                return seat;
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!SeatExists(seat.Id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }
        }

        // POST: api/Seats/purchase
        [Authorize]
        [HttpPost("purchase")]
        public async Task<ActionResult<object>> PurchaseSeat(SeatPurchaseRequest request)
        {
            _logger.LogInformation($"[PURCHASE] Request received: EventId={request?.EventId}, SeatId={request?.SeatId}, TicketType={request?.TicketType}");
            
            if (request == null)
            {
                _logger.LogWarning("[PURCHASE] Request is null!");
                return BadRequest("Неверные параметры");
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                _logger.LogWarning("UserId claim not found in token!");
                return Unauthorized();
            }
            var userId = int.Parse(userIdClaim.Value);
            _logger.LogInformation($"[PURCHASE] UserId from token: {userId}");

            var seat = await _context.Seats
                .Include(s => s.Event)
                .FirstOrDefaultAsync(s => s.Id == request.SeatId && s.EventId == request.EventId);

            if (seat == null) 
            {
                _logger.LogWarning($"[PURCHASE] Seat not found: EventId={request.EventId}, SeatId={request.SeatId}");
                return NotFound("Место не найдено");
            }
            if (seat.Status != "reserved" || seat.ReservedByUserId != userId) 
            {
                _logger.LogWarning($"[PURCHASE] Seat status check failed: status={seat.Status}, reservedBy={seat.ReservedByUserId}, userId={userId}");
                return BadRequest("Место не забронировано вами");
            }

            // Генерируем QR-код
            var qrCode = GenerateQrCode(userId, seat.EventId, seat.Id);

            // Создаем билет with proper UTC DateTime values
            var purchaseDate = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
            var eventDate = EventDateTimeHelper.EventDateOnly(seat.Event?.Date ?? purchaseDate);

            var ticket = new UserTicket
            {
                UserId = userId,
                EventId = seat.EventId,
                SeatId = seat.Id,
                TicketType = request.TicketType,
                Price = seat.Price,
                PurchaseDate = purchaseDate,
                EventDate = eventDate,
                QrCode = qrCode,
                QrRotationStartedAt = purchaseDate,
                IsUsed = false
            };

            // Обновляем статус места
            seat.Status = "sold";
            seat.ReservedByUserId = null;
            seat.ReservationExpiresAt = null;

            _context.UserTickets.Add(ticket);

            var orderNumber = $"VB-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
            var seatLabel = SeatLabelHelper.Format(seat);
            var order = new Order
            {
                UserId = userId,
                OrderNumber = orderNumber,
                TotalAmount = seat.Price,
                Status = "paid",
                CreatedAt = purchaseDate,
                CompletedAt = purchaseDate,
                EventId = seat.EventId,
                EventTitle = seat.Event?.Title,
                SeatLabel = seatLabel,
            };
            _context.Orders.Add(order);

            try
            {
                await _context.SaveChangesAsync();

                var commissionPercent = PlatformCommission.ResolvePercent(_configuration);
                var (platformFee, organizerPayout) = PlatformCommission.Split(seat.Price, commissionPercent);
                var payment = new Payment
                {
                    OrderId = order.Id,
                    UserId = userId,
                    Amount = seat.Price,
                    GrossAmount = seat.Price,
                    EventId = seat.EventId,
                    OrganizerId = seat.Event?.OrganizerId,
                    PlatformFee = platformFee,
                    OrganizerPayout = organizerPayout,
                    CommissionPercent = commissionPercent,
                    PaymentMethod = "card",
                    Status = "completed",
                    TransactionId = $"TXN-{Guid.NewGuid():N}",
                    PaymentDetails = JsonSerializer.Serialize(new
                    {
                        eventId = seat.EventId,
                        seatId = seat.Id,
                        row = seat.Row,
                        number = seat.Number,
                        ticketType = request.TicketType,
                        commissionPercent,
                        platformFee,
                        organizerPayout,
                    }),
                    CreatedAt = purchaseDate,
                    CompletedAt = purchaseDate,
                };
                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();

                await TrySendTicketEmailAsync(userId, ticket, order, seat);

                await NotificationHelper.CreateAsync(
                    _context,
                    userId,
                    "Билет куплен",
                    $"{seatLabel} на «{seat.Event?.Title}» успешно оплачено. QR-код в профиле обновляется каждые {RotatingQrService.WindowMinutes} мин.",
                    "success",
                    seat.EventId,
                    ticket.Id);

                // Возвращаем только нужные поля (DTO)
                return new {
                    ticket.Id,
                    orderId = order.Id,
                    orderNumber = order.OrderNumber,
                    ticket.TicketType,
                    ticket.Price,
                    ticket.PurchaseDate,
                    ticket.EventDate,
                    ticket.QrCode,
                    ticket.IsUsed,
                    Event = new {
                        seat.Event?.Title,
                        seat.Event?.Date,
                        seat.Event?.Image
                    },
                    Seat = new {
                        seat.Row,
                        seat.Number
                    }
                };
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!SeatExists(seat.Id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }
        }

        // POST: api/Seats/checkout — пакетная оплата (один запрос вместо N×reserve+N×purchase)
        [Authorize]
        [HttpPost("checkout")]
        public async Task<ActionResult<object>> Checkout(BatchCheckoutRequest request)
        {
            if (request?.Seats == null || request.Seats.Count == 0)
                return BadRequest("Не выбраны места");

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();
            var userId = int.Parse(userIdClaim.Value);

            var seatIds = request.Seats.Select(s => s.SeatId).Distinct().ToList();
            if (seatIds.Count != request.Seats.Count)
                return BadRequest("Дублирующиеся места в заказе");

            var seats = await _context.Seats
                .Include(s => s.Event)
                .Where(s => s.EventId == request.EventId && seatIds.Contains(s.Id))
                .ToListAsync();

            if (seats.Count != seatIds.Count)
                return NotFound("Часть мест не найдена");

            var userReservations = await _context.Seats
                .Where(s => s.ReservedByUserId == userId && s.EventId == request.EventId)
                .ToListAsync();

            var now = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
            foreach (var reservation in userReservations)
            {
                if (reservation.ReservationExpiresAt < now)
                {
                    reservation.Status = "available";
                    reservation.ReservedByUserId = null;
                    reservation.ReservationExpiresAt = null;
                }
            }

            var ticketTypeBySeat = request.Seats.ToDictionary(s => s.SeatId, s => s.TicketType ?? "");
            var reserveUntil = DateTime.SpecifyKind(now.AddMinutes(10), DateTimeKind.Utc);

            foreach (var seat in seats)
            {
                if (seat.Status == "available")
                {
                    seat.Status = "reserved";
                    seat.ReservedByUserId = userId;
                    seat.ReservationExpiresAt = reserveUntil;
                    continue;
                }

                if (seat.Status == "reserved" && seat.ReservedByUserId == userId)
                    continue;

                return BadRequest($"Место {SeatLabelHelper.Format(seat)} уже занято");
            }

            var purchaseDate = now;
            var evt = seats[0].Event;
            var eventDate = EventDateTimeHelper.EventDateOnly(evt?.Date ?? purchaseDate);
            var orderNumber = $"VB-{now:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
            var tickets = new List<UserTicket>();
            decimal total = 0;
            var labels = new List<string>();

            foreach (var seat in seats)
            {
                var qrCode = GenerateQrCode(userId, seat.EventId, seat.Id);
                var ticket = new UserTicket
                {
                    UserId = userId,
                    EventId = seat.EventId,
                    SeatId = seat.Id,
                    TicketType = ticketTypeBySeat.GetValueOrDefault(seat.Id, ""),
                    Price = seat.Price,
                    PurchaseDate = purchaseDate,
                    EventDate = eventDate,
                    QrCode = qrCode,
                    QrRotationStartedAt = purchaseDate,
                    IsUsed = false,
                };
                tickets.Add(ticket);
                total += seat.Price;
                labels.Add(SeatLabelHelper.Format(seat));

                seat.Status = "sold";
                seat.ReservedByUserId = null;
                seat.ReservationExpiresAt = null;
            }

            _context.UserTickets.AddRange(tickets);

            var seatLabelSummary = labels.Count <= 3
                ? string.Join(", ", labels)
                : $"{labels[0]}, {labels[1]} и ещё {labels.Count - 2}";

            var order = new Order
            {
                UserId = userId,
                OrderNumber = orderNumber,
                TotalAmount = total,
                Status = "paid",
                CreatedAt = purchaseDate,
                CompletedAt = purchaseDate,
                EventId = request.EventId,
                EventTitle = evt?.Title,
                SeatLabel = seatLabelSummary,
            };
            _context.Orders.Add(order);

            try
            {
                await _context.SaveChangesAsync();

                var commissionPercent = PlatformCommission.ResolvePercent(_configuration);
                var (platformFee, organizerPayout) = PlatformCommission.Split(total, commissionPercent);
                var payment = new Payment
                {
                    OrderId = order.Id,
                    UserId = userId,
                    Amount = total,
                    GrossAmount = total,
                    EventId = request.EventId,
                    OrganizerId = evt?.OrganizerId,
                    PlatformFee = platformFee,
                    OrganizerPayout = organizerPayout,
                    CommissionPercent = commissionPercent,
                    PaymentMethod = "card",
                    Status = "completed",
                    TransactionId = $"TXN-{Guid.NewGuid():N}",
                    PaymentDetails = JsonSerializer.Serialize(new
                    {
                        eventId = request.EventId,
                        seatCount = seats.Count,
                        commissionPercent,
                        platformFee,
                        organizerPayout,
                    }),
                    CreatedAt = purchaseDate,
                    CompletedAt = purchaseDate,
                };
                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();

                await TrySendCheckoutEmailAsync(userId, evt?.Title ?? "концерт", order, tickets.Count);

                await NotificationHelper.CreateAsync(
                    _context,
                    userId,
                    tickets.Count == 1 ? "Билет куплен" : $"Куплено билетов: {tickets.Count}",
                    tickets.Count == 1
                        ? $"{labels[0]} на «{evt?.Title}» успешно оплачено. QR-код в профиле обновляется каждые {RotatingQrService.WindowMinutes} мин."
                        : $"{tickets.Count} мест на «{evt?.Title}» оплачены. QR-коды в профиле обновляются каждые {RotatingQrService.WindowMinutes} мин.",
                    "success",
                    request.EventId,
                    tickets[0].Id);

                return Ok(new
                {
                    orderId = order.Id,
                    orderNumber = order.OrderNumber,
                    ticketCount = tickets.Count,
                    total,
                });
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict("Не удалось завершить оплату — места могли быть заняты. Обновите схему зала.");
            }
        }

        // GET: api/Seats/my-tickets
        [Authorize]
        [HttpGet("my-tickets")]
        public async Task<ActionResult<IEnumerable<object>>> GetMyTickets()
        {
            try
            {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                _logger.LogWarning("UserId claim not found in token!");
                return Unauthorized();
            }
            var userId = int.Parse(userIdClaim.Value);

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                _logger.LogWarning($"User with id {userId} not found in DB!");
                return Unauthorized();
            }

            var siteUrl = _configuration["SiteUrl"]?.Trim().TrimEnd('/') ?? "http://localhost:5173";
            var qrSecret = _configuration["Jwt:Key"] ?? "vibe_qr_secret";
            var utcNow = DateTime.UtcNow;

            var tickets = await _context.UserTickets
                .Include(t => t.Event)
                .Include(t => t.Seat)
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.EventDate)
                .ToListAsync();

            await DatabaseSchemaHelper.EnsureTicketRefundRequestsTableAsync(_context);
            await DatabaseSchemaHelper.EnsureTicketTransferSchemaAsync(_context);
            var transferService = HttpContext.RequestServices.GetRequiredService<TicketTransferService>();
            await transferService.ExpireStaleAsync(utcNow);

            var ticketIds = tickets.Select(t => t.Id).ToList();
            var pendingRefunds = await _context.TicketRefundRequests
                .Where(r => ticketIds.Contains(r.UserTicketId) && r.Status == "pending")
                .ToDictionaryAsync(r => r.UserTicketId, r => r.Status);

            var pendingTransfers = await _context.TicketTransfers
                .Where(t => ticketIds.Contains(t.UserTicketId) && t.Status == "pending" && t.ExpiresAt > utcNow)
                .ToDictionaryAsync(t => t.UserTicketId, t => t);

            var completedSent = await _context.TicketTransfers
                .Include(t => t.UserTicket).ThenInclude(ut => ut!.Event)
                .Include(t => t.UserTicket).ThenInclude(ut => ut!.Seat)
                .Where(t => t.SenderUserId == userId && t.Status == "completed")
                .OrderByDescending(t => t.CompletedAt)
                .ToListAsync();

            foreach (var t in tickets)
            {
                if (!t.QrRotationStartedAt.HasValue && t.PurchaseDate != default)
                    t.QrRotationStartedAt = t.PurchaseDate;
            }

            // Явно подгружаем Event и Seat, если вдруг не подгрузились
            foreach (var ticket in tickets)
            {
                if (ticket.Event == null)
                    ticket.Event = await _context.Events.FindAsync(ticket.EventId);
                if (ticket.Seat == null)
                    ticket.Seat = await _context.Seats.FindAsync(ticket.SeatId);
            }

            // Возвращаем только нужные поля (DTO)
            var ownedDtos = tickets.Select(ticket => {
                var cancelled = ticket.Event != null && ticket.Event.Status == EventStatus.Cancelled;
                var past = cancelled || ticket.IsRefunded
                    || (ticket.Event != null && EventCatalog.IsEventPast(ticket.Event, utcNow));
                var transferPending = pendingTransfers.ContainsKey(ticket.Id);
                if (transferPending) past = false;

                string? qrValue = null;
                int? expiresIn = null;
                if (!past && !ticket.IsRefunded && !transferPending)
                {
                    var rotationStart = RotatingQrService.RotationStart(ticket, utcNow);
                    qrValue = RotatingQrService.BuildQrValue(ticket, user, siteUrl, qrSecret, utcNow);
                    expiresIn = RotatingQrService.SecondsUntilNextWindow(rotationStart, utcNow);
                }
                pendingTransfers.TryGetValue(ticket.Id, out var activeTransfer);
                return new {
                ticket.Id,
                ticket.TicketType,
                ticket.Price,
                ticket.PurchaseDate,
                ticket.EventDate,
                QrCode = qrValue,
                qrExpiresInSec = expiresIn,
                qrWindowMinutes = RotatingQrService.WindowMinutes,
                isPast = past,
                isCancelled = cancelled,
                ticket.IsRefunded,
                ticket.IsUsed,
                isTransferredOut = false,
                transferPending,
                transferExpiresInSec = activeTransfer != null
                    ? Math.Max(0, (int)Math.Ceiling((activeTransfer.ExpiresAt - utcNow).TotalSeconds))
                    : (int?)null,
                transferRecipientEmail = activeTransfer?.RecipientEmail,
                refundRequestStatus = pendingRefunds.GetValueOrDefault(ticket.Id),
                allowTicketTransfer = ticket.Event?.AllowTicketTransfer == true,
                hoursUntilEvent = ticket.Event != null ? EventDateTimeHelper.HoursUntil(ticket.Event, utcNow) : null,
                eventStatus = ticket.Event?.Status,
                Event = ticket.Event == null ? null : new {
                    ticket.Event.Id,
                    ticket.Event.Title,
                    ticket.Event.Image,
                    ticket.Event.Date,
                    ticket.Event.Time,
                    ticket.Event.Location,
                    ticket.Event.Address,
                    ticket.Event.Price,
                    ticket.Event.Category,
                    ticket.Event.Description,
                    ticket.Event.EventType,
                    ticket.Event.Lineup,
                    ticket.Event.IsFeatured,
                    ticket.Event.Status,
                    ticket.Event.AllowTicketTransfer,
                },
                Seat = ticket.Seat == null ? null : new {
                    ticket.Seat.Row,
                    ticket.Seat.Number
                }
            }; }).ToList();

            var sentDtos = completedSent.Select(tr => {
                var ticket = tr.UserTicket!;
                var evt = ticket.Event;
                return new {
                    ticket.Id,
                    ticket.TicketType,
                    ticket.Price,
                    ticket.PurchaseDate,
                    ticket.EventDate,
                    QrCode = (string?)null,
                    qrExpiresInSec = (int?)null,
                    qrWindowMinutes = RotatingQrService.WindowMinutes,
                    isPast = true,
                    isCancelled = false,
                    ticket.IsRefunded,
                    ticket.IsUsed,
                    isTransferredOut = true,
                    transferPending = false,
                    transferExpiresInSec = (int?)null,
                    transferRecipientEmail = tr.RecipientEmail,
                    transferredAt = tr.CompletedAt,
                    refundRequestStatus = (string?)null,
                    allowTicketTransfer = false,
                    hoursUntilEvent = (double?)null,
                    eventStatus = evt?.Status,
                    Event = evt == null ? null : new {
                        evt.Id,
                        evt.Title,
                        evt.Image,
                        evt.Date,
                        evt.Time,
                        evt.Location,
                        evt.Address,
                        evt.Price,
                        evt.Category,
                        evt.Description,
                        evt.EventType,
                        evt.Lineup,
                        evt.IsFeatured,
                        evt.Status,
                        evt.AllowTicketTransfer,
                    },
                    Seat = ticket.Seat == null ? null : new {
                        ticket.Seat.Row,
                        ticket.Seat.Number
                    }
                };
            }).ToList();

            return ownedDtos.Cast<object>().Concat(sentDtos.Cast<object>()).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetMyTickets failed");
                return StatusCode(500, new { message = "Не удалось загрузить билеты. Проверьте миграцию БД (ADD_AVATAR_QR_FAQ.sql)." });
            }
        }

        [Authorize]
        [HttpPost("tickets/{ticketId}/refund-request")]
        public async Task<IActionResult> RequestTicketRefund(int ticketId, [FromBody] TicketRefundBody? body)
        {
            if (!_captcha.ConsumeToken(body?.CaptchaToken))
                return BadRequest(new { message = "Пройдите проверку «Я не робот»" });

            await DatabaseSchemaHelper.EnsureTicketRefundRequestsTableAsync(_context);

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();
            var userId = int.Parse(userIdClaim.Value);

            var ticket = await _context.UserTickets
                .Include(t => t.Event)
                .Include(t => t.Seat)
                .FirstOrDefaultAsync(t => t.Id == ticketId && t.UserId == userId);
            if (ticket == null) return NotFound(new { message = "Билет не найден" });
            if (ticket.IsRefunded) return BadRequest(new { message = "Билет уже возвращён" });
            if (ticket.IsUsed) return BadRequest(new { message = "Билет уже использован" });
            if (ticket.Event != null && ticket.Event.Status == EventStatus.Cancelled)
                return BadRequest(new { message = "Концерт отменён — возврат оформляется автоматически" });
            if (ticket.Event != null && EventCatalog.IsEventPast(ticket.Event, DateTime.UtcNow))
                return BadRequest(new { message = "Мероприятие уже прошло" });

            var hours = ticket.Event != null ? EventDateTimeHelper.HoursUntil(ticket.Event, DateTime.UtcNow) : null;
            if (hours.HasValue && hours.Value <= 24)
                return BadRequest(new { message = "Возврат недоступен менее чем за 24 часа до начала" });

            var existing = await _context.TicketRefundRequests
                .AnyAsync(r => r.UserTicketId == ticketId && r.Status == "pending");
            if (existing) return BadRequest(new { message = "Заявка уже на рассмотрении" });

            var req = new TicketRefundRequest
            {
                UserTicketId = ticketId,
                UserId = userId,
                EventId = ticket.EventId,
                Reason = body?.Reason?.Trim(),
                Status = "pending",
                CreatedAt = DateTime.UtcNow,
            };
            _context.TicketRefundRequests.Add(req);

            var user = await _context.Users.FindAsync(userId);
            var title = ticket.Event?.Title ?? "мероприятие";
            var urgency = hours.HasValue && hours.Value <= 72 ? " (срочно)" : "";
            await NotificationHelper.NotifyAdminsAsync(
                _context,
                "Заявка на возврат билета",
                $"{user?.Name ?? "Пользователь"}: «{title}» — {ticket.TicketType}{urgency}",
                hours.HasValue && hours.Value <= 48 ? "warning" : "info");

            await _context.SaveChangesAsync();
            return Ok(new { message = "Заявка отправлена. Мы ответим в ближайшее время.", requestId = req.Id });
        }

        // GET: api/Seats/verify?p=...&s=...
        [AllowAnonymous]
        [HttpGet("verify")]
        public async Task<IActionResult> VerifyQr([FromQuery] string p, [FromQuery] string s)
        {
            if (string.IsNullOrWhiteSpace(p) || string.IsNullOrWhiteSpace(s))
                return BadRequest(new { valid = false, message = "Неверная ссылка QR" });

            var parts = p.Split('|');
            if (parts.Length != 4 || !parts[0].StartsWith('T') || !int.TryParse(parts[0][1..], out var ticketId))
                return BadRequest(new { valid = false, message = "Неверный формат билета" });

            var ticket = await _context.UserTickets
                .Include(t => t.Event)
                .Include(t => t.Seat)
                .FirstOrDefaultAsync(t => t.Id == ticketId);
            if (ticket == null)
                return NotFound(new { valid = false, message = "Билет не найден" });

            var user = await _context.Users.FindAsync(ticket.UserId);
            if (user == null)
                return NotFound(new { valid = false, message = "Владелец билета не найден" });

            if (ticket.IsUsed)
                return Ok(new
                {
                    valid = false,
                    status = "used",
                    message = "Билет уже использован на входе",
                    ticketId,
                    eventTitle = ticket.Event?.Title,
                });

            var utcNow = DateTime.UtcNow;
            var secret = _configuration["Jwt:Key"] ?? "vibe_qr_secret";
            var v = RotatingQrService.Validate(p, s, secret, utcNow, user, ticket);
            var eventPassed = ticket.Event != null && EventCatalog.IsEventPast(ticket.Event, utcNow);

            string status;
            string message;
            bool valid;

            if (!v.SignatureValid)
            {
                status = "invalid";
                valid = false;
                message = "Подпись QR не совпадает — возможна подделка или повреждённый код.";
            }
            else if (eventPassed)
            {
                status = "event_passed";
                valid = false;
                message = "Мероприятие уже прошло. Динамический QR больше не принимается.";
            }
            else if (!v.WindowValid)
            {
                status = "expired_window";
                valid = false;
                message = $"QR из окна №{v.ScannedWindow + 1} — код уже обновился (сейчас окно №{v.CurrentWindow + 1}). Так +Vibe блокирует перепродажу.";
            }
            else
            {
                status = "valid";
                valid = true;
                message = "Билет действителен. Это актуальное 10-минутное окно +Vibe.";
            }

            return Ok(new
            {
                valid,
                status,
                message,
                ticketId = ticket.Id,
                eventId = ticket.EventId,
                eventTitle = ticket.Event?.Title,
                eventDate = ticket.EventDate,
                seat = ticket.Seat == null ? null : $"{ticket.Seat.Row}{ticket.Seat.Number}",
                verifiedAt = utcNow,
                dynamicQr = true,
                windowMinutes = RotatingQrService.WindowMinutes,
                scannedWindow = v.ScannedWindow >= 0 ? v.ScannedWindow + 1 : (int?)null,
                currentWindow = v.CurrentWindow + 1,
                secondsUntilNextWindow = v.SecondsUntilNextWindow,
                windowProgressPercent = v.WindowProgressPercent,
                signatureValid = v.SignatureValid,
            });
        }

        private async Task<List<Seat>> InitializeHallLayout(int eventId)
        {
            var event_ = await _context.Events.Include(e => e.TicketTypes).FirstOrDefaultAsync(e => e.Id == eventId);
            if (event_ == null) return new List<Seat>();

            if (event_.HallLayoutId.HasValue)
            {
                var layoutSeats = await _context.HallLayoutSeats
                    .Where(s => s.HallLayoutId == event_.HallLayoutId.Value)
                    .ToListAsync();
                if (layoutSeats.Count > 0)
                {
                    var mapped = layoutSeats
                        .Select(ls => LayoutSeatMapper.ToEventSeat(ls, eventId, event_.HallThemeJson))
                        .ToList();
                    _context.Seats.AddRange(mapped);
                    await _context.SaveChangesAsync();
                    return mapped;
                }
            }

            var seats = DefaultHallSeatGenerator.Build(eventId, event_.TicketTypes);
            _context.Seats.AddRange(seats);
            await _context.SaveChangesAsync();
            return seats;
        }

        private bool SeatExists(int id)
        {
            return _context.Seats.Any(e => e.Id == id);
        }

        private string GenerateQrCode(int userId, int eventId, int seatId)
        {
            return $"{userId}-{eventId}-{seatId}-{Guid.NewGuid()}";
        }

        private async Task TrySendCheckoutEmailAsync(int userId, string eventTitle, Order order, int ticketCount)
        {
            try
            {
                var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
                if (user == null || string.IsNullOrWhiteSpace(user.Email))
                {
                    _logger.LogWarning("[TICKET-EMAIL] User {UserId} not found or has no email", userId);
                    return;
                }

                if (!user.NotifyOrderEmail)
                {
                    _logger.LogInformation("[TICKET-EMAIL] User {UserId} disabled order emails", userId);
                    return;
                }

                var profileUrl = $"{(_configuration["SiteUrl"]?.Trim().TrimEnd('/') ?? "http://localhost:5173")}/profile";

                var sent = await _emailService.SendTicketPurchaseEmailAsync(
                    user.Email,
                    user.Name,
                    eventTitle,
                    order.OrderNumber,
                    profileUrl,
                    RotatingQrService.WindowMinutes,
                    ticketCount);

                if (!sent)
                    _logger.LogWarning("[TICKET-EMAIL] SMTP did not send ticket to {Email}", user.Email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[TICKET-EMAIL] Failed to send ticket notice for order {Order}", order.OrderNumber);
            }
        }

        private async Task TrySendTicketEmailAsync(int userId, UserTicket ticket, Order order, Seat seat)
        {
            try
            {
                var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
                if (user == null || string.IsNullOrWhiteSpace(user.Email))
                {
                    _logger.LogWarning("[TICKET-EMAIL] User {UserId} not found or has no email", userId);
                    return;
                }

                if (!user.NotifyOrderEmail)
                {
                    _logger.LogInformation("[TICKET-EMAIL] User {UserId} disabled order emails", userId);
                    return;
                }

                var ev = seat.Event;
                var profileUrl = $"{(_configuration["SiteUrl"]?.Trim().TrimEnd('/') ?? "http://localhost:5173")}/profile";

                var sent = await _emailService.SendTicketPurchaseEmailAsync(
                    user.Email,
                    user.Name,
                    ev?.Title ?? "концерт",
                    order.OrderNumber,
                    profileUrl,
                    RotatingQrService.WindowMinutes);

                if (!sent)
                    _logger.LogWarning("[TICKET-EMAIL] SMTP did not send ticket to {Email}", user.Email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[TICKET-EMAIL] Failed to send ticket notice for order {Order}", order.OrderNumber);
            }
        }
    }

    public class SeatReservationRequest
    {
        public int EventId { get; set; }
        public int SeatId { get; set; }
    }

    public class SeatPurchaseRequest
    {
        public int EventId { get; set; }
        public int SeatId { get; set; }
        public string TicketType { get; set; } = string.Empty;
    }

    public class BatchCheckoutRequest
    {
        public int EventId { get; set; }
        public List<BatchCheckoutSeat> Seats { get; set; } = new();
    }

    public class BatchCheckoutSeat
    {
        public int SeatId { get; set; }
        public string TicketType { get; set; } = string.Empty;
    }

    public class TicketRefundBody
    {
        public string? Reason { get; set; }
        public string? CaptchaToken { get; set; }
    }
}