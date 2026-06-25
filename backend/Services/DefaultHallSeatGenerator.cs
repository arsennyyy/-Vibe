using MyMvcBackend.Models;

namespace MyMvcBackend.Services;

/// <summary>Единая стандартная схема зала для всех событий (8 рядов А–З).</summary>
public static class DefaultHallSeatGenerator
{
    private static readonly string[] Rows = ["А", "Б", "В", "Г", "Д", "Е", "Ж", "З"];

    public static List<Seat> Build(int eventId, IEnumerable<TicketType> ticketTypes)
    {
        var types = ticketTypes.ToList();
        var vipTypes = types.Where(t => t.Name.Contains("vip", StringComparison.OrdinalIgnoreCase));
        var standardTypes = types.Where(t =>
            !t.Name.Contains("vip", StringComparison.OrdinalIgnoreCase) &&
            !t.Name.Contains("инвалид", StringComparison.OrdinalIgnoreCase) &&
            !t.Name.Contains("disabled", StringComparison.OrdinalIgnoreCase));
        var disabledTypes = types.Where(t =>
            t.Name.Contains("инвалид", StringComparison.OrdinalIgnoreCase) ||
            t.Name.Contains("disabled", StringComparison.OrdinalIgnoreCase));

        var vipPrice = vipTypes.Any() ? vipTypes.Max(t => t.Price) : 0;
        var standardPrice = standardTypes.Any()
            ? standardTypes.Min(t => t.Price)
            : types.Any() ? types.Min(t => t.Price) : 0;
        var disabledPrice = disabledTypes.Any() ? disabledTypes.Min(t => t.Price) : 0;

        var seats = new List<Seat>();

        foreach (var row in Rows)
        {
            var rowIndex = Array.IndexOf(Rows, row);
            var seatsPerRow = 12 + rowIndex * 2;

            for (var i = 1; i <= seatsPerRow; i++)
            {
                var type = "standard";
                var price = standardPrice;

                if (row is "А" or "Б")
                {
                    type = "vip";
                    price = vipPrice;
                }
                else if ((i == 1 || i == seatsPerRow) && row is "Г" or "Д")
                {
                    type = "disabled";
                    price = disabledPrice;
                }

                seats.Add(new Seat
                {
                    EventId = eventId,
                    Row = row,
                    Number = i,
                    Status = "available",
                    Type = type,
                    Price = price,
                });
            }
        }

        return seats;
    }
}
