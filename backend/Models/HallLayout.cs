using System.ComponentModel.DataAnnotations;

namespace MyMvcBackend.Models
{
    public class HallLayout
    {
        [Key]
        public int Id { get; set; }
        public required string Name { get; set; }
        public int HallId { get; set; }
        public bool IsActive { get; set; } = true;
        public virtual Hall? Hall { get; set; }
        public virtual ICollection<HallLayoutSeat> Seats { get; set; } = new List<HallLayoutSeat>();
    }
}
