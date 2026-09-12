using Crediamericana_backend.DTOs.Auth;
using Crediamericana_backend.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crediamericana_backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login(
            [FromBody] LoginRequestDto request)
        {
            var result = await _authService.LoginAsync(request);

            if (!result.Success)
            {
                return Unauthorized(new
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

        [Authorize]
        [HttpGet("session")]
        public IActionResult GetSession()
        {
            return Ok(new
            {
                success = true,
                message = "El token es válido.",
                user = new
                {
                    id = User.FindFirst(
                        System.Security.Claims.ClaimTypes.NameIdentifier
                    )?.Value,

                    name = User.FindFirst(
                        System.Security.Claims.ClaimTypes.Name
                    )?.Value,

                    email = User.FindFirst(
                        System.Security.Claims.ClaimTypes.Email
                    )?.Value,

                    role = User.FindFirst(
                        System.Security.Claims.ClaimTypes.Role
                    )?.Value
                }
            });
        }
    }
}