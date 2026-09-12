using Crediamericana_backend.DataAccess;
using Crediamericana_backend.DTOs.Users;
using Crediamericana_backend.Models.DataModels;
using Microsoft.EntityFrameworkCore;

namespace Crediamericana_backend.Services.Users
{
    public class UserService : IUserService
    {
        private readonly CrediamericanaContext _context;

        public UserService(CrediamericanaContext context)
        {
            _context = context;
        }

        public async Task<List<UserResponseDto>> GetAllAsync()
        {
            return await _context.Users
                .AsNoTracking()
                .OrderByDescending(user => user.CreatedAt)
                .Select(user => new UserResponseDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    LastName = user.LastName,
                    FullName = user.Name + " " + user.LastName,
                    DocumentNumber = user.DocumentNumber,
                    Email = user.Email,
                    Role = user.Role,
                    IsActive = user.IsActive,
                    CreatedAt = user.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<UserResponseDto?> GetByIdAsync(int id)
        {
            return await _context.Users
                .AsNoTracking()
                .Where(user => user.Id == id)
                .Select(user => new UserResponseDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    LastName = user.LastName,
                    FullName = user.Name + " " + user.LastName,
                    DocumentNumber = user.DocumentNumber,
                    Email = user.Email,
                    Role = user.Role,
                    IsActive = user.IsActive,
                    CreatedAt = user.CreatedAt
                })
                .FirstOrDefaultAsync();
        }

        public async Task<UserServiceResult<UserResponseDto>> CreateAsync(
            CreateUserDto request)
        {
            var normalizedEmail = request.Email
                .Trim()
                .ToLower();

            var normalizedDocument = request.DocumentNumber.Trim();

            var emailExists = await _context.Users
                .AnyAsync(user => user.Email == normalizedEmail);

            if (emailExists)
            {
                return UserServiceResult<UserResponseDto>.Fail(
                    "Ya existe un usuario registrado con ese correo."
                );
            }

            var documentExists = await _context.Users
                .AnyAsync(user =>
                    user.DocumentNumber == normalizedDocument);

            if (documentExists)
            {
                return UserServiceResult<UserResponseDto>.Fail(
                    "Ya existe un usuario registrado con ese documento."
                );
            }

            var normalizedRole = NormalizeRole(request.Role);

            if (normalizedRole is null)
            {
                return UserServiceResult<UserResponseDto>.Fail(
                    "El rol seleccionado no es válido."
                );
            }

            var user = new User
            {
                Name = request.Name.Trim(),
                LastName = request.LastName.Trim(),
                DocumentNumber = normalizedDocument,
                Email = normalizedEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(
                    request.Password
                ),
                Role = normalizedRole,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);

            await _context.SaveChangesAsync();

            var response = MapToResponse(user);

            return UserServiceResult<UserResponseDto>.Ok(
                response,
                "Usuario registrado correctamente."
            );
        }

        public async Task<UserServiceResult<UserResponseDto>> UpdateAsync(
            int id,
            UpdateUserDto request)
        {
            var user = await _context.Users.FindAsync(id);

            if (user is null)
            {
                return UserServiceResult<UserResponseDto>.Fail(
                    "El usuario solicitado no existe."
                );
            }

            var normalizedEmail = request.Email
                .Trim()
                .ToLower();

            var normalizedDocument = request.DocumentNumber.Trim();

            var emailExists = await _context.Users
                .AnyAsync(existingUser =>
                    existingUser.Email == normalizedEmail &&
                    existingUser.Id != id);

            if (emailExists)
            {
                return UserServiceResult<UserResponseDto>.Fail(
                    "Ya existe otro usuario registrado con ese correo."
                );
            }

            var documentExists = await _context.Users
                .AnyAsync(existingUser =>
                    existingUser.DocumentNumber == normalizedDocument &&
                    existingUser.Id != id);

            if (documentExists)
            {
                return UserServiceResult<UserResponseDto>.Fail(
                    "Ya existe otro usuario registrado con ese documento."
                );
            }

            var normalizedRole = NormalizeRole(request.Role);

            if (normalizedRole is null)
            {
                return UserServiceResult<UserResponseDto>.Fail(
                    "El rol seleccionado no es válido."
                );
            }

            user.Name = request.Name.Trim();
            user.LastName = request.LastName.Trim();
            user.DocumentNumber = normalizedDocument;
            user.Email = normalizedEmail;
            user.Role = normalizedRole;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return UserServiceResult<UserResponseDto>.Ok(
                MapToResponse(user),
                "Usuario actualizado correctamente."
            );
        }

        public async Task<UserServiceResult<UserResponseDto>> ChangeStatusAsync(
            int id,
            bool isActive)
        {
            var user = await _context.Users.FindAsync(id);

            if (user is null)
            {
                return UserServiceResult<UserResponseDto>.Fail(
                    "El usuario solicitado no existe."
                );
            }

            user.IsActive = isActive;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var message = isActive
                ? "Usuario activado correctamente."
                : "Usuario desactivado correctamente.";

            return UserServiceResult<UserResponseDto>.Ok(
                MapToResponse(user),
                message
            );
        }

        private static string? NormalizeRole(string role)
        {
            if (string.Equals(
                role.Trim(),
                "Admin",
                StringComparison.OrdinalIgnoreCase))
            {
                return "Admin";
            }

            if (string.Equals(
                role.Trim(),
                "Worker",
                StringComparison.OrdinalIgnoreCase))
            {
                return "Worker";
            }

            return null;
        }

        private static UserResponseDto MapToResponse(User user)
        {
            return new UserResponseDto
            {
                Id = user.Id,
                Name = user.Name,
                LastName = user.LastName,
                FullName = $"{user.Name} {user.LastName}",
                DocumentNumber = user.DocumentNumber,
                Email = user.Email,
                Role = user.Role,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt
            };
        }
    }
}