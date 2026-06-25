using System.Net.Http.Headers;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;
using MyMvcBackend.Services;

namespace MyMvcBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Organizer,Admin")]
    public class OrganizerController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly IConfiguration _configuration;
        private readonly ImageOptimizationService _images;
        private readonly OtpService _otp;
        private readonly CaptchaService _captcha;
        private readonly GeniusProfileService _genius;
        private readonly LineupAvatarRefreshService _lineupAvatars;

        public OrganizerController(
            ApplicationDbContext context,
            IWebHostEnvironment env,
            IConfiguration configuration,
            ImageOptimizationService images,
            OtpService otp,
            CaptchaService captcha,
            GeniusProfileService genius,
            LineupAvatarRefreshService lineupAvatars)
        {
            _context = context;
            _env = env;
            _configuration = configuration;
            _images = images;
            _otp = otp;
            _captcha = captcha;
            _genius = genius;
            _lineupAvatars = lineupAvatars;
        }

        private int CurrentUserId() =>
            int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

        private bool IsAdminUser() => User.IsInRole("Admin");

        private static bool CanEditEvent(Event evt, int userId, bool isAdmin)
        {
            if (isAdmin) return true;
            if (evt.OrganizerId != userId) return false;
            return !string.Equals(evt.AdminOrganizerAccess, "viewonly", StringComparison.OrdinalIgnoreCase);
        }

        private static bool CanViewEvent(Event evt, int userId, bool isAdmin) =>
            isAdmin || evt.OrganizerId == userId;

        private async Task<IActionResult> SaveOptimizedUploadAsync(IFormFile? file, string subfolder, int maxWidth, int maxHeight)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Выберите файл изображения" });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            string[] allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
            if (!allowed.Contains(ext))
                return BadRequest(new { message = "Допустимы JPG, PNG, GIF или WEBP" });

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var optimized = await _images.SaveOptimizedAsync(file, webRoot, subfolder, maxWidth, maxHeight);
            var relative = optimized.RelativePath;
            var absolute = $"{Request.Scheme}://{Request.Host.Value}{relative}";
            return Ok(new { url = absolute, path = relative });
        }

        [HttpPost("events/upload-cover")]
        [RequestSizeLimit(8 * 1024 * 1024)]
        public Task<IActionResult> UploadCover(IFormFile? file) =>
            SaveOptimizedUploadAsync(file, "events", 1920, 1080);

        [HttpPost("events/upload-lineup-avatar")]
        [RequestSizeLimit(4 * 1024 * 1024)]
        public Task<IActionResult> UploadLineupAvatar(IFormFile? file) =>
            SaveOptimizedUploadAsync(file, "lineup", 640, 640);

        [HttpGet("events")]
        public async Task<ActionResult<IEnumerable<Event>>> GetMyEvents()
        {
            var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            var events = await _context.Events
                .Where(e => e.OrganizerId == userId)
                .OrderByDescending(e => e.UpdatedAt)
                .ToListAsync();
            return Ok(events);
        }

        [HttpGet("events/{id}")]
        public async Task<ActionResult<Event>> GetEventById(int id)
        {
            var userId = CurrentUserId();
            var isAdmin = IsAdminUser();
            var evt = await _context.Events
                .Include(e => e.TicketTypes)
                .FirstOrDefaultAsync(e => e.Id == id);
            if (evt == null) return NotFound();
            if (!CanViewEvent(evt, userId, isAdmin)) return Forbid();
            await EventCatalog.EnrichSoldOutAsync(_context, new[] { evt });
            await _lineupAvatars.TryRefreshEventAsync(_context, evt);
            return Ok(evt);
        }

        [HttpPost("events")]
        public async Task<ActionResult<Event>> CreateDraft([FromBody] Event evt)
        {
            var userId = CurrentUserId();
            var isAdmin = IsAdminUser();
            var typesFromClient = ExtractTicketTypes(evt.TicketTypes);
            evt.Id = 0;
            evt.Seats = new List<Seat>();
            evt.TicketTypes = new List<TicketType>();
            if (isAdmin)
            {
                evt.CreatedByAdmin = true;
                evt.CreatedByAdminUserId = userId;
                evt.OrganizerId = evt.OrganizerId > 0 ? evt.OrganizerId : null;
            }
            else
            {
                evt.OrganizerId = userId;
                evt.CreatedByAdmin = false;
            }
            evt.Status = EventStatus.Draft;
            evt.CreatedAt = DateTime.UtcNow;
            evt.UpdatedAt = DateTime.UtcNow;
            evt.Image = EventImageResolver.NormalizeStoragePath(evt.Image) ?? evt.Image;
            _context.Events.Add(evt);
            await _context.SaveChangesAsync();
            await SyncTicketTypesAsync(evt.Id, typesFromClient);
            await EnsureSeatsSnapshot(evt);
            return Ok(await ToOrganizerEventDtoAsync(evt.Id));
        }

        [HttpPut("events/{id}")]
        public async Task<IActionResult> UpdateDraft(int id, [FromBody] Event updated)
        {
            var userId = CurrentUserId();
            var isAdmin = IsAdminUser();
            var evt = await _context.Events.FindAsync(id);
            if (evt == null) return NotFound();
            if (!CanEditEvent(evt, userId, isAdmin)) return Forbid();
            if (evt.Status == EventStatus.PendingReview)
                return BadRequest(new { message = "Событие уже отправлено на модерацию" });
            if (evt.Status == EventStatus.Cancelled)
                return BadRequest(new { message = "Мероприятие отменено — редактирование недоступно" });

            var isLive = evt.Status is EventStatus.Published or EventStatus.Approved or EventStatus.Passed;
            if (isLive)
            {
                var dateChanged = updated.Date != default && updated.Date.Date != evt.Date.Date;
                var timeChanged = !string.IsNullOrWhiteSpace(updated.Time)
                    && !string.Equals(updated.Time.Trim(), evt.Time.Trim(), StringComparison.Ordinal);
                if (dateChanged || timeChanged)
                    return BadRequest(new { message = "Для изменения даты или времени используйте «Запросить перенос»" });
            }

            evt.Title = updated.Title;
            evt.Image = EventImageResolver.NormalizeStoragePath(updated.Image) ?? updated.Image;
            if (!isLive)
            {
                evt.Date = updated.Date;
                evt.Time = updated.Time;
            }
            evt.Location = updated.Location;
            evt.Address = updated.Address;
            evt.Price = updated.Price;
            evt.Category = updated.Category;
            evt.Genre = updated.Genre;
            evt.Description = updated.Description;
            evt.EventType = updated.EventType;
            evt.Lineup = updated.Lineup;
            evt.VenueId = updated.VenueId;
            evt.HallId = updated.HallId;
            evt.HallLayoutId = updated.HallLayoutId;
            evt.HallThemeJson = updated.HallThemeJson;
            evt.AllowTicketTransfer = updated.AllowTicketTransfer;
            if (!isLive)
            {
                evt.Status = EventStatus.Draft;
                evt.ScheduledPublishAt = null;
                evt.PublishedAt = null;
                evt.SubmittedAt = null;
            }
            evt.UpdatedAt = DateTime.UtcNow;

            var typesFromClient = ExtractTicketTypes(updated.TicketTypes);
            await _context.SaveChangesAsync();
            await SyncTicketTypesAsync(evt.Id, typesFromClient);
            await EnsureSeatsSnapshot(evt);
            return Ok(await ToOrganizerEventDtoAsync(evt.Id));
        }

        [HttpPost("events/{id}/request-reschedule")]
        public async Task<IActionResult> RequestReschedule(int id, [FromBody] RescheduleRequestDto? body)
        {
            try
            {
                await DatabaseSchemaHelper.EnsureRescheduleTableAsync(_context);

                if (body == null)
                    return BadRequest(new { message = "Некорректное тело запроса" });

                var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
                var evt = await _context.Events.FindAsync(id);
                if (evt == null) return NotFound();
                if (evt.OrganizerId != userId) return Forbid();
                if (evt.Status is not (EventStatus.Published or EventStatus.Approved))
                    return BadRequest(new { message = "Перенос доступен только для опубликованных мероприятий" });
                if (string.IsNullOrWhiteSpace(body.Reason))
                    return BadRequest(new { message = "Укажите причину переноса" });
                if (body.ProposedDate == default)
                    return BadRequest(new { message = "Укажите новую дату" });
                if (string.IsNullOrWhiteSpace(body.ProposedTime))
                    return BadRequest(new { message = "Укажите новое время" });

                var hasPending = await _context.EventRescheduleRequests
                    .AnyAsync(r => r.EventId == id && r.Status == "pending");
                if (hasPending)
                    return BadRequest(new { message = "Запрос на перенос уже ожидает проверки администратора" });

                var proposedDate = EventDateTimeHelper.EventDateOnly(body.ProposedDate);
                var proposedTime = body.ProposedTime.Trim();
                if (proposedTime.Length >= 5) proposedTime = proposedTime[..5];

                var currentTime = (evt.Time ?? "").Trim();
                if (proposedDate.Date == evt.Date.Date && proposedTime == currentTime)
                    return BadRequest(new { message = "Новая дата и время совпадают с текущими" });

                var request = new EventRescheduleRequest
                {
                    EventId = id,
                    OrganizerId = userId,
                    OriginalDate = EventDateTimeHelper.EventDateOnly(evt.Date),
                    OriginalTime = currentTime,
                    ProposedDate = proposedDate,
                    ProposedTime = proposedTime,
                    Reason = body.Reason.Trim(),
                    Status = "pending",
                    CreatedAt = ToDbTimestamp(DateTime.UtcNow),
                };
                _context.EventRescheduleRequests.Add(request);
                await _context.SaveChangesAsync();

                try
                {
                    await NotificationHelper.NotifyAdminsAsync(
                        _context,
                        "Запрос переноса даты",
                        $"Организатор просит перенести «{evt.Title}» на {proposedDate:dd.MM.yyyy} {proposedTime}. Причина: {body.Reason.Trim()}",
                        "warning",
                        evt.Id);
                }
                catch
                {
                    /* запрос уже сохранён */
                }

                return Ok(new { message = "Запрос отправлен администратору на проверку", requestId = request.Id });
            }
            catch (Exception ex)
            {
                var inner = ex.InnerException?.Message;
                var detail = string.IsNullOrWhiteSpace(inner) ? ex.Message : $"{ex.Message} → {inner}";
                return StatusCode(500, new { message = detail, detail });
            }
        }

        [HttpGet("events/{id}/reschedule-request")]
        public async Task<ActionResult<object>> GetRescheduleRequest(int id)
        {
            var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            var isAdmin = User.IsInRole("Admin");
            var evt = await _context.Events.FindAsync(id);
            if (evt == null) return NotFound();
            if (!isAdmin && evt.OrganizerId != userId) return Forbid();

            var req = await _context.EventRescheduleRequests
                .Where(r => r.EventId == id)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.Status,
                    r.Reason,
                    r.OriginalDate,
                    r.OriginalTime,
                    r.ProposedDate,
                    r.ProposedTime,
                    r.CreatedAt,
                    r.ReviewedAt,
                    r.ReviewComment,
                })
                .FirstOrDefaultAsync();

            return Ok(req ?? (object)new { status = "none" });
        }

        [HttpPost("events/{id}/assign-organizer")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AssignOrganizer(int id, [FromBody] AssignOrganizerRequest body)
        {
            await DatabaseSchemaHelper.EnsureEventAdminColumnsAsync(_context);
            if (body.OrganizerId <= 0)
                return BadRequest(new { message = "Выберите организатора" });
            var access = (body.AccessMode ?? "editable").Trim().ToLowerInvariant();
            if (access is not ("editable" or "viewonly"))
                return BadRequest(new { message = "Некорректный режим доступа" });

            var organizer = await _context.Users.FirstOrDefaultAsync(u => u.Id == body.OrganizerId && u.IsOrganizer);
            if (organizer == null)
                return BadRequest(new { message = "Организатор не найден" });

            var evt = await _context.Events.FindAsync(id);
            if (evt == null) return NotFound();
            if (!evt.CreatedByAdmin)
                evt.CreatedByAdmin = true;

            evt.OrganizerId = body.OrganizerId;
            evt.AdminOrganizerAccess = access;
            evt.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            try
            {
                await NotificationHelper.CreateAsync(
                    _context,
                    organizer.Id,
                    access == "editable" ? "Новое мероприятие от администратора" : "Просмотр мероприятия от администратора",
                    access == "editable"
                        ? $"Администратор передал вам концерт «{evt.Title}» для редактирования и публикации."
                        : $"Администратор поделился ссылкой на концерт «{evt.Title}» — режим только просмотра.",
                    access == "editable" ? "info" : "default",
                    evt.Id);
            }
            catch { /* ignore */ }

            return Ok(new
            {
                message = access == "editable"
                    ? "Мероприятие передано организатору для редактирования"
                    : "Организатор назначен (только просмотр)",
                organizerId = organizer.Id,
                accessMode = access,
            });
        }

        [HttpPost("events/{id}/cancellation/request-code")]
        public async Task<IActionResult> RequestCancellationCode(int id, [FromBody] CancellationStartRequest body)
        {
            await DatabaseSchemaHelper.EnsureCancellationTableAsync(_context);
            if (!_captcha.ConsumeToken(body.CaptchaToken))
                return BadRequest(new { message = "Подтвердите, что вы не робот" });
            if (string.IsNullOrWhiteSpace(body.Reason))
                return BadRequest(new { message = "Укажите причину отмены" });

            var userId = CurrentUserId();
            var evt = await _context.Events.FindAsync(id);
            if (evt == null) return NotFound();
            if (evt.OrganizerId != userId) return Forbid();
            if (evt.Status is not (EventStatus.Published or EventStatus.Approved))
                return BadRequest(new { message = "Отмена доступна только для опубликованных мероприятий" });

            var hasPending = await _context.EventCancellationRequests
                .AnyAsync(r => r.EventId == id && r.Status == "pending");
            if (hasPending)
                return BadRequest(new { message = "Заявка на отмену уже ожидает решения администратора" });

            var organizer = await _context.Users.FindAsync(userId);
            if (organizer == null) return Unauthorized();

            var (ok, error, challengeId, expiresIn) = await _otp.StartEventCancelAsync(organizer, id, body.Reason.Trim());
            if (!ok) return BadRequest(new { message = error });
            return Ok(new { challengeId, expiresInSec = expiresIn });
        }

        [HttpPost("events/{id}/cancellation/resend")]
        public async Task<IActionResult> ResendCancellationCode(int id, [FromBody] CancellationResendRequest body)
        {
            if (body.ChallengeId <= 0) return BadRequest(new { message = "Некорректный запрос" });
            var userId = CurrentUserId();
            var evt = await _context.Events.FindAsync(id);
            if (evt == null) return NotFound();
            if (evt.OrganizerId != userId) return Forbid();

            var (ok, error, expiresIn) = await _otp.ResendAsync(body.ChallengeId);
            if (!ok) return BadRequest(new { message = error });
            return Ok(new { expiresInSec = expiresIn, message = "Новый код отправлен" });
        }

        [HttpPost("events/{id}/cancellation/submit")]
        public async Task<IActionResult> SubmitCancellation(int id, [FromBody] CancellationSubmitRequest body)
        {
            await DatabaseSchemaHelper.EnsureCancellationTableAsync(_context);
            if (body.ChallengeId <= 0 || string.IsNullOrWhiteSpace(body.Code))
                return BadRequest(new { message = "Введите код из письма" });

            var userId = CurrentUserId();
            var evt = await _context.Events.FindAsync(id);
            if (evt == null) return NotFound();
            if (evt.OrganizerId != userId) return Forbid();

            var (ok, error, payload) = await _otp.VerifyEventCancelAsync(body.ChallengeId, body.Code);
            if (!ok || payload == null) return BadRequest(new { message = error });
            if (payload.EventId != id || payload.OrganizerId != userId)
                return BadRequest(new { message = "Код не относится к этому мероприятию" });

            var hasPending = await _context.EventCancellationRequests
                .AnyAsync(r => r.EventId == id && r.Status == "pending");
            if (hasPending)
                return BadRequest(new { message = "Заявка уже отправлена" });

            var request = new EventCancellationRequest
            {
                EventId = id,
                OrganizerId = userId,
                Reason = payload.Reason,
                Status = "pending",
                CreatedAt = DateTime.UtcNow,
            };
            _context.EventCancellationRequests.Add(request);
            await _context.SaveChangesAsync();

            try
            {
                await NotificationHelper.NotifyAdminsAsync(
                    _context,
                    "Заявка на отмену концерта",
                    $"Организатор просит отменить «{evt.Title}». Причина: {payload.Reason}",
                    "warning",
                    evt.Id);
            }
            catch { /* ignore */ }

            return Ok(new { message = "Заявка отправлена администратору", requestId = request.Id });
        }

        [HttpGet("events/{id}/cancellation-request")]
        public async Task<ActionResult<object>> GetCancellationRequest(int id)
        {
            var userId = CurrentUserId();
            var isAdmin = IsAdminUser();
            var evt = await _context.Events.FindAsync(id);
            if (evt == null) return NotFound();
            if (!CanViewEvent(evt, userId, isAdmin)) return Forbid();

            await DatabaseSchemaHelper.EnsureCancellationTableAsync(_context);
            var req = await _context.EventCancellationRequests
                .Where(r => r.EventId == id)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.Status,
                    r.Reason,
                    r.CreatedAt,
                    r.ReviewedAt,
                    r.ReviewComment,
                })
                .FirstOrDefaultAsync();

            return Ok(req ?? (object)new { status = "none" });
        }

        [HttpGet("venues")]
        public async Task<ActionResult<IEnumerable<object>>> GetVenueDirectory()
        {
            var fromDb = await _context.Venues
                .OrderBy(v => v.Name)
                .Select(v => new { v.Name, Address = v.City + ", " + v.Address })
                .ToListAsync();
            return Ok(fromDb);
        }

        [HttpGet("hall-catalog")]
        public async Task<ActionResult<IEnumerable<object>>> GetHallCatalog()
        {
            var venues = await _context.Venues
                .Include(v => v.Halls)
                .ThenInclude(h => h.Layouts)
                .OrderBy(v => v.Name)
                .ToListAsync();

            foreach (var v in venues)
            {
                foreach (var h in v.Halls)
                {
                    h.Layouts = h.Layouts.Where(l => l.IsActive).ToList();
                }
            }

            var layoutIds = venues
                .SelectMany(v => v.Halls.SelectMany(h => h.Layouts.Select(l => l.Id)))
                .ToList();

            var seatCounts = await _context.HallLayoutSeats
                .Where(s => layoutIds.Contains(s.HallLayoutId))
                .GroupBy(s => s.HallLayoutId)
                .Select(g => new { LayoutId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.LayoutId, x => x.Count);

            var result = venues.Select(v => new
            {
                v.Id,
                v.Name,
                v.City,
                v.Address,
                halls = v.Halls.OrderBy(h => h.Name).Select(h => new
                {
                    h.Id,
                    h.Name,
                    h.Capacity,
                    layouts = h.Layouts.OrderBy(l => l.Name).Select(l => new
                    {
                        l.Id,
                        l.Name,
                        seatCount = seatCounts.GetValueOrDefault(l.Id, 0),
                    }),
                }),
            });

            return Ok(result);
        }

        [HttpGet("layouts/{layoutId}/seats")]
        public async Task<ActionResult<IEnumerable<object>>> GetLayoutSeatsPreview(int layoutId)
        {
            var seats = await _context.HallLayoutSeats
                .Where(s => s.HallLayoutId == layoutId)
                .OrderBy(s => s.Id)
                .ThenBy(s => s.Number)
                .Select(s => new
                {
                    s.Id,
                    s.Sector,
                    s.Row,
                    s.Number,
                    s.Type,
                    s.Price,
                    s.PriceTier,
                    posX = s.PosX,
                    posY = s.PosY,
                    s.IsGa,
                })
                .ToListAsync();

            if (!seats.Any()) return NotFound(new { message = "Схема не найдена" });
            return Ok(seats);
        }

        [HttpPut("events/{id}/hall-setup")]
        public async Task<IActionResult> UpdateHallSetup(int id, [FromBody] HallSetupRequest model)
        {
            var userId = CurrentUserId();
            var isAdmin = IsAdminUser();
            var evt = await _context.Events.FindAsync(id);
            if (evt == null) return NotFound();
            if (!CanEditEvent(evt, userId, isAdmin)) return Forbid();
            if (evt.Status == EventStatus.PendingReview)
                return BadRequest(new { message = "Схему нельзя менять во время модерации" });

            if (model.HallLayoutId.HasValue)
            {
                var layout = await _context.HallLayouts
                    .Include(l => l.Hall)
                    .FirstOrDefaultAsync(l => l.Id == model.HallLayoutId.Value);
                if (layout == null) return BadRequest(new { message = "Схема зала не найдена" });
                evt.HallLayoutId = layout.Id;
                evt.HallId = model.HallId ?? layout.HallId;
                evt.VenueId = model.VenueId ?? layout.Hall?.VenueId;
            }
            else
            {
                evt.VenueId = model.VenueId;
                evt.HallId = model.HallId;
                evt.HallLayoutId = null;
            }

            evt.HallThemeJson = model.HallThemeJson;
            evt.UpdatedAt = DateTime.UtcNow;

            var regen = await RegenerateEventSeatsAsync(evt);
            if (regen != null) return regen;

            await _context.SaveChangesAsync();
            return Ok(new
            {
                message = "Схема зала сохранена",
                evt.VenueId,
                evt.HallId,
                evt.HallLayoutId,
                hallThemeJson = evt.HallThemeJson,
            });
        }

        /// <summary>Удалить своё мероприятие. Блокируется только при активных продажах на предстоящее событие.</summary>
        [HttpDelete("events/{id}")]
        public async Task<IActionResult> DeleteMyEvent(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
                var evt = await _context.Events.FindAsync(id);
                if (evt == null) return NotFound();
                if (evt.OrganizerId != userId) return Forbid();

                var blocksOnPaid = evt.Status is EventStatus.Published
                    or EventStatus.Approved
                    or EventStatus.PendingReview;

                if (blocksOnPaid)
                {
                    var hasActivePaid = await _context.Orders.AnyAsync(o =>
                        o.EventId == id && o.Status == "paid");
                    if (hasActivePaid)
                    {
                        return BadRequest(new
                        {
                            message = "Нельзя удалить: есть активные оплаченные билеты. Сначала отмените мероприятие через администратора с возвратом.",
                        });
                    }
                }

                var userTickets = await _context.UserTickets.Where(t => t.EventId == id).ToListAsync();
                var userTicketIds = userTickets.Select(t => t.Id).ToList();

                await DatabaseSchemaHelper.EnsureTicketRefundRequestsTableAsync(_context);
                await DatabaseSchemaHelper.EnsureTicketTransferSchemaAsync(_context);
                await DatabaseSchemaHelper.EnsureCancellationTableAsync(_context);

                // В БД на relatedeventid/relatedticketid часто стоит ON DELETE NO ACTION — снимаем ссылки явно.
                var relatedNotifications = await _context.Notifications
                    .Where(n => n.RelatedEventId == id
                        || (n.RelatedTicketId != null && userTicketIds.Contains(n.RelatedTicketId.Value)))
                    .ToListAsync();
                foreach (var notification in relatedNotifications)
                {
                    if (notification.RelatedEventId == id)
                        notification.RelatedEventId = null;
                    if (notification.RelatedTicketId != null && userTicketIds.Contains(notification.RelatedTicketId.Value))
                        notification.RelatedTicketId = null;
                }
                if (relatedNotifications.Count > 0)
                    await _context.SaveChangesAsync();

                if (userTicketIds.Count > 0)
                {
                    var transfers = await _context.TicketTransfers
                        .Where(t => userTicketIds.Contains(t.UserTicketId))
                        .ToListAsync();
                    _context.TicketTransfers.RemoveRange(transfers);
                }

                var refundReqs = await _context.TicketRefundRequests
                    .Where(r => r.EventId == id)
                    .ToListAsync();
                _context.TicketRefundRequests.RemoveRange(refundReqs);

                var cancelReqs = await _context.EventCancellationRequests
                    .Where(r => r.EventId == id)
                    .ToListAsync();
                _context.EventCancellationRequests.RemoveRange(cancelReqs);

                _context.UserTickets.RemoveRange(userTickets);

                var orderIds = await _context.Orders
                    .Where(o => o.EventId == id)
                    .Select(o => o.Id)
                    .ToListAsync();

                if (orderIds.Count > 0)
                {
                    var payments = await _context.Payments
                        .Where(p => orderIds.Contains(p.OrderId) || p.EventId == id)
                        .ToListAsync();
                    _context.Payments.RemoveRange(payments);

                    var orders = await _context.Orders.Where(o => orderIds.Contains(o.Id)).ToListAsync();
                    _context.Orders.RemoveRange(orders);
                }
                else
                {
                    var orphanPayments = await _context.Payments.Where(p => p.EventId == id).ToListAsync();
                    _context.Payments.RemoveRange(orphanPayments);
                }

                var reviews = await _context.Reviews.Where(r => r.EventId == id).ToListAsync();
                _context.Reviews.RemoveRange(reviews);

                try
                {
                    await DatabaseSchemaHelper.EnsureRescheduleTableAsync(_context);
                    var reschedules = await _context.EventRescheduleRequests
                        .Where(r => r.EventId == id)
                        .ToListAsync();
                    _context.EventRescheduleRequests.RemoveRange(reschedules);
                }
                catch { /* таблица может отсутствовать */ }

                var seats = await _context.Seats.Where(s => s.EventId == id).ToListAsync();
                _context.Seats.RemoveRange(seats);

                var ticketTypes = await _context.TicketTypes.Where(t => t.EventId == id).ToListAsync();
                _context.TicketTypes.RemoveRange(ticketTypes);

                _context.Events.Remove(evt);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Событие удалено" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Не удалось удалить мероприятие. Попробуйте ещё раз или обратитесь к администратору.",
                    detail = ex.InnerException?.Message ?? ex.Message,
                });
            }
        }

        [HttpPost("events/{id}/submit")]
        public async Task<IActionResult> SubmitForModeration(int id)
        {
            var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            var evt = await _context.Events.FindAsync(id);
            if (evt == null) return NotFound();
            if (evt.OrganizerId != userId) return Forbid();

            var conflict = await FindVenueScheduleConflictAsync(evt);
            if (conflict != null)
            {
                return BadRequest(new
                {
                    message = $"На эту дату, время и площадку уже запланировано мероприятие «{conflict.Title}». Измените дату, время или место проведения и отправьте снова.",
                    conflictEventId = conflict.Id,
                    conflictTitle = conflict.Title,
                });
            }

            evt.Status = EventStatus.PendingReview;
            evt.SubmittedAt = DateTime.UtcNow;
            evt.ReviewComment = null;
            evt.ScheduledPublishAt = null;
            evt.PublishedAt = null;
            evt.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await NotificationHelper.NotifyAdminsAsync(
                _context,
                "Новая заявка на модерацию",
                $"Организатор отправил событие «{evt.Title}» на проверку.",
                "info",
                evt.Id);

            return Ok(new { message = "Событие отправлено на модерацию", status = evt.Status.ToString() });
        }

        [HttpPost("events/{id}/schedule-publish")]
        public async Task<IActionResult> SchedulePublish(int id, [FromBody] SchedulePublishRequest model)
        {
            var userId = CurrentUserId();
            var isAdmin = IsAdminUser();
            var evt = await _context.Events.FindAsync(id);
            if (evt == null) return NotFound();
            if (!CanEditEvent(evt, userId, isAdmin)) return Forbid();

            if (isAdmin)
            {
                if (evt.Status is EventStatus.Cancelled or EventStatus.PendingReview)
                    return BadRequest(new { message = "Нельзя опубликовать отменённое или событие на модерации" });
                if (evt.Status is EventStatus.Draft or EventStatus.Rejected)
                {
                    evt.Status = EventStatus.Approved;
                    evt.ReviewComment = null;
                }
            }
            else
            {
                if (evt.Status != EventStatus.Approved)
                    return BadRequest(new { message = "Опубликовать можно только одобренное событие" });
            }

            var publishAt = DateTime.SpecifyKind(model.ScheduledPublishAt, DateTimeKind.Utc);
            var unpublishAt = DateTime.SpecifyKind(model.ScheduledUnpublishAt, DateTimeKind.Utc);
            if (unpublishAt <= publishAt)
                return BadRequest(new { message = "Дата снятия с витрины должна быть позже даты публикации" });

            var now = DateTime.UtcNow;
            evt.ScheduledPublishAt = publishAt;
            evt.ScheduledUnpublishAt = unpublishAt;
            evt.UpdatedAt = now;

            if (publishAt <= now && unpublishAt > now)
            {
                evt.Status = EventStatus.Published;
                evt.PublishedAt = now;
            }
            else if (publishAt > now)
            {
                evt.Status = EventStatus.Approved;
                evt.PublishedAt = null;
            }

            await _context.SaveChangesAsync();
            return Ok(new
            {
                message = publishAt <= now
                    ? "Событие опубликовано в каталоге"
                    : $"Событие появится в каталоге {publishAt:dd.MM.yyyy HH:mm} UTC",
                evt.Status,
                evt.ScheduledPublishAt,
                evt.ScheduledUnpublishAt,
                evt.PublishedAt,
            });
        }

        [HttpGet("earnings")]
        public async Task<ActionResult<object>> GetEarnings()
        {
            var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            var percent = PlatformCommission.ResolvePercent(_configuration);

            var payments = await _context.Payments
                .Where(p => p.Status == "completed" && p.OrganizerId == userId)
                .ToListAsync();

            var legacy = await (
                from p in _context.Payments
                join o in _context.Orders on p.OrderId equals o.Id
                join e in _context.Events on o.EventId equals e.Id
                where p.Status == "completed"
                      && e.OrganizerId == userId
                      && p.OrganizerId == null
                select new { Payment = p, EventId = e.Id, EventTitle = e.Title }
            ).ToListAsync();

            decimal gross = 0, fees = 0, payout = 0;
            var byEvent = new Dictionary<int, (string title, decimal gross, decimal payout, int sales)>();

            foreach (var p in payments)
            {
                var g = p.GrossAmount ?? p.Amount;
                var fee = p.PlatformFee ?? PlatformCommission.Split(g, p.CommissionPercent ?? percent).platformFee;
                var net = p.OrganizerPayout ?? (g - fee);
                gross += g;
                fees += fee;
                payout += net;
                if (p.EventId.HasValue)
                {
                    var id = p.EventId.Value;
                    if (!byEvent.ContainsKey(id))
                        byEvent[id] = ("", 0, 0, 0);
                    var cur = byEvent[id];
                    byEvent[id] = (cur.title, cur.gross + g, cur.payout + net, cur.sales + 1);
                }
            }

            foreach (var row in legacy)
            {
                var g = row.Payment.Amount;
                var (fee, net) = PlatformCommission.Split(g, percent);
                gross += g;
                fees += fee;
                payout += net;
                if (!byEvent.ContainsKey(row.EventId))
                    byEvent[row.EventId] = (row.EventTitle ?? "Событие", 0, 0, 0);
                var cur = byEvent[row.EventId];
                byEvent[row.EventId] = (row.EventTitle ?? cur.title, cur.gross + g, cur.payout + net, cur.sales + 1);
            }

            var eventTitles = await _context.Events
                .Where(e => byEvent.Keys.Contains(e.Id))
                .Select(e => new { e.Id, e.Title })
                .ToListAsync();

            var eventIds = byEvent.Keys.ToList();

            var ticketCountsByEvent = eventIds.Count == 0
                ? new Dictionary<int, int>()
                : await _context.UserTickets
                    .Where(t => !t.IsRefunded && eventIds.Contains(t.EventId))
                    .GroupBy(t => t.EventId)
                    .Select(g => new { EventId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.EventId, x => x.Count);

            var soldSeatCountsByEvent = eventIds.Count == 0
                ? new Dictionary<int, int>()
                : await _context.Seats
                    .Where(s => s.Status == "sold" && eventIds.Contains(s.EventId))
                    .GroupBy(s => s.EventId)
                    .Select(g => new { EventId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.EventId, x => x.Count);

            var unavailableSeatCountsByEvent = eventIds.Count == 0
                ? new Dictionary<int, int>()
                : await _context.Seats
                    .Where(s => eventIds.Contains(s.EventId) && s.Status != "available")
                    .GroupBy(s => s.EventId)
                    .Select(g => new { EventId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.EventId, x => x.Count);

            var eventsList = byEvent.Select(kv =>
            {
                var title = eventTitles.FirstOrDefault(t => t.Id == kv.Key)?.Title ?? kv.Value.title;
                var fromTickets = ticketCountsByEvent.GetValueOrDefault(kv.Key, 0);
                var fromSoldSeats = soldSeatCountsByEvent.GetValueOrDefault(kv.Key, 0);
                var ticketsSold = Math.Max(fromTickets, fromSoldSeats);

                if (kv.Value.gross > 0)
                {
                    var unavailable = unavailableSeatCountsByEvent.GetValueOrDefault(kv.Key, 0);
                    if (unavailable > ticketsSold) ticketsSold = unavailable;
                }

                if (ticketsSold == 0) ticketsSold = kv.Value.sales;
                return new
                {
                    eventId = kv.Key,
                    title,
                    grossSales = kv.Value.gross,
                    organizerPayout = kv.Value.payout,
                    ticketsSold,
                };
            }).OrderByDescending(x => x.organizerPayout).ToList();

            return Ok(new
            {
                commissionPercent = percent,
                totalGrossSales = gross,
                platformFees = fees,
                organizerPayout = payout,
                currency = "BYN",
                events = eventsList,
            });
        }

        private async Task<IActionResult?> RegenerateEventSeatsAsync(Event evt)
        {
            var hasSold = await _context.Seats.AnyAsync(s =>
                s.EventId == evt.Id && (s.Status == "sold" || s.Status == "reserved"));
            if (hasSold)
                return BadRequest(new { message = "Нельзя сменить схему: уже есть брони или продажи" });

            var existing = await _context.Seats.Where(s => s.EventId == evt.Id).ToListAsync();
            if (existing.Count > 0)
            {
                _context.Seats.RemoveRange(existing);
                await _context.SaveChangesAsync();
            }

            if (evt.HallLayoutId.HasValue)
            {
                await CopyLayoutSeatsToEventAsync(evt);
                return null;
            }

            var evtWithTypes = await _context.Events
                .Include(e => e.TicketTypes)
                .FirstAsync(e => e.Id == evt.Id);
            var seats = DefaultHallSeatGenerator.Build(evt.Id, evtWithTypes.TicketTypes);
            _context.Seats.AddRange(seats);
            await _context.SaveChangesAsync();
            return null;
        }

        private async Task CopyLayoutSeatsToEventAsync(Event evt)
        {
            if (!evt.HallLayoutId.HasValue) return;
            var layoutSeats = await _context.HallLayoutSeats
                .Where(s => s.HallLayoutId == evt.HallLayoutId.Value)
                .OrderBy(s => s.Id)
                .ToListAsync();
            if (layoutSeats.Count == 0) return;

            var eventSeats = layoutSeats
                .Select(ls => LayoutSeatMapper.ToEventSeat(ls, evt.Id, evt.HallThemeJson))
                .ToList();
            _context.Seats.AddRange(eventSeats);
            await _context.SaveChangesAsync();
        }

        private async Task EnsureSeatsSnapshot(Event evt)
        {
            var alreadyExists = await _context.Seats.AnyAsync(s => s.EventId == evt.Id);
            if (alreadyExists) return;

            if (evt.HallLayoutId.HasValue)
            {
                await CopyLayoutSeatsToEventAsync(evt);
                return;
            }

            var evtWithTypes = await _context.Events
                .Include(e => e.TicketTypes)
                .FirstAsync(e => e.Id == evt.Id);
            var seats = DefaultHallSeatGenerator.Build(evt.Id, evtWithTypes.TicketTypes);
            _context.Seats.AddRange(seats);
            await _context.SaveChangesAsync();
        }

        /// <summary>Колонки БД — timestamp without time zone; Npgsql требует Unspecified.</summary>
        private static DateTime ToDbTimestamp(DateTime value)
        {
            var utc = value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(value, DateTimeKind.Utc)
                : value.ToUniversalTime();
            return DateTime.SpecifyKind(utc, DateTimeKind.Unspecified);
        }

        private static List<TicketType> ExtractTicketTypes(IEnumerable<TicketType>? source) =>
            (source ?? Enumerable.Empty<TicketType>())
                .Where(t => !string.IsNullOrWhiteSpace(t.Name))
                .Select(t => new TicketType
                {
                    Name = t.Name.Trim(),
                    Price = t.Price,
                    Available = t.Available,
                })
                .ToList();

        private async Task SyncTicketTypesAsync(int eventId, IReadOnlyList<TicketType> incoming)
        {
            var existing = await _context.TicketTypes.Where(t => t.EventId == eventId).ToListAsync();
            if (existing.Count > 0)
                _context.TicketTypes.RemoveRange(existing);

            foreach (var tt in incoming)
            {
                _context.TicketTypes.Add(new TicketType
                {
                    EventId = eventId,
                    Name = tt.Name,
                    Price = tt.Price,
                    Available = tt.Available,
                });
            }

            if (existing.Count > 0 || incoming.Count > 0)
                await _context.SaveChangesAsync();
        }

        private async Task<object> ToOrganizerEventDtoAsync(int eventId)
        {
            var evt = await _context.Events
                .Include(e => e.TicketTypes)
                .FirstAsync(e => e.Id == eventId);
            return ToOrganizerEventDto(evt);
        }

        [HttpGet("genius-preview")]
        public async Task<IActionResult> GeniusPreview([FromQuery] string? url, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(url))
                return BadRequest(new { message = "Укажите ссылку на профиль Genius" });

            if (!GeniusProfileService.IsGeniusProfileUrl(url))
                return BadRequest(new { message = "Ссылка Genius: genius.com/artists/… (артист) или genius.com/username (пользователь)" });

            try
            {
                var (name, avatarUrl) = await _genius.FetchProfileAsync(url, ct);
                if (string.IsNullOrWhiteSpace(name) && string.IsNullOrWhiteSpace(avatarUrl))
                    return Ok(new { name = (string?)null, avatarUrl = (string?)null, geniusUrl = GeniusProfileService.NormalizeArtistUrl(url), message = "Профиль найден, но превью недоступно — укажите имя и фото вручную" });

                return Ok(new
                {
                    name,
                    avatarUrl,
                    geniusUrl = GeniusProfileService.NormalizeArtistUrl(url),
                    avatarSyncedAt = DateTime.UtcNow.ToString("O"),
                });
            }
            catch (Exception ex)
            {
                return StatusCode(502, new { message = "Не удалось загрузить Genius. Укажите имя и аватар вручную.", detail = ex.Message });
            }
        }

        [HttpGet("bandlink-preview")]
        [Obsolete("Используйте genius-preview")]
        public Task<IActionResult> BandLinkPreview([FromQuery] string? url, CancellationToken ct) =>
            GeniusPreview(url, ct);

        private static string NormalizeEventTime(string? time)
        {
            if (string.IsNullOrWhiteSpace(time)) return "";
            var t = time.Trim();
            if (TimeSpan.TryParse(t, out var ts))
                return ts.ToString(@"hh\:mm");
            if (t.Length >= 5 && t[2] == ':')
                return t[..5];
            return t;
        }

        private async Task<Event?> FindVenueScheduleConflictAsync(Event evt)
        {
            var eventDate = evt.Date.Date;
            var eventTime = NormalizeEventTime(evt.Time);
            if (string.IsNullOrEmpty(eventTime)) return null;

            var locationKey = (evt.Location ?? "").Trim();
            var hasVenue = evt.VenueId.HasValue;

            var candidates = await _context.Events
                .Where(e =>
                    e.Id != evt.Id &&
                    e.Date.Date == eventDate &&
                    e.Status != EventStatus.Cancelled &&
                    e.Status != EventStatus.Rejected &&
                    e.Status != EventStatus.Passed &&
                    e.Status != EventStatus.Draft)
                .ToListAsync();

            foreach (var other in candidates)
            {
                if (NormalizeEventTime(other.Time) != eventTime) continue;

                if (hasVenue && other.VenueId.HasValue)
                {
                    if (other.VenueId == evt.VenueId) return other;
                    continue;
                }

                if (!string.IsNullOrEmpty(locationKey) &&
                    string.Equals(locationKey, (other.Location ?? "").Trim(), StringComparison.OrdinalIgnoreCase))
                {
                    return other;
                }
            }

            return null;
        }

        private static object ToOrganizerEventDto(Event evt) => new
        {
            evt.Id,
            evt.Title,
            evt.Image,
            evt.Date,
            evt.Time,
            evt.Location,
            evt.Address,
            evt.Price,
            evt.Category,
            evt.Genre,
            evt.Description,
            evt.EventType,
            evt.Lineup,
            evt.VenueId,
            evt.HallId,
            evt.HallLayoutId,
            hallThemeJson = evt.HallThemeJson,
            status = evt.Status,
            evt.ReviewComment,
            evt.SubmittedAt,
            evt.ReviewedAt,
            evt.ScheduledPublishAt,
            evt.ScheduledUnpublishAt,
            evt.PublishedAt,
            evt.OrganizerId,
            evt.CreatedByAdmin,
            evt.AdminOrganizerAccess,
            evt.CreatedByAdminUserId,
            evt.AllowTicketTransfer,
            evt.IsSoldOut,
            evt.CreatedAt,
            evt.UpdatedAt,
            ticketTypes = evt.TicketTypes
                .OrderBy(t => t.Price)
                .Select(t => new { t.Name, t.Price, t.Available })
                .ToList(),
        };
    }

    public class SchedulePublishRequest
    {
        public DateTime ScheduledPublishAt { get; set; }
        public DateTime ScheduledUnpublishAt { get; set; }
    }

    public class HallSetupRequest
    {
        public int? VenueId { get; set; }
        public int? HallId { get; set; }
        public int? HallLayoutId { get; set; }
        public string? HallThemeJson { get; set; }
    }

    public class RescheduleRequestDto
    {
        public DateTime ProposedDate { get; set; }
        public string ProposedTime { get; set; } = "";
        public string Reason { get; set; } = "";
    }

    public class AssignOrganizerRequest
    {
        public int OrganizerId { get; set; }
        /// <summary>editable | viewonly</summary>
        public string? AccessMode { get; set; }
    }

    public class CancellationStartRequest
    {
        public string Reason { get; set; } = "";
        public string? CaptchaToken { get; set; }
    }

    public class CancellationSubmitRequest
    {
        public int ChallengeId { get; set; }
        public string Code { get; set; } = "";
    }

    public class CancellationResendRequest
    {
        public int ChallengeId { get; set; }
    }
}
