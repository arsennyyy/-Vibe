namespace MyMvcBackend.Services
{
    /// <summary>
    /// Комиссия маркетплейса билетов. Ориентиры 2024–2026:
    /// Eventbrite ~3.7% + фикс; агрегаторы/EU часто 10–15%; Ticketmaster выше на крупных шоу.
    /// Для BY используем 12% сервиса площадки (без отдельного эквайринга в MVP).
    /// </summary>
    public static class PlatformCommission
    {
        public const decimal DefaultPercent = 12m;

        public static decimal ResolvePercent(IConfiguration configuration) =>
            configuration.GetValue("Platform:CommissionPercent", DefaultPercent);

        public static (decimal platformFee, decimal organizerPayout) Split(decimal gross, decimal percent)
        {
            if (gross <= 0) return (0, 0);
            var fee = Math.Round(gross * percent / 100m, 2, MidpointRounding.AwayFromZero);
            var payout = Math.Round(gross - fee, 2, MidpointRounding.AwayFromZero);
            return (fee, payout);
        }
    }
}
