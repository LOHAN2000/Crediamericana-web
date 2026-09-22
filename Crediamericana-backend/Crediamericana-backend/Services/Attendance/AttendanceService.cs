using Crediamericana_backend.DataAccess;
using Crediamericana_backend.DTOs.Attendance;
using Crediamericana_backend.Models.DataModels;
using Microsoft.EntityFrameworkCore;

namespace Crediamericana_backend.Services.Attendance
{
    public class AttendanceService : IAttendanceService
    {
        private readonly CrediamericanaContext _context;

        public AttendanceService(
            CrediamericanaContext context)
        {
            _context = context;
        }

        public async Task<
            AttendanceResult<AttendanceTodayDto>
        > GetTodayAsync(int userId)
        {
            var userIsActive = await _context.Users
                .AsNoTracking()
                .AnyAsync(user =>
                    user.Id == userId &&
                    user.IsActive
                );

            if (!userIsActive)
            {
                return AttendanceResult<
                    AttendanceTodayDto
                >.Fail(
                    "El usuario no existe o se encuentra desactivado."
                );
            }

            var today = GetPeruDate();

            var record = await _context.AttendanceRecords
                .AsNoTracking()
                .Include(record => record.User)
                .FirstOrDefaultAsync(record =>
                    record.UserId == userId &&
                    record.Date == today
                );

            if (record is null)
            {
                return AttendanceResult<
                    AttendanceTodayDto
                >.Ok(
                    new AttendanceTodayDto
                    {
                        HasEntry = false,
                        HasExit = false,
                        Status = "Pending",
                        Record = null
                    },
                    "El usuario todavía no registró su entrada."
                );
            }

            var response = MapToResponse(record);

            return AttendanceResult<
                AttendanceTodayDto
            >.Ok(
                new AttendanceTodayDto
                {
                    HasEntry = true,
                    HasExit = record.ExitTime.HasValue,
                    Status = record.Status,
                    Record = response
                },
                "Registro del día obtenido correctamente."
            );
        }

        public async Task<
            AttendanceResult<AttendanceResponseDto>
        > RegisterEntryAsync(int userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(user =>
                    user.Id == userId
                );

            if (user is null)
            {
                return AttendanceResult<
                    AttendanceResponseDto
                >.Fail(
                    "El usuario autenticado no existe."
                );
            }

            if (!user.IsActive)
            {
                return AttendanceResult<
                    AttendanceResponseDto
                >.Fail(
                    "La cuenta se encuentra desactivada."
                );
            }

            var today = GetPeruDate();

            var recordExists = await _context
                .AttendanceRecords
                .AnyAsync(record =>
                    record.UserId == userId &&
                    record.Date == today
                );

            if (recordExists)
            {
                return AttendanceResult<
                    AttendanceResponseDto
                >.Fail(
                    "La entrada de hoy ya fue registrada."
                );
            }

            var record = new AttendanceRecord
            {
                UserId = userId,
                Date = today,
                EntryTime = DateTime.UtcNow,
                ExitTime = null,
                Status = "Open",
                Observation = null,
                CreatedAt = DateTime.UtcNow
            };

            _context.AttendanceRecords.Add(record);

            await _context.SaveChangesAsync();

            record.User = user;

            return AttendanceResult<
                AttendanceResponseDto
            >.Ok(
                MapToResponse(record),
                "Entrada registrada correctamente."
            );
        }

        public async Task<
            AttendanceResult<AttendanceResponseDto>
        > RegisterExitAsync(int userId)
        {
            var userIsActive = await _context.Users
                .AsNoTracking()
                .AnyAsync(user =>
                    user.Id == userId &&
                    user.IsActive
                );

            if (!userIsActive)
            {
                return AttendanceResult<
                    AttendanceResponseDto
                >.Fail(
                    "El usuario no existe o se encuentra desactivado."
                );
            }

            var today = GetPeruDate();

            var record = await _context.AttendanceRecords
                .Include(record => record.User)
                .FirstOrDefaultAsync(record =>
                    record.UserId == userId &&
                    record.Date == today
                );

            if (record is null)
            {
                return AttendanceResult<
                    AttendanceResponseDto
                >.Fail(
                    "No puede registrar la salida sin una entrada previa."
                );
            }

            if (record.ExitTime.HasValue)
            {
                return AttendanceResult<
                    AttendanceResponseDto
                >.Fail(
                    "La salida de hoy ya fue registrada."
                );
            }

            record.ExitTime = DateTime.UtcNow;
            record.Status = "Completed";
            record.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return AttendanceResult<
                AttendanceResponseDto
            >.Ok(
                MapToResponse(record),
                "Salida registrada correctamente."
            );
        }

