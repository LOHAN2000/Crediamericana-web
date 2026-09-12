let users = [];
let filteredUsers = [];
let editingUserId = null;
let pendingStatusChange = null;
let alertTimer = null;

const elements = {};

document.addEventListener("DOMContentLoaded", async () => {
    if (!requireRole("Admin")) {
        return;
    }

    cacheElements();
    fillSessionInformation();
    configureNavigation();
    configureProfileMenu();
    configureLogoutButtons();
    configureFilters();
    configureUserModal();
    configureStatusModal();
    configurePasswordToggle();
    startDate();

    await loadUsers();
});

function cacheElements() {
    const ids = [
        "pageAlert", "searchInput", "roleFilter", "statusFilter", "refreshButton",
        "loadingState", "emptyState", "emptyStateText", "tableContainer",
        "usersTableBody", "mobileUsersList", "resultsText", "totalUsers",
        "activeUsers", "inactiveUsers", "openCreateModalButton", "userModal",
        "closeUserModalButton", "cancelUserButton", "userForm", "userId",
        "userModalTitle", "modalAlert", "passwordField", "saveUserButton",
        "saveUserButtonText", "saveUserLoader", "toggleUserPassword", "password",
        "statusModal", "statusModalTitle", "statusModalText", "statusConfirmationIcon",
        "cancelStatusButton", "confirmStatusButton", "confirmStatusButtonText", "statusLoader"
    ];

    ids.forEach(id => {
        elements[id] = document.getElementById(id);
    });
}

function fillSessionInformation() {
    const user = getStoredUser();

    if (!user) {
        logout();
        return;
    }

    const fullName = user.fullName || user.name || "Administrador";
    const firstName = fullName.trim().split(/\s+/)[0] || "Administrador";
    const initial = firstName.charAt(0).toUpperCase();

    setText("sidebarUserName", fullName);
    setText("sidebarUserRole", "Administrador");
    setText("topbarUserName", firstName);
    setText("topbarUserRole", "Administrador");
    setText("dropdownUserName", fullName);
    setText("dropdownUserEmail", user.email || "Sin correo registrado");
    setText("sidebarAvatar", initial);
    setText("topbarAvatar", initial);
}

function configureNavigation() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const menuButton = document.getElementById("menuButton");

    const setOpen = open => {
        sidebar.classList.toggle("open", open);
        overlay.classList.toggle("open", open);
        menuButton.setAttribute("aria-expanded", String(open));
        overlay.setAttribute("aria-hidden", String(!open));
    };

    menuButton.addEventListener("click", () => setOpen(!sidebar.classList.contains("open")));
    overlay.addEventListener("click", () => setOpen(false));
    window.addEventListener("resize", () => {
        if (window.innerWidth > 920) setOpen(false);
    });
}

function configureProfileMenu() {
    const button = document.getElementById("profileButton");
    const dropdown = document.getElementById("profileDropdown");

    const close = () => {
        dropdown.classList.add("hidden");
        button.setAttribute("aria-expanded", "false");
    };

    button.addEventListener("click", event => {
        event.stopPropagation();
        const open = dropdown.classList.contains("hidden");
        dropdown.classList.toggle("hidden", !open);
        button.setAttribute("aria-expanded", String(open));
    });

    dropdown.addEventListener("click", event => event.stopPropagation());
    document.addEventListener("click", close);
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") close();
    });
}

function configureLogoutButtons() {
    ["logoutButton", "sidebarLogoutButton"].forEach(id => {
        document.getElementById(id)?.addEventListener("click", logout);
    });
}

function configureFilters() {
    elements.searchInput.addEventListener("input", applyFilters);
    elements.roleFilter.addEventListener("change", applyFilters);
    elements.statusFilter.addEventListener("change", applyFilters);
    elements.refreshButton.addEventListener("click", loadUsers);
}

