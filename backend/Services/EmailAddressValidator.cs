using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;
using MimeKit;

namespace MyMvcBackend.Services;

public static partial class EmailAddressValidator
{
    private static readonly Regex EmailFormat = EmailFormatRegex();

    public static bool HasValidFormat(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        var trimmed = email.Trim();
        if (!EmailFormat.IsMatch(trimmed)) return false;
        return MailboxAddress.TryParse(trimmed, out _);
    }

    public static string? GetDomain(string? email)
    {
        if (!HasValidFormat(email)) return null;
        return email!.Trim().ToLowerInvariant().Split('@', 2)[1];
    }

    /// <summary>Проверяет, что домен существует в DNS (есть A/AAAA или MX).</summary>
    public static async Task<bool> IsDomainDeliverableAsync(string? email, CancellationToken ct = default)
    {
        var domain = GetDomain(email);
        if (domain == null) return false;

        try
        {
            var hostEntry = await Dns.GetHostEntryAsync(domain, ct);
            if (hostEntry.AddressList.Length > 0) return true;
        }
        catch (SocketException) { /* нет A/AAAA */ }
        catch (Exception) { return false; }

        return await HasMxRecordAsync(domain, ct);
    }

    private static async Task<bool> HasMxRecordAsync(string domain, CancellationToken ct)
    {
        try
        {
            var query = await Dns.GetHostAddressesAsync($"mail.{domain}", ct);
            return query.Length > 0;
        }
        catch
        {
            return false;
        }
    }

    public static async Task<(bool Ok, string? Error)> ValidateForOutboundAsync(string? email, CancellationToken ct = default)
    {
        if (!HasValidFormat(email))
            return (false, "Некорректный адрес email");

        if (!await IsDomainDeliverableAsync(email, ct))
            return (false, "Домен email не существует или не принимает почту. Проверьте опечатку в адресе.");

        return (true, null);
    }

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex EmailFormatRegex();
}
