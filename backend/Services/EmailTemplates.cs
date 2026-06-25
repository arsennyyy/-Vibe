using System.Net;
using System.Text;

namespace MyMvcBackend.Services
{
    internal static class EmailTemplates
    {
        private const string Brand = "#8b5cf6";
        private const string BrandLight = "#ddd6fe";
        private const string Bg = "#030308";
        private const string Card = "#0f0f14";
        private const string CardInner = "#09090d";
        private const string Muted = "#a1a1aa";
        private const string Text = "#fafafa";
        private const string Font =
            "'Inter','Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
        private const string Mono =
            "'SF Mono','Cascadia Mono',Consolas,'Liberation Mono',Menlo,monospace";

        public static string SiteBase { get; set; } = "http://localhost:5173";

        public static string Escape(string? text) =>
            WebUtility.HtmlEncode(text ?? "");

        private const string HeartSvg = """
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
              <path d="M12 20.5s-6.2-4.1-8.4-7.4C1.8 10.2 2.6 6.8 5.6 5.4c2-.9 4.3-.2 5.7 1.5 1.4-1.7 3.7-2.4 5.7-1.5 3 1.4 3.8 4.8 2 7.7-2.2 3.3-8.4 7.4-8.4 7.4z" fill="#ffffff"/>
            </svg>
            """;

