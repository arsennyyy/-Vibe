using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Models;

namespace MyMvcBackend.Services;

public static class FaqSeed
{
    public static async Task SeedAsync(ApplicationDbContext db)
    {
        if (await db.FaqCategories.AnyAsync()) return;

        var categories = new[]
        {
            new FaqCategory { Id = "buy", Title = "Покупка билетов", Description = "От выбора концерта до билета в кабинете", SortOrder = 0 },
            new FaqCategory { Id = "pay", Title = "Оплата и возврат", Description = "Карты, возвраты и отменённые концерты", SortOrder = 1 },
            new FaqCategory { Id = "org", Title = "Организаторам", Description = "Публикация событий и модерация", SortOrder = 2 },
            new FaqCategory { Id = "help", Title = "Поддержка", Description = "Связь с командой +Vibe", SortOrder = 3 },
        };
        db.FaqCategories.AddRange(categories);

        var items = new List<FaqItem>
        {
            new() { CategoryId = "buy", SortOrder = 0, Question = "Как купить билет на концерт?", Answer = "Раздел «Концерты» → карточка мероприятия → места на схеме → оплата. Билет появится в личном кабинете." },
            new() { CategoryId = "buy", SortOrder = 1, Question = "Нужна ли регистрация?", Answer = "Да — для покупки и хранения билетов. Регистрация по email и паролю, меньше минуты." },
            new() { CategoryId = "buy", SortOrder = 2, Question = "Не пришёл билет на почту", Answer = "Проверьте «Спам» и личный кабинет. Нет заказа — напишите в поддержку с email и названием концерта." },
            new() { CategoryId = "pay", SortOrder = 0, Question = "Какие способы оплаты?", Answer = "Visa, MasterCard, Белкарт; Apple Pay / Google Pay — где подключено. Данные карты обрабатывает банк, не +Vibe." },
            new() { CategoryId = "pay", SortOrder = 1, Question = "Можно ли вернуть билет?", Answer = "Зависит от правил мероприятия. Обычно возврат за 24–72 ч до начала. При отмене концерта — автоматический возврат." },
            new() { CategoryId = "pay", SortOrder = 2, Question = "Мероприятие отменили — что дальше?", Answer = "Уведомление на email, возврат на карту оплаты за 3–14 рабочих дней (срок банка)." },
            new() { CategoryId = "org", SortOrder = 0, Question = "Как стать организатором?", Answer = "Регистрация + назначение роли администратором по email. В профиле — создание событий с модерацией." },
            new() { CategoryId = "org", SortOrder = 1, Question = "Почему событие не в каталоге?", Answer = "До одобрения админом событие в статусе черновика или «На модерации» — видно только вам." },
            new() { CategoryId = "help", SortOrder = 0, Question = "Как связаться с поддержкой?", Answer = "Страница «Контакты» или email поддержки в разделе контактов." },
        };
        db.FaqItems.AddRange(items);
        await db.SaveChangesAsync();
    }
}
