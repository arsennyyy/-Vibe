using MyMvcBackend.Models;

namespace MyMvcBackend.Services;

public static class LayoutSeatMapper
{
    public static Seat ToEventSeat(HallLayoutSeat ls, int eventId, string? hallThemeJson)
    {
        return new Seat
        {
            EventId = eventId,
            Row = ls.Row,
            Number = ls.Number,
            Type = ls.Type,
            Price = HallThemeHelper.ResolveSeatPrice(ls.PriceTier, ls.Price, hallThemeJson),
            Status = "available",
            Sector = ls.Sector,
            PosX = ls.PosX,
            PosY = ls.PosY,
            PriceTier = ls.PriceTier,
            IsGa = ls.IsGa,
        };
    }
}
