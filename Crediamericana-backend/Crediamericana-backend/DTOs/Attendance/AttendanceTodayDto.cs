namespace Crediamericana_backend.DTOs.Attendance
{
    public class AttendanceTodayDto
    {
        public bool HasEntry { get; set; }

        public bool HasExit { get; set; }

        public string Status { get; set; } = "Pending";

        public AttendanceResponseDto? Record { get; set; }
    }
}