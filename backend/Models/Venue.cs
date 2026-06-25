using System.ComponentModel.DataAnnotations;

namespace MyMvcBackend.Models
{
    public class Venue
    {
        [Key]
        public int Id { get; set; }
        public required string Name { get; set; }
        public required string City { get; set; }
        public required string Address { get; set; }
        public virtual ICollection<Hall> Halls { get; set; } = new List<Hall>();
    }
}
