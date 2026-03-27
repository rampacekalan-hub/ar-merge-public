(function () {
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarBackdrop = document.getElementById("sidebarBackdrop");
  const sidebarLinks = document.querySelectorAll(".sidebar__link");
  const sidebarGroupToggles = document.querySelectorAll(".sidebar-group__toggle");

  function openSidebar() {
    document.body.classList.add("sidebar-open");
  }

  function closeSidebar() {
    document.body.classList.remove("sidebar-open");
  }

  function toggleSidebar() {
    if (!sidebar) {
      return;
    }
    document.body.classList.toggle("sidebar-open");
  }

  sidebarToggle?.addEventListener("click", toggleSidebar);
  sidebarBackdrop?.addEventListener("click", closeSidebar);
  sidebarLinks.forEach((link) => link.addEventListener("click", closeSidebar));
  sidebarGroupToggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const groupName = toggle.dataset.sidebarGroup;
      const content = document.querySelector(`[data-sidebar-group-content="${groupName}"]`);
      if (!content) {
        return;
      }
      const isCollapsed = content.classList.toggle("is-collapsed");
      toggle.setAttribute("aria-expanded", String(!isCollapsed));
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();
    }
  });

  const currentPath = window.location.pathname === "/" ? "/index.html" : window.location.pathname;
  sidebarLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) {
      return;
    }
    if (href === currentPath) {
      link.setAttribute("aria-current", "page");
    }
  });

  window.unifyoSiteNav = {
    openSidebar,
    closeSidebar,
  };
}());
