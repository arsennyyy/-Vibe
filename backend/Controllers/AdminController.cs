using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;
using MyMvcBackend.Services;
using Microsoft.Extensions.Configuration;

namespace MyMvcBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly RefundService _refundService;
        private readonly IPlatformGuideService _platformGuide;

        public AdminController(
            ApplicationDbContext context,
            IEmailService emailService,
            IConfiguration configuration,
            RefundService refundService,
            IPlatformGuideService platformGuide)
        {
            _context = context;
            _emailService = emailService;
            _configuration = configuration;
            _refundService = refundService;
            _platformGuide = platformGuide;
        }

        // ========== USERS ==========
        [HttpGet("users")]
        public async Task<ActionResult<IEnumerable<object>>> GetUsers([FromQuery] string? search = null)
        {
            var query = _context.Users.AsQueryable();
            
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(u => 
                    u.Name.Contains(search) || 
                    u.Email.Contains(search));
            }

            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.Email,
                    u.EmailVerified,
                    u.IsAdmin,
                    u.IsOrganizer,
                    u.CreatedAt,
                    u.UpdatedAt
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpGet("users/{id}")]
        public async Task<ActionResult<object>> GetUser(int id)
        {
            var user = await _context.Users
                .Where(u => u.Id == id)
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.Email,
                    u.EmailVerified,
                    u.IsAdmin,
                    u.IsOrganizer,
                    u.CreatedAt,
                    u.UpdatedAt
                })
                .FirstOrDefaultAsync();

            if (user == null) return NotFound();

            return Ok(user);
        }

        [HttpPut("users/{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserModel model)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            var wasAdmin = user.IsAdmin;
            var wasOrganizer = user.IsOrganizer;

            user.Name = model.Name ?? user.Name;
            user.Email = model.Email ?? user.Email;
            user.IsAdmin = model.IsAdmin ?? user.IsAdmin;
            user.IsOrganizer = model.IsOrganizer ?? user.IsOrganizer;
            user.EmailVerified = model.EmailVerified ?? user.EmailVerified;
            user.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrEmpty(model.Password))
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password);
            }

            await _context.SaveChangesAsync();

            if (!wasOrganizer && user.IsOrganizer)
                await _platformGuide.TrySendOrganizerGuideAsync(user, force: true);
            if (!wasAdmin && user.IsAdmin)
                await _platformGuide.TrySendAdminGuideAsync(user, force: true);

            return Ok(new { message = "Пользователь обновлен" });
        }

        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Пользователь удален" });
        }

        [HttpPost("users")]
        public async Task<ActionResult<object>> CreateUser([FromBody] CreateUserModel model)
        {
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
            {
                return BadRequest(new { message = "Пользователь с таким email уже существует" });
            }

            var user = new User
            {
                Name = model.Name,
                Email = model.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
                IsAdmin = model.IsAdmin ?? false,
                IsOrganizer = model.IsOrganizer ?? false,
                EmailVerified = model.EmailVerified ?? false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            if (user.IsOrganizer)
                await _platformGuide.TrySendOrganizerGuideAsync(user, force: true);
            if (user.IsAdmin)
                await _platformGuide.TrySendAdminGuideAsync(user, force: true);

            return Ok(new
            {
                user.Id,
                user.Name,
                user.Email,
                user.IsAdmin,
                user.IsOrganizer,
                user.EmailVerified
            });
        }

        [HttpGet("users/search")]
        public async Task<ActionResult<IEnumerable<object>>> SearchUsers([FromQuery] string q)
        {
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 1)
                return Ok(Array.Empty<object>());

            var term = q.Trim();
            var users = await _context.Users
                .Where(u =>
                    u.Name.Contains(term) ||
                    u.Email.Contains(term))
                .OrderBy(u => u.Name)
                .Take(12)
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.Email,
                    u.AvatarUrl,
                    u.IsOrganizer,
                    u.IsAdmin,
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpGet("users/organizers")]
        public async Task<ActionResult<IEnumerable<object>>> GetOrganizers()
        {
            var organizers = await _context.Users
                .Where(u => u.IsOrganizer)
                .OrderBy(u => u.Name)
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.Email,
                    u.AvatarUrl,
                    u.IsOrganizer,
                    u.CreatedAt,
                })
                .ToListAsync();

            return Ok(organizers);
        }

        [HttpPost("users/organizer-role")]
        public async Task<IActionResult> SetOrganizerRole([FromBody] SetOrganizerRoleRequest model)
        {
            User? user = null;
            if (model.UserId.HasValue)
                user = await _context.Users.FindAsync(model.UserId.Value);
            else if (!string.IsNullOrWhiteSpace(model.Email))
                user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email.Trim());

            if (user == null) return NotFound(new { message = "Пользователь не найден" });
            if (user.IsAdmin && !model.IsOrganizer)
                return BadRequest(new { message = "Нельзя снять роль у администратора через этот интерфейс" });

            var wasOrganizer = user.IsOrganizer;
            user.IsOrganizer = model.IsOrganizer;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            if (!wasOrganizer && user.IsOrganizer)
                await _platformGuide.TrySendOrganizerGuideAsync(user, force: true);

            return Ok(new
            {
                message = model.IsOrganizer ? "Роль организатора назначена" : "Роль организатора снята",
                user = new { user.Id, user.Name, user.Email, user.IsOrganizer },
            });
        }

        // ========== EVENTS ==========
        [HttpGet("events")]
        public async Task<ActionResult<IEnumerable<object>>> GetEvents([FromQuery] string? search = null)
        {
            var query = _context.Events.AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(e => 
                    e.Title.Contains(search) || 
                    e.Location.Contains(search) ||
                    (e.Category != null && e.Category.Contains(search)));
            }

            var events = await query
                .OrderByDescending(e => e.Date)
                .Select(e => new
                {
                    e.Id,
                    e.Title,
                    e.Image,
                    e.Date,
                    e.Time,
                    e.Location,
                    e.Address,
                    e.Price,
                    e.Category,
                    e.Genre,
                    e.Description,
                    e.EventType,
                    e.Lineup,
                    e.IsFeatured,
                    e.Status,
                    e.OrganizerId,
                    e.ReviewComment,
                    e.SubmittedAt,
                    e.ReviewedAt,
                    e.VenueId,
                    e.HallId,
                    e.HallLayoutId,
                    e.AllowTicketTransfer
                })
                .ToListAsync();

            return Ok(events);
        }

        [HttpGet("events/{id}")]
        public async Task<ActionResult<object>> GetEvent(int id)
        {
            var @event = await _context.Events.FindAsync(id);
            if (@event == null) return NotFound();

            return Ok(@event);
        }

        [HttpPost("events")]
        public async Task<ActionResult<object>> CreateEvent([FromBody] Event @event)
        {
            @event.Status = @event.Status == EventStatus.Draft ? EventStatus.Published : @event.Status;
            @event.UpdatedAt = DateTime.UtcNow;
            _context.Events.Add(@event);
            await _context.SaveChangesAsync();

            return Ok(@event);
        }

        [HttpPut("events/{id}")]
        public async Task<IActionResult> UpdateEvent(int id, [FromBody] Event incoming)
        {
            var evt = await _context.Events.FindAsync(id);
            if (evt == null) return NotFound();

            var oldDate = evt.Date;
            var oldTime = evt.Time;

            if (!string.IsNullOrWhiteSpace(incoming.Title))
                evt.Title = incoming.Title.Trim();
            if (!string.IsNullOrWhiteSpace(incoming.Image))
                evt.Image = EventImageResolver.NormalizeStoragePath(incoming.Image.Trim()) ?? incoming.Image.Trim();
            if (incoming.Date != default)
            {
                evt.Date = incoming.Date.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(incoming.Date, DateTimeKind.Utc)
                    : incoming.Date.ToUniversalTime();
            }
            if (!string.IsNullOrWhiteSpace(incoming.Time))
                evt.Time = incoming.Time.Trim();
            if (!string.IsNullOrWhiteSpace(incoming.Location))
                evt.Location = incoming.Location.Trim();
            if (!string.IsNullOrWhiteSpace(incoming.Address))
                evt.Address = incoming.Address.Trim();
            if (!string.IsNullOrWhiteSpace(incoming.Price))
                evt.Price = incoming.Price.Trim();

            if (incoming.Category != null)
                evt.Category = string.IsNullOrWhiteSpace(incoming.Category) ? null : incoming.Category.Trim();

            // Жанр: пустая строка с формы = сброс
            evt.Genre = string.IsNullOrWhiteSpace(incoming.Genre) ? null : incoming.Genre.Trim();

            if (!string.IsNullOrWhiteSpace(incoming.Description))
                evt.Description = incoming.Description;
            if (!string.IsNullOrWhiteSpace(incoming.EventType))
                evt.EventType = incoming.EventType;
            if (!string.IsNullOrWhiteSpace(incoming.Lineup))
                evt.Lineup = incoming.Lineup;

            evt.IsFeatured = incoming.IsFeatured;
            evt.AllowTicketTransfer = incoming.AllowTicketTransfer;
            evt.UpdatedAt = DateTime.UtcNow;

            try
            {
                await _context.SaveChangesAsync();

                var dateChanged = incoming.Date != default && evt.Date.Date != oldDate.Date;
                var timeChanged = !string.IsNullOrWhiteSpace(incoming.Time)
                    && !string.Equals(evt.Time.Trim(), oldTime.Trim(), StringComparison.Ordinal);
                if (dateChanged || timeChanged)
                {
                    var hasTickets = await _context.UserTickets.AnyAsync(t => t.EventId == id && !t.IsRefunded);
                    if (hasTickets)
                        await _refundService.NotifyEventRescheduledAsync(evt, oldDate, oldTime, evt.Date, evt.Time);
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Не удалось сохранить событие", detail = ex.Message });
            }

            return Ok(new { message = "Событие обновлено", genre = evt.Genre });
        }

        [HttpPost("events/{id}/cancel-refund-all")]
        public async Task<IActionResult> CancelEventAndRefundAll(int id, [FromBody] CancelEventRequest? body)
        {
            var result = await _refundService.CancelEventAndRefundAllAsync(id, body?.Reason);
            if (!result.Success)
                return BadRequest(new { message = result.Error });
            return Ok(new
            {
                message = "Мероприятие отменено, билеты возвращены, схема зала освобождена",
                ordersRefunded = result.OrdersRefunded,
                totalAmount = result.TotalAmount,
            });
        }

        [HttpPost("orders/{id}/refund")]
        public async Task<IActionResult> RefundOrder(int id, [FromBody] RefundOrderRequest? body)
        {
            var result = await _refundService.RefundOrderAsync(id, body?.Reason ?? "Возврат администратором.");
            if (!result.Success)
                return BadRequest(new { message = result.Error });
            return Ok(new { message = "Возврат оформлен", amount = result.TotalAmount });
        }

        [HttpDelete("events/{id}")]
        public async Task<IActionResult> DeleteEvent(int id)
        {
            var @event = await _context.Events.FindAsync(id);
            if (@event == null) return NotFound();

            _context.Events.Remove(@event);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Событие удалено" });
        }

        // ========== CATALOG FILTERS (жанры / типы на /concerts) ==========
        [HttpGet("catalog-filters")]
        public async Task<ActionResult<IEnumerable<object>>> GetCatalogFilters()
        {
            var items = await _context.CatalogFilters
                .OrderBy(f => f.Kind)
                .ThenBy(f => f.SortOrder)
                .ThenBy(f => f.Label)
                .Select(f => new { f.Id, f.Kind, f.Label, f.SortOrder, f.IsActive })
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost("catalog-filters")]
        public async Task<ActionResult<object>> CreateCatalogFilter([FromBody] CatalogFilterDto dto)
        {
            var kind = (dto.Kind ?? "").Trim().ToLowerInvariant();
            if (kind is not ("genre" or "type"))
                return BadRequest(new { message = "Kind должен быть genre или type" });

            var label = (dto.Label ?? "").Trim();
            if (string.IsNullOrEmpty(label))
                return BadRequest(new { message = "Укажите название" });

            if (await _context.CatalogFilters.AnyAsync(f => f.Kind == kind && f.Label == label))
                return Conflict(new { message = "Такой фильтр уже есть" });

            var maxOrder = await _context.CatalogFilters
                .Where(f => f.Kind == kind)
                .Select(f => (int?)f.SortOrder)
                .MaxAsync() ?? -1;

            var filter = new CatalogFilter
            {
                Kind = kind,
                Label = label,
                SortOrder = dto.SortOrder ?? maxOrder + 1,
                IsActive = dto.IsActive ?? true,
            };
            _context.CatalogFilters.Add(filter);
            await _context.SaveChangesAsync();
            return Ok(filter);
        }

        [HttpPut("catalog-filters/{id}")]
        public async Task<IActionResult> UpdateCatalogFilter(int id, [FromBody] CatalogFilterDto dto)
        {
            var filter = await _context.CatalogFilters.FindAsync(id);
            if (filter == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(dto.Label))
            {
                var label = dto.Label.Trim();
                var kind = dto.Kind?.Trim().ToLowerInvariant() ?? filter.Kind;
                if (await _context.CatalogFilters.AnyAsync(f => f.Id != id && f.Kind == kind && f.Label == label))
                    return Conflict(new { message = "Такой фильтр уже есть" });
                filter.Label = label;
            }

            if (!string.IsNullOrWhiteSpace(dto.Kind))
            {
                var kind = dto.Kind.Trim().ToLowerInvariant();
                if (kind is "genre" or "type") filter.Kind = kind;
            }

            if (dto.SortOrder.HasValue) filter.SortOrder = dto.SortOrder.Value;
            if (dto.IsActive.HasValue) filter.IsActive = dto.IsActive.Value;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Фильтр обновлён" });
        }

        [HttpDelete("catalog-filters/{id}")]
        public async Task<IActionResult> DeleteCatalogFilter(int id)
        {
            var filter = await _context.CatalogFilters.FindAsync(id);
            if (filter == null) return NotFound();

            _context.CatalogFilters.Remove(filter);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Фильтр удалён" });
        }

        // ========== ORDERS ==========
        [HttpGet("orders")]
        public async Task<ActionResult<IEnumerable<object>>> GetOrders([FromQuery] string? search = null)
        {
            var query = _context.Orders
                .Include(o => o.User)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(o =>
                    o.OrderNumber.Contains(search) ||
                    (o.User != null && (o.User.Name.Contains(search) || o.User.Email.Contains(search))));
            }

            var orders = await query
                .OrderByDescending(o => o.CreatedAt)
                .Select(o => new
                {
                    o.Id,
                    o.OrderNumber,
                    o.TotalAmount,
                    o.Status,
                    o.CreatedAt,
                    o.CompletedAt,
                    o.EventId,
                    o.EventTitle,
                    o.SeatLabel,
                    User = o.User == null ? null : new
                    {
                        o.User.Id,
                        o.User.Name,
                        o.User.Email
                    }
                })
                .ToListAsync();

            return Ok(orders);
        }

        [HttpPut("orders/{id}")]
        public async Task<IActionResult> UpdateOrder(int id, [FromBody] UpdateOrderModel model)
        {
            if (model.Status == "refunded")
            {
                var result = await _refundService.RefundOrderAsync(id, "Возврат администратором.");
                if (!result.Success) return BadRequest(new { message = result.Error });
                return Ok(new { message = "Возврат оформлен", amount = result.TotalAmount });
            }

            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();

            if (!string.IsNullOrEmpty(model.Status))
            {
                order.Status = model.Status;
                if (model.Status == "paid" || model.Status == "completed")
                    order.CompletedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Заказ обновлен" });
        }

        [HttpDelete("orders/{id}")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();

            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Заказ удален" });
        }

        // ========== PAYMENTS ==========
        [HttpGet("payments")]
        public async Task<ActionResult<IEnumerable<object>>> GetPayments([FromQuery] string? search = null)
        {
            var query = _context.Payments
                .Include(p => p.User)
                .Include(p => p.Order)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(p =>
                    (p.TransactionId != null && p.TransactionId.Contains(search)) ||
                    (p.Order != null && p.Order.OrderNumber.Contains(search)) ||
                    (p.User != null && p.User.Email.Contains(search)));
            }

            var payments = await query
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id,
                    p.Amount,
                    p.GrossAmount,
                    p.PlatformFee,
                    p.OrganizerPayout,
                    p.CommissionPercent,
                    p.PaymentMethod,
                    p.Status,
                    p.TransactionId,
                    p.CreatedAt,
                    p.CompletedAt,
                    User = p.User == null ? null : new
                    {
                        p.User.Id,
                        p.User.Name,
                        p.User.Email
                    },
                    Order = p.Order == null ? null : new
                    {
                        p.Order.Id,
                        p.Order.OrderNumber,
                        p.Order.EventTitle,
                        p.Order.SeatLabel,
                    }
                })
                .ToListAsync();

            return Ok(payments);
        }

        // ========== REVIEWS ==========
        [HttpGet("reviews")]
        public async Task<ActionResult<IEnumerable<object>>> GetReviews([FromQuery] string? search = null)
        {
            var query = _context.Reviews
                .Include(r => r.User)
                .Include(r => r.Event)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(r =>
                    (r.User != null && r.User.Name.Contains(search)) ||
                    (r.Event != null && r.Event.Title.Contains(search)) ||
                    (r.Comment != null && r.Comment.Contains(search)));
            }

            var reviews = await query
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.Rating,
                    r.Comment,
                    r.IsApproved,
                    r.CreatedAt,
                    r.UpdatedAt,
                    User = r.User == null ? null : new
                    {
                        r.User.Id,
                        r.User.Name,
                        r.User.Email
                    },
                    Event = r.Event == null ? null : new
                    {
                        r.Event.Id,
                        r.Event.Title
                    }
                })
                .ToListAsync();

            return Ok(reviews);
        }

        [HttpPut("reviews/{id}")]
        public async Task<IActionResult> UpdateReview(int id, [FromBody] UpdateReviewModel model)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound();

            if (model.IsApproved.HasValue)
            {
                review.IsApproved = model.IsApproved.Value;
            }

            if (!string.IsNullOrEmpty(model.Comment))
            {
                review.Comment = model.Comment;
            }

            review.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Отзыв обновлен" });
        }

        [HttpDelete("reviews/{id}")]
        public async Task<IActionResult> DeleteReview(int id)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound();

            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Отзыв удален" });
        }

        // ========== CONTACT MESSAGES ==========
        [HttpGet("contact-messages")]
        public async Task<ActionResult<IEnumerable<object>>> GetContactMessages([FromQuery] string? search = null)
        {
            var query = _context.ContactMessages.AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(m => 
                    m.Name.Contains(search) ||
                    m.Email.Contains(search) ||
                    m.Message.Contains(search));
            }

            var messages = await query
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => new
                {
                    m.Id,
                    m.Name,
                    m.Email,
                    m.Message,
                    m.Status,
                    m.CreatedAt,
                    m.ResolvedAt,
                    m.Response
                })
                .ToListAsync();

            return Ok(messages);
        }

        [HttpPut("contact-messages/{id}")]
        public async Task<IActionResult> UpdateContactMessage(int id, [FromBody] UpdateContactMessageModel model)
        {
            var message = await _context.ContactMessages.FindAsync(id);
            if (message == null) return NotFound();

            var previousResponse = message.Response ?? "";

            if (!string.IsNullOrEmpty(model.Status))
            {
                message.Status = model.Status;
                if (model.Status == "resolved")
                {
                    message.ResolvedAt = DateTime.UtcNow;
                }
            }

            if (!string.IsNullOrEmpty(model.Response))
            {
                message.Response = model.Response;
            }

            await _context.SaveChangesAsync();

            var responseText = (message.Response ?? "").Trim();
            var responseAddedOrChanged =
                !string.IsNullOrEmpty(responseText) &&
                !string.Equals(responseText, previousResponse.Trim(), StringComparison.Ordinal);

            if (responseAddedOrChanged)
            {
                var statusLabel = message.Status switch
                {
                    "in_progress" => "В работе",
                    "resolved" => "Решено",
                    "archived" => "В архиве",
                    _ => "Новое",
                };
                await _emailService.SendContactReplyAsync(
                    message.Email,
                    message.Name,
                    message.Message,
                    responseText,
                    statusLabel);
            }

            return Ok(new { message = "Сообщение обновлено" });
        }

        [HttpDelete("contact-messages/{id}")]
        public async Task<IActionResult> DeleteContactMessage(int id)
        {
            var message = await _context.ContactMessages.FindAsync(id);
            if (message == null) return NotFound();

            _context.ContactMessages.Remove(message);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Сообщение удалено" });
        }

        [HttpGet("moderation/events")]
        public async Task<ActionResult<IEnumerable<object>>> GetModerationEvents()
        {
            var items = await _context.Events
                .Where(e => e.Status == EventStatus.PendingReview)
                .OrderByDescending(e => e.SubmittedAt)
                .Select(e => new
                {
                    e.Id,
                    e.Title,
                    e.Location,
                    e.Date,
                    e.Status,
                    e.SubmittedAt,
                    e.ReviewComment,
                    Organizer = _context.Users.Where(u => u.Id == e.OrganizerId).Select(u => new { u.Id, u.Name, u.Email }).FirstOrDefault()
                })
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost("moderation/events/{id}/approve")]
        public async Task<IActionResult> ApproveEvent(int id)
        {
            var evt = await _context.Events.FindAsync(id);
            if (evt == null) return NotFound();
            evt.Status = EventStatus.Approved;
            evt.ReviewedAt = DateTime.UtcNow;
            evt.ReviewComment = null;
            evt.ScheduledPublishAt = null;
            evt.PublishedAt = null;
            var adminId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            evt.ReviewedByAdminId = string.IsNullOrEmpty(adminId) ? null : int.Parse(adminId);
            evt.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var organizer = evt.OrganizerId.HasValue
                ? await _context.Users.FindAsync(evt.OrganizerId.Value)
                : null;
            if (organizer != null)
            {
                await _emailService.SendModerationApprovedAsync(
                    organizer.Email, organizer.Name, evt.Title, evt.Id);
                if (organizer.NotifyOrganizerEvents)
                {
                    await NotificationHelper.CreateAsync(
                        _context,
                        organizer.Id,
                        "Заявка одобрена",
                        $"«{evt.Title}» одобрена модератором. Можно запланировать публикацию.",
                        "success",
                        evt.Id);
                }
            }

            return Ok(new { message = "Событие одобрено. Организатор получит письмо и сможет запланировать публикацию." });
        }

        [HttpPost("moderation/events/{id}/reject")]
        public async Task<IActionResult> RejectEvent(int id, [FromBody] ModerationCommentRequest model)
        {
            if (string.IsNullOrWhiteSpace(model.Comment))
                return BadRequest(new { message = "Укажите причину отклонения" });

            var evt = await _context.Events.FindAsync(id);
            if (evt == null) return NotFound();
            evt.Status = EventStatus.Rejected;
            evt.ReviewedAt = DateTime.UtcNow;
            evt.ReviewComment = model.Comment.Trim();
            evt.ScheduledPublishAt = null;
            evt.PublishedAt = null;
            var adminId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            evt.ReviewedByAdminId = string.IsNullOrEmpty(adminId) ? null : int.Parse(adminId);
            evt.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var organizer = evt.OrganizerId.HasValue
                ? await _context.Users.FindAsync(evt.OrganizerId.Value)
                : null;
            if (organizer != null)
            {
                await _emailService.SendModerationRejectedAsync(
                    organizer.Email, organizer.Name, evt.Title, evt.ReviewComment);
                if (organizer.NotifyOrganizerEvents)
                {
                    await NotificationHelper.CreateAsync(
                        _context,
                        organizer.Id,
                        "Заявка отклонена",
                        $"«{evt.Title}»: {evt.ReviewComment}",
                        "error",
                        evt.Id);
                }
            }

            return Ok(new { message = "Событие отклонено. Причина отправлена организатору." });
        }

        [HttpGet("venues")]
        public async Task<ActionResult<IEnumerable<Venue>>> GetVenues()
        {
            return Ok(await _context.Venues.OrderBy(v => v.Name).ToListAsync());
        }

        [HttpPost("venues")]
        public async Task<ActionResult<Venue>> CreateVenue([FromBody] Venue venue)
        {
            _context.Venues.Add(venue);
            await _context.SaveChangesAsync();
            return Ok(venue);
        }

        [HttpPut("venues/{id}")]
        public async Task<ActionResult<Venue>> UpdateVenue(int id, [FromBody] Venue venue)
        {
            var existing = await _context.Venues.FindAsync(id);
            if (existing == null) return NotFound();
            existing.Name = venue.Name?.Trim() ?? existing.Name;
            existing.City = venue.City?.Trim() ?? existing.City;
            existing.Address = venue.Address?.Trim() ?? existing.Address;
            await _context.SaveChangesAsync();
            return Ok(existing);
        }

        [HttpDelete("venues/{id}")]
        public async Task<IActionResult> DeleteVenue(int id)
        {
            var existing = await _context.Venues.FindAsync(id);
            if (existing == null) return NotFound();
            var used = await _context.Events.AnyAsync(e => e.VenueId == id);
            if (used) return BadRequest(new { message = "Площадка привязана к событиям — удаление невозможно" });
            _context.Venues.Remove(existing);
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpGet("halls")]
        public async Task<ActionResult<IEnumerable<Hall>>> GetHalls([FromQuery] int? venueId = null)
        {
            var query = _context.Halls.AsQueryable();
            if (venueId.HasValue) query = query.Where(h => h.VenueId == venueId);
            return Ok(await query.OrderBy(h => h.Name).ToListAsync());
        }

        [HttpPost("halls")]
        public async Task<ActionResult<Hall>> CreateHall([FromBody] Hall hall)
        {
            _context.Halls.Add(hall);
            await _context.SaveChangesAsync();
            return Ok(hall);
        }

        [HttpGet("layouts")]
        public async Task<ActionResult<IEnumerable<HallLayout>>> GetLayouts([FromQuery] int? hallId = null)
        {
            var query = _context.HallLayouts.AsQueryable();
            if (hallId.HasValue) query = query.Where(l => l.HallId == hallId);
            return Ok(await query.OrderBy(l => l.Name).ToListAsync());
        }

        [HttpPost("layouts")]
        public async Task<ActionResult<HallLayout>> CreateLayout([FromBody] HallLayout layout)
        {
            _context.HallLayouts.Add(layout);
            await _context.SaveChangesAsync();
            return Ok(layout);
        }

        [HttpGet("layouts/{layoutId}/seats")]
        public async Task<ActionResult<IEnumerable<HallLayoutSeat>>> GetLayoutSeats(int layoutId)
        {
            return Ok(await _context.HallLayoutSeats.Where(s => s.HallLayoutId == layoutId).OrderBy(s => s.Row).ThenBy(s => s.Number).ToListAsync());
        }

        [HttpPost("layouts/{layoutId}/seats")]
        public async Task<ActionResult> UpsertLayoutSeats(int layoutId, [FromBody] List<HallLayoutSeat> seats)
        {
            var existing = _context.HallLayoutSeats.Where(s => s.HallLayoutId == layoutId);
            _context.HallLayoutSeats.RemoveRange(existing);
            foreach (var seat in seats)
            {
                seat.HallLayoutId = layoutId;
            }
            _context.HallLayoutSeats.AddRange(seats);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Схема зала обновлена" });
        }

        [HttpGet("layouts/{layoutId}/ga-sectors")]
        public async Task<ActionResult> GetGaSectors(int layoutId)
        {
            var ga = await _context.HallLayoutSeats
                .Where(s => s.HallLayoutId == layoutId && s.IsGa)
                .ToListAsync();

            var sectors = ga
                .GroupBy(s => s.Sector ?? "Танцпол")
                .Select(g => new
                {
                    sector = g.Key,
                    capacity = g.Count(),
                    price = g.Min(x => x.Price),
                })
                .OrderBy(x => x.sector)
                .ToList();

            return Ok(sectors);
        }

        [HttpPut("layouts/{layoutId}/ga-capacity")]
        public async Task<ActionResult> SetGaCapacity(int layoutId, [FromBody] GaCapacityRequest body)
        {
            var sector = string.IsNullOrWhiteSpace(body.Sector) ? "Танцпол" : body.Sector.Trim();
            var target = Math.Clamp(body.Capacity, 0, 10000);

            var gaSeats = await _context.HallLayoutSeats
                .Where(s => s.HallLayoutId == layoutId && s.IsGa && (s.Sector ?? "Танцпол") == sector)
                .OrderBy(s => s.Number)
                .ToListAsync();

            if (gaSeats.Count == 0 && target > 0)
            {
                var template = await _context.HallLayoutSeats
                    .Where(s => s.HallLayoutId == layoutId)
                    .OrderBy(s => s.IsGa)
                    .FirstOrDefaultAsync();

                for (var i = 0; i < target; i++)
                {
                    _context.HallLayoutSeats.Add(new HallLayoutSeat
                    {
                        HallLayoutId = layoutId,
                        Row = "GA",
                        Number = i + 1,
                        Type = template?.Type ?? "ga",
                        Price = body.Price ?? template?.Price ?? 35,
                        Sector = sector,
                        PriceTier = template?.PriceTier ?? "ga",
                        IsGa = true,
                    });
                }
            }
            else if (target < gaSeats.Count)
            {
                _context.HallLayoutSeats.RemoveRange(gaSeats.Skip(target));
            }
            else if (target > gaSeats.Count)
            {
                var sample = gaSeats.FirstOrDefault();
                for (var i = gaSeats.Count; i < target; i++)
                {
                    _context.HallLayoutSeats.Add(new HallLayoutSeat
                    {
                        HallLayoutId = layoutId,
                        Row = sample?.Row ?? "GA",
                        Number = i + 1,
                        Type = sample?.Type ?? "ga",
                        Price = sample?.Price ?? 35,
                        Sector = sector,
                        PriceTier = sample?.PriceTier ?? "ga",
                        IsGa = true,
                    });
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { sector, capacity = target });
        }

        // ========== STATISTICS ==========
        [HttpGet("statistics")]
        public async Task<ActionResult<object>> GetStatistics()
        {
            try
            {
                var commissionPercent = PlatformCommission.ResolvePercent(_configuration);
                var completed = await _context.Payments
                    .Where(p => p.Status == "completed")
                    .ToListAsync();

                decimal grossSales = 0;
                decimal platformRevenue = 0;
                foreach (var p in completed)
                {
                    var g = p.GrossAmount ?? p.Amount;
                    grossSales += g;
                    platformRevenue += p.PlatformFee
                        ?? PlatformCommission.Split(g, p.CommissionPercent ?? commissionPercent).platformFee;
                }

                var stats = new
                {
                    TotalUsers = await _context.Users.CountAsync(),
                    TotalOrganizers = await _context.Users.CountAsync(u => u.IsOrganizer),
                    TotalEvents = await _context.Events.CountAsync(),
                    PendingModerationEvents = await _context.Events.CountAsync(e => e.Status == EventStatus.PendingReview),
                    TotalOrders = await _context.Orders.CountAsync(),
                    PaidOrders = await _context.Orders.CountAsync(o => o.Status == "paid"),
                    TotalPayments = await _context.Payments.CountAsync(),
                    CompletedPayments = await _context.Payments.CountAsync(p => p.Status == "completed"),
                    CommissionPercent = commissionPercent,
                    TotalGrossSales = grossSales,
                    PlatformRevenue = platformRevenue,
                    TotalRevenue = platformRevenue,
                    PendingOrders = await _context.Orders.CountAsync(o => o.Status == "pending"),
                    ApprovedReviews = await _context.Reviews.CountAsync(r => r.IsApproved),
                    PendingReviews = await _context.Reviews.CountAsync(r => !r.IsApproved),
                    TotalVenues = await _context.Venues.CountAsync(),
                    TotalCatalogFilters = await _context.CatalogFilters.CountAsync(f => f.IsActive),
                    PendingMessages = await _context.ContactMessages.CountAsync(m => m.Status == "new"),
                    PendingSupportThreads = await SafeCountAsync(() =>
                        _context.SupportThreads.CountAsync(t => t.Status == "awaiting_admin")),
                    PendingRescheduleRequests = await SafeCountAsync(() =>
                        _context.EventRescheduleRequests.CountAsync(r => r.Status == "pending")),
                    PendingCancellationRequests = await SafeCountAsync(async () =>
                    {
                        await DatabaseSchemaHelper.EnsureCancellationTableAsync(_context);
                        return await _context.EventCancellationRequests.CountAsync(r => r.Status == "pending");
                    }),
                    PendingTicketRefundRequests = await SafeCountAsync(async () =>
                    {
                        await DatabaseSchemaHelper.EnsureTicketRefundRequestsTableAsync(_context);
                        return await _context.TicketRefundRequests.CountAsync(r => r.Status == "pending");
                    }),
                    UrgentTicketRefundRequests = await SafeCountAsync(async () =>
                    {
                        await DatabaseSchemaHelper.EnsureTicketRefundRequestsTableAsync(_context);
                        var pending = await _context.TicketRefundRequests
                            .Include(r => r.Event)
                            .Where(r => r.Status == "pending")
                            .ToListAsync();
                        var now = DateTime.UtcNow;
                        return pending.Count(r => r.Event != null && (EventDateTimeHelper.HoursUntil(r.Event, now) ?? 999) <= 72);
                    }),
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Не удалось загрузить статистику", detail = ex.Message });
            }
        }

        private async Task<int> SafeCountAsync(Func<Task<int>> count)
        {
            try { return await count(); }
            catch { return 0; }
        }

        // ========== ПЕРЕНОС ДАТЫ ==========
        [HttpGet("reschedule-requests")]
        public async Task<ActionResult<IEnumerable<object>>> GetRescheduleRequests([FromQuery] string? status = "pending")
        {
            await DatabaseSchemaHelper.EnsureRescheduleTableAsync(_context);
            var q = _context.EventRescheduleRequests.Include(r => r.Event).AsQueryable();
            if (!string.IsNullOrWhiteSpace(status))
                q = q.Where(r => r.Status == status);

            var items = await q
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.EventId,
                    r.Status,
                    r.Reason,
                    r.OriginalDate,
                    r.OriginalTime,
                    r.ProposedDate,
                    r.ProposedTime,
                    r.CreatedAt,
                    EventTitle = r.Event != null ? r.Event.Title : null,
                    Organizer = _context.Users.Where(u => u.Id == r.OrganizerId)
                        .Select(u => new { u.Id, u.Name, u.Email }).FirstOrDefault(),
                })
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost("reschedule-requests/{id}/approve")]
        public async Task<IActionResult> ApproveRescheduleRequest(int id)
        {
            await DatabaseSchemaHelper.EnsureRescheduleTableAsync(_context);
            var req = await _context.EventRescheduleRequests.Include(r => r.Event).FirstOrDefaultAsync(r => r.Id == id);
            if (req == null) return NotFound();
            if (req.Status != "pending") return BadRequest(new { message = "Запрос уже обработан" });
            if (req.Event == null) return BadRequest(new { message = "Мероприятие не найдено" });

            var evt = req.Event;
            var oldDate = evt.Date;
            var oldTime = evt.Time;
            evt.Date = EventDateTimeHelper.EventDateOnly(req.ProposedDate);
            evt.Time = EventDateTimeHelper.NormalizeTime(req.ProposedTime);
            evt.UpdatedAt = DateTime.UtcNow;

            req.Status = "approved";
            req.ReviewedAt = DateTime.UtcNow;
            var adminId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            req.ReviewedByAdminId = string.IsNullOrEmpty(adminId) ? null : int.Parse(adminId);

            await _context.SaveChangesAsync();
            await _refundService.NotifyEventRescheduledAsync(evt, oldDate, oldTime, evt.Date, evt.Time);

            if (evt.OrganizerId.HasValue)
            {
                await NotificationHelper.CreateAsync(
                    _context,
                    evt.OrganizerId.Value,
                    "Перенос одобрен",
                    $"Администратор подтвердил новую дату «{evt.Title}»: {evt.Date:dd.MM.yyyy} {evt.Time}",
                    "success",
                    evt.Id);
            }

            return Ok(new { message = "Дата обновлена, держатели билетов уведомлены" });
        }

        [HttpPost("reschedule-requests/{id}/reject")]
        public async Task<IActionResult> RejectRescheduleRequest(int id, [FromBody] ModerationCommentRequest model)
        {
            if (string.IsNullOrWhiteSpace(model.Comment))
                return BadRequest(new { message = "Укажите причину отклонения" });

            var req = await _context.EventRescheduleRequests.Include(r => r.Event).FirstOrDefaultAsync(r => r.Id == id);
            if (req == null) return NotFound();
            if (req.Status != "pending") return BadRequest(new { message = "Запрос уже обработан" });

            req.Status = "rejected";
            req.ReviewComment = model.Comment.Trim();
            req.ReviewedAt = DateTime.UtcNow;
            var adminId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            req.ReviewedByAdminId = string.IsNullOrEmpty(adminId) ? null : int.Parse(adminId);
            await _context.SaveChangesAsync();

            if (req.Event?.OrganizerId is int oid)
            {
                await NotificationHelper.CreateAsync(
                    _context,
                    oid,
                    "Перенос отклонён",
                    $"Запрос на перенос «{req.Event.Title}» отклонён: {req.ReviewComment}",
                    "warning",
                    req.EventId);
            }

            return Ok(new { message = "Запрос отклонён" });
        }

        // ========== ОТМЕНА КОНЦЕРТОВ ==========
        [HttpGet("cancellation-requests")]
        public async Task<ActionResult<IEnumerable<object>>> GetCancellationRequests([FromQuery] string? status = null)
        {
            await DatabaseSchemaHelper.EnsureCancellationTableAsync(_context);
            var q = _context.EventCancellationRequests
                .Include(r => r.Event)
                .Include(r => r.Organizer)
                .AsQueryable();
            if (!string.IsNullOrWhiteSpace(status) && status != "all")
                q = q.Where(r => r.Status == status);

            var items = await q
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.EventId,
                    eventTitle = r.Event != null ? r.Event.Title : "",
                    eventDate = r.Event != null ? r.Event.Date : (DateTime?)null,
                    organizerEmail = r.Organizer != null ? r.Organizer.Email : "",
                    organizerName = r.Organizer != null ? r.Organizer.Name : "",
                    r.Status,
                    r.Reason,
                    r.CreatedAt,
                    r.ReviewedAt,
                    r.ReviewComment,
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpPost("cancellation-requests/{id}/approve")]
        public async Task<IActionResult> ApproveCancellationRequest(int id)
        {
            await DatabaseSchemaHelper.EnsureCancellationTableAsync(_context);
            var req = await _context.EventCancellationRequests
                .Include(r => r.Event)
                .FirstOrDefaultAsync(r => r.Id == id);
            if (req == null) return NotFound();
            if (req.Status != "pending") return BadRequest(new { message = "Заявка уже обработана" });

            var result = await _refundService.CancelEventAndRefundAllAsync(req.EventId, req.Reason);
            if (!result.Success)
                return BadRequest(new { message = result.Error });

            req.Status = "approved";
            req.ReviewedAt = DateTime.UtcNow;
            var adminId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            req.ReviewedByAdminId = string.IsNullOrEmpty(adminId) ? null : int.Parse(adminId);
            await _context.SaveChangesAsync();

            if (req.Event?.OrganizerId is int oid)
            {
                await NotificationHelper.CreateAsync(
                    _context,
                    oid,
                    "Отмена одобрена",
                    $"Заявка на отмену «{req.Event.Title}» одобрена. Держателям билетов отправлены письма о возврате.",
                    "success",
                    req.EventId);
            }

            return Ok(new
            {
                message = "Концерт отменён, возвраты и письма отправлены",
                ordersRefunded = result.OrdersRefunded,
                totalAmount = result.TotalAmount,
            });
        }

        [HttpPost("cancellation-requests/{id}/reject")]
        public async Task<IActionResult> RejectCancellationRequest(int id, [FromBody] ModerationCommentRequest model)
        {
            await DatabaseSchemaHelper.EnsureCancellationTableAsync(_context);
            if (string.IsNullOrWhiteSpace(model.Comment))
                return BadRequest(new { message = "Укажите причину отклонения" });

            var req = await _context.EventCancellationRequests
                .Include(r => r.Event)
                .FirstOrDefaultAsync(r => r.Id == id);
            if (req == null) return NotFound();
            if (req.Status != "pending") return BadRequest(new { message = "Заявка уже обработана" });

            req.Status = "rejected";
            req.ReviewComment = model.Comment.Trim();
            req.ReviewedAt = DateTime.UtcNow;
            var adminId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            req.ReviewedByAdminId = string.IsNullOrEmpty(adminId) ? null : int.Parse(adminId);
            await _context.SaveChangesAsync();

            if (req.Event?.OrganizerId is int oid)
            {
                await NotificationHelper.CreateAsync(
                    _context,
                    oid,
                    "Отмена отклонена",
                    $"Заявка на отмену «{req.Event.Title}» отклонена: {req.ReviewComment}",
                    "warning",
                    req.EventId);
            }

            return Ok(new { message = "Заявка отклонена" });
        }

        // ========== ВОЗВРАТ БИЛЕТОВ ==========
        [HttpGet("ticket-refund-requests")]
        public async Task<ActionResult<IEnumerable<object>>> GetTicketRefundRequests([FromQuery] string? status = "pending")
        {
            await DatabaseSchemaHelper.EnsureTicketRefundRequestsTableAsync(_context);
            var q = _context.TicketRefundRequests
                .Include(r => r.User)
                .Include(r => r.Event)
                .Include(r => r.UserTicket)
                .ThenInclude(t => t!.Seat)
                .AsQueryable();
            if (!string.IsNullOrWhiteSpace(status) && status != "all")
                q = q.Where(r => r.Status == status);

            var rows = await q.ToListAsync();
            var now = DateTime.UtcNow;
            var items = rows
                .Select(r => new
                {
                    r.Id,
                    r.UserTicketId,
                    r.UserId,
                    userName = r.User?.Name,
                    userEmail = r.User?.Email,
                    r.EventId,
                    eventTitle = r.Event?.Title,
                    eventDate = r.Event?.Date,
                    eventTime = r.Event?.Time,
                    ticketType = r.UserTicket?.TicketType,
                    price = r.UserTicket?.Price,
                    seatRow = r.UserTicket?.Seat?.Row,
                    seatNumber = r.UserTicket?.Seat?.Number,
                    r.Reason,
                    r.Status,
                    r.CreatedAt,
                    r.ReviewedAt,
                    r.ReviewComment,
                    hoursUntilEvent = r.Event != null ? EventDateTimeHelper.HoursUntil(r.Event, now) : null,
                })
                .OrderBy(r => r.hoursUntilEvent ?? 99999)
                .ThenByDescending(r => r.CreatedAt)
                .ToList();

            return Ok(items);
        }

        [HttpPost("ticket-refund-requests/{id}/approve")]
        public async Task<IActionResult> ApproveTicketRefundRequest(int id)
        {
            await DatabaseSchemaHelper.EnsureTicketRefundRequestsTableAsync(_context);
            var req = await _context.TicketRefundRequests
                .Include(r => r.UserTicket)
                .Include(r => r.Event)
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.Id == id);
            if (req == null) return NotFound();
            if (req.Status != "pending") return BadRequest(new { message = "Заявка уже обработана" });

            var reason = string.IsNullOrWhiteSpace(req.Reason)
                ? "Возврат одобрен администратором."
                : $"Возврат одобрен: {req.Reason.Trim()}";
            var result = await _refundService.RefundSingleTicketAsync(req.UserTicketId, reason);
            if (!result.Success)
                return BadRequest(new { message = result.Error });

            req.Status = "approved";
            req.ReviewedAt = DateTime.UtcNow;
            var adminId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            req.ReviewedByAdminId = string.IsNullOrEmpty(adminId) ? null : int.Parse(adminId);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Возврат одобрен, место снова доступно на схеме",
                amount = result.TotalAmount,
            });
        }

        [HttpPost("ticket-refund-requests/{id}/reject")]
        public async Task<IActionResult> RejectTicketRefundRequest(int id, [FromBody] ModerationCommentRequest model)
        {
            await DatabaseSchemaHelper.EnsureTicketRefundRequestsTableAsync(_context);
            if (string.IsNullOrWhiteSpace(model.Comment))
                return BadRequest(new { message = "Укажите причину отклонения" });

            var req = await _context.TicketRefundRequests
                .Include(r => r.User)
                .Include(r => r.Event)
                .FirstOrDefaultAsync(r => r.Id == id);
            if (req == null) return NotFound();
            if (req.Status != "pending") return BadRequest(new { message = "Заявка уже обработана" });

            req.Status = "rejected";
            req.ReviewComment = model.Comment.Trim();
            req.ReviewedAt = DateTime.UtcNow;
            var adminId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            req.ReviewedByAdminId = string.IsNullOrEmpty(adminId) ? null : int.Parse(adminId);

            if (req.UserId > 0)
            {
                await NotificationHelper.CreateAsync(
                    _context,
                    req.UserId,
                    "Возврат отклонён",
                    $"Заявка на возврат билета «{req.Event?.Title}» отклонена: {req.ReviewComment}",
                    "warning",
                    req.EventId);
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Заявка отклонена" });
        }

        // ========== ЧАТ ПОДДЕРЖКИ ==========
        [HttpGet("support-threads")]
        public async Task<ActionResult<IEnumerable<object>>> GetSupportThreads([FromQuery] string? status = null)
        {
            var q = _context.SupportThreads.Include(t => t.User).AsQueryable();
            if (!string.IsNullOrWhiteSpace(status))
                q = q.Where(t => t.Status == status);

            var items = await q
                .OrderByDescending(t => t.UpdatedAt)
                .Select(t => new
                {
                    t.Id,
                    t.Status,
                    t.UserRole,
                    t.CreatedAt,
                    t.UpdatedAt,
                    User = t.User == null ? null : new { t.User.Id, t.User.Name, t.User.Email, t.User.IsOrganizer },
                    LastMessage = t.Messages.OrderByDescending(m => m.CreatedAt).Select(m => m.Content).FirstOrDefault(),
                })
                .ToListAsync();
            return Ok(items);
        }

        [HttpGet("support-threads/{id}/messages")]
        public async Task<ActionResult<object>> GetSupportMessages(int id)
        {
            var thread = await _context.SupportThreads.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == id);
            if (thread == null) return NotFound();
            var messages = await _context.SupportMessages
                .Where(m => m.ThreadId == id)
                .OrderBy(m => m.CreatedAt)
                .Select(m => new { m.Id, m.SenderRole, m.Content, m.CreatedAt })
                .ToListAsync();
            return Ok(new
            {
                thread.Id,
                thread.Status,
                thread.UserRole,
                user = thread.User == null ? null : new
                {
                    thread.User.Id,
                    thread.User.Name,
                    thread.User.Email,
                    thread.User.IsOrganizer,
                },
                messages,
            });
        }

        [HttpPost("support-threads/{id}/reply")]
        public async Task<IActionResult> ReplySupportThread(int id, [FromBody] SupportReplyRequest body)
        {
            if (string.IsNullOrWhiteSpace(body.Reply))
                return BadRequest(new { message = "Введите ответ" });

            var thread = await _context.SupportThreads.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == id);
            if (thread == null) return NotFound();

            var reply = body.Reply.Trim();
            _context.SupportMessages.Add(new SupportMessage
            {
                ThreadId = id,
                SenderRole = "admin",
                Content = reply,
                CreatedAt = DateTime.UtcNow,
            });
            thread.Status = "answered";
            thread.UpdatedAt = DateTime.UtcNow;

            var lastUserMsg = await _context.SupportMessages
                .Where(m => m.ThreadId == id && m.SenderRole == "user")
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => m.Content)
                .FirstOrDefaultAsync() ?? "";

            if (thread.User != null)
            {
                await NotificationHelper.CreateAsync(
                    _context,
                    thread.UserId,
                    "Ответ поддержки",
                    reply.Length > 200 ? reply[..200] + "…" : reply,
                    "info");
                await _emailService.SendSupportChatReplyAsync(
                    thread.User.Email,
                    thread.User.Name,
                    lastUserMsg,
                    reply);
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Ответ отправлен" });
        }

        [HttpPatch("support-threads/{id}/status")]
        public async Task<IActionResult> UpdateSupportThreadStatus(int id, [FromBody] UpdateSupportThreadStatusRequest body)
        {
            var allowed = new[] { "ai", "awaiting_admin", "answered", "resolved", "closed" };
            var status = (body.Status ?? "").Trim().ToLowerInvariant();
            if (!allowed.Contains(status))
                return BadRequest(new { message = "Недопустимый статус" });

            var thread = await _context.SupportThreads.FindAsync(id);
            if (thread == null) return NotFound();

            thread.Status = status;
            thread.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Статус обновлён", status });
        }

        [HttpDelete("support-messages/{messageId}")]
        public async Task<IActionResult> DeleteSupportMessage(int messageId)
        {
            var msg = await _context.SupportMessages.FindAsync(messageId);
            if (msg == null) return NotFound();

            _context.SupportMessages.Remove(msg);
            var thread = await _context.SupportThreads.FindAsync(msg.ThreadId);
            if (thread != null) thread.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Сообщение удалено" });
        }

        [HttpGet("cookie-consents")]
        public async Task<ActionResult<IEnumerable<object>>> GetCookieConsents([FromQuery] int limit = 100)
        {
            await DatabaseSchemaHelper.EnsureCookieConsentsTableAsync(_context);
            var take = Math.Clamp(limit, 1, 500);
            var rows = await _context.CookieConsents
                .Include(c => c.User)
                .OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt)
                .Take(take)
                .Select(c => new
                {
                    c.Id,
                    c.VisitorId,
                    c.UserId,
                    userEmail = c.User != null ? c.User.Email : null,
                    userName = c.User != null ? c.User.Name : null,
                    c.Essential,
                    c.Analytics,
                    c.Marketing,
                    c.UserAgent,
                    c.CreatedAt,
                    c.UpdatedAt,
                })
                .ToListAsync();
            return Ok(rows);
        }
    }

    // Models
    public class UpdateUserModel
    {
        public string? Name { get; set; }
        public string? Email { get; set; }
        public string? Password { get; set; }
        public bool? IsAdmin { get; set; }
        public bool? IsOrganizer { get; set; }
        public bool? EmailVerified { get; set; }
    }

    public class CatalogFilterDto
    {
        public string? Kind { get; set; }
        public string? Label { get; set; }
        public int? SortOrder { get; set; }
        public bool? IsActive { get; set; }
    }

    public class CreateUserModel
    {
        public required string Name { get; set; }
        public required string Email { get; set; }
        public required string Password { get; set; }
        public bool? IsAdmin { get; set; }
        public bool? IsOrganizer { get; set; }
        public bool? EmailVerified { get; set; }
    }

    public class SetOrganizerRoleRequest
    {
        public string? Email { get; set; }
        public int? UserId { get; set; }
        public bool IsOrganizer { get; set; }
    }

    public class ModerationCommentRequest
    {
        public string? Comment { get; set; }
    }

    public class CancelEventRequest
    {
        public string? Reason { get; set; }
    }

    public class RefundOrderRequest
    {
        public string? Reason { get; set; }
    }

    public class SupportReplyRequest
    {
        public string Reply { get; set; } = "";
    }

    public class UpdateSupportThreadStatusRequest
    {
        public string Status { get; set; } = "";
    }

    public class UpdateOrderModel
    {
        public string? Status { get; set; }
    }

    public class UpdateReviewModel
    {
        public bool? IsApproved { get; set; }
        public string? Comment { get; set; }
    }

    public class UpdateContactMessageModel
    {
        public string? Status { get; set; }
        public string? Response { get; set; }
    }

    public class GaCapacityRequest
    {
        public string? Sector { get; set; }
        public int Capacity { get; set; }
        public decimal? Price { get; set; }
    }
}

