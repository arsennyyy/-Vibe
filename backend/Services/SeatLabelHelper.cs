using MyMvcBackend.Models;

namespace MyMvcBackend.Services;

public static class SeatLabelHelper
{
    public static string Format(Seat seat)
    {
        if (seat.IsGa)
            return string.IsNullOrWhiteSpace(seat.Sector) ? "Танцпол" : seat.Sector.Trim();
        return $"Ряд {seat.Row} · Место {seat.Number}";
    }
}
