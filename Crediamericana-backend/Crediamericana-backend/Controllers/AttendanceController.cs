using System.Security.Claims;
using Crediamericana_backend.DTOs.Attendance;
using Crediamericana_backend.Services.Attendance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crediamericana_backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly IAttendanceService
            _attendanceService;

        public AttendanceController(
            IAttendanceService attendanceService)
        {
            _attendanceService = attendanceService;
        }

        [HttpGet("today")]
        public async Task<IActionResult> GetToday()
        {
            var userId = GetAuthenticatedUserId();

            if (!userId.HasValue)
            {
                return Unauthorized(new
                {
                    success = false,
                    message =
                        "No se pudo identificar al usuario."
                });
            }

            var result = await _attendanceService
                .GetTodayAsync(userId.Value);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpPost("entry")]
        public async Task<IActionResult> RegisterEntry()
        {
            var userId = GetAuthenticatedUserId();

            if (!userId.HasValue)
            {
                return Unauthorized(new
                {
                    success = false,
                    message =
                        "No se pudo identificar al usuario."
                });
            }

            var result = await _attendanceService
                .RegisterEntryAsync(userId.Value);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpPatch("exit")]
        public async Task<IActionResult> RegisterExit()
        {
            var userId = GetAuthenticatedUserId();

            if (!userId.HasValue)
            {
                return Unauthorized(new
                {
                    success = false,
                    message =
                        "No se pudo identificar al usuario."
                });
            }

            var result = await _attendanceService
                .RegisterExitAsync(userId.Value);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpGet("my-history")]
        public async Task<IActionResult> GetMyHistory(
            [FromQuery] DateOnly? startDate,
            [FromQuery] DateOnly? endDate,
            [FromQuery] string? status)
        {
            var userId = GetAuthenticatedUserId();

            if (!userId.HasValue)
            {
                return Unauthorized(new
                {
                    success = false,
                    message =
                        "No se pudo identificar al usuario."
                });
            }

            if (
                startDate.HasValue &&
                endDate.HasValue &&
                startDate.Value > endDate.Value
            )
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "La fecha inicial no puede ser posterior a la fecha final."
                });
            }

            var records = await _attendanceService
                .GetMyHistoryAsync(
                    userId.Value,
                    startDate,
                    endDate,
                    status
                );

            return Ok(new
            {
                success = true,
                message =
                    "Historial obtenido correctamente.",
                data = records
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] AttendanceFilterDto filter)
        {
            if (
                filter.StartDate.HasValue &&
                filter.EndDate.HasValue &&
                filter.StartDate.Value >
                filter.EndDate.Value
            )
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "La fecha inicial no puede ser posterior a la fecha final."
                });
            }

            var records = await _attendanceService
                .GetAllAsync(filter);

            return Ok(new
            {
                success = true,
                message =
                    "Registros obtenidos correctamente.",
                data = records
            });
        }

        private int? GetAuthenticatedUserId()
        {
            var userIdValue = User.FindFirst(
                ClaimTypes.NameIdentifier
            )?.Value;

            if (
                int.TryParse(
                    userIdValue,
                    out var userId
                )
            )
            {
                return userId;
            }

            return null;
        }
    }
}