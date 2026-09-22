namespace Crediamericana_backend.DTOs.Attendance
{
    public class AttendanceFilterDto
    {
        public int? UserId { get; set; }

        public DateOnly? StartDate { get; set; }

        public DateOnly? EndDate { get; set; }

        public string? Status { get; set; }
    }
}