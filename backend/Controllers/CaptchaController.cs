using Microsoft.AspNetCore.Mvc;
using MyMvcBackend.Services;

namespace MyMvcBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CaptchaController : ControllerBase
{
    private readonly CaptchaService _captcha;

    public CaptchaController(CaptchaService captcha) => _captcha = captcha;

    [HttpGet("challenge")]
    public IActionResult CreateChallenge() =>
        Ok(new { challengeId = _captcha.CreateChallenge() });

    [HttpPost("verify")]
    public IActionResult Verify([FromBody] CaptchaButtonRequest body)
    {
        var (ok, error, token) = _captcha.VerifyButton(body.ChallengeId ?? "");
        if (!ok) return BadRequest(new { message = error });
        return Ok(new { captchaToken = token });
    }
}

public class CaptchaButtonRequest
{
    public string? ChallengeId { get; set; }
}