function configureUserModal() {
    elements.openCreateModalButton.addEventListener("click", openCreateModal);
    elements.closeUserModalButton.addEventListener("click", closeUserModal);
    elements.cancelUserButton.addEventListener("click", closeUserModal);
    elements.userForm.addEventListener("submit", submitUserForm);

    elements.userModal.addEventListener("mousedown", event => {
        if (event.target === elements.userModal) closeUserModal();
    });
}

function configureStatusModal() {
    elements.cancelStatusButton.addEventListener("click", closeStatusModal);
    elements.confirmStatusButton.addEventListener("click", confirmStatusChange);

    elements.statusModal.addEventListener("mousedown", event => {
        if (event.target === elements.statusModal) closeStatusModal();
    });
}

function configurePasswordToggle() {
    elements.toggleUserPassword.addEventListener("click", () => {
        const visible = elements.password.type === "text";
        elements.password.type = visible ? "password" : "text";
        elements.toggleUserPassword.textContent = visible ? "Mostrar" : "Ocultar";
        elements.toggleUserPassword.setAttribute(
            "aria-label",
            visible ? "Mostrar contraseña" : "Ocultar contraseña"
        );
    });
}

function startDate() {
    const update = () => {
        const text = new Intl.DateTimeFormat("es-PE", {
            weekday: "long", day: "2-digit", month: "long", year: "numeric"
        }).format(new Date());
        setText("currentDate", capitalize(text));
    };

    update();
}

async function loadUsers() {
    setUsersLoading(true);

    try {
        const response = await authenticatedFetch(API_CONFIG.endpoints.users);
        if (!response) return;

        const result = await readJsonSafely(response);

        if (!response.ok) {
            throw new Error(result?.message || "No se pudieron obtener los usuarios.");
        }

        users = Array.isArray(result?.data) ? result.data : [];
        updateSummary();
        applyFilters();
    } catch (error) {
        users = [];
        updateSummary();
        applyFilters();
        showPageAlert(error.message || "Ocurrió un error al consultar los usuarios.", "error");
    } finally {
        setUsersLoading(false);
    }
}

function applyFilters() {
    const query = normalizeText(elements.searchInput.value);
    const role = elements.roleFilter.value;
    const status = elements.statusFilter.value;

    filteredUsers = users.filter(user => {
        const searchText = normalizeText([
            user.fullName,
            user.name,
            user.lastName,
            user.documentNumber,
            user.email
        ].filter(Boolean).join(" "));

        const matchesQuery = !query || searchText.includes(query);
        const matchesRole = role === "all" || user.role === role;
        const matchesStatus = status === "all"
            || (status === "active" && user.isActive)
            || (status === "inactive" && !user.isActive);

        return matchesQuery && matchesRole && matchesStatus;
    });

    renderUsers();
}

function renderUsers() {
    elements.usersTableBody.innerHTML = "";
    elements.mobileUsersList.innerHTML = "";

    const hasUsers = filteredUsers.length > 0;
    elements.emptyState.classList.toggle("hidden", hasUsers || !elements.loadingState.classList.contains("hidden"));
    elements.tableContainer.classList.toggle("hidden", !hasUsers);
    elements.mobileUsersList.classList.toggle("hidden", !hasUsers);

    if (!hasUsers) {
        const filtersActive = Boolean(elements.searchInput.value.trim())
            || elements.roleFilter.value !== "all"
            || elements.statusFilter.value !== "all";

        elements.emptyStateText.textContent = filtersActive
            ? "No existen coincidencias para los filtros seleccionados."
            : "Todavía no existen cuentas registradas.";
    } else {
        filteredUsers.forEach(user => {
            elements.usersTableBody.appendChild(createTableRow(user));
            elements.mobileUsersList.appendChild(createMobileCard(user));
        });
    }

    elements.resultsText.textContent = `Mostrando ${filteredUsers.length} de ${users.length} usuarios`;
}

