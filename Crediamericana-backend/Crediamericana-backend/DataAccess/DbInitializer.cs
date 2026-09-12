using Crediamericana_backend.Models.DataModels;
using Microsoft.EntityFrameworkCore;

namespace Crediamericana_backend.DataAccess
{
    public static class DbInitializer
    {
        public static async Task InitializeAsync(
            CrediamericanaContext context,
            IConfiguration configuration)
        {
            await context.Database.MigrateAsync();

            var adminEmail = configuration[
                "InitialAdmin:Email"
            ];

            var adminPassword = configuration[
                "InitialAdmin:Password"
            ];

            if (string.IsNullOrWhiteSpace(adminEmail) ||
                string.IsNullOrWhiteSpace(adminPassword))
            {
                Console.WriteLine(
                    "No se configuraron las credenciales del administrador inicial."
                );

                return;
            }

            var normalizedEmail = adminEmail
                .Trim()
                .ToLower();

            var adminExists = await context.Users
                .AnyAsync(user =>
                    user.Email.ToLower() == normalizedEmail);

            if (adminExists)
            {
                return;
            }

            var admin = new User
            {
                Name = "Administrador",
                LastName = "Crediamericana",
                DocumentNumber = "00000000",
                Email = normalizedEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(
                    adminPassword
                ),
                Role = "Admin",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            context.Users.Add(admin);

            await context.SaveChangesAsync();

            Console.WriteLine(
                "Administrador inicial creado correctamente."
            );
        }
    }
}