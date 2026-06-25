using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MyMvcBackend.Data;
using MyMvcBackend.Models;
using MyMvcBackend.Services;

namespace MyMvcBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly OtpService _otp;
        private readonly CaptchaService _captcha;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            ApplicationDbContext context,
            IConfiguration configuration,
            IEmailService emailService,
            OtpService otp,
            CaptchaService captcha,
            ILogger<AuthController> logger)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
            _otp = otp;
            _captcha = captcha;
            _logger = logger;
        }

        [HttpPost("register/start")]
        public async Task<IActionResult> RegisterStart([FromBody] RegisterStartModel model)
        {
            if (!_captcha.ConsumeToken(model.CaptchaToken))
                return BadRequest(new { message = "Пройдите проверку «Я не робот»" });

            if (string.IsNullOrWhiteSpace(model.Name) || string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Password))
                return BadRequest(new { message = "Заполните все поля" });

            if (model.Password.Length < 6)
                return BadRequest(new { message = "Пароль должен содержать минимум 6 символов" });

            if (model.Password != model.ConfirmPassword)
                return BadRequest(new { message = "Пароли не совпадают" });

            var hash = BCrypt.Net.BCrypt.HashPassword(model.Password);
            var (ok, error, challengeId, expiresIn) = await _otp.StartRegisterAsync(model.Email, model.Name, hash);
            if (!ok) return BadRequest(new { message = error });

            return Ok(new { challengeId, expiresInSec = expiresIn, message = "Код отправлен на email" });
        }

        [HttpPost("register/resend")]
        public async Task<IActionResult> RegisterResend([FromBody] OtpResendModel model)
        {
            var (ok, error, expiresIn) = await _otp.ResendAsync(model.ChallengeId);
            if (!ok) return BadRequest(new { message = error });
            return Ok(new { expiresInSec = expiresIn, message = "Новый код отправлен" });
        }

        [HttpPost("register/verify")]
        public async Task<IActionResult> RegisterVerify([FromBody] OtpVerifyModel model)
        {
            var (ok, error, user, payload) = await _otp.VerifyAsync(model.ChallengeId, model.Code ?? "");
            if (!ok) return BadRequest(new { message = error });

            if (payload == null || string.IsNullOrEmpty(payload.Email))
                return BadRequest(new { message = "Данные регистрации не найдены" });

            var newUser = new User
            {
                Name = payload.Name,
                Email = payload.Email,
                PasswordHash = payload.PasswordHash,
                EmailVerified = true,
                VerificationToken = null,
                TokenExpiresAt = null,
            };
            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            newUser.QrSessionStartedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _ = _emailService.SendWelcomeEmailAsync(newUser.Email, newUser.Name);

            var token = GenerateJwtToken(newUser);
            _logger.LogInformation("User registered with 2FA: {Email}", newUser.Email);
            return Ok(BuildAuthResponse(newUser, token));
        }

        [HttpPost("login/start")]
        public async Task<IActionResult> LoginStart([FromBody] LoginStartModel model)
        {
            if (!_captcha.ConsumeToken(model.CaptchaToken))
                return BadRequest(new { message = "Пройдите проверку «Я не робот»" });

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email.Trim());
            if (user == null || !BCrypt.Net.BCrypt.Verify(model.Password, user.PasswordHash))
                return BadRequest(new { message = "Неверный email или пароль" });

            var (ok, error, challengeId, expiresIn) = await _otp.StartLoginAsync(user);
            if (!ok) return BadRequest(new { message = error });

            return Ok(new { challengeId, expiresInSec = expiresIn, message = "Код отправлен на email" });
        }

        [HttpPost("login/resend")]
        public async Task<IActionResult> LoginResend([FromBody] OtpResendModel model)
        {
            var (ok, error, expiresIn) = await _otp.ResendAsync(model.ChallengeId);
            if (!ok) return BadRequest(new { message = error });
            return Ok(new { expiresInSec = expiresIn, message = "Новый код отправлен" });
        }

        [HttpPost("login/verify")]
        public async Task<IActionResult> LoginVerify([FromBody] OtpVerifyModel model)
        {
            var (ok, error, user, _) = await _otp.VerifyAsync(model.ChallengeId, model.Code ?? "");
            if (!ok || user == null) return BadRequest(new { message = error ?? "Ошибка входа" });

            user.QrSessionStartedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);
            return Ok(BuildAuthResponse(user, token));
        }

        [HttpGet("google-config")]
        public IActionResult GoogleConfig()
        {
            var clientId = _configuration["Google:ClientId"]?.Trim();
            return Ok(new { clientId = string.IsNullOrEmpty(clientId) ? null : clientId });
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginModel model)
        {
            if (string.IsNullOrWhiteSpace(model.Credential))
                return BadRequest(new { message = "Отсутствует токен Google" });

            var clientId = _configuration["Google:ClientId"]?.Trim();
            if (string.IsNullOrEmpty(clientId))
                return BadRequest(new { message = "Вход через Google не настроен на сервере" });

            GoogleJsonWebSignature.Payload payload;
            try
            {
                payload = await GoogleJsonWebSignature.ValidateAsync(
                    model.Credential,
                    new GoogleJsonWebSignature.ValidationSettings { Audience = new[] { clientId } });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Invalid Google token");
                return BadRequest(new { message = "Не удалось проверить аккаунт Google" });
            }

            if (string.IsNullOrEmpty(payload.Email))
                return BadRequest(new { message = "Google не предоставил email" });

            var email = payload.Email.Trim().ToLowerInvariant();
            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.Email.ToLower() == email || u.GoogleSubjectId == payload.Subject);

            if (user == null)
            {
                user = new User
                {
                    Name = payload.Name ?? payload.GivenName ?? email.Split('@')[0],
                    Email = email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
                    EmailVerified = payload.EmailVerified,
                    GoogleSubjectId = payload.Subject,
                };
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
                _ = _emailService.SendWelcomeEmailAsync(user.Email, user.Name);
            }
            else
            {
                if (string.IsNullOrEmpty(user.GoogleSubjectId))
                {
                    user.GoogleSubjectId = payload.Subject;
                    user.UpdatedAt = DateTime.UtcNow;
                }
                if (!string.IsNullOrWhiteSpace(payload.Name) && user.Name != payload.Name)
                    user.Name = payload.Name;
                await _context.SaveChangesAsync();
            }

            user.QrSessionStartedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);
            return Ok(BuildAuthResponse(user, token));
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordModel model)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();
            var userId = int.Parse(userIdClaim.Value);
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return Unauthorized();
            if (!BCrypt.Net.BCrypt.Verify(model.OldPassword, user.PasswordHash))
                return BadRequest(new { message = "Старый пароль неверный" });
            if (model.NewPassword.Length < 6)
                return BadRequest(new { message = "Новый пароль слишком короткий" });
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Пароль успешно изменён" });
        }

        [Authorize]
        [HttpPost("qr-session")]
        public async Task<IActionResult> StartQrSession()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();
            var user = await _context.Users.FindAsync(int.Parse(userIdClaim.Value));
            if (user == null) return Unauthorized();

            user.QrSessionStartedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new
            {
                qrSessionStartedAt = user.QrSessionStartedAt,
                windowMinutes = RotatingQrService.WindowMinutes,
            });
        }

        private object BuildAuthResponse(User user, string token) => new
        {
            token,
            id = user.Id.ToString(),
            name = user.Name,
            email = user.Email,
            joinedDate = user.CreatedAt,
            isAdmin = user.IsAdmin,
            isOrganizer = user.IsOrganizer,
            avatarUrl = user.AvatarUrl,
        };

        private string GenerateJwtToken(User user)
        {
            var jwtKey = _configuration["Jwt:Key"]
                ?? throw new InvalidOperationException("Jwt:Key не задан в конфигурации");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new(ClaimTypes.Email, user.Email),
                new(ClaimTypes.Name, user.Name),
            };
            if (user.IsAdmin) claims.Add(new Claim(ClaimTypes.Role, "Admin"));
            if (user.IsOrganizer) claims.Add(new Claim(ClaimTypes.Role, "Organizer"));

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddMinutes(Convert.ToDouble(_configuration["Jwt:ExpiryInMinutes"])),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public class RegisterStartModel
        {
            public string Name { get; set; } = "";
            public string Email { get; set; } = "";
            public string Password { get; set; } = "";
            public string ConfirmPassword { get; set; } = "";
            public string? CaptchaToken { get; set; }
        }

        public class LoginStartModel
        {
            public string Email { get; set; } = "";
            public string Password { get; set; } = "";
            public string? CaptchaToken { get; set; }
        }

        public class OtpVerifyModel
        {
            public int ChallengeId { get; set; }
            public string? Code { get; set; }
        }

        public class OtpResendModel
        {
            public int ChallengeId { get; set; }
        }

        public class GoogleLoginModel
        {
            public string Credential { get; set; } = "";
        }

        public class ChangePasswordModel
        {
            public string OldPassword { get; set; } = "";
            public string NewPassword { get; set; } = "";
        }
    }
}
