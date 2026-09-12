namespace Crediamericana_backend.Services.Users
{
    public class UserServiceResult<T>
    {
        public bool Success { get; set; }

        public string Message { get; set; } = string.Empty;

        public T? Data { get; set; }

        public static UserServiceResult<T> Ok(
            T data,
            string message = "Operación realizada correctamente.")
        {
            return new UserServiceResult<T>
            {
                Success = true,
                Message = message,
                Data = data
            };
        }

        public static UserServiceResult<T> Fail(string message)
        {
            return new UserServiceResult<T>
            {
                Success = false,
                Message = message
            };
        }
    }
}