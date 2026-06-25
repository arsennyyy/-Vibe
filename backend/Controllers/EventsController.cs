using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;
using MyMvcBackend.Services;
using System.Text.Json;

namespace MyMvcBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EventsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly LineupAvatarRefreshService _lineupAvatars;

        public EventsController(ApplicationDbContext context, LineupAvatarRefreshService lineupAvatars)
        {
            _context = context;
            _lineupAvatars = lineupAvatars;
        }

        // GET: api/Events
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Event>>> GetEvents()
        {
            var now = DateTime.UtcNow;
            await EventCatalog.ProcessScheduleAsync(_context, now);
            var all = await _context.Events.Include(e => e.TicketTypes).ToListAsync();
            var visible = all.Where(e => EventCatalog.IsPubliclyVisible(e, now)).ToList();
            await EventCatalog.EnrichSoldOutAsync(_context, visible);
            return visible.OrderBy(e => e.Date).Select(NormalizeEventImage).ToList();
        }

        /// <summary>Персональная выдача: приоритет жанров из истории покупок.</summary>
        [HttpGet("recommended")]
        public async Task<ActionResult<IEnumerable<Event>>> GetRecommendedEvents()
        {
            var now = DateTime.UtcNow;
            await EventCatalog.ProcessScheduleAsync(_context, now);
            var all = await _context.Events.Include(e => e.TicketTypes).ToListAsync();
            var visible = all.Where(e => EventCatalog.IsPubliclyVisible(e, now)).ToList();
            await EventCatalog.EnrichSoldOutAsync(_context, visible);

            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
                return visible.OrderBy(e => e.Date).Select(NormalizeEventImage).ToList();

            var boughtGenres = await _context.UserTickets
                .Where(t => t.UserId == userId)
                .Join(_context.Events, t => t.EventId, e => e.Id, (_, e) => e.Genre)
                .Where(g => g != null && g != "")
                .GroupBy(g => g!)
                .OrderByDescending(g => g.Count())
                .Select(g => g.Key)
                .Take(5)
                .ToListAsync();

            if (boughtGenres.Count == 0)
                return visible.OrderBy(e => e.Date).Select(NormalizeEventImage).ToList();

            var related = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var g in boughtGenres)
            {
                related.Add(g);
                foreach (var alias in GenreAliases(g)) related.Add(alias);
            }

            return visible
                .OrderByDescending(e => e.Genre != null && boughtGenres.Contains(e.Genre) ? 20 : 0)
                .ThenByDescending(e => e.Genre != null && related.Contains(e.Genre) ? 10 : 0)
                .ThenBy(e => e.Date)
                .Select(NormalizeEventImage)
                .ToList();
        }

        private static IEnumerable<string> GenreAliases(string genre)
        {
            var key = genre.Trim().ToLowerInvariant();
            return key switch
            {
                "рок" or "rock" => new[] { "Инди", "Метал", "Альтернатива" },
                "инди" or "indie" => new[] { "Рок", "Поп" },
                "хип-хоп" or "hip-hop" or "hip hop" => new[] { "R&B", "Поп", "Рэп" },
                "поп" or "pop" => new[] { "Инди", "Электроника" },
                "электроника" or "electronic" => new[] { "Техно", "House", "Поп" },
                "джаз" or "jazz" => new[] { "Блюз", "Соул" },
                _ => Array.Empty<string>(),
            };
        }

        // Важно: статический сегмент «featured» должен быть выше «{id}», иначе «featured» трактуется как id и ломает привязку маршрута.
        [HttpGet("featured")]
        public async Task<ActionResult<IEnumerable<Event>>> GetFeaturedEvents()
        {
            var now = DateTime.UtcNow;
            await EventCatalog.ProcessScheduleAsync(_context, now);
            var all = await _context.Events
                .Include(e => e.TicketTypes)
                .Where(e => e.IsFeatured)
                .ToListAsync();
            var featured = all.Where(e => EventCatalog.IsPubliclyVisible(e, now)).ToList();
            await EventCatalog.EnrichSoldOutAsync(_context, featured);
            return featured.Select(NormalizeEventImage).ToList();
        }

        // GET: api/Events/5/related
        [HttpGet("{id:int}/related")]
        public async Task<ActionResult<IEnumerable<Event>>> GetRelatedEvents(int id, [FromQuery] int count = 4)
        {
            var now = DateTime.UtcNow;
            await EventCatalog.ProcessScheduleAsync(_context, now);

            var all = await _context.Events
                .Include(e => e.TicketTypes)
                .Where(e => e.Id != id)
                .ToListAsync();

            var visible = all.Where(e => EventCatalog.IsPubliclyVisible(e, now)).ToList();
            if (visible.Count == 0)
                return new List<Event>();

            var visibleIds = visible.Select(e => e.Id).ToList();

            var availableSeatCounts = await _context.Seats
                .Where(s => visibleIds.Contains(s.EventId) && s.Status == "available")
                .GroupBy(s => s.EventId)
                .Select(g => new { EventId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.EventId, x => x.Count);

            var eventsWithSeats = await _context.Seats
                .Where(s => visibleIds.Contains(s.EventId))
                .Select(s => s.EventId)
                .Distinct()
                .ToListAsync();
            var eventsWithSeatsSet = eventsWithSeats.ToHashSet();

            var candidates = visible
                .Where(e => EventCatalog.HasBookableAvailability(e, availableSeatCounts, eventsWithSeatsSet))
                .ToList();

            if (candidates.Count == 0)
                return new List<Event>();

            var rng = Random.Shared;
            var take = Math.Clamp(count, 1, 12);
            var picked = candidates
                .OrderBy(_ => rng.Next())
                .Take(take)
                .Select(NormalizeEventImage)
                .ToList();

            return picked;
        }

        // GET: api/Events/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<Event>> GetEvent(int id)
        {
            var now = DateTime.UtcNow;
            await EventCatalog.ProcessScheduleAsync(_context, now);
            var @event = await _context.Events
                .Include(e => e.TicketTypes)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (@event == null || !EventCatalog.IsPubliclyVisible(@event, now))
            {
                return NotFound();
            }

            await EventCatalog.EnrichSoldOutAsync(_context, new[] { @event });
            await _lineupAvatars.TryRefreshEventAsync(_context, @event);
            return NormalizeEventImage(@event);
        }

        // POST: api/Events
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<Event>> CreateEvent(Event @event)
        {
            @event.Status = EventStatus.Published;
            @event.UpdatedAt = DateTime.UtcNow;
            _context.Events.Add(@event);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEvent), new { id = @event.Id }, @event);
        }

        // PUT: api/Events/5
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateEvent(int id, Event @event)
        {
            if (id != @event.Id)
            {
                return BadRequest();
            }

            @event.UpdatedAt = DateTime.UtcNow;
            _context.Entry(@event).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!EventExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // DELETE: api/Events/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteEvent(int id)
        {
            var @event = await _context.Events.FindAsync(id);
            if (@event == null)
            {
                return NotFound();
            }

            _context.Events.Remove(@event);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool EventExists(int id)
        {
            return _context.Events.Any(e => e.Id == id);
        }

        private static Event NormalizeEventImage(Event e)
        {
            e.Image = EventImageResolver.Resolve(e.Image, e.Title, e.Lineup, e.Genre);
            return e;
        }
    }
} 