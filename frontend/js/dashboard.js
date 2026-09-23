const PERU_TIME_ZONE = "America/Lima";
let dashboardUser = null;

document.addEventListener("DOMContentLoaded", async () => {
    if (!requireAuthentication()) return;

    dashboardUser = getStoredUser();
    if (!dashboardUser) {
        logout();
        return;
    }

    fillUserInformation(dashboardUser);
    configureRoleVisibility(dashboardUser.role);
    configureNavigation();
    configureProfileMenu();
    configureLogoutButtons();
    configureDashboardCards(dashboardUser.role);
    startClock();

    await Promise.all([
        verifySystemStatus(),
        loadDashboardData(dashboardUser.role)
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

    const welcomeText = document.querySelector(".welcome-copy p");
    if (welcomeText) {
        welcomeText.textContent = user.role === "Admin"
            ? "Supervisa las cuentas del personal y consulta el estado de las asistencias registradas hoy."
            : "Consulta el estado de tu jornada, registra tu asistencia y revisa tu historial personal.";
    }
}

function configureRoleVisibility(role) {
    if (role === "Admin") return;

    document.querySelectorAll(".admin-only").forEach(element => {
        element.classList.add("hidden");
    });
}

function configureDashboardCards(role) {
    const grid = document.querySelector(".summary-grid");
    const cards = grid ? [...grid.querySelectorAll(".summary-card")] : [];
    if (!grid || cards.length < 3) return;

    if (role === "Admin") {
        setCardContent(cards[0], "♟", "red", "Usuarios registrados", "registeredUsersCount", "--", "Cuentas en el sistema");
        setCardContent(cards[1], "✓", "green", "Asistencias de hoy", "todayAttendancesCount", "--", "Entradas registradas");
        setCardContent(cards[2], "◷", "gray", "Jornadas pendientes", "openAttendancesCount", "--", "Sin hora de salida");

        const timeCard = document.createElement("article");
        timeCard.className = "summary-card dashboard-time-card";
        timeCard.innerHTML = `
            <span class="summary-icon gray" aria-hidden="true">◷</span>
            <div>
                <p>Hora actual</p>
                <strong id="currentTime">--:--:--</strong>
                <span class="summary-detail">Hora de Perú</span>
            </div>
        `;
        grid.appendChild(timeCard);
        grid.classList.add("admin-summary-grid");
        return;
    }

    setCardContent(cards[0], "✓", "red", "Estado de la jornada", "workerAttendanceStatus", "Consultando...", "Registro de hoy");
    setCardContent(cards[1], "→", "green", "Hora de entrada", "workerEntryTime", "--:--:--", "Inicio de jornada");
    setCardContent(cards[2], "←", "gray", "Hora de salida", "workerExitTime", "--:--:--", "Fin de jornada");

    const timeCard = document.createElement("article");
    timeCard.className = "summary-card dashboard-time-card";
    timeCard.innerHTML = `
        <span class="summary-icon gray" aria-hidden="true">◷</span>
        <div>
            <p>Hora actual</p>
            <strong id="currentTime">--:--:--</strong>
            <span class="summary-detail">Hora de Perú</span>
        </div>
    `;
    grid.appendChild(timeCard);
    grid.classList.add("worker-summary-grid");
}

function setCardContent(card, icon, iconClass, label, valueId, value, detail) {
    card.innerHTML = `
        <span class="summary-icon ${iconClass}" aria-hidden="true">${icon}</span>
        <div>
            <p>${label}</p>
            <strong id="${valueId}">${value}</strong>
            <span class="summary-detail">${detail}</span>
        </div>
    `;
}

async function loadDashboardData(role) {
    if (role === "Admin") {
        await Promise.all([
            loadUserCount(),
            loadAdminAttendanceSummary()
        ]);
        return;
    }

    await loadWorkerAttendanceSummary();
}

async function loadUserCount() {
    try {
        const response = await authenticatedFetch(API_CONFIG.endpoints.users);
        if (!response) return;

        const result = await readJsonSafely(response);
        if (!response.ok) throw new Error();

        const users = Array.isArray(result?.data) ? result.data : [];
        setText("registeredUsersCount", String(users.length));
    } catch {
        setText("registeredUsersCount", "--");
    }
}

async function loadAdminAttendanceSummary() {
    const today = getPeruIsoDate();

    try {
        const response = await authenticatedFetch(
            `/Attendance?startDate=${today}&endDate=${today}`
        );
        if (!response) return;

        const result = await readJsonSafely(response);
        if (!response.ok) throw new Error();

        const records = Array.isArray(result?.data) ? result.data : [];
        const openRecords = records.filter(record => record.status === "Open");

        setText("todayAttendancesCount", String(records.length));
        setText("openAttendancesCount", String(openRecords.length));
    } catch {
        setText("todayAttendancesCount", "--");
        setText("openAttendancesCount", "--");
    }
}

async function loadWorkerAttendanceSummary() {
    try {
        const response = await authenticatedFetch("/Attendance/today");
        if (!response) return;

        const result = await readJsonSafely(response);
        if (!response.ok) {
            throw new Error(result?.message || "No se pudo consultar la jornada.");
        }

        const data = result?.data;
        const record = data?.record;

        let statusText = "Pendiente de entrada";
        let statusClass = "pending-value";

        if (data?.hasEntry && !data?.hasExit) {
            statusText = "Jornada iniciada";
            statusClass = "open-value";
        } else if (data?.hasEntry && data?.hasExit) {
            statusText = "Completada";
            statusClass = "completed-value";
        }

        const statusElement = document.getElementById("workerAttendanceStatus");
        if (statusElement) {
            statusElement.textContent = statusText;
            statusElement.classList.remove("pending-value", "open-value", "completed-value");
            statusElement.classList.add(statusClass);
        }

        setText("workerEntryTime", formatPeruTime(record?.entryTime));
        setText("workerExitTime", formatPeruTime(record?.exitTime));
    } catch {
        setText("workerAttendanceStatus", "No disponible");
        setText("workerEntryTime", "--:--:--");
        setText("workerExitTime", "--:--:--");
    }
}

function configureNavigation() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const menuButton = document.getElementById("menuButton");
    if (!sidebar || !overlay || !menuButton) return;

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
        if (window.innerWidth > 920) setSidebarState(false);
    });
}

