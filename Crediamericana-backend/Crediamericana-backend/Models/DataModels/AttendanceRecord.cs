using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Crediamericana_backend.Models.DataModels
{
    public class AttendanceRecord : BaseEntity
    {
        [Required]
        public int UserId { get; set; }

        [Required]
        public DateOnly Date { get; set; }

        [Required]
        public DateTime EntryTime { get; set; }

        public DateTime? ExitTime { get; set; }

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "Open";

        [StringLength(250)]
        public string? Observation { get; set; }

        [ForeignKey(nameof(UserId))]
        public virtual User User { get; set; } = null!;
    }
}
