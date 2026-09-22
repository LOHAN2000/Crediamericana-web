namespace Crediamericana_backend.Services.Attendance
{
    public class AttendanceResult<T>
    {
        public bool Success { get; set; }

        public string Message { get; set; } = string.Empty;

        public T? Data { get; set; }

        public static AttendanceResult<T> Ok(
            T data,
            string message)
        {
            return new AttendanceResult<T>
            {
                Success = true,
                Message = message,
                Data = data
            };
        }

        public static AttendanceResult<T> Fail(
            string message)
        {
            return new AttendanceResult<T>
            {
                Success = false,
                Message = message
            };
        }
    }
}