namespace Crediamericana_backend.DTOs.Attendance
{
    public class AttendanceResponseDto
    {
        public int Id { get; set; }

        public int UserId { get; set; }

        public string UserFullName { get; set; } = string.Empty;

        public DateOnly Date { get; set; }

        public DateTime EntryTime { get; set; }

        public DateTime? ExitTime { get; set; }

        public string Status { get; set; } = string.Empty;

        public string? Observation { get; set; }

        public double? WorkedHours { get; set; }
    }
}