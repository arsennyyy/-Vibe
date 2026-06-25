using System.ComponentModel.DataAnnotations;

namespace MyMvcBackend.Models
{
    /// <summary>Жанр или тип мероприятия для панели фильтров на /concerts.</summary>
    public class CatalogFilter
    {
        [Key]
        public int Id { get; set; }

        /// <summary>genre | type</summary>
        public required string Kind { get; set; }

        public required string Label { get; set; }

        public int SortOrder { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
