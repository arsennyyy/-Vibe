using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace MyMvcBackend.Services;

public interface IAiChatService
{
    bool IsConfigured { get; }
    Task<string> ReplyAsync(string userMessage, IReadOnlyList<(string Role, string Content)> history);
}

/// <summary>
/// Провайдеры: yandex (YandexGPT), gemini, openai (OpenAI / OpenRouter / Ollama).
/// </summary>
public class AiChatService : IAiChatService
{
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _http;
    private readonly ILogger<AiChatService> _logger;

    private string SystemPrompt
    {
        get
        {
            var email = _config["Site:ContactEmail"] ?? "projectmanagementtoll@gmail.com";
            return $"""
                Ты — помощник службы поддержки билетной платформы +Vibe (концерты в Беларуси).
                Отвечай кратко, по-русски, по делу: билеты, возвраты при отмене, QR-код, профиль, оплата, схема зала.
                Не выдумывай цены и даты. Если нужен человек — предложи нажать кнопку «Связь с поддержкой».
                Единственный официальный email поддержки: {email} (указан на странице «Контакты»). Никогда не называй другие адреса.
                """;
        }
    }

    public AiChatService(IConfiguration config, IHttpClientFactory http, ILogger<AiChatService> logger)
    {
        _config = config;
        _http = http;
        _logger = logger;
    }

    private string Provider => (_config["Ai:Provider"] ?? "gemini").Trim().ToLowerInvariant();

    public bool IsConfigured => Provider switch
    {
        "yandex" => !string.IsNullOrWhiteSpace(_config["Ai:ApiKey"])
                    && !string.IsNullOrWhiteSpace(_config["Ai:FolderId"]),
        _ => !string.IsNullOrWhiteSpace(_config["Ai:ApiKey"]),
    };

    public async Task<string> ReplyAsync(string userMessage, IReadOnlyList<(string Role, string Content)> history)
    {
        if (!IsConfigured)
        {
            return "ИИ-ассистент временно недоступен. Нажмите «Связь с поддержкой» — администратор ответит вам.";
        }

        return Provider switch
        {
            "yandex" => await ReplyYandexAsync(userMessage, history),
            "openai" => await ReplyOpenAiAsync(userMessage, history),
            _ => await ReplyGeminiAsync(userMessage, history),
        };
    }

