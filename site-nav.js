(function () {
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarRailToggle = document.getElementById("sidebarRailToggle");
  const sidebarBackdrop = document.getElementById("sidebarBackdrop");
  const sidebarLinks = document.querySelectorAll(".sidebar__link");
  const sidebarGroupToggles = document.querySelectorAll(".sidebar-group__toggle");
  const collapsedKey = "unifyo_sidebar_collapsed";
  const authEntryLinks = document.querySelectorAll(".js-auth-entry");

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

  function syncSidebarCollapse() {
    const isCollapsed = window.localStorage.getItem(collapsedKey) === "1";
    document.body.classList.toggle("sidebar-collapsed", isCollapsed);
    if (sidebarRailToggle) {
      sidebarRailToggle.textContent = isCollapsed ? "⟩" : "⟨";
    }
  }

  function toggleSidebarRail() {
    const nextValue = document.body.classList.contains("sidebar-collapsed") ? "0" : "1";
    window.localStorage.setItem(collapsedKey, nextValue);
    syncSidebarCollapse();
  }

  sidebarToggle?.addEventListener("click", toggleSidebar);
  sidebarRailToggle?.addEventListener("click", toggleSidebarRail);
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

  syncSidebarCollapse();

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

  async function syncAuthEntries() {
    if (!authEntryLinks.length) {
      window.unifyoCurrentUser = null;
      window.dispatchEvent(new CustomEvent("unifyo-auth-ready", { detail: { user: null } }));
      return;
    }
    try {
      const response = await fetch("/api/me", { credentials: "same-origin" });
      const payload = await response.json();
      const user = payload?.user || null;
      const isAuthenticated = Boolean(user);
      const lang = window.localStorage.getItem("unifyo_lang") === "en" ? "en" : "sk";
      window.unifyoCurrentUser = user;
      authEntryLinks.forEach((link) => {
        const guestHref = link.dataset.guestHref || "/app.html";
        const authHref = link.dataset.authHref || "/app.html";
        const guestLabel = lang === "en" ? (link.dataset.guestLabelEn || link.dataset.guestLabel || "Login") : (link.dataset.guestLabel || "Prihlásenie");
        const authLabel = lang === "en" ? (link.dataset.authLabelEn || link.dataset.authLabel || "App") : (link.dataset.authLabel || "Aplikácia");
        const labelTarget = link.querySelector("[data-auth-entry-label]") || link;
        if (isAuthenticated) {
          link.setAttribute("href", authHref);
          labelTarget.textContent = authLabel;
        } else {
          link.setAttribute("href", guestHref);
          labelTarget.textContent = guestLabel;
        }
      });
      window.dispatchEvent(new CustomEvent("unifyo-auth-ready", { detail: { user } }));
    } catch (_error) {
      window.unifyoCurrentUser = null;
      const lang = window.localStorage.getItem("unifyo_lang") === "en" ? "en" : "sk";
      authEntryLinks.forEach((link) => {
        const guestHref = link.dataset.guestHref || "/app.html";
        const guestLabel = lang === "en" ? (link.dataset.guestLabelEn || link.dataset.guestLabel || "Login") : (link.dataset.guestLabel || "Prihlásenie");
        const labelTarget = link.querySelector("[data-auth-entry-label]") || link;
        link.setAttribute("href", guestHref);
        labelTarget.textContent = guestLabel;
      });
      window.dispatchEvent(new CustomEvent("unifyo-auth-ready", { detail: { user: null } }));
    }
  }

  syncAuthEntries();

  window.addEventListener("unifyo-language-change", () => {
    syncAuthEntries();
  });
}());