        public static string LogoHeaderHtml(string? logoCid = null) =>
            logoCid != null
                ? $@"
              <table role=""presentation"" cellpadding=""0"" cellspacing=""0"" style=""margin:0 auto;"">
                <tr>
                  <td style=""vertical-align:middle;padding-right:16px;"">
                    <img src=""cid:{logoCid}"" width=""56"" height=""56"" alt=""+Vibe"" style=""display:block;border-radius:16px;border:1px solid rgba(139,92,246,0.35);"" />
                  </td>
                  <td style=""vertical-align:middle;text-align:left;font-family:{Font};"">
                    <p style=""margin:0;font-size:28px;font-weight:800;letter-spacing:-0.04em;color:{BrandLight};line-height:1;"">+Vibe</p>
                    <p style=""margin:8px 0 0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:{Muted};font-weight:600;"">Билеты на концерты</p>
                  </td>
                </tr>
              </table>"
                : $@"
              <table role=""presentation"" cellpadding=""0"" cellspacing=""0"" style=""margin:0 auto;"">
                <tr>
                  <td style=""width:56px;height:56px;vertical-align:middle;text-align:center;background:linear-gradient(145deg,#121218 0%,#08080c 100%);border-radius:16px;border:1px solid rgba(139,92,246,0.4);box-shadow:0 8px 24px rgba(0,0,0,0.45);"">
                    {HeartSvg}
                  </td>
                  <td style=""vertical-align:middle;text-align:left;padding-left:16px;font-family:{Font};"">
                    <p style=""margin:0;font-size:28px;font-weight:800;letter-spacing:-0.04em;color:{BrandLight};line-height:1;"">+Vibe</p>
                    <p style=""margin:8px 0 0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:{Muted};font-weight:600;"">Билеты на концерты</p>
                  </td>
                </tr>
              </table>";

        private static string Heading(string text, string color) =>
            $@"<h1 style=""margin:0 0 16px;font-family:{Font};font-size:24px;font-weight:800;line-height:1.25;color:{color};text-align:center;letter-spacing:-0.03em;"">{text}</h1>";

        private static string Paragraph(string html) =>
            $@"<p style=""margin:0 0 16px;font-family:{Font};font-size:15px;line-height:1.75;color:{Text};"">{html}</p>";

        private static string Subtle(string html) =>
            $@"<p style=""margin:16px 0 0;font-family:{Font};font-size:13px;line-height:1.6;color:{Muted};text-align:center;"">{html}</p>";

        private static string InfoBox(string label, string contentHtml, string accent, string bg) =>
            $@"
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""margin:20px 0;background:{bg};border:1px solid {accent}33;border-radius:16px;overflow:hidden;font-family:{Font};"">
                <tr>
                  <td style=""padding:18px 20px;border-left:3px solid {accent};"">
                    <p style=""margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:{accent};"">{label}</p>
                    <div style=""font-size:15px;line-height:1.7;color:{Text};white-space:pre-wrap;"">{contentHtml}</div>
                  </td>
                </tr>
              </table>";

        private static string Button(string label, string href) =>
            $@"
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""margin:28px 0 8px;font-family:{Font};"">
                <tr>
                  <td align=""center"">
                    <a href=""{Escape(href)}"" style=""display:inline-block;padding:15px 36px;background:linear-gradient(135deg,{Brand} 0%,#6d28d9 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.01em;border-radius:14px;box-shadow:0 12px 32px rgba(139,92,246,0.38);"">{Escape(label)}</a>
                  </td>
                </tr>
              </table>";

        private static string OtpDigitBoxes(string code)
        {
            var normalized = (code ?? "").Trim().ToUpperInvariant();
            var sb = new StringBuilder();
            sb.Append($@"<table role=""presentation"" cellpadding=""0"" cellspacing=""0"" style=""margin:28px auto 8px;""><tr>");
            for (var i = 0; i < 6; i++)
            {
                var ch = i < normalized.Length ? Escape(normalized[i].ToString()) : "&nbsp;";
                sb.Append($@"
                  <td style=""padding:0 5px;"">
                    <div style=""width:46px;height:56px;line-height:56px;text-align:center;font-family:{Mono};font-size:24px;font-weight:700;letter-spacing:0;color:#ffffff;background:linear-gradient(180deg,#14141c 0%,#0a0a10 100%);border:1px solid rgba(139,92,246,0.45);border-radius:14px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.06),0 8px 20px rgba(0,0,0,0.35);"">{ch}</div>
                  </td>");
            }
            sb.Append("</tr></table>");
            return sb.ToString();
        }

        public static string Wrap(string title, string bodyHtml, string? logoCid = null) => $@"
<!DOCTYPE html>
<html lang=""ru"">
<head>
  <meta charset=""utf-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1"" />
  <meta name=""color-scheme"" content=""dark"" />
  <title>{Escape(title)}</title>
  <link href=""https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"" rel=""stylesheet"" />
</head>
<body style=""margin:0;padding:0;background:{Bg};font-family:{Font};-webkit-font-smoothing:antialiased;"">
  <div style=""display:none;max-height:0;overflow:hidden;opacity:0;"">{Escape(title)}</div>
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background:radial-gradient(ellipse 90% 60% at 50% -10%,rgba(139,92,246,0.22),transparent 55%),{Bg};padding:48px 16px;font-family:{Font};"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""max-width:600px;background:{Card};border:1px solid rgba(255,255,255,0.07);border-radius:24px;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,0.65);"">
          <tr>
            <td style=""height:5px;background:linear-gradient(90deg,#6d28d9,{Brand},#c4b5fd,#6d28d9);font-size:0;line-height:0;"">&#8203;</td>
          </tr>
          <tr>
            <td style=""padding:36px 40px 24px;text-align:center;background:linear-gradient(180deg,rgba(139,92,246,0.1) 0%,transparent 70%);"">
              {LogoHeaderHtml(logoCid)}
            </td>
          </tr>
          <tr>
            <td style=""padding:4px 40px 32px;font-size:15px;line-height:1.7;color:{Text};font-family:{Font};"">
              {bodyHtml}
            </td>
          </tr>
          <tr>
            <td style=""padding:24px 40px 32px;background:{CardInner};border-top:1px solid rgba(255,255,255,0.06);text-align:center;font-family:{Font};"">
              <p style=""margin:0 0 8px;font-size:14px;color:{Muted};"">С уважением, команда <strong style=""color:{BrandLight};font-weight:700;"">+Vibe</strong></p>
              <p style=""margin:0 0 16px;font-size:12px;color:#71717a;line-height:1.5;"">Билеты на концерты — быстро и безопасно</p>
              <a href=""{Escape(SiteBase)}"" style=""font-size:13px;color:{Brand};text-decoration:none;font-weight:700;letter-spacing:0.02em;"">Открыть сайт →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

        public static string Welcome(string userName, string? logoCid = null) => Wrap(
            "Добро пожаловать в +Vibe",
            $@"
              {Heading("Добро пожаловать!", "#ffffff")}
              {Paragraph($@"Здравствуйте, <strong style=""color:#fff;font-weight:700;"">{Escape(userName)}</strong>!")}
              {Paragraph($@"Аккаунт на <strong style=""color:{BrandLight};"">+Vibe</strong> создан. Покупайте билеты, следите за заказами и получайте уведомления о статусе заявок.")}
              {Button("Перейти на сайт", SiteBase)}
              {Subtle("Если вы не регистрировались — просто проигнорируйте это письмо.")}",
            logoCid);

        public static string ModerationApproved(string organizerName, string eventTitle, int eventId, string? logoCid = null) =>
            Wrap(
                "Заявка одобрена",
                $@"
              {Heading("Заявка одобрена", "#86efac")}
              {Paragraph($@"Здравствуйте, <strong style=""color:#fff;font-weight:700;"">{Escape(organizerName)}</strong>!")}
              {Paragraph($@"Мероприятие <strong style=""color:#fff;"">«{Escape(eventTitle)}»</strong> прошло модерацию.")}
              {InfoBox("Что дальше", "Войдите в кабинет организатора и нажмите «Опубликовать», чтобы выбрать дату появления в каталоге.", "#86efac", "rgba(16,185,129,0.08)")}
              {Button("Кабинет организатора", $"{SiteBase.TrimEnd('/')}/profile")}
              {Subtle($"ID события: {eventId}")}",
                logoCid);

        public static string ModerationRejected(string organizerName, string eventTitle, string reason, string? logoCid = null) =>
            Wrap(
                "Заявка отклонена",
                $@"
              {Heading("Нужна доработка", "#fca5a5")}
              {Paragraph($@"Здравствуйте, <strong style=""color:#fff;font-weight:700;"">{Escape(organizerName)}</strong>!")}
              {Paragraph($@"Мероприятие <strong>«{Escape(eventTitle)}»</strong> пока не опубликовано.")}
              {InfoBox("Комментарий модератора", Escape(reason), "#fca5a5", "rgba(239,68,68,0.08)")}
              {Button("Открыть черновик", $"{SiteBase.TrimEnd('/')}/profile")}
              {Subtle("Исправьте замечания и отправьте заявку снова.")}",
                logoCid);

        public static string ContactReply(string name, string originalMessage, string response, string statusLabel, string? logoCid = null) =>
            Wrap(
                "Ответ службы поддержки +Vibe",
                $@"
              {Heading("Ответ на обращение", "#ffffff")}
              {Paragraph($@"Здравствуйте, <strong style=""color:#fff;font-weight:700;"">{Escape(name)}</strong>!")}
              <p style=""margin:0 0 20px;font-family:{Font};font-size:13px;color:{Muted};text-align:center;"">Статус: <span style=""display:inline-block;padding:5px 12px;border-radius:999px;background:rgba(139,92,246,0.18);color:{BrandLight};font-weight:700;font-size:12px;letter-spacing:0.04em;"">{Escape(statusLabel)}</span></p>
              {InfoBox("Ответ команды", Escape(response), BrandLight, "rgba(139,92,246,0.1)")}
              {InfoBox("Ваше сообщение", Escape(originalMessage), "#71717a", "rgba(255,255,255,0.03)")}",
                logoCid);

        public static string ContactAcknowledgement(string name, string? logoCid = null) => Wrap(
            "Сообщение получено",
            $@"
              {Heading("Спасибо за обращение!", "#ffffff")}
              {Paragraph($@"Здравствуйте, <strong style=""color:#fff;font-weight:700;"">{Escape(name)}</strong>!")}
              {Paragraph($@"Мы получили ваше сообщение через форму «Контакты» на <strong style=""color:{BrandLight};"">+Vibe</strong>. Ответим на указанный email, как только обработаем запрос.")}
              {Subtle("Проверьте папку «Спам», если письма долго нет.")}",
            logoCid);

        public static string OrderRefunded(string userName, string eventTitle, string orderNumber, decimal amount, string reason, string? logoCid = null) =>
            Wrap(
                "Возврат средств",
                $@"
              {Heading("Возврат оформлен", "#86efac")}
              {Paragraph($@"Здравствуйте, <strong style=""color:#fff;font-weight:700;"">{Escape(userName)}</strong>!")}
              {Paragraph($@"По заказу <strong>{Escape(orderNumber)}</strong> на «{Escape(eventTitle)}» выполнен возврат <strong style=""color:#86efac;"">{amount:0.00} BYN</strong>.")}
              {InfoBox("Причина", Escape(reason), "#86efac", "rgba(16,185,129,0.08)")}
              {Subtle("Срок зачисления на карту зависит от банка (обычно 3–14 рабочих дней).")}
              {Button("Мои билеты", $"{SiteBase.TrimEnd('/')}/profile")}",
                logoCid);

        public static string EventCancelled(string userName, string eventTitle, DateTime eventDate, string eventTime, string reason, string? logoCid = null) =>
            Wrap(
                "Мероприятие отменено",
                $@"
              {Heading("Концерт отменён", "#fca5a5")}
              {Paragraph($@"Здравствуйте, <strong style=""color:#fff;font-weight:700;"">{Escape(userName)}</strong>!")}
              {Paragraph($@"Мероприятие <strong>«{Escape(eventTitle)}»</strong> ({eventDate:dd.MM.yyyy} {Escape(eventTime)}) отменено.")}
              {InfoBox("Возврат", "Оплаченные билеты аннулированы, средства возвращены на способ оплаты.", "#86efac", "rgba(16,185,129,0.08)")}
              {InfoBox("Комментарий", Escape(reason), "#fca5a5", "rgba(239,68,68,0.08)")}",
                logoCid);

        public static string EventRescheduled(string userName, string eventTitle, DateTime oldDate, string oldTime, DateTime newDate, string newTime, string? logoCid = null) =>
            Wrap(
                "Дата изменена",
                $@"
              {Heading("Новая дата мероприятия", "#fde68a")}
              {Paragraph($@"Здравствуйте, <strong style=""color:#fff;font-weight:700;"">{Escape(userName)}</strong>!")}
              {Paragraph($@"У мероприятия <strong>«{Escape(eventTitle)}»</strong> изменились дата и время.")}
              {InfoBox("Было", $"{oldDate:dd.MM.yyyy} {Escape(oldTime)}", "#71717a", "rgba(255,255,255,0.03)")}
              {InfoBox("Стало", $"{newDate:dd.MM.yyyy} {Escape(newTime)}", BrandLight, "rgba(139,92,246,0.1)")}
              {Subtle("Ваш билет остаётся действительным на новую дату.")}
              {Button("Мои билеты", $"{SiteBase.TrimEnd('/')}/profile")}",
                logoCid);

        public static string SupportChatReply(string userName, string userMessage, string adminReply, string? logoCid = null) =>
            Wrap(
                "Ответ чата поддержки",
                $@"
              {Heading("Ответ службы поддержки", "#ffffff")}
              {Paragraph($@"Здравствуйте, <strong style=""color:#fff;font-weight:700;"">{Escape(userName)}</strong>!")}
              {InfoBox("Ответ", Escape(adminReply), BrandLight, "rgba(139,92,246,0.1)")}
              {InfoBox("Ваш вопрос", Escape(userMessage), "#71717a", "rgba(255,255,255,0.03)")}",
                logoCid);

        public static string OtpCode(string code, string purposeLabel, string? logoCid = null) => Wrap(
            "Код подтверждения",
            $@"
              {Heading($"Подтверждение {Escape(purposeLabel)}", "#ffffff")}
              {Paragraph($"Введите код на сайте — он действует <strong style=\"color:{BrandLight};\">2 минуты</strong>.")}
              {OtpDigitBoxes(code)}
              {Subtle("Если вы не запрашивали код — проигнорируйте письмо.")}",
            logoCid);

        public static string ContactFormToAdmin(string name, string email, string message, string? logoCid = null) => Wrap(
            "Новое сообщение с сайта",
            $@"
              {Heading("Новое сообщение", "#ffffff")}
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""margin:0 0 20px;font-family:{Font};"">
                <tr><td style=""padding:10px 0;font-size:14px;color:{Muted};border-bottom:1px solid rgba(255,255,255,0.06);""><strong style=""color:{Text};"">Имя:</strong> {Escape(name)}</td></tr>
                <tr><td style=""padding:10px 0;font-size:14px;color:{Muted};""><strong style=""color:{Text};"">Email:</strong> <a href=""mailto:{Escape(email)}"" style=""color:{Brand};text-decoration:none;font-weight:600;"">{Escape(email)}</a></td></tr>
              </table>
              {InfoBox("Текст сообщения", Escape(message), "#71717a", "rgba(255,255,255,0.03)")}",
            logoCid);

        public static string OrganizerGuideGranted(string userName, string siteUrl, string? logoCid = null) =>
            Wrap(
                "Руководство организатора +Vibe",
                $@"
              {Heading("Вам открыт кабинет организатора", "#c4b5fd")}
              {Paragraph($@"Здравствуйте, <strong style=""color:#fff;font-weight:700;"">{Escape(userName)}</strong>!")}
              {Paragraph($@"На <strong style=""color:{BrandLight};"">+Vibe</strong> вам назначена роль <strong style=""color:#fff;"">организатора</strong>. Во вложении — подробное PDF-руководство со схемами экранов: как создать мероприятие, настроить зал, пройти модерацию и опубликовать событие.")}
              {InfoBox("В руководстве", @"• Кабинет в профиле и статусы мероприятий
• Конструктор: Детали → Место → Схема зала → Карточка
• Модерация и публикация
• Доход и правила площадки", BrandLight, "rgba(139,92,246,0.12)")}
              {Button("Открыть кабинет организатора", $"{siteUrl.TrimEnd('/')}/profile?tab=organizer")}
              {Subtle("PDF прикреплён к письму: +Vibe_Руководство_организатора.pdf")}",
                logoCid);

        public static string AdminGuideGranted(string userName, string siteUrl, string? logoCid = null) =>
            Wrap(
                "Руководство администратора +Vibe",
                $@"
              {Heading("Доступ к панели администратора", "#fca5a5")}
              {Paragraph($@"Здравствуйте, <strong style=""color:#fff;font-weight:700;"">{Escape(userName)}</strong>!")}
              {Paragraph($@"Вам назначена роль <strong style=""color:#fff;"">администратора</strong> на <strong style=""color:{BrandLight};"">+Vibe</strong>. Во вложении — PDF-руководство: модерация, пользователи, платежи, поддержка и настройки площадки.")}
              {InfoBox("В руководстве", @"• Вход в /admin и обзор вкладок
• Пользователи и назначение организаторов
• Модерация и переносы дат
• Заказы, возвраты и платежи
• Площадки, танцпол и фильтры каталога", "#fca5a5", "rgba(239,68,68,0.1)")}
              {Button("Открыть панель администратора", $"{siteUrl.TrimEnd('/')}/admin")}
              {Subtle("PDF прикреплён к письму: +Vibe_Руководство_администратора.pdf. Храните доступ в безопасности.")}",
                logoCid);
    }
}
