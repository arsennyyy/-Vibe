using System.Net;

namespace MyMvcBackend.Services
{
    internal static class TicketPurchaseEmail
    {
        public static string HtmlBody(
            string userName,
            string eventTitle,
            string orderNumber,
            string profileUrl,
            int qrWindowMinutes,
            int ticketCount = 1)
        {
            var ticketWord = ticketCount == 1 ? "Билет" : ticketCount is >= 2 and <= 4 ? "Билета" : "Билетов";
            var boughtLine = ticketCount == 1
                ? $"Оплата прошла успешно. Билет на <strong>«{WebUtility.HtmlEncode(eventTitle)}»</strong> добавлен в ваш профиль на +Vibe."
                : $"Оплата прошла успешно. <strong>{ticketCount} {ticketWord.ToLower()}</strong> на <strong>«{WebUtility.HtmlEncode(eventTitle)}»</strong> добавлены в ваш профиль на +Vibe.";

            return $@"
<!DOCTYPE html>
<html lang=""ru"">
<head><meta charset=""utf-8"" /></head>
<body style=""margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""padding:32px 16px;"">
    <tr><td align=""center"">
      <table role=""presentation"" width=""100%"" style=""max-width:520px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;"">
        <tr><td style=""height:4px;background:linear-gradient(90deg,#7c3aed,#a78bfa);""></td></tr>
        <tr><td style=""padding:28px 32px;"">
          <p style=""margin:0 0 8px;font-size:22px;font-weight:800;color:#7c3aed;"">+Vibe</p>
          <h1 style=""margin:0 0 16px;font-size:20px;color:#111827;"">{(ticketCount == 1 ? "Билет успешно куплен" : "Билеты успешно куплены")}</h1>
          <p style=""margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;"">Здравствуйте, <strong>{WebUtility.HtmlEncode(userName)}</strong>!</p>
          <p style=""margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;"">
            {boughtLine}
          </p>
          <table role=""presentation"" width=""100%"" style=""margin:16px 0;background:#f5f3ff;border:1px solid #c4b5fd;border-radius:12px;"">
            <tr><td style=""padding:14px 16px;font-size:14px;line-height:1.55;color:#5b21b6;"">
              <strong>Новинка в Беларуси:</strong> QR-код билета в профиле обновляется каждые <strong>{qrWindowMinutes} минут</strong> после входа на сайт — защита от перепродажи. На входе покажите актуальный QR с телефона.
            </td></tr>
          </table>
          <p style=""margin:16px 0 0;text-align:center;"">
            <a href=""{WebUtility.HtmlEncode(profileUrl)}"" style=""display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;"">Открыть билеты в профиле</a>
          </p>
          <p style=""margin:16px 0 0;font-size:13px;color:#6b7280;"">Заказ: {WebUtility.HtmlEncode(orderNumber)}</p>
        </td></tr>
        <tr><td style=""padding:16px 32px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;"">
          С уважением, команда +Vibe
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>";
        }
    }
}
