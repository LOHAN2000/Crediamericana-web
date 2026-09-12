document.addEventListener("DOMContentLoaded", () => {
  if (!requireAuthentication()) return;
  const u = getStoredUser();
  if (!u) {
    logout();
    return;
  }
  fill(u);
  role(u.role);
  nav();
  logoutButtons();
  clock();
  modal();
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
    ["heroUserName", n],
    ["heroUserRole", r],
    ["sidebarAvatar", i],
    ["topbarAvatar", i],
    ["heroAvatar", i],
  ].forEach(([a, b]) => text(a, b));
}
function role(r) {
  if (r !== "Admin")
    document
      .querySelectorAll(".admin-only")
      .forEach((e) => e.classList.add("hidden"));
}
function nav() {
  const s = document.getElementById("sidebar"),
    o = document.getElementById("sidebarOverlay"),
    b = document.getElementById("menuButton");
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
function logoutButtons() {
  ["logoutButton", "sidebarLogoutButton"].forEach(
    (x) => (document.getElementById(x).onclick = logout),
  );
}
function clock() {
  const run = () => {
    const d = new Date(),
      long = new Intl.DateTimeFormat("es-PE", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(d);
    text("currentTime", time(d));
    text("currentDate", cap(long));
    text("fullDate", cap(long));
    text(
      "day",
      cap(new Intl.DateTimeFormat("es-PE", { weekday: "long" }).format(d)),
    );
    text("date", new Intl.DateTimeFormat("es-PE").format(d));
  };
  run();
  setInterval(run, 1000);
}
function modal() {
  const m = document.getElementById("confirmModal");
  document.getElementById("entryButton").onclick = () => {
    text("modalTime", time(new Date()));
    m.classList.remove("hidden");
  };
  document.getElementById("cancelButton").onclick = () =>
    m.classList.add("hidden");
  document.getElementById("confirmButton").onclick = () => {
    m.classList.add("hidden");
    const n = document.getElementById("notice");
    n.textContent =
      "La interfaz esta preparada. El guardado se habilitara al integrar el modulo de asistencia con la API.";
    n.classList.remove("hidden");
    setTimeout(() => n.classList.add("hidden"), 5500);
  };
}
function time(d) {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}
function cap(s) {
  return s[0].toUpperCase() + s.slice(1);
}
function text(id, v) {
  const e = document.getElementById(id);
  if (e) e.textContent = v;
}
