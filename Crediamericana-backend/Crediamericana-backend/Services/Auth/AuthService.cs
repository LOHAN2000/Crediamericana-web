using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Crediamericana_backend.DataAccess;
using Crediamericana_backend.DTOs.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Crediamericana_backend.Services.Auth
{
    public class AuthService : IAuthService
    {
        private readonly CrediamericanaContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(
            CrediamericanaContext context,
            IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<AuthResult> LoginAsync(LoginRequestDto request)
        {
            var normalizedEmail = request.Email.Trim().ToLower();

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(user =>
                    user.Email.ToLower() == normalizedEmail);

            if (user is null)
            {
                return AuthResult.Fail(
                    "El correo o la contraseña son incorrectos."
                );
            }

            if (!user.IsActive)
            {
                return AuthResult.Fail(
                    "La cuenta se encuentra desactivada."
                );
            }

            var passwordIsValid = BCrypt.Net.BCrypt.Verify(
                request.Password,
                user.PasswordHash
            );

            if (!passwordIsValid)
            {
                return AuthResult.Fail(
                    "El correo o la contraseña son incorrectos."
                );
            }

            var expirationMinutes = _configuration
                .GetValue<int>("JwtSettings:ExpirationMinutes");

            if (expirationMinutes <= 0)
            {
                expirationMinutes = 120;
            }

            var expiration = DateTime.UtcNow
                .AddMinutes(expirationMinutes);

            var token = GenerateToken(user, expiration);

            var response = new LoginResponseDto
            {
                Token = token,
                Expiration = expiration,
                User = new UserSessionDto
                {
                    Id = user.Id,
                    FullName = $"{user.Name} {user.LastName}",
                    Email = user.Email,
                    Role = user.Role
                }
            };

            return AuthResult.Ok(response);
        }

        private string GenerateToken(
            Models.DataModels.User user,
            DateTime expiration)
        {
            var jwtSection = _configuration
                .GetSection("JwtSettings");

            var jwtKey = jwtSection["Key"];

            if (string.IsNullOrWhiteSpace(jwtKey))
            {
                throw new InvalidOperationException(
                    "No se encontró la clave JWT."
                );
            }

            var claims = new List<Claim>
            {
                new(
                    JwtRegisteredClaimNames.Sub,
                    user.Id.ToString()
                ),
                new(
                    JwtRegisteredClaimNames.Email,
                    user.Email
                ),
                new(
                    ClaimTypes.NameIdentifier,
                    user.Id.ToString()
                ),
                new(
                    ClaimTypes.Name,
                    $"{user.Name} {user.LastName}"
                ),
                new(
                    ClaimTypes.Email,
                    user.Email
                ),
                new(
                    ClaimTypes.Role,
                    user.Role
                ),
                new(
                    JwtRegisteredClaimNames.Jti,
                    Guid.NewGuid().ToString()
                )
            };

            var securityKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)
            );

            var credentials = new SigningCredentials(
                securityKey,
                SecurityAlgorithms.HmacSha256
            );

            var jwtToken = new JwtSecurityToken(
                issuer: jwtSection["Issuer"],
                audience: jwtSection["Audience"],
                claims: claims,
                expires: expiration,
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler()
                .WriteToken(jwtToken);
        }
    }
}