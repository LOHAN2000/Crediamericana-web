document.addEventListener("DOMContentLoaded", () => {
    if (isAuthenticated()) {
        window.location.replace("dashboard.html");
        return;
    }

    const loginForm = document.getElementById("loginForm");
    const loginAlert = document.getElementById("loginAlert");
    const loginButton = document.getElementById("loginButton");
    const loginButtonText = document.getElementById(
        "loginButtonText"
    );
    const loginLoader = document.getElementById("loginLoader");
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById(
        "togglePassword"
    );

    togglePassword.addEventListener("click", () => {
        const passwordIsVisible =
            passwordInput.type === "text";

        passwordInput.type = passwordIsVisible
            ? "password"
            : "text";

        togglePassword.textContent = passwordIsVisible
            ? "Mostrar"
            : "Ocultar";

        togglePassword.setAttribute(
            "aria-label",
            passwordIsVisible
                ? "Mostrar contraseña"
                : "Ocultar contraseña"
        );
    });

    loginForm.addEventListener("submit", async event => {
        event.preventDefault();
        hideAlert();

        const email = document
            .getElementById("email")
            .value
            .trim();

        const password = passwordInput.value;

        if (!email || !password) {
            showAlert(
                "Ingresa el correo electrónico y la contraseña."
            );
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.login}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

            let result = null;

            try {
                result = await response.json();
            } catch {
                result = null;
            }

            if (!response.ok) {
                throw new Error(
                    result?.message ??
                    "No fue posible iniciar sesión."
                );
            }

            if (!result?.data?.token) {
                throw new Error(
                    "La API no devolvió una sesión válida."
                );
            }

            saveSession(result.data);

            window.location.replace("dashboard.html");
        } catch (error) {
            const message =
                error instanceof TypeError
                    ? "No se pudo establecer comunicación con el servidor."
                    : error.message;

            showAlert(message);
        } finally {
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        loginButton.disabled = isLoading;

        loginButtonText.textContent = isLoading
            ? "Verificando..."
            : "Ingresar al sistema";

        loginLoader.classList.toggle(
            "hidden",
            !isLoading
        );
    }

    function showAlert(message) {
        loginAlert.textContent = message;
        loginAlert.classList.remove("hidden");
    }

    function hideAlert() {
        loginAlert.textContent = "";
        loginAlert.classList.add("hidden");
    }
});