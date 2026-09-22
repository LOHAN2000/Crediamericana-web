let attendanceRecords = [];
let filteredAttendanceRecords = [];
let currentSessionUser = null;

const PERU_TIME_ZONE = "America/Lima";

document.addEventListener("DOMContentLoaded", async () => {
    if (!requireAuthentication()) return;

    currentSessionUser = getStoredUser();

    if (!currentSessionUser) {
        logout();
        return;
    }

    fillSessionInformation(currentSessionUser);
    applyRoleVisibility(currentSessionUser.role);
    configureNavigation();
    configureProfileMenu();
    configureLogoutButtons();
    configureFilters();
    configureDefaultDates();
    showLoadingState();

    if (currentSessionUser.role === "Admin") {
        await loadUsersForFilter();
    }

    await loadAttendanceHistory();
});

function fillSessionInformation(user) {
    const fullName = user.fullName || user.name || "Usuario";
    const firstName = fullName.trim().split(/\s+/)[0] || "Usuario";
    const roleLabel = user.role === "Admin" ? "Administrador" : "Trabajador";
    const initial = firstName.charAt(0).toUpperCase();

    const values = {
        sidebarUserName: fullName,
        sidebarUserRole: roleLabel,
        topbarUserName: firstName,
        topbarUserRole: roleLabel,
        dropdownUserName: fullName,
        dropdownUserEmail: user.email || "Sin correo registrado",
        sidebarAvatar: initial,
        topbarAvatar: initial
    };

    Object.entries(values).forEach(([id, value]) => setText(id, value));

    setText(
        "heroDescription",
        user.role === "Admin"
            ? "Consulta los registros de entrada y salida del personal por trabajador, fecha y estado."
            : "Consulta tus registros de entrada y salida por fecha y estado."
    );
}

function applyRoleVisibility(role) {
    if (role === "Admin") return;

    document.querySelectorAll(".admin-only").forEach(element => {
        element.classList.add("hidden");
    });
}

function configureNavigation() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const menuButton = document.getElementById("menuButton");

    if (!sidebar || !overlay || !menuButton) return;

    const setOpen = open => {
        sidebar.classList.toggle("open", open);
        overlay.classList.toggle("open", open);
        menuButton.setAttribute("aria-expanded", String(open));
        overlay.setAttribute("aria-hidden", String(!open));
    };

    menuButton.addEventListener("click", () => {
        setOpen(!sidebar.classList.contains("open"));
    });

    overlay.addEventListener("click", () => setOpen(false));
}

function configureProfileMenu() {
    const profileButton = document.getElementById("profileButton");
    const profileDropdown = document.getElementById("profileDropdown");

    if (!profileButton || !profileDropdown) return;

    const close = () => {
        profileDropdown.classList.add("hidden");
        profileButton.setAttribute("aria-expanded", "false");
    };

    profileButton.addEventListener("click", event => {
        event.stopPropagation();
        const open = profileDropdown.classList.contains("hidden");
        profileDropdown.classList.toggle("hidden", !open);
        profileButton.setAttribute("aria-expanded", String(open));
    });

    profileDropdown.addEventListener("click", event => event.stopPropagation());
    document.addEventListener("click", close);
}

function configureLogoutButtons() {
    ["logoutButton", "sidebarLogoutButton"].forEach(id => {
        document.getElementById(id)?.addEventListener("click", logout);
    });
}

function configureFilters() {
    document.getElementById("applyFiltersButton")?.addEventListener(
        "click",
        loadAttendanceHistory
    );

    document.getElementById("clearFiltersButton")?.addEventListener(
        "click",
        async () => {
            const userFilter = document.getElementById("userFilter");
            const statusFilter = document.getElementById("statusFilter");
            const startDate = document.getElementById("startDate");
            const endDate = document.getElementById("endDate");

            if (userFilter) userFilter.value = "all";
            if (statusFilter) statusFilter.value = "all";
            if (startDate) startDate.value = "";
            if (endDate) endDate.value = "";

            await loadAttendanceHistory();
        }
    );
}

