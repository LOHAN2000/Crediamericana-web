using Crediamericana_backend.DTOs.Attendance;

namespace Crediamericana_backend.Services.Attendance
{
    public interface IAttendanceService
    {
        Task<AttendanceResult<AttendanceTodayDto>>
            GetTodayAsync(int userId);

        Task<AttendanceResult<AttendanceResponseDto>>
            RegisterEntryAsync(int userId);

        Task<AttendanceResult<AttendanceResponseDto>>
            RegisterExitAsync(int userId);

        Task<List<AttendanceResponseDto>>
            GetMyHistoryAsync(
                int userId,
                DateOnly? startDate,
                DateOnly? endDate,
                string? status
            );

        Task<List<AttendanceResponseDto>>
            GetAllAsync(AttendanceFilterDto filter);
    }
}