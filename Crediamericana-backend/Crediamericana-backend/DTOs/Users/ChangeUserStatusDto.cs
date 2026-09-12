using System.ComponentModel.DataAnnotations;

namespace Crediamericana_backend.DTOs.Users
{
    public class ChangeUserStatusDto
    {
        [Required]
        public bool? IsActive { get; set; }
    }
}