function configureDefaultDates() {
    const now = getPeruDateParts();
    const firstDay = `${now.year}-${String(now.month).padStart(2, "0")}-01`;
    const today = `${now.year}-${String(now.month).padStart(2, "0")}-${String(now.day).padStart(2, "0")}`;

    const startDate = document.getElementById("startDate");
    const endDate = document.getElementById("endDate");

    if (startDate) startDate.value = firstDay;
    if (endDate) endDate.value = today;

    const formattedDate = new Intl.DateTimeFormat("es-PE", {
        timeZone: PERU_TIME_ZONE,
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(new Date());

    setText("currentDate", capitalize(formattedDate));
}

async function loadUsersForFilter() {
    const select = document.getElementById("userFilter");
    if (!select) return;

    try {
        const response = await authenticatedFetch(API_CONFIG.endpoints.users);
        if (!response) return;

        const result = await readJsonSafely(response);
        if (!response.ok) return;

        const users = Array.isArray(result?.data) ? result.data : [];

        select.innerHTML = '<option value="all">Todos los trabajadores</option>';

        users
            .filter(user => user.isActive)
            .sort((a, b) => getFullName(a).localeCompare(getFullName(b), "es"))
            .forEach(user => {
                const option = document.createElement("option");
                option.value = String(user.id);
                option.textContent = getFullName(user);
                select.appendChild(option);
            });
    } catch {
        // El historial puede cargarse aunque falle este selector auxiliar.
    }
}

async function loadAttendanceHistory() {
    if (!validateDateRange()) return;

    showLoadingState();

    try {
        const endpoint = buildHistoryEndpoint();
        const response = await authenticatedFetch(endpoint);
        if (!response) return;

        const result = await readJsonSafely(response);

        if (!response.ok) {
            throw new Error(result?.message || "No se pudo consultar el historial.");
        }

        attendanceRecords = Array.isArray(result?.data) ? result.data : [];
        filteredAttendanceRecords = [...attendanceRecords];
        renderHistory();
    } catch (error) {
        attendanceRecords = [];
        filteredAttendanceRecords = [];
        renderHistory();
        showHistoryMessage(
            error.message || "No se pudo establecer comunicación con la API.",
            "error"
        );
    }
}

function buildHistoryEndpoint() {
    const isAdmin = currentSessionUser.role === "Admin";
    const baseEndpoint = isAdmin
        ? "/Attendance"
        : "/Attendance/my-history";

    const parameters = new URLSearchParams();
    const startDate = document.getElementById("startDate")?.value;
    const endDate = document.getElementById("endDate")?.value;
    const status = document.getElementById("statusFilter")?.value;
    const userId = document.getElementById("userFilter")?.value;

    if (startDate) parameters.set("startDate", startDate);
    if (endDate) parameters.set("endDate", endDate);
    if (status && status !== "all") parameters.set("status", status);
    if (isAdmin && userId && userId !== "all") parameters.set("userId", userId);

    const query = parameters.toString();
    return query ? `${baseEndpoint}?${query}` : baseEndpoint;
}

function validateDateRange() {
    const startDate = document.getElementById("startDate")?.value;
    const endDate = document.getElementById("endDate")?.value;

    if (startDate && endDate && startDate > endDate) {
        showHistoryMessage(
            "La fecha inicial no puede ser posterior a la fecha final.",
            "error"
        );
        return false;
    }

    hideHistoryMessage();
    return true;
}

function renderHistory() {
    updateSummary();
    renderDesktopTable();
    renderMobileCards();

    const hasRecords = filteredAttendanceRecords.length > 0;
    document.getElementById("emptyHistoryState")?.classList.toggle("hidden", hasRecords);
    document.getElementById("recordsTableContainer")?.classList.toggle("hidden", !hasRecords);
    document.getElementById("mobileRecords")?.classList.toggle("hidden", !hasRecords);

    setText(
        "resultsLabel",
        `${filteredAttendanceRecords.length} ${filteredAttendanceRecords.length === 1 ? "registro" : "registros"}`
    );
}

function updateSummary() {
    const completed = filteredAttendanceRecords.filter(
        record => record.status === "Completed"
    ).length;

    const pending = filteredAttendanceRecords.filter(
        record => record.status === "Open"
    ).length;

    setText("totalRecords", String(filteredAttendanceRecords.length));
    setText("completedRecords", String(completed));
    setText("pendingRecords", String(pending));
}

function renderDesktopTable() {
    const tbody = document.getElementById("recordsTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    filteredAttendanceRecords.forEach(record => {
        const row = document.createElement("tr");
        const status = getStatusData(record.status);

        row.innerHTML = `
            <td>
                <div class="history-user-cell">
                    <span class="history-avatar">${escapeHtml(getInitial(record.userFullName))}</span>
                    <strong>${escapeHtml(record.userFullName || "Usuario")}</strong>
                </div>
            </td>
            <td>${escapeHtml(formatRecordDate(record.date))}</td>
            <td>${escapeHtml(formatPeruTime(record.entryTime))}</td>
            <td>${escapeHtml(formatPeruTime(record.exitTime))}</td>
            <td>${escapeHtml(formatDuration(record))}</td>
            <td><span class="record-status ${status.className}">${status.label}</span></td>
        `;

        tbody.appendChild(row);
    });
}

function renderMobileCards() {
    const container = document.getElementById("mobileRecords");
    if (!container) return;

    container.innerHTML = "";

    filteredAttendanceRecords.forEach(record => {
        const status = getStatusData(record.status);
        const card = document.createElement("article");
        card.className = "record-card";

        card.innerHTML = `
            <div class="record-card-header">
                <div class="history-user-cell">
                    <span class="history-avatar">${escapeHtml(getInitial(record.userFullName))}</span>
                    <div>
                        <strong>${escapeHtml(record.userFullName || "Usuario")}</strong>
                        <small>${escapeHtml(formatRecordDate(record.date))}</small>
                    </div>
                </div>
                <span class="record-status ${status.className}">${status.label}</span>
            </div>
            <div class="record-card-grid">
                <div><span>Entrada</span><strong>${escapeHtml(formatPeruTime(record.entryTime))}</strong></div>
                <div><span>Salida</span><strong>${escapeHtml(formatPeruTime(record.exitTime))}</strong></div>
                <div><span>Duración</span><strong>${escapeHtml(formatDuration(record))}</strong></div>
            </div>
        `;

        container.appendChild(card);
    });
}

function showLoadingState() {
    const emptyState = document.getElementById("emptyHistoryState");
    const table = document.getElementById("recordsTableContainer");
    const mobile = document.getElementById("mobileRecords");

    table?.classList.add("hidden");
    mobile?.classList.add("hidden");

    if (emptyState) {
        emptyState.classList.remove("hidden");
        const title = emptyState.querySelector("strong");
        const description = emptyState.querySelector("p");
        if (title) title.textContent = "Consultando registros";
        if (description) description.textContent = "Estamos obteniendo la información desde la base de datos.";
    }
}

function showHistoryMessage(message, type) {
    let messageBox = document.getElementById("historyMessage");

    if (!messageBox) {
        messageBox = document.createElement("div");
        messageBox.id = "historyMessage";
        messageBox.className = "history-message";

        const main = document.querySelector(".history-main");
        main?.prepend(messageBox);
    }

    messageBox.textContent = message;
    messageBox.className = `history-message ${type}`;
}

function hideHistoryMessage() {
    document.getElementById("historyMessage")?.classList.add("hidden");
}

function getStatusData(status) {
    return status === "Completed"
        ? { label: "Completado", className: "completed" }
        : { label: "Pendiente", className: "open" };
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

function formatRecordDate(value) {
    if (!value) return "Sin fecha";

    const parts = String(value).split("-");
    if (parts.length !== 3) return value;

    const [year, month, day] = parts;
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    return new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date);
}

function formatDuration(record) {
    if (!record.exitTime) return "En curso";

    const entry = new Date(record.entryTime);
    const exit = new Date(record.exitTime);
    const milliseconds = exit.getTime() - entry.getTime();

    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
        return record.workedHours != null
            ? `${Number(record.workedHours).toFixed(2)} h`
            : "No disponible";
    }

    const totalMinutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) return `${minutes} min`;
    return `${hours} h ${String(minutes).padStart(2, "0")} min`;
}

function getPeruDateParts() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: PERU_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const values = Object.fromEntries(
        parts.filter(part => part.type !== "literal").map(part => [part.type, part.value])
    );

    return {
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day)
    };
}

function getFullName(user) {
    return user.fullName || `${user.name || ""} ${user.lastName || ""}`.trim() || "Usuario";
}

function getInitial(name) {
    return String(name || "U").trim().charAt(0).toUpperCase();
}

function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function readJsonSafely(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}
