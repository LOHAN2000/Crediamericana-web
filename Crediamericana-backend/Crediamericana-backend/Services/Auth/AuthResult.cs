using Crediamericana_backend.DTOs.Auth;

namespace Crediamericana_backend.Services.Auth
{
    public class AuthResult
    {
        public bool Success { get; set; }

        public string Message { get; set; } = string.Empty;

        public LoginResponseDto? Data { get; set; }

        public static AuthResult Ok(LoginResponseDto data)
        {
            return new AuthResult
            {
                Success = true,
                Message = "Inicio de sesión exitoso.",
                Data = data
            };
        }

        public static AuthResult Fail(string message)
        {
            return new AuthResult
            {
                Success = false,
                Message = message
            };
        }
    }
}