function createTableRow(user) {
    const row = document.createElement("tr");
    const fullName = getFullName(user);
    const date = formatDate(user.createdAt);

    row.innerHTML = `
        <td>
            <div class="user-cell">
                <span class="table-avatar" aria-hidden="true">${escapeHtml(getInitial(fullName))}</span>
                <div>
                    <strong>${escapeHtml(fullName)}</strong>
                    <span title="${escapeHtml(user.email || "")}">${escapeHtml(user.email || "Sin correo")}</span>
                </div>
            </div>
        </td>
        <td>${escapeHtml(user.documentNumber || "-")}</td>
        <td><span class="role-badge ${user.role === "Admin" ? "admin" : "worker"}">${getRoleLabel(user.role)}</span></td>
        <td><span class="status-badge ${user.isActive ? "active" : "inactive"}">${user.isActive ? "Activo" : "Inactivo"}</span></td>
        <td>
            <div class="date-cell">
                <strong>${escapeHtml(date.date)}</strong>
                <span>${escapeHtml(date.time)}</span>
            </div>
        </td>
        <td>
            <div class="table-actions">
                <button class="action-button edit" type="button" data-action="edit" title="Editar usuario" aria-label="Editar a ${escapeHtml(fullName)}">✎</button>
                <button class="action-button ${user.isActive ? "deactivate" : "activate"}" type="button" data-action="status" title="${user.isActive ? "Desactivar" : "Activar"} usuario" aria-label="${user.isActive ? "Desactivar" : "Activar"} a ${escapeHtml(fullName)}">${user.isActive ? "×" : "✓"}</button>
            </div>
        </td>
    `;

    row.querySelector('[data-action="edit"]').addEventListener("click", () => openEditModal(user));
    row.querySelector('[data-action="status"]').addEventListener("click", () => openStatusModal(user));
    return row;
}

function createMobileCard(user) {
    const card = document.createElement("article");
    card.className = "mobile-user-card";
    const fullName = getFullName(user);

    card.innerHTML = `
        <div class="mobile-user-header">
            <div class="user-cell">
                <span class="table-avatar" aria-hidden="true">${escapeHtml(getInitial(fullName))}</span>
                <div>
                    <strong>${escapeHtml(fullName)}</strong>
                    <span>${escapeHtml(user.email || "Sin correo")}</span>
                </div>
            </div>
            <span class="status-badge ${user.isActive ? "active" : "inactive"}">${user.isActive ? "Activo" : "Inactivo"}</span>
        </div>
        <div class="mobile-user-data">
            <span><strong>Documento:</strong> ${escapeHtml(user.documentNumber || "-")}</span>
            <span><strong>Rol:</strong> ${getRoleLabel(user.role)}</span>
            <span><strong>Registro:</strong> ${escapeHtml(formatDate(user.createdAt).date)}</span>
        </div>
        <div class="mobile-card-actions">
            <button class="mobile-edit-button" type="button">Editar</button>
            <button class="mobile-status-button ${user.isActive ? "deactivate" : "activate"}" type="button">${user.isActive ? "Desactivar" : "Activar"}</button>
        </div>
    `;

    card.querySelector(".mobile-edit-button").addEventListener("click", () => openEditModal(user));
    card.querySelector(".mobile-status-button").addEventListener("click", () => openStatusModal(user));
    return card;
}

function updateSummary() {
    setText("totalUsers", String(users.length));
    setText("activeUsers", String(users.filter(user => user.isActive).length));
    setText("inactiveUsers", String(users.filter(user => !user.isActive).length));
}

function openCreateModal() {
    editingUserId = null;
    elements.userForm.reset();
    elements.userId.value = "";
    elements.passwordField.classList.remove("hidden");
    elements.password.required = true;
    elements.userModalTitle.textContent = "Registrar usuario";
    elements.saveUserButtonText.textContent = "Registrar usuario";
    clearModalErrors();
    openModal(elements.userModal);
    document.getElementById("name").focus();
}