        public async Task<List<AttendanceResponseDto>>
            GetMyHistoryAsync(
                int userId,
                DateOnly? startDate,
                DateOnly? endDate,
                string? status)
        {
            var query = _context.AttendanceRecords
                .AsNoTracking()
                .Include(record => record.User)
                .Where(record =>
                    record.UserId == userId
                )
                .AsQueryable();

            query = ApplyFilters(
                query,
                startDate,
                endDate,
                status
            );

            var records = await query
                .OrderByDescending(record => record.Date)
                .ThenByDescending(record => record.EntryTime)
                .ToListAsync();

            return records
                .Select(MapToResponse)
                .ToList();
        }

        public async Task<List<AttendanceResponseDto>>
            GetAllAsync(AttendanceFilterDto filter)
        {
            var query = _context.AttendanceRecords
                .AsNoTracking()
                .Include(record => record.User)
                .AsQueryable();

            if (filter.UserId.HasValue)
            {
                query = query.Where(record =>
                    record.UserId == filter.UserId.Value
                );
            }

            query = ApplyFilters(
                query,
                filter.StartDate,
                filter.EndDate,
                filter.Status
            );

            var records = await query
                .OrderByDescending(record => record.Date)
                .ThenBy(record => record.User.Name)
                .ThenBy(record => record.User.LastName)
                .ToListAsync();

            return records
                .Select(MapToResponse)
                .ToList();
        }

        private static IQueryable<AttendanceRecord>
            ApplyFilters(
                IQueryable<AttendanceRecord> query,
                DateOnly? startDate,
                DateOnly? endDate,
                string? status)
        {
            if (startDate.HasValue)
            {
                query = query.Where(record =>
                    record.Date >= startDate.Value
                );
            }

            if (endDate.HasValue)
            {
                query = query.Where(record =>
                    record.Date <= endDate.Value
                );
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = NormalizeStatus(
                    status
                );

                if (normalizedStatus is not null)
                {
                    query = query.Where(record =>
                        record.Status == normalizedStatus
                    );
                }
            }

            return query;
        }

        private static string? NormalizeStatus(
            string status)
        {
            if (string.Equals(
                status.Trim(),
                "Open",
                StringComparison.OrdinalIgnoreCase))
            {
                return "Open";
            }

            if (string.Equals(
                status.Trim(),
                "Completed",
                StringComparison.OrdinalIgnoreCase))
            {
                return "Completed";
            }

            return null;
        }

        private static AttendanceResponseDto MapToResponse(
            AttendanceRecord record)
        {
            double? workedHours = null;

            if (record.ExitTime.HasValue)
            {
                workedHours = Math.Round(
                    (
                        record.ExitTime.Value -
                        record.EntryTime
                    ).TotalHours,
                    2
                );
            }

            return new AttendanceResponseDto
            {
                Id = record.Id,
                UserId = record.UserId,
                UserFullName =
                    $"{record.User.Name} {record.User.LastName}",

                Date = record.Date,
                EntryTime = record.EntryTime,
                ExitTime = record.ExitTime,
                Status = record.Status,
                Observation = record.Observation,
                WorkedHours = workedHours
            };
        }

        private static DateOnly GetPeruDate()
        {
            var peruTime = GetPeruDateTime();

            return DateOnly.FromDateTime(peruTime);
        }

        private static DateTime GetPeruDateTime()
        {
            var utcNow = DateTime.UtcNow;

            try
            {
                var timeZone = TimeZoneInfo
                    .FindSystemTimeZoneById(
                        "America/Lima"
                    );

                return TimeZoneInfo.ConvertTimeFromUtc(
                    utcNow,
                    timeZone
                );
            }
            catch (TimeZoneNotFoundException)
            {
                var windowsTimeZone = TimeZoneInfo
                    .FindSystemTimeZoneById(
                        "SA Pacific Standard Time"
                    );

                return TimeZoneInfo.ConvertTimeFromUtc(
                    utcNow,
                    windowsTimeZone
                );
            }
        }
    }
}