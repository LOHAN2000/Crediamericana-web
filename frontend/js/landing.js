document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("siteHeader"),
    nav = document.getElementById("publicNavigation"),
    menu = document.getElementById("mobileMenuButton"),
    top = document.getElementById("backToTopButton"),
    access = document.getElementById("systemAccessButton"),
    accessText = document.getElementById("systemAccessText");
  document.getElementById("currentYear").textContent = new Date().getFullYear();
  if (typeof isAuthenticated === "function" && isAuthenticated()) {
    access.href = "dashboard.html";
    accessText.textContent = "Ir al panel";
  }
  menu.addEventListener("click", () => {
    const open = !nav.classList.contains("open");
    nav.classList.toggle("open", open);
    menu.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      menu.setAttribute("aria-expanded", "false");
    }),
  );
  const update = () => {
    header.classList.toggle("scrolled", scrollY > 15);
    top.classList.toggle("hidden", scrollY < 500);
  };
  addEventListener("scroll", update, { passive: true });
  update();
  top.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
  const sections = [...document.querySelectorAll("main section[id]")],
    links = [...document.querySelectorAll(".navigation-link")];
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          links.forEach((l) =>
            l.classList.toggle(
              "active",
              l.getAttribute("href") === "#" + e.target.id,
            ),
          );
        }
      });
    },
    { rootMargin: "-35% 0px -55% 0px" },
  );
  sections.forEach((s) => observer.observe(s));
  document.getElementById("contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget,
      alert = document.getElementById("contactAlert");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    alert.textContent =
      "El formulario está listo. El almacenamiento del mensaje se habilitará al integrar el módulo de contacto con la base de datos.";
    alert.classList.remove("hidden");
    setTimeout(() => alert.classList.add("hidden"), 6500);
  });
});
