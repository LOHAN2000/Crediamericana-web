using Crediamericana_backend.DataAccess;
using Microsoft.AspNetCore.Mvc;

namespace Crediamericana_backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly CrediamericanaContext _context;

        public HealthController(CrediamericanaContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Check()
        {
            var canConnect = await _context.Database.CanConnectAsync();

            return Ok(new
            {
                application = "Crediamericana API",
                database = canConnect
                    ? "Connected"
                    : "Disconnected"
            });
        }
    }
}