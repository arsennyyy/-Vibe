using System.ComponentModel.DataAnnotations;

namespace MyMvcBackend.Models
{
    public class TicketType
    {
        [Key]
        public int Id { get; set; }
        public required string Name { get; set; }
        public decimal Price { get; set; }
        public bool Available { get; set; }
        public int EventId { get; set; }
        public virtual Event? Event { get; set; }
    }
}