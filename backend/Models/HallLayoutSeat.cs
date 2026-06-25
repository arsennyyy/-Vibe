using System.ComponentModel.DataAnnotations;

namespace MyMvcBackend.Models
{
    public class HallLayoutSeat
    {
        [Key]
        public int Id { get; set; }
        public int HallLayoutId { get; set; }
        public required string Row { get; set; }
        public int Number { get; set; }
        public required string Type { get; set; }
        public decimal Price { get; set; }
        public string? Sector { get; set; }
        public decimal? PosX { get; set; }
        public decimal? PosY { get; set; }
        public string? PriceTier { get; set; }
        public bool IsGa { get; set; }
        public virtual HallLayout? HallLayout { get; set; }
    }
}
