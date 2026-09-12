using Crediamericana_backend.Models.DataModels;
using Microsoft.EntityFrameworkCore;

namespace Crediamericana_backend.DataAccess
{
    public class CrediamericanaContext : DbContext
    {
        public CrediamericanaContext(DbContextOptions<CrediamericanaContext> options) : base(options)
        {

        }

        public DbSet<User> Users { get; set; }
        public DbSet<AttendanceRecord> AttendanceRecords { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
            .HasIndex(user => user.Email)
            .IsUnique();

            modelBuilder.Entity<User>()
            .HasIndex(user => user.DocumentNumber)
            .IsUnique();

            modelBuilder.Entity<AttendanceRecord>()
            .HasIndex(record => new
            {
                record.UserId,
                record.Date
            })
            .IsUnique();

            modelBuilder.Entity<AttendanceRecord>()
            .HasOne(record => record.User)
            .WithMany(user => user.AttendanceRecords)
            .HasForeignKey(record => record.UserId)
            .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
