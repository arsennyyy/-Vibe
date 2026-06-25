using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using QRCoder;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace MyMvcBackend.Services
{
    public record TicketPdfData(
        int TicketId,
        string OrderNumber,
        string HolderName,
        string EventTitle,
        string Artists,
        string? Description,
        DateTime EventDate,
        string? EventTime,
        string? Venue,
        string? Address,
        string? EventType,
        string Row,
        int SeatNumber,
        string TicketType,
        decimal Price,
        string Currency,
        string QrPayload);

    public interface ITicketPdfGenerator
    {
        byte[] Generate(TicketPdfData data);
    }

    public class TicketPdfGenerator : ITicketPdfGenerator
    {
        private static readonly Color Brand = Color.FromHex("#7c3aed");
        private static readonly Color BrandDark = Color.FromHex("#5b21b6");
        private static readonly Color BrandSoft = Color.FromHex("#f5f3ff");
        private static readonly Color BrandLine = Color.FromHex("#ddd6fe");
        private static readonly Color Ink = Color.FromHex("#111827");
        private static readonly Color Muted = Color.FromHex("#6b7280");
        private static readonly Color Line = Color.FromHex("#e5e7eb");
        private static readonly Color Paper = Color.FromHex("#ffffff");
        private static readonly Color PageBg = Color.FromHex("#f1f5f9");
        private static readonly Color WarnBg = Color.FromHex("#fffbeb");
        private static readonly Color WarnBorder = Color.FromHex("#f59e0b");
        private static readonly Color WarnInk = Color.FromHex("#92400e");

        static TicketPdfGenerator()
        {
            QuestPDF.Settings.License = LicenseType.Community;
        }

        public byte[] Generate(TicketPdfData data)
        {
            var qrPng = BuildQrPng(data.QrPayload);
            var eventWhen = FormatEventDateTime(data.EventDate, data.EventTime);
            var seatLabel = $"Ряд {data.Row} · Место {data.SeatNumber}";
            var typeLabel = FormatTicketType(data.TicketType);
            var priceLabel = $"{data.Price:N0} {data.Currency}";
            var description = TicketContentFormatter.FormatDescription(data.Description);
            var artists = string.IsNullOrWhiteSpace(data.Artists)
                ? TicketContentFormatter.FormatArtists(null)
                : data.Artists;
            var eventType = string.IsNullOrWhiteSpace(data.EventType) ? null : data.EventType.Trim();

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(32);
                    page.DefaultTextStyle(x => x.FontSize(10).FontColor(Ink).FontFamily("Arial"));
                    page.Background().Background(PageBg);

                    page.Content().Column(col =>
                    {
                        col.Spacing(14);

                        // Шапка бренда
                        col.Item().Row(header =>
                        {
                            header.ConstantItem(44).Height(44).Background(Ink).Border(1).BorderColor(BrandLine)
                                .AlignCenter().AlignMiddle()
                                .Text("♥").FontSize(22).FontColor(Colors.White);

                            header.RelativeItem().PaddingLeft(14).Column(brand =>
                            {
                                brand.Item().Text("+Vibe").FontSize(20).Bold().FontColor(Brand);
                                brand.Item().Text("Электронный билет").FontSize(10).FontColor(Muted).LetterSpacing(0.06f);
                            });

                            header.ConstantItem(120).AlignRight().AlignMiddle()
                                .Text($"№ {data.TicketId}").FontSize(9).FontColor(Muted);
                        });

                        // Основная карточка
                        col.Item().Border(1).BorderColor(BrandLine).Background(Paper).Column(card =>
                        {
                            // Градиентная полоса + герой с артистом
                            card.Item().Height(5).Background(Brand);
                            card.Item().Background(BrandSoft).Padding(22).Column(hero =>
                            {
                                hero.Item().Row(r =>
                                {
                                    r.RelativeItem().Column(left =>
                                    {
                                        left.Item().Text("ВЫ ИДЁТЕ НА").FontSize(8).Bold()
                                            .FontColor(Brand).LetterSpacing(0.14f);
                                        left.Item().PaddingTop(4).Text(artists).FontSize(22).Bold()
                                            .FontColor(Ink).LineHeight(1.15f);
                                        if (!string.IsNullOrWhiteSpace(data.EventTitle))
                                        {
                                            left.Item().PaddingTop(6).Text(data.EventTitle).FontSize(12)
                                                .SemiBold().FontColor(Muted);
                                        }
                                    });

                                    r.ConstantItem(88).AlignTop().AlignRight().Element(badge =>
                                    {
                                        badge.Background(Paper).Border(1).BorderColor(BrandLine)
                                            .PaddingVertical(5).PaddingHorizontal(10).AlignCenter()
                                            .Text(typeLabel).FontSize(9).Bold().FontColor(Brand);
                                    });
                                });

                                hero.Item().PaddingTop(14).Row(chips =>
                                {
                                    chips.RelativeItem().Element(chip =>
                                        RenderChip(chip, "Дата", eventWhen));
                                    if (!string.IsNullOrWhiteSpace(data.Venue))
                                    {
                                        chips.ConstantItem(12);
                                        chips.RelativeItem().Element(chip =>
                                            RenderChip(chip, "Площадка", data.Venue));
                                    }
                                });

                                if (!string.IsNullOrWhiteSpace(data.Address))
                                {
                                    hero.Item().PaddingTop(6).Text(data.Address).FontSize(9).FontColor(Muted);
                                }

                                if (!string.IsNullOrWhiteSpace(eventType))
                                {
                                    hero.Item().PaddingTop(8).Text(eventType).FontSize(8)
                                        .FontColor(Brand).SemiBold().LetterSpacing(0.08f);
                                }
                            });

                            card.Item().Padding(22).Row(body =>
                            {
                                // Левая колонка: описание + место
                                body.RelativeItem(3).Column(left =>
                                {
                                    if (!string.IsNullOrWhiteSpace(description))
                                    {
                                        left.Item().Element(box => RenderDescriptionBox(box, description));
                                        left.Item().PaddingTop(14);
                                    }

                                    left.Item().Background(PageBg).Border(1).BorderColor(Line)
                                        .Padding(14).Column(seatBlock =>
                                    {
                                        seatBlock.Item().Row(r =>
                                        {
                                            r.RelativeItem().Column(c =>
                                            {
                                                c.Item().Text("МЕСТО").FontSize(8).FontColor(Muted).LetterSpacing(0.1f);
                                                c.Item().PaddingTop(2).Text(seatLabel).FontSize(16).Bold();
                                            });
                                            r.ConstantItem(4);
                                            r.RelativeItem().AlignRight().Column(c =>
                                            {
                                                c.Item().AlignRight().Text("СТОИМОСТЬ").FontSize(8)
                                                    .FontColor(Muted).LetterSpacing(0.1f);
                                                c.Item().AlignRight().PaddingTop(2).Text(priceLabel)
                                                    .FontSize(16).Bold().FontColor(Brand);
                                            });
                                        });
                                    });

                                    left.Item().PaddingTop(12).Row(meta =>
                                    {
                                        meta.RelativeItem().Text($"Заказ {data.OrderNumber}").FontSize(8).FontColor(Muted);
                                        meta.RelativeItem().AlignRight()
                                            .Text($"Покупатель: {data.HolderName}").FontSize(8).FontColor(Muted);
                                    });
                                });

                                body.ConstantItem(18).AlignMiddle().PaddingVertical(12)
                                    .LineVertical(1).LineColor(BrandLine);

                                // QR-отрывной корешок
                                body.ConstantItem(128).AlignMiddle().Column(stub =>
                                {
                                    stub.Item().Border(2).BorderColor(Brand).Background(Colors.White)
                                        .Padding(8).Column(qrWrap =>
                                        {
                                            qrWrap.Item().AlignCenter().Width(100).Height(100).Image(qrPng);
                                        });
                                    stub.Item().PaddingTop(8).AlignCenter()
                                        .Text("SCAN AT ENTRY").FontSize(7).Bold()
                                        .FontColor(Brand).LetterSpacing(0.14f);
                                    stub.Item().PaddingTop(10).AlignCenter().Text(priceLabel)
                                        .FontSize(11).Bold().FontColor(Ink);
                                });
                            });
                        });

                        col.Item().Border(1).BorderColor(WarnBorder).Background(WarnBg).Padding(12).Column(warn =>
                        {
                            warn.Item().Text("Важно — распечатайте билет").FontSize(10).Bold().FontColor(WarnInk);
                            warn.Item().PaddingTop(4).Text(
                                "На концерт необходимо прийти с распечатанным билетом и предъявить QR-код на входе. " +
                                "Скриншот на телефоне может не принять контроль.")
                                .FontSize(9).FontColor(WarnInk).LineHeight(1.45f);
                        });

                        col.Item().AlignCenter().Text("Билеты на концерты — +Vibe · vibe.by").FontSize(8).FontColor(Muted);
                    });
                });
            }).GeneratePdf();
        }

        private static void RenderChip(IContainer container, string label, string text)
        {
            container.Background(Paper).Border(1).BorderColor(Line)
                .PaddingVertical(6).PaddingHorizontal(10).Column(c =>
                {
                    c.Item().Text(label.ToUpperInvariant()).FontSize(7).Bold().FontColor(Brand).LetterSpacing(0.1f);
                    c.Item().PaddingTop(2).Text(text).FontSize(9).SemiBold().FontColor(Ink);
                });
        }

        private static void RenderDescriptionBox(IContainer container, string description)
        {
            container.Border(1).BorderColor(Line).Background(Paper).Row(row =>
            {
                row.ConstantItem(4).Background(Brand);
                row.RelativeItem().Padding(12).Column(c =>
                {
                    c.Item().Text("О СОБЫТИИ").FontSize(8).Bold().FontColor(Brand).LetterSpacing(0.12f);
                    c.Item().PaddingTop(6).Text(description).FontSize(9)
                        .FontColor(Muted).LineHeight(1.5f);
                });
            });
        }

        private static byte[] BuildQrPng(string payload)
        {
            using var generator = new QRCodeGenerator();
            var qrData = generator.CreateQrCode(payload, QRCodeGenerator.ECCLevel.M);
            var png = new PngByteQRCode(qrData);
            return png.GetGraphic(8, new byte[] { 91, 33, 182 }, new byte[] { 255, 255, 255 });
        }

        private static string FormatEventDateTime(DateTime eventDate, string? time)
        {
            var culture = CultureInfo.GetCultureInfo("ru-RU");
            var datePart = eventDate.ToLocalTime().ToString("d MMMM yyyy", culture);
            if (!string.IsNullOrWhiteSpace(time))
                return $"{datePart} · {time.Trim()}";
            var t = eventDate.ToLocalTime();
            if (t.Hour != 0 || t.Minute != 0)
                return t.ToString("d MMMM yyyy · HH:mm", culture);
            return datePart;
        }

        private static string FormatTicketType(string type) =>
            string.IsNullOrWhiteSpace(type)
                ? "STANDARD"
                : type.ToUpperInvariant() switch
                {
                    "VIP" => "VIP",
                    "STANDARD" => "STANDARD",
                    "DISABLED" => "ДОСТУПНОЕ",
                    _ => type.ToUpperInvariant(),
                };
    }

    internal static class TicketContentFormatter
    {
        public static string FormatArtists(string? lineup)
        {
            if (string.IsNullOrWhiteSpace(lineup))
                return "Состав уточняется";

            var raw = lineup.Trim();
            if (raw.StartsWith('['))
            {
                try
                {
                    var names = JsonSerializer.Deserialize<string[]>(raw);
                    if (names is { Length: > 0 })
                    {
                        var filtered = names.Where(n => !string.IsNullOrWhiteSpace(n)).Select(n => n.Trim()).ToArray();
                        if (filtered.Length > 0)
                            return string.Join(" · ", filtered);
                    }
                }
                catch
                {
                    // fallback to raw
                }
            }

            return raw;
        }

        public static string FormatDescription(string? description, int maxLen = 380)
        {
            if (string.IsNullOrWhiteSpace(description))
                return string.Empty;

            var text = WebUtility.HtmlDecode(description.Trim());
            text = Regex.Replace(text, "<[^>]+>", " ", RegexOptions.Singleline);
            text = Regex.Replace(text, @"\s+", " ").Trim();

            if (text.Length <= maxLen)
                return text;

            var cut = text[..maxLen];
            var lastSpace = cut.LastIndexOf(' ');
            if (lastSpace > maxLen / 2)
                cut = cut[..lastSpace];

            return cut.TrimEnd() + "…";
        }
    }
}
