using Crediamericana_backend.DTOs.Users;

namespace Crediamericana_backend.Services.Users
{
    public interface IUserService
    {
        Task<List<UserResponseDto>> GetAllAsync();

        Task<UserResponseDto?> GetByIdAsync(int id);

        Task<UserServiceResult<UserResponseDto>> CreateAsync(
            CreateUserDto request
        );

        Task<UserServiceResult<UserResponseDto>> UpdateAsync(
            int id,
            UpdateUserDto request
        );

        Task<UserServiceResult<UserResponseDto>> ChangeStatusAsync(
            int id,
            bool isActive
        );
    }
}