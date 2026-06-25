using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Models;

namespace MyMvcBackend.Data
{
    public class EventDbContext : DbContext
    {
        public EventDbContext(DbContextOptions<EventDbContext> options) : base(options) { }
        
        public DbSet<Event> Events { get; set; }
        public DbSet<TicketType> TicketTypes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Event>()
                .HasMany(e => e.TicketTypes)
                .WithOne(t => t.Event)
                .HasForeignKey(t => t.EventId);
        }
    }
}