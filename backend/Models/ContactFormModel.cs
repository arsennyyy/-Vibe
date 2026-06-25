using System.ComponentModel.DataAnnotations;

namespace MyMvcBackend.Models
{
    public class ContactFormModel
    {
        [Required(ErrorMessage = "Имя обязательно для заполнения")]
        public required string Name { get; set; }
        
        [Required(ErrorMessage = "Email обязателен для заполнения")]
        [EmailAddress(ErrorMessage = "Некорректный формат email")]
        public required string Email { get; set; }
        
        [Required(ErrorMessage = "Сообщение обязательно для заполнения")]
        public required string Message { get; set; }

        public string? CaptchaToken { get; set; }
    }
} 