function openEditModal(user) {
    editingUserId = user.id;
    elements.userForm.reset();
    elements.userId.value = String(user.id);
    document.getElementById("name").value = user.name || "";
    document.getElementById("lastName").value = user.lastName || "";
    document.getElementById("documentNumber").value = user.documentNumber || "";
    document.getElementById("email").value = user.email || "";
    document.getElementById("role").value = user.role || "Worker";
    elements.passwordField.classList.add("hidden");
    elements.password.required = false;
    elements.userModalTitle.textContent = "Editar usuario";
    elements.saveUserButtonText.textContent = "Guardar cambios";
    clearModalErrors();
    openModal(elements.userModal);
    document.getElementById("name").focus();
}

function closeUserModal() {
    if (elements.saveUserButton.disabled) return;
    closeModal(elements.userModal);
    editingUserId = null;
    elements.userForm.reset();
    clearModalErrors();
}

async function submitUserForm(event) {
    event.preventDefault();
    clearModalErrors();

    const data = collectFormData();
    const errors = validateUserData(data, editingUserId === null);

    if (Object.keys(errors).length > 0) {
        showFieldErrors(errors);
        showModalAlert("Revisa los campos señalados antes de continuar.");
        return;
    }

    setUserFormLoading(true);

    try {
        const isCreating = editingUserId === null;
        const endpoint = isCreating
            ? API_CONFIG.endpoints.users
            : `${API_CONFIG.endpoints.users}/${editingUserId}`;

        const body = isCreating
            ? data
            : {
                name: data.name,
                lastName: data.lastName,
                documentNumber: data.documentNumber,
                email: data.email,
                role: data.role
            };

        const response = await authenticatedFetch(endpoint, {
            method: isCreating ? "POST" : "PUT",
            body: JSON.stringify(body)
        });

        if (!response) return;
        const result = await readJsonSafely(response);

        if (!response.ok) {
            throw new Error(extractApiError(result));
        }

        closeModal(elements.userModal);
        editingUserId = null;
        showPageAlert(result?.message || (isCreating ? "Usuario registrado correctamente." : "Usuario actualizado correctamente."), "success");
        await loadUsers();
    } catch (error) {
        showModalAlert(error.message || "No se pudo guardar el usuario.");
    } finally {
        setUserFormLoading(false);
    }
}

function collectFormData() {
    return {
        name: document.getElementById("name").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        documentNumber: document.getElementById("documentNumber").value.trim(),
        email: document.getElementById("email").value.trim().toLowerCase(),
        password: elements.password.value,
        role: document.getElementById("role").value
    };
}

function validateUserData(data, requirePassword) {
    const errors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!data.name) errors.name = "Ingresa los nombres.";
    if (!data.lastName) errors.lastName = "Ingresa los apellidos.";
    if (data.documentNumber.length < 8) errors.documentNumber = "El documento debe tener al menos 8 caracteres.";
    if (!emailPattern.test(data.email)) errors.email = "Ingresa un correo electrónico válido.";
    if (requirePassword && data.password.length < 8) errors.password = "La contraseña debe tener al menos 8 caracteres.";
    if (!["Admin", "Worker"].includes(data.role)) errors.role = "Selecciona un rol válido.";

    return errors;
}

function showFieldErrors(errors) {
    Object.entries(errors).forEach(([field, message]) => {
        const input = document.getElementById(field);
        const error = document.querySelector(`[data-error-for="${field}"]`);
        input?.classList.add("invalid");
        if (error) error.textContent = message;
    });
}

function clearModalErrors() {
    document.querySelectorAll(".field-error").forEach(element => element.textContent = "");
    document.querySelectorAll(".form-control.invalid").forEach(element => element.classList.remove("invalid"));
    elements.modalAlert.textContent = "";
    elements.modalAlert.classList.add("hidden");
}

function showModalAlert(message) {
    elements.modalAlert.textContent = message;
    elements.modalAlert.classList.remove("hidden");
}

