using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace MyMvcBackend.Services
{
    public enum PlatformGuideKind
    {
        Organizer,
        Admin,
    }

    public interface IPlatformGuidePdfGenerator
    {
        byte[] Generate(PlatformGuideKind kind, string siteUrl);
    }

    public class PlatformGuidePdfGenerator : IPlatformGuidePdfGenerator
    {
        private static readonly Color Brand = Color.FromHex("#7c3aed");
        private static readonly Color BrandDark = Color.FromHex("#5b21b6");
        private static readonly Color BrandSoft = Color.FromHex("#ede9fe");
        private static readonly Color BrandLine = Color.FromHex("#ddd6fe");
        private static readonly Color Ink = Color.FromHex("#111827");
        private static readonly Color Muted = Color.FromHex("#6b7280");
        private static readonly Color Line = Color.FromHex("#e5e7eb");
        private static readonly Color Paper = Color.FromHex("#ffffff");
        private static readonly Color PageBg = Color.FromHex("#f8fafc");
        private static readonly Color MockBg = Color.FromHex("#0c0c12");
        private static readonly Color MockCard = Color.FromHex("#16161e");
        private static readonly Color MockBorder = Color.FromHex("#2a2a38");
        private static readonly Color MockAccent = Color.FromHex("#8b5cf6");
        private static readonly Color MockText = Color.FromHex("#f4f4f5");
        private static readonly Color MockMuted = Color.FromHex("#a1a1aa");
        private static readonly Color WarnBg = Color.FromHex("#fffbeb");
        private static readonly Color WarnBorder = Color.FromHex("#f59e0b");

        static PlatformGuidePdfGenerator()
        {
            QuestPDF.Settings.License = LicenseType.Community;
        }

        public byte[] Generate(PlatformGuideKind kind, string siteUrl) =>
            kind == PlatformGuideKind.Admin
                ? BuildAdminGuide(siteUrl)
                : BuildOrganizerGuide(siteUrl);

        private byte[] BuildOrganizerGuide(string siteUrl) =>
            Document.Create(doc =>
            {
                CoverPage(doc, "Руководство организатора", "Создание мероприятий, модерация и публикация на +Vibe", siteUrl);

                ContentPage(doc, "Содержание", col =>
                {
                    col.Item().Text("1. Роль организатора на площадке").FontSize(11);
                    col.Item().PaddingTop(4).Text("2. Кабинет в профиле").FontSize(11);
                    col.Item().PaddingTop(4).Text("3. Конструктор мероприятия (4 вкладки)").FontSize(11);
                    col.Item().PaddingTop(4).Text("4. Отправка на модерацию").FontSize(11);
                    col.Item().PaddingTop(4).Text("5. Публикация и продажи").FontSize(11);
                    col.Item().PaddingTop(4).Text("6. Доход и уведомления").FontSize(11);
                    col.Item().PaddingTop(4).Text("7. Правила и рекомендации").FontSize(11);
                });

                SectionPage(doc, "1", "Роль организатора", """
                    Организатор на +Vibe создаёт концерты и мероприятия, настраивает зал, цены и карточку в каталоге.
                    После модерации администратором событие публикуется — билеты продаются через сайт, а выручка отображается в кабинете.

                    Основной путь: Профиль → вкладка «Организатор» → «Создать мероприятие» → заполнить конструктор → «Отправить на модерацию».
                    """, mock =>
                {
                    MockProfileSidebar(mock, ["Профиль", "Билеты", "Организатор", "Доход", "Настройки"], 2);
                });

                SectionPage(doc, "2", "Кабинет организатора", $"""
                    Откройте профиль: {siteUrl.TrimEnd('/')}/profile?tab=organizer

                    Здесь список ваших мероприятий со статусами: Черновик, На модерации, Одобрено, Опубликовано, Прошло, Отменено.
                    Кнопка «Создать мероприятие» открывает конструктор. Карточка события — кнопки «Редактировать», «Опубликовать», «Перенос».
                    """, mock =>
                {
                    MockOrganizerList(mock);
                });

                SectionPage(doc, "3", "Конструктор: вкладка «Детали»", """
                    Название мероприятия, обложка (JPG/PNG), тип и жанр, дата и время, описание.
                    Блок «Состав» — артисты с band.link: аватар подтягивается автоматически, ссылка отображается на странице события.
                    Все обязательные поля нужно заполнить до отправки на модерацию.
                    """, mock =>
                {
                    MockBuilderTabs(mock, ["Детали", "Место", "Схема зала", "Карточка"], 0);
                    MockFormFields(mock, ["Название", "Обложка", "Тип / Жанр", "Дата и время", "Состав артистов"]);
                });

                SectionPage(doc, "3", "Конструктор: «Место проведения»", """
                    Выберите площадку из справочника Минска или укажите адрес. На карте отобразится метка.
                    Адрес виден покупателям на странице события и в билете.
                    """, mock =>
                {
                    MockBuilderTabs(mock, ["Детали", "Место", "Схема зала", "Карточка"], 1);
                    MockMapPreview(mock);
                });

                SectionPage(doc, "3", "Конструктор: «Схема зала»", """
                    Выберите шаблон зала или настройте рассадку: ряды, места, VIP-зоны, танцпол (GA).
                    Для каждого типа места задайте цену в белорусских рублях (Br).
                    Справа — превью схемы: клик по месту показывает цену и тип.
                    """, mock =>
                {
                    MockBuilderTabs(mock, ["Детали", "Место", "Схема зала", "Карточка"], 2);
                    MockSeatMap(mock);
                });

                SectionPage(doc, "3", "Конструктор: «Карточка»", """
                    Превью того, как мероприятие выглядит в каталоге: обложка, артисты, дата, площадка, цена «от».
                    Проверьте карточку перед отправкой на модерацию — это то, что увидят посетители.
                    """, mock =>
                {
                    MockBuilderTabs(mock, ["Детали", "Место", "Схема зала", "Карточка"], 3);
                    MockCatalogCard(mock);
                });

                SectionPage(doc, "4", "Модерация", """
                    Когда всё заполнено, нажмите «Отправить на модерацию». Статус сменится на «На модерации» — редактирование ограничено.
                    Администратор проверяет контент, цены и схему зала. При одобрении придёт письмо; при отклонении — комментарий с замечаниями.
                    Исправьте черновик и отправьте повторно.
                    """, mock =>
                {
                    MockStatusBadge(mock, "На модерации", Color.FromHex("#f59e0b"));
                    MockButton(mock, "Отправить на модерацию");
                });

                SectionPage(doc, "5", "Публикация и продажи", """
                    После одобрения нажмите «Опубликовать» — выберите дату появления в каталоге (сразу или по расписанию).
                    Покупатели выбирают места на схеме, оплачивают демо-картой на сайте. Билеты с QR попадают в профиль покупателя.
                    Вы можете запросить перенос даты — администратор рассмотрит заявку.
                    """, mock =>
                {
                    MockButton(mock, "Опубликовать");
                    MockEventPagePreview(mock);
                });

                SectionPage(doc, "6", "Доход и уведомления", $"""
                    Вкладка «Доход» в профиле: выручка по мероприятиям с учётом комиссии площадки.
                    В «Настройках» включите уведомления о модерации и публикации на email.

                    Ссылка: {siteUrl.TrimEnd('/')}/profile?tab=earnings
                    """, mock =>
                {
                    MockEarningsPanel(mock);
                });

                RulesPage(doc, "Организатор", """
                    • Публикуйте только достоверную информацию о дате, составе и площадке.
                    • Не дублируйте одно мероприятие на ту же дату и площадку — система предупредит о конфликте.
                    • Цены и схема зала должны соответствовать реальной рассадке площадки.
                    • После публикации существенные изменения — через заявку на перенос или обращение в поддержку.
                    • Отмена мероприятия инициируется через администратора; покупателям оформляется возврат.
                    • Запрещён контент, нарушающий законодательство РБ и правила площадки.
                    """);
            }).GeneratePdf();

        private byte[] BuildAdminGuide(string siteUrl) =>
            Document.Create(doc =>
            {
                CoverPage(doc, "Руководство администратора", "Модерация, пользователи, платежи и настройки +Vibe", siteUrl);

                ContentPage(doc, "Содержание", col =>
                {
                    col.Item().Text("1. Вход в панель администратора").FontSize(11);
                    col.Item().PaddingTop(4).Text("2. Пользователи и организаторы").FontSize(11);
                    col.Item().PaddingTop(4).Text("3. Модерация мероприятий").FontSize(11);
                    col.Item().PaddingTop(4).Text("4. События, заказы и платежи").FontSize(11);
                    col.Item().PaddingTop(4).Text("5. Поддержка и сообщения").FontSize(11);
                    col.Item().PaddingTop(4).Text("6. Площадки, танцпол и фильтры").FontSize(11);
                    col.Item().PaddingTop(4).Text("7. Правила администрирования").FontSize(11);
                });

                SectionPage(doc, "1", "Панель администратора", $"""
                    Войдите под учётной записью с ролью Admin: {siteUrl.TrimEnd('/')}/admin

                    Вверху — сводная статистика: пользователи, события, заказы, платежи, заявки на модерацию.
                    Навигация по вкладкам в одной панели — переключайтесь без перезагрузки страницы.
                    """, mock =>
                {
                    MockAdminHeader(mock);
                    MockAdminTabs(mock, ["Пользователи", "События", "Заказы", "Платежи", "Модерация"], 4);
                });

                SectionPage(doc, "2", "Пользователи и организаторы", """
                    Вкладка «Пользователи» — поиск, создание, редактирование, назначение роли Admin.
                    Вкладка «Организаторы» — выдача и снятие роли организатора по email или из списка.
                    При назначении роли пользователю автоматически отправляется PDF-руководство на почту.
                    """, mock =>
                {
                    MockAdminTable(mock, ["Имя", "Email", "Роль", "Действия"]);
                    MockButton(mock, "Назначить организатора");
                });

                SectionPage(doc, "3", "Модерация мероприятий", """
                    Вкладка «Модерация» — очередь заявок организаторов и запросы на перенос даты.
                    Откройте превью события, проверьте обложку, описание, схему зала и цены.
                    «Одобрить» — организатор получит email и сможет опубликовать. «Отклонить» — укажите причину в комментарии.
                    """, mock =>
                {
                    MockModerationCard(mock);
                });

                SectionPage(doc, "4", "События, заказы и платежи", """
                    «События» — все мероприятия (текущие и прошедшие), отмена с возвратом всем покупателям.
                    «Заказы» — статусы оплаты, номера заказов, возврат по отдельному заказу.
                    «Платежи» — детализация транзакций, комиссия площадки и выплата организатору.
                    """, mock =>
                {
                    MockAdminTabs(mock, ["События", "Заказы", "Платежи"], 1);
                    MockPaymentsRow(mock);
                });

                SectionPage(doc, "5", "Поддержка и сообщения", """
                    «Сообщения» — обращения с формы контактов: ответьте пользователю, смените статус.
                    «Чат поддержки» — диалоги с посетителями и организаторами, эскалация сложных кейсов.
                    Ответы уходят на email пользователя в фирменном оформлении +Vibe.
                    """, mock =>
                {
                    MockSupportChat(mock);
                });

                SectionPage(doc, "6", "Площадки, танцпол и фильтры", """
                    «Площадки» — справочник залов Минска: адрес, координаты, привязка схем.
                    «Танцпол» — лимиты вместимости GA-зон для площадок без фиксированных мест.
                    «Фильтры» — жанры и типы мероприятий в каталоге концертов.
                    """, mock =>
                {
                    MockVenuesList(mock);
                });

                RulesPage(doc, "Администратор", """
                    • Не передавайте доступ Admin третьим лицам; используйте уникальные пароли и 2FA на почте.
                    • Модерацию проводите в течение разумного срока; при отклонении всегда указывайте конкретную причину.
                    • Возвраты и отмены — только через предусмотренные действия в панели (не вручную в БД).
                    • Персональные данные пользователей не выгружайте без основания.
                    • При подозрении на мошенничество — заблокируйте публикацию и свяжитесь с организатором.
                    • Изменения в справочниках площадок согласовывайте с реальной инфраструктурой залов.
                    """);
            }).GeneratePdf();

        private static void CoverPage(IDocumentContainer doc, string title, string subtitle, string siteUrl) =>
            doc.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(0);
                page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Arial").FontColor(Ink));

                page.Background().Background(BrandDark);
                page.Content().Padding(48).Column(col =>
                {
                    col.Item().Height(80);
                    col.Item().AlignCenter().Text("♥").FontSize(48).FontColor(Colors.White);
                    col.Item().PaddingTop(16).AlignCenter().Text("+Vibe").FontSize(36).Bold().FontColor(Colors.White);
                    col.Item().PaddingTop(48).AlignCenter().Text(title).FontSize(26).Bold().FontColor(Colors.White);
                    col.Item().PaddingTop(12).AlignCenter().Text(subtitle).FontSize(13).FontColor(BrandSoft);
                    col.Item().PaddingTop(40).AlignCenter().Text(siteUrl).FontSize(11).FontColor(BrandLine);
                    col.Item().PaddingTop(60).AlignCenter().Text($"Версия {DateTime.UtcNow:MMMM yyyy}").FontSize(9).FontColor(BrandLine);
                });
            });

        private static void ContentPage(IDocumentContainer doc, string heading, Action<ColumnDescriptor> body) =>
            doc.Page(page =>
            {
                PageShell(page);
                page.Content().Column(col =>
                {
                    PageHeader(col, heading);
                    col.Item().PaddingTop(16).Column(body);
                });
            });

        private static void SectionPage(
            IDocumentContainer doc,
            string num,
            string title,
            string body,
            Action<ColumnDescriptor>? mockBuilder = null) =>
            doc.Page(page =>
            {
                PageShell(page);
                page.Content().Column(col =>
                {
                    PageHeader(col, $"§ {num}  {title}");
                    col.Item().PaddingTop(12).Text(body.Trim()).FontSize(10.5f).LineHeight(1.55f).FontColor(Ink);

                    if (mockBuilder != null)
                    {
                        col.Item().PaddingTop(16).Text("Интерфейс (схема экрана)").FontSize(8).Bold()
                            .FontColor(Muted).LetterSpacing(0.1f);
                        col.Item().PaddingTop(8).Border(1).BorderColor(Line).Background(MockBg).Padding(12)
                            .Column(mockBuilder);
                    }
                });
            });

        private static void RulesPage(IDocumentContainer doc, string role, string rules) =>
            doc.Page(page =>
            {
                PageShell(page);
                page.Content().Column(col =>
                {
                    PageHeader(col, $"Правила для {role.ToLowerInvariant()}а");
                    col.Item().PaddingTop(12).Background(WarnBg).Border(1).BorderColor(WarnBorder).Padding(16)
                        .Text(rules.Trim()).FontSize(10.5f).LineHeight(1.6f).FontColor(Ink);
                    col.Item().PaddingTop(24).Text("По вопросам работы площадки: раздел «Контакты» на сайте или чат поддержки в профиле.")
                        .FontSize(9).FontColor(Muted);
                });
            });

        private static void PageShell(PageDescriptor page)
        {
            page.Size(PageSizes.A4);
            page.Margin(36);
            page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Arial").FontColor(Ink));
            page.Background().Background(PageBg);
            page.Footer().AlignCenter().Text(t =>
            {
                t.Span("Руководство +Vibe · ").FontSize(8).FontColor(Muted);
                t.CurrentPageNumber().FontSize(8).FontColor(Muted);
                t.Span(" / ").FontSize(8).FontColor(Muted);
                t.TotalPages().FontSize(8).FontColor(Muted);
            });
        }

        private static void PageHeader(ColumnDescriptor col, string title)
        {
            col.Item().Row(r =>
            {
                r.ConstantItem(28).Height(28).Background(Brand).AlignCenter().AlignMiddle()
                    .Text("♥").FontSize(14).FontColor(Colors.White);
                r.RelativeItem().PaddingLeft(10).AlignMiddle()
                    .Text(title).FontSize(16).Bold().FontColor(BrandDark);
            });
            col.Item().PaddingTop(8).Height(2).Background(BrandLine);
        }

        private static void MockProfileSidebar(ColumnDescriptor col, string[] items, int active)
        {
            col.Item().Row(r =>
            {
                r.ConstantItem(100).Background(MockCard).Border(1).BorderColor(MockBorder).Padding(8).Column(side =>
                {
                    foreach (var (item, i) in items.Select((x, i) => (x, i)))
                    {
                        var bg = i == active ? MockAccent : Color.FromHex("#00000000");
                        side.Item().PaddingVertical(4).PaddingHorizontal(6).Background(bg)
                            .Text(item).FontSize(7).FontColor(i == active ? Colors.White : MockMuted);
                    }
                });
                r.RelativeItem().PaddingLeft(8).Background(MockCard).Border(1).BorderColor(MockBorder)
                    .Height(80).Padding(10).Column(c =>
                    {
                        c.Item().Text("Мои мероприятия").FontSize(9).Bold().FontColor(MockText);
                        c.Item().PaddingTop(6).Text("• Концерт группы …  [Черновик]").FontSize(7).FontColor(MockMuted);
                    });
            });
        }

        private static void MockOrganizerList(ColumnDescriptor col)
        {
            col.Item().Background(MockCard).Border(1).BorderColor(MockBorder).Padding(10).Column(c =>
            {
                c.Item().Row(r =>
                {
                    r.RelativeItem().Text("Создать мероприятие").FontSize(8).Bold().FontColor(Colors.White);
                    r.ConstantItem(60).Background(MockAccent).Padding(4).AlignCenter()
                        .Text("+ Создать").FontSize(7).FontColor(Colors.White);
                });
                c.Item().PaddingTop(8).Text("АНАМНЕЗ · На модерации · Редактировать").FontSize(7).FontColor(MockMuted);
            });
        }

        private static void MockBuilderTabs(ColumnDescriptor col, string[] tabs, int active)
        {
            col.Item().Row(r =>
            {
                foreach (var (tab, i) in tabs.Select((t, i) => (t, i)))
                {
                    var activeTab = i == active;
                    r.AutoItem().PaddingRight(4).Background(activeTab ? Color.FromHex("#ffffff18") : MockCard)
                        .Border(1).BorderColor(MockBorder).PaddingVertical(4).PaddingHorizontal(8)
                        .Text(tab).FontSize(7).FontColor(activeTab ? Colors.White : MockMuted);
                }
            });
        }

        private static void MockFormFields(ColumnDescriptor col, string[] labels)
        {
            col.Item().PaddingTop(8).Column(c =>
            {
                foreach (var label in labels)
                {
                    c.Item().PaddingBottom(6).Column(f =>
                    {
                        f.Item().Text(label).FontSize(6).FontColor(MockMuted);
                        f.Item().PaddingTop(2).Height(14).Background(Color.FromHex("#0a0a10"))
                            .Border(1).BorderColor(MockBorder);
                    });
                }
            });
        }

        private static void MockMapPreview(ColumnDescriptor col) =>
            col.Item().PaddingTop(8).Height(70).Background(Color.FromHex("#1a1a24")).Border(1).BorderColor(MockBorder)
                .AlignCenter().AlignMiddle().Text("📍  Карта площадки").FontSize(9).FontColor(MockMuted);

        private static void MockSeatMap(ColumnDescriptor col) =>
            col.Item().PaddingTop(8).Row(r =>
            {
                r.RelativeItem().Height(70).Background(Color.FromHex("#1a1a24")).Border(1).BorderColor(MockBorder)
                    .AlignCenter().AlignMiddle().Text("● ● ●  СЦЕНА  ● ● ●").FontSize(8).FontColor(MockAccent);
                r.ConstantItem(70).PaddingLeft(6).Background(MockCard).Border(1).BorderColor(MockBorder).Padding(6)
                    .Column(c =>
                    {
                        c.Item().Text("Ряд 6 · 7").FontSize(7).FontColor(MockText);
                        c.Item().PaddingTop(4).Text("50 Br").FontSize(8).Bold().FontColor(MockAccent);
                    });
            });

        private static void MockCatalogCard(ColumnDescriptor col) =>
            col.Item().PaddingTop(8).Width(120).Background(MockCard).Border(1).BorderColor(MockBorder).Column(c =>
            {
                c.Item().Height(40).Background(BrandDark);
                c.Item().Padding(6).Column(i =>
                {
                    i.Item().Text("АНАМНЕЗ").FontSize(8).Bold().FontColor(MockText);
                    i.Item().PaddingTop(2).Text("от 50 Br").FontSize(7).FontColor(MockAccent);
                });
            });

        private static void MockStatusBadge(ColumnDescriptor col, string label, Color color) =>
            col.Item().Background(color).Padding(6).AlignCenter()
                .Text(label).FontSize(8).Bold().FontColor(Colors.White);

        private static void MockButton(ColumnDescriptor col, string label) =>
            col.Item().PaddingTop(6).Background(MockAccent).Padding(8).AlignCenter()
                .Text(label).FontSize(8).Bold().FontColor(Colors.White);

        private static void MockEventPagePreview(ColumnDescriptor col) =>
            col.Item().PaddingTop(8).Background(MockCard).Border(1).BorderColor(MockBorder).Padding(10).Column(c =>
            {
                c.Item().Text("Страница события").FontSize(8).Bold().FontColor(MockText);
                c.Item().PaddingTop(6).Text("Схема зала · Выбрать места · Оплатить").FontSize(7).FontColor(MockMuted);
            });

        private static void MockEarningsPanel(ColumnDescriptor col) =>
            col.Item().PaddingTop(8).Row(r =>
            {
                r.RelativeItem().Background(MockCard).Border(1).BorderColor(MockBorder).Padding(8).Column(c =>
                {
                    c.Item().Text("Выручка").FontSize(7).FontColor(MockMuted);
                    c.Item().Text("1 240 Br").FontSize(12).Bold().FontColor(MockAccent);
                });
                r.ConstantItem(8);
                r.RelativeItem().Background(MockCard).Border(1).BorderColor(MockBorder).Padding(8).Column(c =>
                {
                    c.Item().Text("Комиссия").FontSize(7).FontColor(MockMuted);
                    c.Item().Text("12%").FontSize(12).Bold().FontColor(MockText);
                });
            });

        private static void MockAdminHeader(ColumnDescriptor col) =>
            col.Item().Row(r =>
            {
                r.RelativeItem().Column(c =>
                {
                    c.Item().Text("Панель администратора").FontSize(10).Bold().FontColor(MockText);
                    c.Item().PaddingTop(4).Text("Пользователи · Модерация · Платежи").FontSize(7).FontColor(MockMuted);
                });
                r.ConstantItem(50).Background(MockAccent).Padding(6).AlignCenter()
                    .Text("Admin").FontSize(7).Bold().FontColor(Colors.White);
            });

        private static void MockAdminTabs(ColumnDescriptor col, string[] tabs, int active)
        {
            col.Item().PaddingTop(8).Row(r =>
            {
                foreach (var (tab, i) in tabs.Select((t, i) => (t, i)))
                {
                    var on = i == active;
                    r.AutoItem().PaddingRight(3).Background(on ? MockAccent : MockCard).Border(1).BorderColor(MockBorder)
                        .PaddingVertical(3).PaddingHorizontal(6)
                        .Text(tab).FontSize(6).FontColor(on ? Colors.White : MockMuted);
                }
            });
        }

        private static void MockAdminTable(ColumnDescriptor col, string[] headers)
        {
            col.Item().PaddingTop(8).Background(MockCard).Border(1).BorderColor(MockBorder).Table(t =>
            {
                t.ColumnsDefinition(c =>
                {
                    foreach (var _ in headers) c.RelativeColumn();
                });
                t.Header(header =>
                {
                    foreach (var col in headers)
                        header.Cell().Background(Color.FromHex("#1f1f2a")).Padding(4)
                            .Text(col).FontSize(6).Bold().FontColor(MockMuted);
                });
                t.Cell().Padding(4).Text("Иван П.").FontSize(6).FontColor(MockText);
                t.Cell().Padding(4).Text("ivan@…").FontSize(6).FontColor(MockMuted);
                t.Cell().Padding(4).Text("Орг.").FontSize(6).FontColor(MockAccent);
                t.Cell().Padding(4).Text("···").FontSize(6).FontColor(MockMuted);
            });
        }

        private static void MockModerationCard(ColumnDescriptor col) =>
            col.Item().PaddingTop(8).Background(MockCard).Border(1).BorderColor(MockBorder).Padding(10).Column(c =>
            {
                c.Item().Text("АНАМНЕЗ — заявка организатора").FontSize(8).Bold().FontColor(MockText);
                c.Item().PaddingTop(8).Row(r =>
                {
                    r.AutoItem().Background(Color.FromHex("#16a34a")).Padding(5).PaddingHorizontal(10)
                        .Text("Одобрить").FontSize(7).FontColor(Colors.White);
                    r.AutoItem().PaddingLeft(6).Background(Color.FromHex("#dc2626")).Padding(5).PaddingHorizontal(10)
                        .Text("Отклонить").FontSize(7).FontColor(Colors.White);
                });
            });

        private static void MockPaymentsRow(ColumnDescriptor col) =>
            col.Item().PaddingTop(8).Text("ORD-1042 · 50 Br · оплачен · комиссия 6 Br").FontSize(7).FontColor(MockMuted);

        private static void MockSupportChat(ColumnDescriptor col) =>
            col.Item().PaddingTop(8).Column(c =>
            {
                c.Item().AlignRight().Background(MockAccent).Padding(5).PaddingHorizontal(8)
                    .Text("Здравствуйте! Как помочь?").FontSize(7).FontColor(Colors.White);
                c.Item().PaddingTop(6).AlignLeft().Background(MockCard).Border(1).BorderColor(MockBorder).Padding(5)
                    .Text("Вопрос по возврату билета").FontSize(7).FontColor(MockMuted);
            });

        private static void MockVenuesList(ColumnDescriptor col) =>
            col.Item().PaddingTop(8).Column(c =>
            {
                c.Item().Text("• Минск-Арена").FontSize(7).FontColor(MockText);
                c.Item().PaddingTop(3).Text("• Дворец спорта").FontSize(7).FontColor(MockText);
                c.Item().PaddingTop(3).Text("• Танцпол: вместимость 500").FontSize(7).FontColor(MockMuted);
            });
    }
}
