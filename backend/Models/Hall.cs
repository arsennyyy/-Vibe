using System.ComponentModel.DataAnnotations;

namespace MyMvcBackend.Models
{
    public class Hall
    {
        [Key]
        public int Id { get; set; }
        public required string Name { get; set; }
        public int VenueId { get; set; }
        public int Capacity { get; set; }
        public virtual Venue? Venue { get; set; }
        public virtual ICollection<HallLayout> Layouts { get; set; } = new List<HallLayout>();
    }
}
