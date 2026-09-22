let pendingAttendanceAction = null;
let attendanceToday = null;

document.addEventListener("DOMContentLoaded", async () => {
    if (!requireAuthentication()) return;

    const user = getStoredUser();
    if (!user) {
        logout();
        return;
    }

    fillUserData(user);
    applyRoleVisibility(user.role);
    configureNavigation();
    configureLogoutButtons();
    configureModal();
    startClock();

    await loadTodayAttendance();
});

function fillUserData(user) {
    const fullName = user.fullName || user.name || "Usuario";
    const firstName = fullName.trim().split(/\s+/)[0] || "Usuario";
    const roleLabel = user.role === "Admin" ? "Administrador" : "Trabajador";
    const initial = firstName.charAt(0).toUpperCase();

    const values = {
        sidebarUserName: fullName,
        sidebarUserRole: roleLabel,
        topbarUserName: firstName,
        topbarUserRole: roleLabel,
        heroUserName: fullName,
        heroUserRole: roleLabel,
        sidebarAvatar: initial,
        topbarAvatar: initial,
        heroAvatar: initial
    };

    Object.entries(values).forEach(([id, value]) => setText(id, value));
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
    const button = document.getElementById("menuButton");

    if (!sidebar || !overlay || !button) return;

    button.addEventListener("click", () => {
        const open = !sidebar.classList.contains("open");
        sidebar.classList.toggle("open", open);
        overlay.classList.toggle("open", open);
    });

    overlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("open");
    });
}

function configureLogoutButtons() {
    ["logoutButton", "sidebarLogoutButton"].forEach(id => {
        document.getElementById(id)?.addEventListener("click", logout);
    });
}

function configureModal() {
    getEntryButton()?.addEventListener("click", () => openAttendanceModal("entry"));
    getExitButton()?.addEventListener("click", () => openAttendanceModal("exit"));
    document.getElementById("cancelButton")?.addEventListener("click", closeAttendanceModal);
    document.getElementById("confirmButton")?.addEventListener("click", confirmAttendance);
}

async function loadTodayAttendance() {
    setNotice("Consultando el registro de hoy...", "info");

    try {
        const response = await authenticatedFetch("/Attendance/today");
        if (!response) return;

        const result = await readJson(response);
        if (!response.ok) {
            throw new Error(result?.message || "No se pudo consultar la asistencia de hoy.");
        }

        attendanceToday = result.data;
        renderAttendanceState(attendanceToday);
        hideNotice();
    } catch (error) {
        setNotice(error.message || "No se pudo establecer comunicación con la API.", "error");
        disableAttendanceButtons();
    }
}

function renderAttendanceState(data) {
    const record = data?.record;

    const entryButton = getEntryButton();
    const exitButton = getExitButton();

    const statusElement = document.querySelector(".status");
    const scheduleStatus = document.getElementById(
        "scheduleStatus"
    );

    const entryText = document.querySelector(
        ".timeline > div:first-child strong"
    );

    const exitText = document.querySelector(
        ".timeline > div:last-child strong"
    );

    if (entryText) {
        entryText.textContent = record?.entryTime
            ? formatPeruTime(record.entryTime)
            : "Sin registrar";
    }

    if (exitText) {
        exitText.textContent = record?.exitTime
            ? formatPeruTime(record.exitTime)
            : "Sin registrar";
    }

    if (!data?.hasEntry) {
        setStatus(
            statusElement,
            "Pendiente",
            "pending"
        );

        setScheduleStatus(
            scheduleStatus,
            "Pendiente de entrada",
            "pending"
        );

        entryButton.disabled = false;
        exitButton.disabled = true;

        return;
    }

    if (data.hasEntry && !data.hasExit) {
        setStatus(
            statusElement,
            "Jornada iniciada",
            "open"
        );

        setScheduleStatus(
            scheduleStatus,
            "Jornada iniciada",
            "open"
        );

        entryButton.disabled = true;
        exitButton.disabled = false;

        return;
    }

    setStatus(
        statusElement,
        "Completada",
        "completed"
    );

    function setScheduleStatus(
        element,
        text,
        cssClass
    ) {
        if (!element) {
            return;
        }

        element.textContent = text;

        element.classList.remove(
            "warning",
            "open-text",
            "completed-text"
        );

        if (cssClass === "pending") {
            element.classList.add("warning");
            return;
        }

        if (cssClass === "open") {
            element.classList.add("open-text");
            return;
        }

        element.classList.add("completed-text");
    }

    setScheduleStatus(
        scheduleStatus,
        "Jornada completada",
        "completed"
    );

    entryButton.disabled = true;
    exitButton.disabled = true;
}