function openStatusModal(user) {
    pendingStatusChange = { id: user.id, isActive: !user.isActive };
    const fullName = getFullName(user);
    const willActivate = !user.isActive;

    elements.statusModalTitle.textContent = willActivate ? "Activar usuario" : "Desactivar usuario";
    elements.statusModalText.textContent = willActivate
        ? `¿Deseas permitir nuevamente el acceso de ${fullName}?`
        : `¿Deseas restringir el acceso de ${fullName}? El usuario permanecerá registrado.`;
    elements.confirmStatusButtonText.textContent = willActivate ? "Activar usuario" : "Desactivar usuario";
    elements.statusConfirmationIcon.textContent = willActivate ? "✓" : "!";
    elements.statusConfirmationIcon.classList.toggle("activate", willActivate);
    openModal(elements.statusModal);
}

function closeStatusModal() {
    if (elements.confirmStatusButton.disabled) return;
    closeModal(elements.statusModal);
    pendingStatusChange = null;
}

async function confirmStatusChange() {
    if (!pendingStatusChange) return;

    setStatusLoading(true);

    try {
        const response = await authenticatedFetch(
            `${API_CONFIG.endpoints.users}/${pendingStatusChange.id}/status`,
            {
                method: "PATCH",
                body: JSON.stringify({ isActive: pendingStatusChange.isActive })
            }
        );

        if (!response) return;
        const result = await readJsonSafely(response);

        if (!response.ok) {
            throw new Error(extractApiError(result));
        }

        closeModal(elements.statusModal);
        pendingStatusChange = null;
        showPageAlert(result?.message || "Estado actualizado correctamente.", "success");
        await loadUsers();
    } catch (error) {
        closeModal(elements.statusModal);
        pendingStatusChange = null;
        showPageAlert(error.message || "No se pudo cambiar el estado del usuario.", "error");
    } finally {
        setStatusLoading(false);
    }
}

function setUsersLoading(loading) {
    elements.loadingState.classList.toggle("hidden", !loading);
    elements.refreshButton.disabled = loading;
    elements.refreshButton.classList.toggle("loading", loading);

    if (loading) {
        elements.tableContainer.classList.add("hidden");
        elements.mobileUsersList.classList.add("hidden");
        elements.emptyState.classList.add("hidden");
    }
}

function setUserFormLoading(loading) {
    elements.saveUserButton.disabled = loading;
    elements.cancelUserButton.disabled = loading;
    elements.closeUserModalButton.disabled = loading;
    elements.saveUserLoader.classList.toggle("hidden", !loading);
    elements.saveUserButtonText.textContent = loading
        ? "Guardando..."
        : editingUserId === null ? "Registrar usuario" : "Guardar cambios";
}

function setStatusLoading(loading) {
    elements.confirmStatusButton.disabled = loading;
    elements.cancelStatusButton.disabled = loading;
    elements.statusLoader.classList.toggle("hidden", !loading);
}

function openModal(modal) {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeModal(modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
}

function showPageAlert(message, type) {
    window.clearTimeout(alertTimer);
    elements.pageAlert.textContent = message;
    elements.pageAlert.className = `page-alert ${type}`;
    alertTimer = window.setTimeout(() => {
        elements.pageAlert.classList.add("hidden");
    }, 4500);
}

function getFullName(user) {
    return user.fullName || `${user.name || ""} ${user.lastName || ""}`.trim() || "Usuario";
}

function getInitial(name) {
    return (name || "U").trim().charAt(0).toUpperCase();
}

function getRoleLabel(role) {
    return role === "Admin" ? "Administrador" : "Trabajador";
}

function formatDate(value) {
    if (!value) return { date: "Sin fecha", time: "" };
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { date: "Sin fecha", time: "" };

    return {
        date: new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" }).format(date),
        time: new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date)
    };
}

function normalizeText(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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

function extractApiError(result) {
    if (result?.message) return result.message;

    if (result?.errors && typeof result.errors === "object") {
        const messages = Object.values(result.errors).flat().filter(Boolean);
        if (messages.length) return messages.join(" ");
    }

    return "La solicitud no pudo completarse.";
}
