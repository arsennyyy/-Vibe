namespace MyMvcBackend.Services.HallLayouts;

public sealed class LayoutSeatBlueprint
{
    public required string Sector { get; init; }
    public required string Row { get; init; }
    public required int Number { get; init; }
    public required string Type { get; init; }
    public required decimal Price { get; init; }
    public required string PriceTier { get; init; }
    public double? X { get; init; }
    public double? Y { get; init; }
    public bool IsGa { get; init; }
}

/// <summary>Сеточные схемы (ряды + места), без координат — как стандартная схема зала.</summary>
public static class LayoutBuilderCore
{
    public static LayoutSeatBlueprint Seat(
        string sector,
        string row,
        int number,
        string type,
        decimal price,
        string tier,
        bool isGa = false) =>
        new()
        {
            Sector = sector,
            Row = row,
            Number = number,
            Type = type,
            Price = price,
            PriceTier = tier,
            IsGa = isGa,
        };

    public static void AddRow(
        List<LayoutSeatBlueprint> seats,
        string sector,
        string row,
        int count,
        decimal price,
        string tier,
        string type = "standard")
    {
        for (var n = 1; n <= count; n++)
        {
            seats.Add(Seat(sector, row, n, type, price, tier));
        }
    }

    public static void AddFanRows(
        List<LayoutSeatBlueprint> seats,
        string sector,
        string[] rowLabels,
        int[] counts,
        decimal price,
        string tier,
        string type = "standard")
    {
        for (var i = 0; i < rowLabels.Length; i++)
        {
            AddRow(seats, sector, rowLabels[i], counts[i], price, tier, type);
        }
    }

    public static void AddGaCapacity(
        List<LayoutSeatBlueprint> seats,
        string sector,
        int capacity,
        decimal price,
        string tier = "ga")
    {
        for (var n = 1; n <= capacity; n++)
        {
            seats.Add(Seat(sector, "GA", n, "standard", price, tier, isGa: true));
        }
    }
}
