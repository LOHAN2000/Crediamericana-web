using Crediamericana_backend.DTOs.Users;
using Crediamericana_backend.Services.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crediamericana_backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var users = await _userService.GetAllAsync();

            return Ok(new
            {
                success = true,
                message = "Usuarios obtenidos correctamente.",
                data = users
            });
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = await _userService.GetByIdAsync(id);

            if (user is null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "El usuario solicitado no existe."
                });
            }

            return Ok(new
            {
                success = true,
                message = "Usuario obtenido correctamente.",
                data = user
            });
        }

        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateUserDto request)
        {
            var result = await _userService.CreateAsync(request);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return CreatedAtAction(
                nameof(GetById),
                new { id = result.Data!.Id },
                new
                {
                    success = true,
                    message = result.Message,
                    data = result.Data
                }
            );
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(
            int id,
            [FromBody] UpdateUserDto request)
        {
            var result = await _userService.UpdateAsync(
                id,
                request
            );

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

        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> ChangeStatus(
            int id,
            [FromBody] ChangeUserStatusDto request)
        {
            if (!request.IsActive.HasValue)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Debe indicar el estado del usuario."
                });
            }

            var result = await _userService.ChangeStatusAsync(
                id,
                request.IsActive.Value
            );

            if (!result.Success)
            {
                return NotFound(new
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
    }
}