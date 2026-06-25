namespace MyMvcBackend.Services.HallLayouts;

/// <summary>8 рядовых схем (как стандартная) + танцpol, без секторов.</summary>
public static class MinskHallLayoutBuilders
{
    private static void WithDanceFloor(List<LayoutSeatBlueprint> seats, int capacity, decimal price = 35) =>
        LayoutBuilderCore.AddGaCapacity(seats, "Танцпол", capacity, price, "ga");

    public static List<LayoutSeatBlueprint> BuildRePublic()
    {
        var seats = new List<LayoutSeatBlueprint>();
        AddFanRows(seats, ["А", "Б"], [8, 10], 120, "vip", "vip");
        AddFanRows(seats, ["В", "Г", "Д", "Е"], [10, 12, 12, 10], 55, "standard");
        WithDanceFloor(seats, 45, 35);
        return seats;
    }

    public static List<LayoutSeatBlueprint> BuildPhilharmonic()
    {
        var seats = new List<LayoutSeatBlueprint>();
        var rows = new[] { "А", "Б", "В", "Г", "Д", "Е", "Ж", "З" };
        for (var i = 0; i < rows.Length; i++)
        {
            var tier = i switch { < 2 => "premium", < 4 => "belletage", < 6 => "mid", _ => "balcony" };
            var price = tier switch { "premium" => 65m, "belletage" => 48m, "mid" => 38m, _ => 28m };
            AddRow(seats, rows[i], 12 + i * 2, price, tier, i < 2 ? "vip" : "standard");
        }
        WithDanceFloor(seats, 40, 32);
        return seats;
    }

    public static List<LayoutSeatBlueprint> BuildKzMinsk()
    {
        var seats = new List<LayoutSeatBlueprint>();
        AddFanRows(seats, ["А", "Б", "В", "Г", "Д", "Е", "Ж", "З", "И"], [10, 12, 14, 16, 18, 18, 16, 14, 12], 45, "standard");
        AddFanRows(seats, ["К", "Л", "М"], [14, 16, 14], 52, "premium", "vip");
        WithDanceFloor(seats, 50, 35);
        return seats;
    }

    public static List<LayoutSeatBlueprint> BuildPrimeHall()
    {
        var seats = new List<LayoutSeatBlueprint>();
        AddFanRows(seats, ["1", "2", "3"], [14, 16, 18], 42, "balcony");
        AddFanRows(seats, ["4", "5", "6", "7"], [16, 18, 20, 22], 58, "amphitheater");
        AddFanRows(seats, ["А", "Б", "В", "Г", "Д"], [14, 16, 20, 22, 24], 72, "standard");
        AddFanRows(seats, ["L1", "L2"], [4, 4], 110, "box", "vip");
        WithDanceFloor(seats, 55, 38);
        return seats;
    }

    public static List<LayoutSeatBlueprint> BuildPalaceOfRepublic()
    {
        var seats = new List<LayoutSeatBlueprint>();
        var rows = new[] { "А", "Б", "В", "Г", "Д", "Е", "Ж", "З", "И", "К" };
        for (var i = 0; i < rows.Length; i++)
        {
            var tier = i switch { < 3 => "vip", < 6 => "parterre", < 8 => "amphitheater", _ => "balcony" };
            var price = tier switch { "vip" => 120m, "parterre" => 75m, "amphitheater" => 55m, _ => 40m };
            AddRow(seats, rows[i], 14 + i * 2, price, tier, i < 3 ? "vip" : "standard");
        }
        WithDanceFloor(seats, 70, 40);
        return seats;
    }

    public static List<LayoutSeatBlueprint> BuildFalconClub()
    {
        var seats = new List<LayoutSeatBlueprint>();
        AddFanRows(seats, ["1", "2", "3", "4", "5", "6"], [12, 14, 18, 20, 18, 14], 58, "parter-center");
        AddFanRows(seats, ["7", "8", "9"], [16, 20, 16], 65, "premium", "vip");
        WithDanceFloor(seats, 60, 35);
        return seats;
    }

    public static List<LayoutSeatBlueprint> BuildSportsPalace()
    {
        var seats = new List<LayoutSeatBlueprint>();
        AddFanRows(seats, ["1", "2", "3", "4", "5", "6", "7"], [14, 16, 20, 24, 20, 16, 14], 50, "parter-center");
        AddFanRows(seats, ["8", "9", "10"], [22, 26, 22], 55, "premium");
        WithDanceFloor(seats, 80, 30);
        return seats;
    }

    public static List<LayoutSeatBlueprint> BuildMinskArena()
    {
        var seats = new List<LayoutSeatBlueprint>();
        AddFanRows(seats, ["1", "2", "3", "4", "5", "6"], [18, 22, 26, 28, 26, 22], 60, "lower");
        AddFanRows(seats, ["7", "8", "9", "10"], [24, 28, 28, 24], 50, "middle");
        AddFanRows(seats, ["11", "12", "13"], [20, 24, 20], 40, "upper");
        WithDanceFloor(seats, 100, 25);
        return seats;
    }

    private static void AddRow(
        List<LayoutSeatBlueprint> seats,
        string row,
        int count,
        decimal price,
        string tier,
        string type = "standard") =>
        LayoutBuilderCore.AddRow(seats, "Партер", row, count, price, tier, type);

    private static void AddFanRows(
        List<LayoutSeatBlueprint> seats,
        string[] rows,
        int[] counts,
        decimal price,
        string tier,
        string type = "standard")
    {
        for (var i = 0; i < rows.Length; i++)
        {
            LayoutBuilderCore.AddRow(seats, "Партер", rows[i], counts[i], price, tier, type);
        }
    }
}