function openAttendanceModal(action) {
    pendingAttendanceAction = action;
    const modal = document.getElementById("confirmModal");
    const icon = modal?.querySelector(".confirm-icon");
    const title = modal?.querySelector("h2");
    const description = modal?.querySelector("p");

    const isEntry = action === "entry";

    if (icon) icon.textContent = isEntry ? "→" : "←";
    if (title) title.textContent = isEntry ? "Registrar entrada" : "Registrar salida";
    if (description) {
        description.textContent = isEntry
            ? "Se registrará el inicio de la jornada con la fecha y hora actuales."
            : "Se registrará la finalización de la jornada con la fecha y hora actuales.";
    }

    setText("modalTime", formatCurrentPeruTime());
    modal?.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeAttendanceModal() {
    pendingAttendanceAction = null;
    document.getElementById("confirmModal")?.classList.add("hidden");
    document.body.style.overflow = "";
}

async function confirmAttendance() {
    if (!pendingAttendanceAction) return;

    const confirmButton = document.getElementById("confirmButton");
    const originalText = confirmButton.textContent;
    confirmButton.disabled = true;
    confirmButton.textContent = "Guardando...";

    try {
        const endpoint = pendingAttendanceAction === "entry"
            ? "/Attendance/entry"
            : "/Attendance/exit";

        const method = pendingAttendanceAction === "entry" ? "POST" : "PATCH";
        const response = await authenticatedFetch(endpoint, { method });
        if (!response) return;

        const result = await readJson(response);
        if (!response.ok) {
            throw new Error(result?.message || "No se pudo registrar la asistencia.");
        }

        closeAttendanceModal();
        setNotice(result?.message || "Registro realizado correctamente.", "success");
        await loadTodayAttendance();
    } catch (error) {
        closeAttendanceModal();
        setNotice(error.message || "No se pudo registrar la asistencia.", "error");
    } finally {
        confirmButton.disabled = false;
        confirmButton.textContent = originalText;
    }
}

function startClock() {
    const update = () => {
        const now = new Date();
        const longDate = new Intl.DateTimeFormat("es-PE", {
            timeZone: "America/Lima",
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(now);

        setText("currentTime", formatCurrentPeruTime());
        setText("currentDate", capitalize(longDate));
        setText("fullDate", capitalize(longDate));
        setText("day", capitalize(new Intl.DateTimeFormat("es-PE", {
            timeZone: "America/Lima",
            weekday: "long"
        }).format(now)));
        setText("date", new Intl.DateTimeFormat("es-PE", {
            timeZone: "America/Lima",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(now));
    };

    update();
    window.setInterval(update, 1000);
}

function formatPeruTime(utcDate) {
    if (!utcDate) return "Sin registrar";

    return new Intl.DateTimeFormat("es-PE", {
        timeZone: "America/Lima",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(new Date(utcDate));
}

function formatCurrentPeruTime() {
    return formatPeruTime(new Date());
}

function getEntryButton() {
    return document.getElementById("entryButton");
}

function getExitButton() {
    return document.querySelector(".exit-button");
}

function disableAttendanceButtons() {
    if (getEntryButton()) getEntryButton().disabled = true;
    if (getExitButton()) getExitButton().disabled = true;
}

function setStatus(element, text, cssClass) {
    if (!element) return;
    element.textContent = text;
    element.classList.remove("pending", "open", "completed");
    element.classList.add(cssClass);
}

function setNotice(message, type) {
    const notice = document.getElementById("notice");
    if (!notice) return;

    notice.textContent = message;
    notice.classList.remove("hidden", "success", "error", "info");
    notice.classList.add(type);
}

function hideNotice() {
    document.getElementById("notice")?.classList.add("hidden");
}

function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

async function readJson(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}
