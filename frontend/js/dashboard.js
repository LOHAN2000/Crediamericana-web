document.addEventListener("DOMContentLoaded", async () => {
    if (!requireAuthentication()) {
        return;
    }

    const user = getStoredUser();

    if (!user) {
        logout();
        return;
    }

    fillUserInformation(user);
    configureRoleVisibility(user.role);
    configureNavigation();
    configureProfileMenu();
    configureLogoutButtons();
    startClock();

    await Promise.all([
        verifySystemStatus(),
        loadUserCount(user.role)
    ]);
});

function fillUserInformation(user) {
    const fullName = user.fullName || user.name || "Usuario";
    const firstName = fullName.trim().split(/\s+/)[0] || "Usuario";
    const roleLabel = getRoleLabel(user.role);
    const initial = firstName.charAt(0).toUpperCase();

    setText("sidebarUserName", fullName);
    setText("sidebarUserRole", roleLabel);
    setText("topbarUserName", firstName);
    setText("topbarUserRole", roleLabel);
    setText("dropdownUserName", fullName);
    setText("dropdownUserEmail", user.email || "Sin correo registrado");
    setText("welcomeTitle", `Hola, ${firstName}`);
    setText("sidebarAvatar", initial);
    setText("topbarAvatar", initial);
}

function configureRoleVisibility(role) {
    if (role === "Admin") {
        return;
    }

    document.querySelectorAll(".admin-only").forEach(element => {
        element.classList.add("hidden");
    });
}

function configureNavigation() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const menuButton = document.getElementById("menuButton");

    if (!sidebar || !overlay || !menuButton) {
        return;
    }

    const setSidebarState = isOpen => {
        sidebar.classList.toggle("open", isOpen);
        overlay.classList.toggle("open", isOpen);
        menuButton.setAttribute("aria-expanded", String(isOpen));
        overlay.setAttribute("aria-hidden", String(!isOpen));
    };

    menuButton.addEventListener("click", () => {
        setSidebarState(!sidebar.classList.contains("open"));
    });

    overlay.addEventListener("click", () => setSidebarState(false));

    window.addEventListener("resize", () => {
        if (window.innerWidth > 920) {
            setSidebarState(false);
        }
    });
}

function configureProfileMenu() {
    const profileButton = document.getElementById("profileButton");
    const profileDropdown = document.getElementById("profileDropdown");

    if (!profileButton || !profileDropdown) {
        return;
    }

    const closeDropdown = () => {
        profileDropdown.classList.add("hidden");
        profileButton.setAttribute("aria-expanded", "false");
    };

    profileButton.addEventListener("click", event => {
        event.stopPropagation();
        const willOpen = profileDropdown.classList.contains("hidden");
        profileDropdown.classList.toggle("hidden", !willOpen);
        profileButton.setAttribute("aria-expanded", String(willOpen));
    });

    profileDropdown.addEventListener("click", event => {
        event.stopPropagation();
    });

    document.addEventListener("click", closeDropdown);
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeDropdown();
        }
    });
}

function configureLogoutButtons() {
    ["logoutButton", "sidebarLogoutButton"].forEach(id => {
        const button = document.getElementById(id);
        button?.addEventListener("click", logout);
    });
}

function startClock() {
    const update = () => {
        const now = new Date();

        const dateText = new Intl.DateTimeFormat("es-PE", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(now);

        const timeText = new Intl.DateTimeFormat("es-PE", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }).format(now);

        setText("currentDate", capitalizeFirstLetter(dateText));
        setText("currentTime", timeText);
    };

    update();
    window.setInterval(update, 1000);
}

async function verifySystemStatus() {
    const apiDot = document.getElementById("apiStatusDot");
    const databaseDot = document.getElementById("databaseStatusDot");

    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/Health`);

        if (!response.ok) {
            throw new Error("El servicio no respondió correctamente.");
        }

        const result = await response.json();
        const databaseConnected =
            result.database === "Connected" || result.database === true;

        setStatus(apiDot, "apiStatusText", true, "Servicio disponible");
        setStatus(
            databaseDot,
            "databaseStatusText",
            databaseConnected,
            databaseConnected ? "Conexión establecida" : "Sin conexión"
        );
    } catch {
        setStatus(apiDot, "apiStatusText", false, "Servicio no disponible");
        setStatus(databaseDot, "databaseStatusText", false, "No verificada");
    }
}

async function loadUserCount(role) {
    const countElement = document.getElementById("registeredUsersCount");

    if (!countElement) {
        return;
    }

    if (role !== "Admin") {
        countElement.textContent = "N/A";
        return;
    }

    try {
        const response = await authenticatedFetch(API_CONFIG.endpoints.users);

        if (!response) {
            return;
        }

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result?.message || "No se pudieron obtener los usuarios.");
        }

        const users = Array.isArray(result?.data) ? result.data : [];
        countElement.textContent = String(users.length);
    } catch {
        countElement.textContent = "--";
    }
}

function setStatus(dot, textId, isOnline, text) {
    if (dot) {
        dot.classList.remove("checking", "online", "offline");
        dot.classList.add(isOnline ? "online" : "offline");
    }

    setText(textId, text);
}

function getRoleLabel(role) {
    return role === "Admin" ? "Administrador" : "Trabajador";
}

function capitalizeFirstLetter(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}