function configureProfileMenu() {
    const profileButton = document.getElementById("profileButton");
    const profileDropdown = document.getElementById("profileDropdown");
    if (!profileButton || !profileDropdown) return;

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

    profileDropdown.addEventListener("click", event => event.stopPropagation());
    document.addEventListener("click", closeDropdown);
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeDropdown();
    });
}

function configureLogoutButtons() {
    ["logoutButton", "sidebarLogoutButton"].forEach(id => {
        document.getElementById(id)?.addEventListener("click", logout);
    });
}

function startClock() {
    const update = () => {
        const now = new Date();

        const dateText = new Intl.DateTimeFormat("es-PE", {
            timeZone: PERU_TIME_ZONE,
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(now);

        const timeText = new Intl.DateTimeFormat("es-PE", {
            timeZone: PERU_TIME_ZONE,
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
        if (!response.ok) throw new Error();

        const result = await response.json();
        const databaseConnected =
            result.database === "Connected" || result.database === true;

        setSystemStatus(apiDot, "apiStatusText", true, "Servicio disponible");
        setSystemStatus(
            databaseDot,
            "databaseStatusText",
            databaseConnected,
            databaseConnected ? "Conexión establecida" : "Sin conexión"
        );
    } catch {
        setSystemStatus(apiDot, "apiStatusText", false, "Servicio no disponible");
        setSystemStatus(databaseDot, "databaseStatusText", false, "No verificada");
    }
}

function getPeruIsoDate() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: PERU_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const values = Object.fromEntries(
        parts
            .filter(part => part.type !== "literal")
            .map(part => [part.type, part.value])
    );

    return `${values.year}-${values.month}-${values.day}`;
}

function formatPeruTime(value) {
    if (!value) return "Sin registrar";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sin registrar";

    return new Intl.DateTimeFormat("es-PE", {
        timeZone: PERU_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(date);
}

function setSystemStatus(dot, textId, isOnline, text) {
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
    if (element) element.textContent = value;
}

async function readJsonSafely(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}
