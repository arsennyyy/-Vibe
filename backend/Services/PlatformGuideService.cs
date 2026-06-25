using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;

namespace MyMvcBackend.Services
{
    public interface IPlatformGuideService
    {
        Task<bool> TrySendOrganizerGuideAsync(User user, bool force = false, CancellationToken ct = default);
        Task<bool> TrySendAdminGuideAsync(User user, bool force = false, CancellationToken ct = default);
        Task DispatchPendingGuidesAsync(CancellationToken ct = default);
    }

    public class PlatformGuideService : IPlatformGuideService
    {
        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;
        private readonly IPlatformGuidePdfGenerator _pdfGenerator;
        private readonly IConfiguration _configuration;
        private readonly ILogger<PlatformGuideService> _logger;

        public PlatformGuideService(
            ApplicationDbContext context,
            IEmailService emailService,
            IPlatformGuidePdfGenerator pdfGenerator,
            IConfiguration configuration,
            ILogger<PlatformGuideService> logger)
        {
            _context = context;
            _emailService = emailService;
            _pdfGenerator = pdfGenerator;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<bool> TrySendOrganizerGuideAsync(User user, bool force = false, CancellationToken ct = default)
        {
            if (!user.IsOrganizer) return false;
            if (!force && user.OrganizerGuideSentAt.HasValue) return false;

            var siteUrl = GetSiteUrl();
            var pdf = _pdfGenerator.Generate(PlatformGuideKind.Organizer, siteUrl);
            var sent = await _emailService.SendOrganizerGuideAsync(user.Email, user.Name, siteUrl, pdf);
            if (!sent)
            {
                await SkipGuideRetryIfEmailInvalidAsync(user, isOrganizer: true, ct);
                return false;
            }

            user.OrganizerGuideSentAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
            _logger.LogInformation("Руководство организатора отправлено → {Email}", user.Email);
            return true;
        }

        public async Task<bool> TrySendAdminGuideAsync(User user, bool force = false, CancellationToken ct = default)
        {
            if (!user.IsAdmin) return false;
            if (!force && user.AdminGuideSentAt.HasValue) return false;

            var siteUrl = GetSiteUrl();
            var pdf = _pdfGenerator.Generate(PlatformGuideKind.Admin, siteUrl);
            var sent = await _emailService.SendAdminGuideAsync(user.Email, user.Name, siteUrl, pdf);
            if (!sent)
            {
                await SkipGuideRetryIfEmailInvalidAsync(user, isOrganizer: false, ct);
                return false;
            }

            user.AdminGuideSentAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
            _logger.LogInformation("Руководство администратора отправлено → {Email}", user.Email);
            return true;
        }

        public async Task DispatchPendingGuidesAsync(CancellationToken ct = default)
        {
            var pending = await _context.Users
                .Where(u =>
                    (u.IsOrganizer && u.OrganizerGuideSentAt == null) ||
                    (u.IsAdmin && u.AdminGuideSentAt == null))
                .OrderBy(u => u.Id)
                .ToListAsync(ct);

            if (pending.Count == 0)
            {
                _logger.LogInformation("Рассылка руководств: все актуальные пользователи уже получили PDF");
                return;
            }

            _logger.LogInformation("Рассылка руководств: {Count} пользователей в очереди", pending.Count);

            foreach (var user in pending)
            {
                if (ct.IsCancellationRequested) break;

                if (user.IsOrganizer && user.OrganizerGuideSentAt == null)
                    await TrySendOrganizerGuideAsync(user, force: true, ct);

                if (user.IsAdmin && user.AdminGuideSentAt == null)
                    await TrySendAdminGuideAsync(user, force: true, ct);

                await Task.Delay(2500, ct);
            }
        }

        private string GetSiteUrl() =>
            _configuration["SiteUrl"]?.Trim().TrimEnd('/') ?? "http://localhost:5173";

        /// <summary>Не повторять рассылку при каждом старте сервера на мёртвый домен.</summary>
        private async Task SkipGuideRetryIfEmailInvalidAsync(User user, bool isOrganizer, CancellationToken ct)
        {
            if (await EmailAddressValidator.IsDomainDeliverableAsync(user.Email, ct)) return;

            var now = DateTime.UtcNow;
            if (isOrganizer)
                user.OrganizerGuideSentAt = now;
            else
                user.AdminGuideSentAt = now;
            user.UpdatedAt = now;
            await _context.SaveChangesAsync(ct);
            _logger.LogWarning(
                "Руководство не отправлено: домен email недоступен ({Email}). Повторная авто-рассылка отключена.",
                user.Email);
        }
    }
}
