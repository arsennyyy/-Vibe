using System.ComponentModel.DataAnnotations;

namespace MyMvcBackend.Models
{
    public class UserRegistrationModel
    {
        [Required(ErrorMessage = "Имя обязательно для заполнения")]
        [StringLength(100, ErrorMessage = "Имя должно быть от 2 до 100 символов", MinimumLength = 2)]
        public required string Name { get; set; }
        
        [Required(ErrorMessage = "Email обязателен для заполнения")]
        [EmailAddress(ErrorMessage = "Некорректный формат email")]
        public required string Email { get; set; }
        
        [Required(ErrorMessage = "Пароль обязателен для заполнения")]
        [StringLength(100, ErrorMessage = "Пароль должен быть от 6 до 100 символов", MinimumLength = 6)]
        public required string Password { get; set; }
        
        [Required(ErrorMessage = "Подтверждение пароля обязательно")]
        [Compare("Password", ErrorMessage = "Пароли не совпадают")]
        public required string ConfirmPassword { get; set; }
    }
}