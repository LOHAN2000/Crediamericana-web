let records = [];
document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAuthentication()) return;
  const u = getStoredUser();
  if (!u) {
    logout();
    return;
  }
  fill(u);
  role(u.role);
  nav();
  profile();
  logoutButtons();
  dateNow();
  filters();
  if (u.role === "Admin") await loadUsersForFilter();
  render();
});
function fill(u) {
  const n = u.fullName || u.name || "Usuario",
    f = n.split(/\s+/)[0],
    r = u.role === "Admin" ? "Administrador" : "Trabajador",
    i = f[0].toUpperCase();
  [
    ["sidebarUserName", n],
    ["sidebarUserRole", r],
    ["topbarUserName", f],
    ["topbarUserRole", r],
    ["dropdownUserName", n],
    ["dropdownUserEmail", u.email || "Sin correo"],
    ["sidebarAvatar", i],
    ["topbarAvatar", i],
  ].forEach(([a, b]) => text(a, b));
  if (u.role === "Admin")
    text(
      "heroDescription",
      "Consulta los registros de entrada y salida del personal por trabajador, fecha y estado.",
    );
}
function role(r) {
  if (r !== "Admin")
    document
      .querySelectorAll(".admin-only")
      .forEach((e) => e.classList.add("hidden"));
}
function nav() {
  const s = id("sidebar"),
    o = id("sidebarOverlay"),
    b = id("menuButton");
  b.onclick = () => {
    const x = !s.classList.contains("open");
    s.classList.toggle("open", x);
    o.classList.toggle("open", x);
  };
  o.onclick = () => {
    s.classList.remove("open");
    o.classList.remove("open");
  };
}
function profile() {
  const b = id("profileButton"),
    d = id("profileDropdown");
  b.onclick = (e) => {
    e.stopPropagation();
    d.classList.toggle("hidden");
  };
  d.onclick = (e) => e.stopPropagation();
  document.onclick = () => d.classList.add("hidden");
}
function logoutButtons() {
  ["logoutButton", "sidebarLogoutButton"].forEach(
    (x) => (id(x).onclick = logout),
  );
}
function dateNow() {
  const d = new Date(),
    s = new Intl.DateTimeFormat("es-PE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d);
  text("currentDate", s[0].toUpperCase() + s.slice(1));
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  id("startDate").value = iso(first);
  id("endDate").value = iso(d);
}
function filters() {
  id("applyFiltersButton").onclick = render;
  id("clearFiltersButton").onclick = () => {
    id("userFilter").value = "all";
    id("statusFilter").value = "all";
    id("startDate").value = "";
    id("endDate").value = "";
    render();
  };
}
async function loadUsersForFilter() {
  try {
    const r = await authenticatedFetch(API_CONFIG.endpoints.users);
    if (!r || !r.ok) return;
    const j = await r.json(),
      s = id("userFilter");
    (j.data || [])
      .filter((u) => u.role === "Worker")
      .forEach((u) => {
        const o = document.createElement("option");
        o.value = u.id;
        o.textContent = u.fullName || `${u.name} ${u.lastName}`;
        s.appendChild(o);
      });
  } catch {}
}
function render() {
  text("totalRecords", records.length);
  text(
    "completedRecords",
    records.filter((x) => x.status === "Completed").length,
  );
  text("pendingRecords", records.filter((x) => x.status === "Open").length);
  text("resultsLabel", `${records.length} registros`);
  id("emptyHistoryState").classList.toggle("hidden", records.length > 0);
  id("recordsTableContainer").classList.toggle("hidden", records.length === 0);
  id("mobileRecords").classList.toggle("hidden", records.length === 0);
}
function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function id(x) {
  return document.getElementById(x);
}
function text(x, v) {
  const e = id(x);
  if (e) e.textContent = v;
}
