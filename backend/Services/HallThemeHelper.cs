using System.Globalization;
using System.Text.Json;

namespace MyMvcBackend.Services;

public static class HallThemeHelper
{
    public static decimal ResolveSeatPrice(string? priceTier, decimal layoutPrice, string? hallThemeJson)
    {
        if (string.IsNullOrWhiteSpace(hallThemeJson)) return layoutPrice;
        try
        {
            using var doc = JsonDocument.Parse(hallThemeJson);
            if (!doc.RootElement.TryGetProperty("tierPrices", out var prices)) return layoutPrice;
            if (string.IsNullOrWhiteSpace(priceTier)) return layoutPrice;
            if (!prices.TryGetProperty(priceTier, out var val)) return layoutPrice;

            if (val.ValueKind == JsonValueKind.Number && val.TryGetDecimal(out var p)) return p;
            if (val.ValueKind == JsonValueKind.String)
            {
                var s = val.GetString();
                if (s != null && decimal.TryParse(s, NumberStyles.Number, CultureInfo.InvariantCulture, out var ps))
                    return ps;
            }
        }
        catch
        {
            // ignore malformed theme
        }

        return layoutPrice;
    }
}
