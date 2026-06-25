using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace MyMvcBackend.Services;

public class ImageOptimizationService
{
    public sealed class OptimizedImage
    {
        public required string RelativePath { get; init; }
        public required string PhysicalPath { get; init; }
        public required string ContentType { get; init; }
        public required string Extension { get; init; }
    }

    public async Task<OptimizedImage> SaveOptimizedAsync(
        IFormFile file,
        string webRoot,
        string subfolder,
        int maxWidth = 1600,
        int maxHeight = 1600,
        int quality = 82)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("Пустой файл");

        var uploadsDir = Path.Combine(webRoot, "uploads", subfolder);
        Directory.CreateDirectory(uploadsDir);

        await using var input = file.OpenReadStream();
        using var image = await Image.LoadAsync(input);

        image.Mutate(ctx =>
        {
            var ratio = Math.Min((double)maxWidth / image.Width, (double)maxHeight / image.Height);
            if (ratio < 1)
            {
                var w = Math.Max(1, (int)Math.Round(image.Width * ratio));
                var h = Math.Max(1, (int)Math.Round(image.Height * ratio));
                ctx.Resize(w, h);
            }
        });

        const string ext = ".webp";
        var fileName = $"{Guid.NewGuid():N}{ext}";
        var physicalPath = Path.Combine(uploadsDir, fileName);
        await image.SaveAsync(physicalPath, new WebpEncoder { Quality = quality });

        var relative = $"/uploads/{subfolder}/{fileName}";
        return new OptimizedImage
        {
            RelativePath = relative,
            PhysicalPath = physicalPath,
            ContentType = "image/webp",
            Extension = ext,
        };
    }
}
