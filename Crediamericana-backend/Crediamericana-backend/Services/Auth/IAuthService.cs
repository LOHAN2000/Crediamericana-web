using Crediamericana_backend.DTOs.Auth;

namespace Crediamericana_backend.Services.Auth
{
    public interface IAuthService
    {
        Task<AuthResult> LoginAsync(LoginRequestDto request);
    }
}