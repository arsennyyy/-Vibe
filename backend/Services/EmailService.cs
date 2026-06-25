using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace MyMvcBackend.Services
{
    public interface IEmailService
    {
        Task<bool> SendWelcomeEmailAsync(string toEmail, string userName);
        Task<bool> SendContactFormEmailAsync(string name, string email, string message);
        Task<bool> SendContactAcknowledgementAsync(string toEmail, string name);
        Task<bool> SendContactReplyAsync(string toEmail, string name, string originalMessage, string response, string statusLabel);
        Task<bool> SendModerationApprovedAsync(string toEmail, string organizerName, string eventTitle, int eventId);
        Task<bool> SendModerationRejectedAsync(string toEmail, string organizerName, string eventTitle, string reason);
        Task<bool> SendTicketPurchaseEmailAsync(
            string toEmail,
            string userName,
            string eventTitle,
            string orderNumber,
            string profileUrl,
            int qrWindowMinutes,
            int ticketCount = 1);
        Task<bool> SendOrderRefundedAsync(string toEmail, string userName, string eventTitle, string orderNumber, decimal amount, string reason);
        Task<bool> SendEventCancelledRefundAsync(string toEmail, string userName, string eventTitle, DateTime eventDate, string eventTime, string reason);
        Task<bool> SendEventRescheduledAsync(string toEmail, string userName, string eventTitle, DateTime oldDate, string oldTime, DateTime newDate, string newTime);
        Task<bool> SendSupportChatReplyAsync(string toEmail, string userName, string userMessage, string adminReply);
        Task<bool> SendOtpEmailAsync(string toEmail, string code, string purposeLabel);
        Task<bool> SendOrganizerGuideAsync(string toEmail, string userName, string siteUrl, byte[] pdfBytes);
        Task<bool> SendAdminGuideAsync(string toEmail, string userName, string siteUrl, byte[] pdfBytes);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
            EmailTemplates.SiteBase = configuration["SiteUrl"]?.Trim().TrimEnd('/')
                ?? "http://localhost:5173";
        }

        public Task<bool> SendWelcomeEmailAsync(string toEmail, string userName) =>
            SendHtmlAsync(
                toEmail,
                "Добро пожаловать в +Vibe",
                () => EmailTemplates.Welcome(userName),
                $"Здравствуйте, {userName}! Добро пожаловать на +Vibe.");

        public async Task<bool> SendContactFormEmailAsync(string name, string email, string message)
        {
            var adminEmail = GetAdminInbox();
            var toAdmin = await SendHtmlAsync(
                adminEmail,
                "Новое сообщение с сайта +Vibe",
                () => EmailTemplates.ContactFormToAdmin(name, email, message),
                $"Новое сообщение от {name} ({email}):\n{message}");
            var toUser = await SendContactAcknowledgementAsync(email, name);
            return toAdmin && toUser;
        }

        public Task<bool> SendContactAcknowledgementAsync(string toEmail, string name) =>
            SendHtmlAsync(
                toEmail,
                "Мы получили ваше сообщение — +Vibe",
                () => EmailTemplates.ContactAcknowledgement(name),
                $"Здравствуйте, {name}! Мы получили ваше обращение и скоро ответим.");

        public Task<bool> SendContactReplyAsync(string toEmail, string name, string originalMessage, string response, string statusLabel) =>
            SendHtmlAsync(
                toEmail,
                "Ответ службы поддержки +Vibe",
                () => EmailTemplates.ContactReply(name, originalMessage, response, statusLabel),
                $"Ответ поддержки ({statusLabel}):\n{response}");

        public Task<bool> SendModerationApprovedAsync(string toEmail, string organizerName, string eventTitle, int eventId) =>
            SendHtmlAsync(
                toEmail,
                "Заявка одобрена — +Vibe",
                () => EmailTemplates.ModerationApproved(organizerName, eventTitle, eventId),
                $"Заявка «{eventTitle}» одобрена.");

        public Task<bool> SendModerationRejectedAsync(string toEmail, string organizerName, string eventTitle, string reason) =>
            SendHtmlAsync(
                toEmail,
                "Заявка отклонена — +Vibe",
                () => EmailTemplates.ModerationRejected(organizerName, eventTitle, reason),
                $"Заявка «{eventTitle}» отклонена: {reason}");

        public Task<bool> SendTicketPurchaseEmailAsync(
            string toEmail,
            string userName,
            string eventTitle,
            string orderNumber,
            string profileUrl,
            int qrWindowMinutes,
            int ticketCount = 1) =>
            SendHtmlAsync(
                toEmail,
                ticketCount == 1 ? $"Билет куплен — {eventTitle} | +Vibe" : $"Билеты куплены ({ticketCount}) — {eventTitle} | +Vibe",
                () => TicketPurchaseEmail.HtmlBody(userName, eventTitle, orderNumber, profileUrl, qrWindowMinutes, ticketCount),
                ticketCount == 1
                    ? $"Билет на «{eventTitle}» добавлен в профиль +Vibe. Заказ: {orderNumber}. Откройте профиль: {profileUrl}"
                    : $"{ticketCount} билетов на «{eventTitle}» добавлены в профиль +Vibe. Заказ: {orderNumber}. Откройте профиль: {profileUrl}");

        public Task<bool> SendOrderRefundedAsync(string toEmail, string userName, string eventTitle, string orderNumber, decimal amount, string reason) =>
            SendHtmlAsync(
                toEmail,
                $"Возврат средств — {eventTitle} | +Vibe",
                () => EmailTemplates.OrderRefunded(userName, eventTitle, orderNumber, amount, reason),
                $"Возврат по заказу {orderNumber} на «{eventTitle}»: {amount:0.00} BYN. {reason}");

        public Task<bool> SendEventCancelledRefundAsync(string toEmail, string userName, string eventTitle, DateTime eventDate, string eventTime, string reason) =>
            SendHtmlAsync(
                toEmail,
                $"Мероприятие отменено — {eventTitle} | +Vibe",
                () => EmailTemplates.EventCancelled(userName, eventTitle, eventDate, eventTime, reason),
                $"«{eventTitle}» отменено. Оплаченные билеты возвращены. {reason}");

        public Task<bool> SendEventRescheduledAsync(string toEmail, string userName, string eventTitle, DateTime oldDate, string oldTime, DateTime newDate, string newTime) =>
            SendHtmlAsync(
                toEmail,
                $"Новая дата — {eventTitle} | +Vibe",
                () => EmailTemplates.EventRescheduled(userName, eventTitle, oldDate, oldTime, newDate, newTime),
                $"«{eventTitle}»: дата изменена с {oldDate:dd.MM.yyyy} {oldTime} на {newDate:dd.MM.yyyy} {newTime}.");

        public Task<bool> SendOtpEmailAsync(string toEmail, string code, string purposeLabel) =>
            SendHtmlAsync(
                toEmail,
                $"Код подтверждения +Vibe — {purposeLabel}",
                () => EmailTemplates.OtpCode(code, purposeLabel),
                $"Ваш код для {purposeLabel} на +Vibe: {code}. Действует 2 минуты.");

        public Task<bool> SendSupportChatReplyAsync(string toEmail, string userName, string userMessage, string adminReply) =>
            SendHtmlAsync(
                toEmail,
                "Ответ поддержки +Vibe",
                () => EmailTemplates.SupportChatReply(userName, userMessage, adminReply),
                $"Ответ поддержки: {adminReply}");

        public Task<bool> SendOrganizerGuideAsync(
            string toEmail,
            string userName,
            string siteUrl,
            byte[] pdfBytes) =>
            SendHtmlWithPdfAsync(
                toEmail,
                "Руководство организатора +Vibe",
                EmailTemplates.OrganizerGuideGranted(userName, siteUrl),
                $"Здравствуйте, {userName}! Вам назначена роль организатора на +Vibe. PDF-руководство во вложении. Кабинет: {siteUrl.TrimEnd('/')}/profile?tab=organizer",
                pdfBytes,
                "+Vibe_Руководство_организатора.pdf");

        public Task<bool> SendAdminGuideAsync(
            string toEmail,
            string userName,
            string siteUrl,
            byte[] pdfBytes) =>
            SendHtmlWithPdfAsync(
                toEmail,
                "Руководство администратора +Vibe",
                EmailTemplates.AdminGuideGranted(userName, siteUrl),
                $"Здравствуйте, {userName}! Вам назначена роль администратора на +Vibe. PDF-руководство во вложении. Панель: {siteUrl.TrimEnd('/')}/admin",
                pdfBytes,
                "+Vibe_Руководство_администратора.pdf");

        private string GetAdminInbox()
        {
            var smtp = _configuration.GetSection("SmtpSettings");
            return smtp["AdminEmail"]?.Trim()
                ?? smtp["Username"]?.Trim()
                ?? throw new InvalidOperationException("SmtpSettings:Username не задан");
        }

        private Task<bool> SendHtmlWithPdfAsync(
            string toEmail,
            string subject,
            string htmlBody,
            string plainBody,
            byte[] pdfBytes,
            string pdfFileName) =>
            SendMessageAsync(toEmail, subject, plainBody, htmlBody, pdfBytes, pdfFileName);

        private async Task<bool> SendHtmlAsync(
            string toEmail,
            string subject,
            Func<string> buildHtml,
            string plainBody) =>
            await SendMessageAsync(toEmail, subject, plainBody, buildHtml(), null, null);

        private async Task<bool> SendMessageAsync(
            string toEmail,
            string subject,
            string plainBody,
            string htmlBody,
            byte[]? pdfBytes,
            string? pdfFileName)
        {
            var smtp = _configuration.GetSection("SmtpSettings");
            var enabled = smtp.GetValue("Enabled", true);
            if (!enabled)
            {
                _logger.LogWarning("SMTP отключён (SmtpSettings:Enabled=false), письмо не отправлено: {Subject} → {To}", subject, toEmail);
                return false;
            }

            var (emailOk, emailError) = await EmailAddressValidator.ValidateForOutboundAsync(toEmail);
            if (!emailOk)
            {
                _logger.LogWarning("Письмо не отправлено — невалидный адрес {To}: {Reason}", toEmail, emailError);
                return false;
            }

            var host = smtp["Host"]?.Trim();
            var username = smtp["Username"]?.Trim();
            var password = (smtp["Password"] ?? "").Replace(" ", "");
            var fromName = smtp["FromName"]?.Trim() ?? "+Vibe";
            var port = smtp.GetValue("Port", 587);

            if (string.IsNullOrEmpty(host) || string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
            {
                _logger.LogError("SMTP не настроен: проверьте Host, Username и Password в appsettings.json");
                return false;
            }

            try
            {
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(fromName, username));
                message.To.Add(MailboxAddress.Parse(toEmail));
                message.Subject = subject;

                var builder = new BodyBuilder
                {
                    TextBody = plainBody,
                    HtmlBody = htmlBody,
                };

                if (pdfBytes is { Length: > 0 } && !string.IsNullOrWhiteSpace(pdfFileName))
                {
                    builder.Attachments.Add(pdfFileName, pdfBytes, ContentType.Parse("application/pdf"));
                }

                message.Body = builder.ToMessageBody();

                using var client = new SmtpClient();
                client.Timeout = 30_000;

                _logger.LogInformation("SMTP connect {Host}:{Port}, send «{Subject}» → {To}", host, port, subject, toEmail);

                await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(username, password);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);

                _logger.LogInformation("Письмо отправлено: {To}, subject: {Subject}", toEmail, subject);
                return true;
            }
            catch (Exception ex)
            {
                var hint = ex.Message.Contains("Daily user sending limit", StringComparison.OrdinalIgnoreCase)
                    ? "Gmail: превышен дневной лимит отправки (подождите ~24 ч или укажите другой SMTP-аккаунт в appsettings)."
                    : ex.Message;
                _logger.LogError(ex, "Ошибка SMTP → {To}: {Hint}", toEmail, hint);
                return false;
            }
        }
    }
}