    private async Task<string> ReplyGeminiAsync(string userMessage, IReadOnlyList<(string Role, string Content)> history)
    {
        var apiKey = _config["Ai:ApiKey"]!;
        var model = _config["Ai:Model"] ?? "gemini-flash-latest";
        var baseUrl = (_config["Ai:BaseUrl"] ?? "https://generativelanguage.googleapis.com/v1beta").TrimEnd('/');

        var contents = new List<object>();
        foreach (var (role, content) in history.TakeLast(12))
        {
            if (string.IsNullOrWhiteSpace(content) || role is "admin") continue;
            var geminiRole = role == "user" ? "user" : "model";
            contents.Add(new
            {
                role = geminiRole,
                parts = new[] { new { text = content.Trim() } },
            });
        }
        contents.Add(new
        {
            role = "user",
            parts = new[] { new { text = userMessage.Trim() } },
        });

        var payload = JsonSerializer.Serialize(new
        {
            systemInstruction = new
            {
                parts = new[] { new { text = SystemPrompt } },
            },
            contents,
            generationConfig = new { temperature = 0.4, maxOutputTokens = 1024 },
        });

        var client = _http.CreateClient();
        client.DefaultRequestHeaders.Add("X-goog-api-key", apiKey);

        var url = $"{baseUrl}/models/{model}:generateContent";
        using var res = await client.PostAsync(url, new StringContent(payload, Encoding.UTF8, "application/json"));

        if (!res.IsSuccessStatusCode)
        {
            var err = await res.Content.ReadAsStringAsync();
            _logger.LogWarning("Gemini API error {Status}: {Body}", res.StatusCode, err);

            return SupportFaqFallback.TryAnswer(userMessage);
        }

        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        if (!doc.RootElement.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
            return "Пустой ответ. Уточните вопрос или обратитесь в поддержку.";

        var text = candidates[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString();

        return string.IsNullOrWhiteSpace(text)
            ? "Пустой ответ. Уточните вопрос или обратитесь в поддержку."
            : text.Trim();
    }

    private async Task<string> ReplyYandexAsync(string userMessage, IReadOnlyList<(string Role, string Content)> history)
    {
        var apiKey = _config["Ai:ApiKey"]!;
        var folderId = _config["Ai:FolderId"]!;
        var model = _config["Ai:Model"] ?? "yandexgpt-lite/latest";
        var baseUrl = (_config["Ai:BaseUrl"] ?? "https://llm.api.cloud.yandex.net/foundationModels/v1").TrimEnd('/');

        var messages = new List<object> { new { role = "system", text = SystemPrompt } };
        foreach (var (role, content) in history.TakeLast(12))
        {
            if (string.IsNullOrWhiteSpace(content) || role is "admin") continue;
            var r = role == "user" ? "user" : "assistant";
            messages.Add(new { role = r, text = content.Trim() });
        }
        messages.Add(new { role = "user", text = userMessage.Trim() });

        var payload = JsonSerializer.Serialize(new
        {
            modelUri = $"gpt://{folderId}/{model}",
            completionOptions = new { stream = false, temperature = 0.4, maxTokens = 1024 },
            messages,
        });

        var client = _http.CreateClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Api-Key {apiKey}");
        client.DefaultRequestHeaders.Add("x-folder-id", folderId);

        using var res = await client.PostAsync(
            $"{baseUrl}/completion",
            new StringContent(payload, Encoding.UTF8, "application/json"));

        if (!res.IsSuccessStatusCode)
        {
            var err = await res.Content.ReadAsStringAsync();
            _logger.LogWarning("YandexGPT API error {Status}: {Body}", res.StatusCode, err);
            return SupportFaqFallback.TryAnswer(userMessage);
        }

        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        var text = doc.RootElement
            .GetProperty("result")
            .GetProperty("alternatives")[0]
            .GetProperty("message")
            .GetProperty("text")
            .GetString();

        return string.IsNullOrWhiteSpace(text)
            ? "Пустой ответ. Уточните вопрос или обратитесь в поддержку."
            : text.Trim();
    }

    private async Task<string> ReplyOpenAiAsync(string userMessage, IReadOnlyList<(string Role, string Content)> history)
    {
        var baseUrl = _config["Ai:BaseUrl"]?.TrimEnd('/');
        if (string.IsNullOrWhiteSpace(baseUrl))
            return "ИИ не настроен (нужен Ai:BaseUrl для OpenAI).";

        var model = _config["Ai:Model"] ?? "gpt-4o-mini";
        var apiKey = _config["Ai:ApiKey"]!;

        var messages = new List<object> { new { role = "system", content = SystemPrompt } };
        foreach (var (role, content) in history.TakeLast(12))
        {
            if (string.IsNullOrWhiteSpace(content)) continue;
            var r = role == "user" ? "user" : "assistant";
            messages.Add(new { role = r, content });
        }
        messages.Add(new { role = "user", content = userMessage });

        var payload = JsonSerializer.Serialize(new { model, messages, temperature = 0.4 });
        var client = _http.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        using var res = await client.PostAsync(
            $"{baseUrl}/chat/completions",
            new StringContent(payload, Encoding.UTF8, "application/json"));

        if (!res.IsSuccessStatusCode)
        {
            var err = await res.Content.ReadAsStringAsync();
            _logger.LogWarning("OpenAI API error {Status}: {Body}", res.StatusCode, err);
            return SupportFaqFallback.TryAnswer(userMessage);
        }

        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        var text = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();
        return string.IsNullOrWhiteSpace(text)
            ? "Пустой ответ. Уточните вопрос или обратитесь в поддержку."
            : text.Trim();
    }
}
