using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace MyMvcBackend.Models
{
    public enum EventStatus
    {
        Draft = 0,
        PendingReview = 1,
        Approved = 2,
        Rejected = 3,
        Published = 4,
        Passed = 5,
        Cancelled = 6
    }

    public class Event
    {
        [Key]
        public int Id { get; set; }
        public required string Title { get; set; }
        public required string Image { get; set; }
        public DateTime Date { get; set; }
        public required string Time { get; set; }
        public required string Location { get; set; }
        public required string Address { get; set; }
        public required string Price { get; set; }
        public string? Category { get; set; }
        /// <summary>Жанр для фильтра на странице концертов (совпадает с label в catalog_filters).</summary>
        public string? Genre { get; set; }
        public required string Description { get; set; }
        public required string EventType { get; set; }
        public required string Lineup { get; set; } // Stored as JSON string
        public bool IsFeatured { get; set; }
        public EventStatus Status { get; set; } = EventStatus.Draft;
        public int? OrganizerId { get; set; }
        public int? ReviewedByAdminId { get; set; }
        public string? ReviewComment { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        /// <summary>Когда событие должно появиться в каталоге (организатор задаёт после одобрения).</summary>
        public DateTime? ScheduledPublishAt { get; set; }
        /// <summary>Фактическое время публикации в каталоге.</summary>
        public DateTime? PublishedAt { get; set; }
        /// <summary>Когда убрать событие из каталога (организатор задаёт при публикации).</summary>
        public DateTime? ScheduledUnpublishAt { get; set; }
        public int? VenueId { get; set; }
        public int? HallId { get; set; }
        public int? HallLayoutId { get; set; }
        /// <summary>JSON: tierColors, tierPrices, tierLabels для схемы зала.</summary>
        public string? HallThemeJson { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        /// <summary>Событие создано администратором и передано организатору.</summary>
        public bool CreatedByAdmin { get; set; }
        /// <summary>editable | viewonly — режим доступа назначенного организатора.</summary>
        public string? AdminOrganizerAccess { get; set; }
        public int? CreatedByAdminUserId { get; set; }

        /// <summary>Разрешить покупателям передавать билеты друзьям по номинальной цене.</summary>
        public bool AllowTicketTransfer { get; set; }

        [NotMapped]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        public bool IsSoldOut { get; set; }

        public virtual ICollection<TicketType> TicketTypes { get; set; } = new List<TicketType>();
        public virtual ICollection<Seat> Seats { get; set; } = new List<Seat>();
        public virtual User? Organizer { get; set; }
        public virtual Venue? Venue { get; set; }
        public virtual Hall? Hall { get; set; }
        public virtual HallLayout? HallLayout { get; set; }
    }
}