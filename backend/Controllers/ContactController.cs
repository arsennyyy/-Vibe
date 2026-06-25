using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;
using MyMvcBackend.Services;

namespace MyMvcBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ContactController : ControllerBase
    {
        private readonly IEmailService _emailService;
        private readonly ApplicationDbContext _context;
        private readonly CaptchaService _captcha;
        private readonly ILogger<ContactController> _logger;

        public ContactController(
            IEmailService emailService,
            ApplicationDbContext context,
            CaptchaService captcha,
            ILogger<ContactController> logger)
        {
            _emailService = emailService;
            _context = context;
            _captcha = captcha;
            _logger = logger;
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] ContactFormModel model)
        {
            try
            {
                if (!_captcha.ConsumeToken(model.CaptchaToken))
                    return BadRequest(new { message = "Пройдите проверку «Я не робот»" });

                if (!ModelState.IsValid)
                {
                    return BadRequest(new { errors = ModelState });
                }

                var (emailOk, emailError) = await EmailAddressValidator.ValidateForOutboundAsync(model.Email);
                if (!emailOk)
                    return BadRequest(new { message = emailError });

                var message = new ContactMessage
                {
                    Name = model.Name.Trim(),
                    Email = model.Email.Trim(),
                    Message = model.Message.Trim(),
                    Status = "new",
                    CreatedAt = DateTime.UtcNow,
                };
                _context.ContactMessages.Add(message);
                await _context.SaveChangesAsync();

                var preview = model.Message.Trim();
                if (preview.Length > 120) preview = preview[..120] + "…";

                await NotificationHelper.NotifyAdminsAsync(
                    _context,
                    "Новое обращение",
                    $"{model.Name} ({model.Email}): {preview}",
                    "info");

                var emailSent = await _emailService.SendContactFormEmailAsync(model.Name, model.Email, model.Message);
                if (!emailSent)
                    _logger.LogWarning("Contact emails were not sent for {Email}", model.Email);

                return Ok(new
                {
                    message = emailSent
                        ? "Сообщение отправлено. Проверьте почту — мы прислали подтверждение."
                        : "Сообщение сохранено. Письмо не ушло: у Gmail-аккаунта в SmtpSettings мог быть исчерпан дневной лимит — подождите сутки или смените почту/пароль приложения.",
                    emailSent,
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving contact message from {Email}", model.Email);
                return StatusCode(500, new { message = "Ошибка при отправке сообщения" });
            }
        }
    }
}
