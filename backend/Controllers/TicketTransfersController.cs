using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;
using MyMvcBackend.Services;

namespace MyMvcBackend.Controllers;

[ApiController]
[Route("api/ticket-transfers")]
[Authorize]
public class TicketTransfersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly TicketTransferService _transfers;
    private readonly ILogger<TicketTransfersController> _logger;

    public TicketTransfersController(
        ApplicationDbContext context,
        TicketTransferService transfers,
        ILogger<TicketTransfersController> logger)
    {
        _context = context;
        _transfers = transfers;
        _logger = logger;
    }

    private int? CurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null ? int.Parse(claim.Value) : null;
    }

    [HttpPost("tickets/{ticketId}")]
    public async Task<IActionResult> Initiate(int ticketId, [FromBody] TransferInitiateBody? body)
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized();

        var (ok, error, transfer) = await _transfers.InitiateAsync(userId.Value, ticketId, body?.RecipientEmail ?? "");
        if (!ok) return BadRequest(new { message = error });
        return Ok(new { transferId = transfer!.Id, expiresInSec = TicketTransferService.TransferWindowMinutes * 60 });
    }

    [HttpGet("incoming")]
    public async Task<IActionResult> Incoming()
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized();

        await DatabaseSchemaHelper.EnsureTicketTransferSchemaAsync(_context);
        var utcNow = DateTime.UtcNow;
        await _transfers.ExpireStaleAsync(utcNow);

        var user = await _context.Users.FindAsync(userId.Value);
        var list = await _context.TicketTransfers
            .Include(t => t.UserTicket).ThenInclude(ut => ut!.Event)
            .Include(t => t.UserTicket).ThenInclude(ut => ut!.Seat)
            .Include(t => t.Sender)
            .Include(t => t.Recipient)
            .Where(t => t.RecipientUserId == userId && t.Status == "pending" && t.ExpiresAt > utcNow)
            .OrderBy(t => t.ExpiresAt)
            .ToListAsync();

        return Ok(list.Select(t => TicketTransferService.MapTransferDto(t, user, utcNow)));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized();

        await DatabaseSchemaHelper.EnsureTicketTransferSchemaAsync(_context);
        var utcNow = DateTime.UtcNow;
        await _transfers.ExpireStaleAsync(utcNow);

        var user = await _context.Users.FindAsync(userId.Value);
        var transfer = await _context.TicketTransfers
            .Include(t => t.UserTicket).ThenInclude(ut => ut!.Event)
            .Include(t => t.UserTicket).ThenInclude(ut => ut!.Seat)
            .Include(t => t.Sender)
            .Include(t => t.Recipient)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transfer == null) return NotFound();
        if (transfer.SenderUserId != userId && transfer.RecipientUserId != userId)
            return Forbid();

        return Ok(TicketTransferService.MapTransferDto(transfer, user, utcNow));
    }

    [HttpPost("{id}/decline")]
    public async Task<IActionResult> Decline(int id)
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized();

        await DatabaseSchemaHelper.EnsureTicketTransferSchemaAsync(_context);
        var utcNow = DateTime.UtcNow;

        var transfer = await _context.TicketTransfers
            .Include(t => t.UserTicket).ThenInclude(ut => ut!.Event)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transfer == null) return NotFound();
        if (transfer.RecipientUserId != userId) return Forbid();
        if (transfer.Status != "pending") return BadRequest(new { message = "Передача уже обработана" });

        transfer.Status = "declined";
        transfer.RespondedAt = utcNow;
        await _context.SaveChangesAsync();

        await NotificationHelper.CreateAsync(
            _context,
            transfer.SenderUserId,
            "Передача отклонена",
            $"Пользователь отклонил билет на «{transfer.UserTicket?.Event?.Title ?? "мероприятие"}».",
            "info",
            transfer.UserTicket?.EventId,
            transfer.UserTicketId);

        return Ok(new { message = "Передача отклонена" });
    }

    [HttpPost("{id}/pay")]
    public async Task<IActionResult> Pay(int id)
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized();

        try
        {
            var (ok, error, dto) = await _transfers.PayAsync(userId.Value, id);
            if (!ok) return BadRequest(new { message = error });
            return Ok(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ticket transfer pay failed {TransferId}", id);
            return StatusCode(500, new { message = "Не удалось завершить оплату передачи" });
        }
    }
}

public class TransferInitiateBody
{
    public string RecipientEmail { get; set; } = "";
}
