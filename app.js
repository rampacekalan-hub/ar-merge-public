const state = {
  user: null,
  account: null,
  admin: null,
  authMode: "register",
  files: [],
  datasets: [],
  mergedContacts: [],
  removedDuplicates: [],
  report: {
    pocet_importovanych_zaznamov: 0,
    pocet_odstranenych_duplicit: 0,
    pocet_vyradenych_bez_emailu_a_telefonu: 0,
    pocet_finalnych_kontaktov: 0,
  },
  uploadUi: {
    phase: "idle",
    progress: 0,
    progressTimer: null,
  },
};

const elements = {
  fileInput: document.getElementById("fileInput"),
  uploadBox: document.getElementById("uploadBox"),
  uploadStateBadge: document.getElementById("uploadStateBadge"),
  uploadStateText: document.getElementById("uploadStateText"),
  uploadProgress: document.getElementById("uploadProgress"),
  uploadProgressBar: document.getElementById("uploadProgressBar"),
  buyHeroBtn: document.getElementById("buyHeroBtn"),
  accountBtn: document.getElementById("accountBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  accountStatus: document.getElementById("accountStatus"),
  accountSummary: document.getElementById("accountSummary"),
  accountMenuBtn: document.getElementById("accountMenuBtn"),
  adminMenuBtn: document.getElementById("adminMenuBtn"),
  uploadTitle: document.getElementById("uploadTitle"),
  uploadSubtitle: document.getElementById("uploadSubtitle"),
  unlockUploadBtn: document.getElementById("unlockUploadBtn"),
  buyToolbarBtn: document.getElementById("buyToolbarBtn"),
  buyProBtn: document.getElementById("buyProBtn"),
  pricingCtaBtn: document.getElementById("pricingCtaBtn"),
  mergeBtn: document.getElementById("mergeBtn"),
  resetBtn: document.getElementById("resetBtn"),
  datasetList: document.getElementById("datasetList"),
  totalRows: document.getElementById("totalRows"),
  validContacts: document.getElementById("validContacts"),
  mergedContacts: document.getElementById("mergedContacts"),
  duplicatesRemoved: document.getElementById("duplicatesRemoved"),
  droppedInvalid: document.getElementById("droppedInvalid"),
  resultTable: document.getElementById("resultTable"),
  duplicatesAudit: document.getElementById("duplicatesAudit"),
  downloadCsvBtn: document.getElementById("downloadCsvBtn"),
  downloadXlsxBtn: document.getElementById("downloadXlsxBtn"),
  datasetItemTemplate: document.getElementById("datasetItemTemplate"),
  promoModal: document.getElementById("promoModal"),
  promoModalBackdrop: document.getElementById("promoModalBackdrop"),
  promoModalClose: document.getElementById("promoModalClose"),
  promoModalAuth: document.getElementById("promoModalAuth"),
  promoModalStart: document.getElementById("promoModalStart"),
  authModal: document.getElementById("authModal"),
  authModalBackdrop: document.getElementById("authModalBackdrop"),
  authModalClose: document.getElementById("authModalClose"),
  authRegisterTab: document.getElementById("authRegisterTab"),
  authLoginTab: document.getElementById("authLoginTab"),
  authForm: document.getElementById("authForm"),
  authNameField: document.getElementById("authNameField"),
  authName: document.getElementById("authName"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  authSubmitBtn: document.getElementById("authSubmitBtn"),
  forgotPasswordBtn: document.getElementById("forgotPasswordBtn"),
  authMessage: document.getElementById("authMessage"),
  resetRequestModal: document.getElementById("resetRequestModal"),
  resetRequestBackdrop: document.getElementById("resetRequestBackdrop"),
  resetRequestClose: document.getElementById("resetRequestClose"),
  resetRequestForm: document.getElementById("resetRequestForm"),
  resetRequestEmail: document.getElementById("resetRequestEmail"),
  resetRequestMessage: document.getElementById("resetRequestMessage"),
  resetPasswordModal: document.getElementById("resetPasswordModal"),
  resetPasswordBackdrop: document.getElementById("resetPasswordBackdrop"),
  resetPasswordClose: document.getElementById("resetPasswordClose"),
  resetPasswordForm: document.getElementById("resetPasswordForm"),
  resetPasswordInput: document.getElementById("resetPasswordInput"),
  resetPasswordMessage: document.getElementById("resetPasswordMessage"),
  accountPanel: document.getElementById("accountPanel"),
  accountPanelBackdrop: document.getElementById("accountPanelBackdrop"),
  accountPanelClose: document.getElementById("accountPanelClose"),
  accountPanelSummary: document.getElementById("accountPanelSummary"),
  accountActivityList: document.getElementById("accountActivityList"),
  accountUpdateForm: document.getElementById("accountUpdateForm"),
  accountNameInput: document.getElementById("accountNameInput"),
  accountEmailInput: document.getElementById("accountEmailInput"),
  accountUpdateMessage: document.getElementById("accountUpdateMessage"),
  accountPasswordForm: document.getElementById("accountPasswordForm"),
  accountCurrentPassword: document.getElementById("accountCurrentPassword"),
  accountNewPassword: document.getElementById("accountNewPassword"),
  accountPasswordMessage: document.getElementById("accountPasswordMessage"),
  adminPanel: document.getElementById("adminPanel"),
  adminPanelBackdrop: document.getElementById("adminPanelBackdrop"),
  adminPanelClose: document.getElementById("adminPanelClose"),
  adminStats: document.getElementById("adminStats"),
  adminSearchInput: document.getElementById("adminSearchInput"),
  adminMembershipFilter: document.getElementById("adminMembershipFilter"),
  adminExportBtn: document.getElementById("adminExportBtn"),
  adminUsersTable: document.getElementById("adminUsersTable"),
  adminUserDetail: document.getElementById("adminUserDetail"),
  adminActivityList: document.getElementById("adminActivityList"),
  sidebar: document.getElementById("sidebar"),
  sidebarToggle: document.getElementById("sidebarToggle"),
  sidebarRailToggle: document.getElementById("sidebarRailToggle"),
  sidebarBackdrop: document.getElementById("sidebarBackdrop"),
  sidebarLinks: document.querySelectorAll(".sidebar__link"),
  sidebarGroupToggles: document.querySelectorAll(".sidebar-group__toggle"),
};

const SIDEBAR_COLLAPSED_KEY = "unifyo_sidebar_collapsed";

bootstrap();

async function bootstrap() {
  disableServiceWorkers();
  await refreshCurrentUser();
  elements.fileInput.addEventListener("change", handleFileSelection);
  elements.uploadBox.addEventListener("click", handleUploadBoxClick);
  elements.uploadBox.addEventListener("dragover", handleUploadDragOver);
  elements.uploadBox.addEventListener("dragleave", handleUploadDragLeave);
  elements.uploadBox.addEventListener("drop", handleUploadDrop);
  elements.buyHeroBtn.addEventListener("click", startCheckoutFlow);
  elements.accountBtn.addEventListener("click", () => {
    if (state.user) {
      openAccountPanel();
      return;
    }
    openAuthModal("register");
  });
  elements.accountMenuBtn?.addEventListener("click", () => {
    closeSidebar();
    if (state.user) {
      openAccountPanel();
      return;
    }
    openAuthModal("register");
  });
  elements.adminMenuBtn?.addEventListener("click", () => {
    closeSidebar();
    openAdminPanel();
  });
  elements.logoutBtn.addEventListener("click", logout);
  elements.unlockUploadBtn.addEventListener("click", handleUnlockUploadAction);
  elements.buyToolbarBtn.addEventListener("click", startCheckoutFlow);
  elements.buyProBtn.addEventListener("click", startCheckoutFlow);
  elements.pricingCtaBtn?.addEventListener("click", startCheckoutFlow);
  elements.mergeBtn.addEventListener("click", processFiles);
  elements.resetBtn.addEventListener("click", resetApp);
  elements.promoModalBackdrop.addEventListener("click", closePromoModal);
  elements.promoModalClose.addEventListener("click", closePromoModal);
  elements.promoModalAuth.addEventListener("click", () => {
    closePromoModal();
    openAuthModal("register");
  });
  elements.promoModalStart.addEventListener("click", async () => {
    closePromoModal();
    await startCheckoutFlow();
  });
  elements.authModalBackdrop.addEventListener("click", closeAuthModal);
  elements.authModalClose.addEventListener("click", closeAuthModal);
  elements.authRegisterTab.addEventListener("click", () => setAuthMode("register"));
  elements.authLoginTab.addEventListener("click", () => setAuthMode("login"));
  elements.authForm.addEventListener("submit", handleAuthSubmit);
  elements.forgotPasswordBtn.addEventListener("click", openResetRequestModal);
  elements.resetRequestBackdrop.addEventListener("click", closeResetRequestModal);
  elements.resetRequestClose.addEventListener("click", closeResetRequestModal);
  elements.resetRequestForm.addEventListener("submit", handleResetRequestSubmit);
  elements.resetPasswordBackdrop.addEventListener("click", closeResetPasswordModal);
  elements.resetPasswordClose.addEventListener("click", closeResetPasswordModal);
  elements.resetPasswordForm.addEventListener("submit", handleResetPasswordSubmit);
  elements.accountPanelBackdrop?.addEventListener("click", closeAccountPanel);
  elements.accountPanelClose?.addEventListener("click", closeAccountPanel);
  elements.accountUpdateForm?.addEventListener("submit", handleAccountUpdateSubmit);
  elements.accountPasswordForm?.addEventListener("submit", handleAccountPasswordSubmit);
  elements.adminPanelBackdrop?.addEventListener("click", closeAdminPanel);
  elements.adminPanelClose?.addEventListener("click", closeAdminPanel);
  elements.adminSearchInput?.addEventListener("input", renderAdminUsers);
  elements.adminMembershipFilter?.addEventListener("change", renderAdminUsers);
  elements.adminExportBtn?.addEventListener("click", exportAdminUsers);
  elements.sidebarToggle?.addEventListener("click", toggleSidebar);
  elements.sidebarRailToggle?.addEventListener("click", toggleSidebarRail);
  elements.sidebarBackdrop?.addEventListener("click", closeSidebar);
  elements.sidebarLinks.forEach((link) => link.addEventListener("click", closeSidebar));
  elements.sidebarGroupToggles.forEach((toggle) => toggle.addEventListener("click", handleSidebarGroupToggle));
  document.addEventListener("keydown", handleModalEscape);
  elements.downloadCsvBtn.addEventListener("click", () => {
    if (state.mergedContacts.length) {
      downloadCsv("kontakty_final.csv", state.mergedContacts);
    }
  });
  elements.downloadXlsxBtn.addEventListener("click", async () => {
    if (!state.mergedContacts.length) {
      return;
    }

    try {
      await downloadXlsx("kontakty_final.xlsx", state.mergedContacts);
    } catch (error) {
      window.alert(`XLSX export zlyhal: ${error.message}`);
    }
  });
  maybeOpenPromoModal();
  syncSidebarCollapse();
  renderAccessState();
  renderUploadState();
}

function renderAccessState() {
  const hasMembership = Boolean(state.user?.membership_active);
  const isLoggedIn = Boolean(state.user);
  const isAdmin = Boolean(state.user?.is_admin);
  const canManageAdminTools = Boolean(state.user?.can_manage_admin_tools);
  const accountLabel = state.user?.name?.trim() || state.user?.email || "Prihlásiť sa";
  const membershipUntil = formatDate(state.user?.membership_valid_until);
  document.body.classList.toggle("is-pro-unlocked", hasMembership);
  if (elements.mergeBtn) {
    elements.mergeBtn.classList.toggle("is-hidden", !hasMembership);
    elements.mergeBtn.disabled = !hasMembership || state.files.length === 0;
  }
  if (elements.buyToolbarBtn) {
    elements.buyToolbarBtn.classList.toggle("is-hidden", hasMembership);
  }
  if (elements.buyHeroBtn) {
    elements.buyHeroBtn.textContent = hasMembership ? "Nahrať súbory" : "Začať čistenie";
    elements.buyHeroBtn.disabled = false;
  }
  if (elements.unlockUploadBtn) {
    elements.unlockUploadBtn.textContent = hasMembership ? "Nahrať súbory" : "Nahrať a vyčistiť";
    elements.unlockUploadBtn.disabled = false;
  }
  if (elements.buyProBtn) {
    elements.buyProBtn.textContent = hasMembership ? "Členstvo je aktívne" : "Aktivovať za 0,99 € / mesiac";
    elements.buyProBtn.disabled = false;
  }
  if (elements.pricingCtaBtn) {
    elements.pricingCtaBtn.textContent = hasMembership ? "Nahrať a vyčistiť" : "Vyčistiť moje kontakty";
    elements.pricingCtaBtn.disabled = false;
  }
  if (elements.fileInput) {
    elements.fileInput.disabled = !hasMembership;
  }
  if (elements.accountBtn) {
    elements.accountBtn.textContent = isLoggedIn ? accountLabel : "Prihlásiť sa";
  }
  if (elements.accountMenuBtn) {
    elements.accountMenuBtn.textContent = isLoggedIn ? "Účet a nastavenia" : "Prihlásiť sa / Registrovať";
  }
  if (elements.adminMenuBtn) {
    elements.adminMenuBtn.classList.toggle("is-hidden", !isAdmin);
  }
  if (elements.logoutBtn) {
    elements.logoutBtn.classList.toggle("is-hidden", !isLoggedIn);
  }
  if (elements.accountStatus) {
    if (hasMembership) {
      elements.accountStatus.textContent = `Prihlásený účet ${accountLabel} má aktívne členstvo${membershipUntil !== "—" ? ` do ${membershipUntil}` : ""}${canManageAdminTools ? " a plný správca prístup." : isAdmin ? " a zároveň administrátorský prístup." : "."}`;
    } else if (isLoggedIn) {
      elements.accountStatus.textContent = `Prihlásený účet ${accountLabel} ešte nemá aktívne členstvo${canManageAdminTools ? ", ale má plný správca prístup." : isAdmin ? ", ale má administrátorský prístup." : "."}`;
    } else {
      elements.accountStatus.textContent = "Vytvor si účet, aktivuj členstvo a vyčisti svoje kontakty bez duplicít.";
    }
  }
  const accountGroupToggle = document.querySelector('[data-sidebar-group="account"]');
  const accountGroupContent = document.querySelector('[data-sidebar-group-content="account"]');
  if (accountGroupToggle && accountGroupContent && isAdmin) {
    accountGroupContent.classList.remove("is-collapsed");
    accountGroupToggle.setAttribute("aria-expanded", "true");
  }
  if (elements.uploadTitle) {
    elements.uploadTitle.textContent = hasMembership
      ? "Import je odomknutý a pripravený"
      : "Plný import je súčasťou členského prístupu";
  }
  if (elements.uploadSubtitle) {
    elements.uploadSubtitle.textContent = hasMembership
      ? "Nahraj vlastné CSV, XLSX alebo XLS súbory a systém ich automaticky vyčistí."
      : isLoggedIn
        ? "Účet je pripravený. Aktivuj členstvo cez Stripe a odomkni plný import a export."
        : "Najprv sa zaregistruj, prihlás sa a aktivuj členstvo na 1 mesiac.";
  }
  renderAccountSummary();
  renderUploadState();
}

function setUploadPhase(phase, progress = state.uploadUi.progress) {
  if (state.uploadUi.progressTimer) {
    window.clearInterval(state.uploadUi.progressTimer);
    state.uploadUi.progressTimer = null;
  }
  state.uploadUi.phase = phase;
  state.uploadUi.progress = progress;
  renderUploadState();
}

function renderUploadState() {
  if (!elements.uploadBox || !elements.uploadStateBadge || !elements.uploadStateText || !elements.uploadProgress || !elements.uploadProgressBar) {
    return;
  }

  const membershipActive = Boolean(state.user?.membership_active);
  const fileCount = state.files.length;
  const { phase, progress } = state.uploadUi;

  elements.uploadBox.classList.toggle("upload--locked", !membershipActive);
  elements.uploadBox.classList.toggle("upload--ready", membershipActive && fileCount > 0 && phase !== "processing");
  elements.uploadBox.classList.toggle("upload--processing", phase === "processing");
  elements.uploadBox.classList.toggle("upload--done", phase === "done");

  let badge = "Pripravené";
  let text = "Pridaj súbory alebo ich sem pretiahni";
  let showProgress = false;

  if (!membershipActive) {
    badge = "Uzamknuté";
    text = "Najprv aktivuj členstvo a potom nahráš vlastné súbory";
  } else if (phase === "processing") {
    badge = "Spracovanie";
    text = "Súbory sa práve čistia a pripravujú na finálny export";
    showProgress = true;
  } else if (phase === "done") {
    badge = "Hotovo";
    text = "Výsledok je pripravený nižšie vrátane auditu a exportu";
  } else if (fileCount > 0) {
    badge = "Nahraté";
    text = `${fileCount} súbor${fileCount === 1 ? "" : fileCount >= 2 && fileCount <= 4 ? "y" : "ov"} pripraven${fileCount === 1 ? "ý" : "é"} na čistenie`;
  }

  elements.uploadStateBadge.textContent = badge;
  elements.uploadStateText.textContent = text;
  elements.uploadProgress.hidden = !showProgress;
  elements.uploadProgressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
}

function startUploadProgressLoop() {
  setUploadPhase("processing", 14);
  state.uploadUi.progressTimer = window.setInterval(() => {
    if (state.uploadUi.progress >= 84) {
      return;
    }
    state.uploadUi.progress += Math.random() > 0.55 ? 11 : 7;
    renderUploadState();
  }, 320);
}

function handleModalEscape(event) {
  if (event.key !== "Escape") {
    return;
  }
  if (!elements.promoModal.hidden) {
    closePromoModal();
  }
  if (!elements.authModal.hidden) {
    closeAuthModal();
  }
  if (!elements.resetRequestModal.hidden) {
    closeResetRequestModal();
  }
  if (!elements.resetPasswordModal.hidden) {
    closeResetPasswordModal();
  }
  if (!elements.accountPanel.hidden) {
    closeAccountPanel();
  }
  if (!elements.adminPanel.hidden) {
    closeAdminPanel();
  }
  closeSidebar();
}

function maybeOpenPromoModal() {
  if (state.user?.membership_active) {
    return;
  }
  if (sessionStorage.getItem("promo_seen") === "1") {
    return;
  }
  elements.promoModal.hidden = false;
  sessionStorage.setItem("promo_seen", "1");
  syncModalState();
}

function closePromoModal() {
  elements.promoModal.hidden = true;
  syncModalState();
}

function toggleSidebar() {
  document.body.classList.toggle("sidebar-open");
}

function syncSidebarCollapse() {
  const isCollapsed = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  document.body.classList.toggle("sidebar-collapsed", isCollapsed);
  if (elements.sidebarRailToggle) {
    elements.sidebarRailToggle.textContent = isCollapsed ? "⟩" : "⟨";
  }
}

function toggleSidebarRail() {
  const nextValue = document.body.classList.contains("sidebar-collapsed") ? "0" : "1";
  window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, nextValue);
  syncSidebarCollapse();
}

function closeSidebar() {
  document.body.classList.remove("sidebar-open");
  elements.uploadBox?.classList.remove("is-dragover");
}

function handleSidebarGroupToggle(event) {
  const toggle = event.currentTarget;
  const groupName = toggle.dataset.sidebarGroup;
  const content = document.querySelector(`[data-sidebar-group-content="${groupName}"]`);
  if (!content) {
    return;
  }
  const isCollapsed = content.classList.toggle("is-collapsed");
  toggle.setAttribute("aria-expanded", String(!isCollapsed));
}

function syncModalState() {
  const hasOpenModal =
    !elements.promoModal.hidden ||
    !elements.authModal.hidden ||
    !elements.resetRequestModal.hidden ||
    !elements.resetPasswordModal.hidden ||
    !elements.accountPanel.hidden ||
    !elements.adminPanel.hidden;
  document.body.classList.toggle("modal-open", hasOpenModal);
}

function openAuthModal(mode = "register") {
  setAuthMode(mode);
  clearAuthMessage();
  if (mode === "register") {
    elements.authPassword.value = "";
  }
  elements.authModal.hidden = false;
  syncModalState();
}

function closeAuthModal() {
  elements.authModal.hidden = true;
  syncModalState();
}

async function openAccountPanel() {
  elements.accountPanel.hidden = false;
  syncModalState();
  await fetchAccountPanel();
}

function closeAccountPanel() {
  elements.accountPanel.hidden = true;
  syncModalState();
}

async function openAdminPanel() {
  if (!state.user?.is_admin) {
    window.alert("Administrácia je dostupná len pre správcu.");
    return;
  }
  elements.adminPanel.hidden = false;
  syncModalState();
  await fetchAdminPanel();
}

function closeAdminPanel() {
  elements.adminPanel.hidden = true;
  syncModalState();
}

function setAuthMode(mode) {
  state.authMode = mode;
  const isRegister = mode === "register";
  elements.authRegisterTab.classList.toggle("auth-switch__button--active", isRegister);
  elements.authLoginTab.classList.toggle("auth-switch__button--active", !isRegister);
  elements.authSubmitBtn.textContent = isRegister ? "Vytvoriť účet" : "Prihlásiť sa";
  elements.authPassword.autocomplete = isRegister ? "new-password" : "current-password";
  elements.authNameField.classList.toggle("is-hidden", !isRegister);
  elements.forgotPasswordBtn.classList.toggle("is-hidden", isRegister);
}

function setAuthMessage(message, isError = false) {
  elements.authMessage.hidden = false;
  elements.authMessage.textContent = message;
  elements.authMessage.classList.toggle("auth-message--error", isError);
}

function clearAuthMessage() {
  elements.authMessage.hidden = true;
  elements.authMessage.textContent = "";
  elements.authMessage.classList.remove("auth-message--error");
}

async function refreshCurrentUser() {
  const response = await fetch("/api/me");
  const payload = await response.json();
  state.user = payload.user;

  const url = new URL(window.location.href);
  const checkoutState = url.searchParams.get("checkout");
  const resetToken = url.searchParams.get("reset_token");
  if (checkoutState === "success") {
    try {
      const refreshResponse = await fetch("/api/refresh-membership");
      const refreshPayload = await refreshResponse.json();
      if (refreshResponse.ok) {
        state.user = refreshPayload.user;
      }
    } catch (_error) {
      // ignore sync issue here; current state stays visible
    }

    if (state.user?.membership_active) {
      window.alert("Členstvo bolo úspešne aktivované.");
    } else {
      window.alert("Platba prebehla. Členstvo sa ešte synchronizuje, skús stránku obnoviť o pár sekúnd.");
    }
  }
  if (checkoutState === "cancel") {
    window.alert("Platba bola zrušená.");
  }
  if (checkoutState) {
    url.searchParams.delete("checkout");
    window.history.replaceState({}, "", url.toString());
  }
  if (resetToken) {
    openResetPasswordModal(resetToken);
    url.searchParams.delete("reset_token");
    window.history.replaceState({}, "", url.toString());
  }
}

async function fetchAccountPanel() {
  if (!state.user) {
    return;
  }
  elements.accountPanelSummary.className = "account-summary empty-state";
  elements.accountPanelSummary.textContent = "Načítavam údaje o účte...";
  elements.accountActivityList.className = "empty-state";
  elements.accountActivityList.textContent = "Načítavam aktivitu...";
  try {
    const response = await fetch("/api/account");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Údaje o účte sa nepodarilo načítať.");
    }
    state.account = payload;
    renderAccountPanel();
  } catch (error) {
    elements.accountPanelSummary.className = "account-summary empty-state";
    elements.accountPanelSummary.textContent = error.message;
    elements.accountActivityList.className = "empty-state";
    elements.accountActivityList.textContent = error.message;
  }
}

async function fetchAdminPanel() {
  if (elements.adminStats) {
    elements.adminStats.className = "summary-grid summary-grid--admin empty-state";
    elements.adminStats.textContent = "Načítavam štatistiky...";
  }
  elements.adminUsersTable.className = "table-wrap empty-state";
  elements.adminUsersTable.textContent = "Načítavam používateľov...";
  elements.adminUserDetail.className = "panel-card empty-state";
  elements.adminUserDetail.textContent = "Vyber používateľa z tabuľky a zobrazí sa detail účtu, história aj rýchle zásahy.";
  elements.adminActivityList.className = "empty-state";
  elements.adminActivityList.textContent = "Načítavam admin log...";
  try {
    const response = await fetch("/api/admin/overview");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Admin dáta sa nepodarilo načítať.");
    }
    state.admin = payload;
    renderAdminPanel();
  } catch (error) {
    elements.adminUsersTable.className = "table-wrap empty-state";
    elements.adminUsersTable.textContent = error.message;
    elements.adminActivityList.className = "empty-state";
    elements.adminActivityList.textContent = error.message;
  }
}

function formatDate(value) {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function renderAccountSummary() {
  if (!elements.accountSummary) {
    return;
  }
  if (!state.user) {
    elements.accountSummary.className = "account-summary empty-state";
    elements.accountSummary.textContent = "Zatiaľ nie si prihlásený.";
    return;
  }

  elements.accountSummary.className = "account-summary";
  elements.accountSummary.innerHTML = `
    <article class="account-card">
      <div class="account-card__row"><strong>Meno</strong><span>${escapeHtml(state.user.name || "—")}</span></div>
      <div class="account-card__row"><strong>E-mail</strong><span>${escapeHtml(state.user.email || "")}</span></div>
      <div class="account-card__row"><strong>Rola</strong><span>${escapeHtml(state.user.is_admin ? "Admin" : "Používateľ")}</span></div>
      <div class="account-card__row"><strong>Registrovaný od</strong><span>${escapeHtml(formatDate(state.user.created_at))}</span></div>
      <div class="account-card__row"><strong>Stav členstva</strong><span>${escapeHtml(state.user.membership_active ? "Aktívne" : "Neaktívne")}</span></div>
      <div class="account-card__row"><strong>Členstvo od</strong><span>${escapeHtml(formatDate(state.user.membership_started_at))}</span></div>
      <div class="account-card__row"><strong>Platné do</strong><span>${escapeHtml(formatDate(state.user.membership_valid_until))}</span></div>
    </article>
  `;
}

function renderAccountPanel() {
  const user = state.account?.user || state.user;
  if (!user) {
    elements.accountPanelSummary.className = "account-summary empty-state";
    elements.accountPanelSummary.textContent = "Zatiaľ nie si prihlásený.";
    return;
  }
  elements.accountPanelSummary.className = "account-summary";
  elements.accountPanelSummary.innerHTML = `
    <article class="account-card">
      <div class="account-card__row"><strong>Meno</strong><span>${escapeHtml(user.name || "—")}</span></div>
      <div class="account-card__row"><strong>E-mail</strong><span>${escapeHtml(user.email || "")}</span></div>
      <div class="account-card__row"><strong>Registrovaný od</strong><span>${escapeHtml(formatDate(user.created_at))}</span></div>
      <div class="account-card__row"><strong>Stav členstva</strong><span>${escapeHtml(user.membership_active ? "Aktívne" : "Neaktívne")}</span></div>
      <div class="account-card__row"><strong>Členstvo od</strong><span>${escapeHtml(formatDate(user.membership_started_at))}</span></div>
      <div class="account-card__row"><strong>Platné do</strong><span>${escapeHtml(formatDate(user.membership_valid_until))}</span></div>
      <div class="account-card__row"><strong>Rola</strong><span>${escapeHtml(user.is_admin ? "Admin" : "Používateľ")}</span></div>
    </article>
  `;
  if (elements.accountNameInput) {
    elements.accountNameInput.value = user.name || "";
  }
  if (elements.accountEmailInput) {
    elements.accountEmailInput.value = user.email || "";
  }
  if (elements.accountUpdateMessage) {
    elements.accountUpdateMessage.hidden = true;
    elements.accountUpdateMessage.textContent = "";
    elements.accountUpdateMessage.classList.remove("auth-message--error");
  }
  if (elements.accountPasswordMessage) {
    elements.accountPasswordMessage.hidden = true;
    elements.accountPasswordMessage.textContent = "";
    elements.accountPasswordMessage.classList.remove("auth-message--error");
  }
  renderActivityList(elements.accountActivityList, state.account?.activity || []);
}

function renderActivityList(target, items) {
  if (!items.length) {
    target.className = "empty-state";
    target.textContent = "Zatiaľ bez aktivity.";
    return;
  }
  target.className = "activity-list";
  target.innerHTML = items.map((item) => `
    <article class="activity-card">
      <div class="activity-card__head">
        <strong>${escapeHtml(item.event_label || item.event_type || "Aktivita")}</strong>
        <span>${escapeHtml(formatDateTime(item.created_at))}</span>
      </div>
      <div class="activity-card__meta">
        ${item.user_name || item.user_email ? `<span>${escapeHtml(item.user_name || item.user_email)}</span>` : ""}
        ${item.meta?.files ? `<span>${escapeHtml(String(item.meta.files))} súbory</span>` : ""}
        ${item.meta?.status ? `<span>${escapeHtml(item.meta.status)}</span>` : ""}
      </div>
    </article>
  `).join("");
}

function renderAdminPanel() {
  renderAdminStats();
  renderAdminUsers();
  renderActivityList(elements.adminActivityList, state.admin?.activity || []);
}

function renderAdminStats() {
  const stats = state.admin?.stats;
  if (!elements.adminStats || !stats) {
    return;
  }
  elements.adminStats.className = "summary-grid summary-grid--admin";
  elements.adminStats.innerHTML = `
    <article class="summary-card">
      <span>Spolu používateľov</span>
      <strong>${escapeHtml(String(stats.total_users || 0))}</strong>
    </article>
    <article class="summary-card">
      <span>Aktívne členstvá</span>
      <strong>${escapeHtml(String(stats.active_memberships || 0))}</strong>
    </article>
    <article class="summary-card">
      <span>Admin účty</span>
      <strong>${escapeHtml(String(stats.admin_users || 0))}</strong>
    </article>
    <article class="summary-card">
      <span>Registrácie za 30 dní</span>
      <strong>${escapeHtml(String(stats.recent_registrations || 0))}</strong>
    </article>
  `;
}

function renderAdminUsers() {
  const users = getFilteredAdminUsers();
  const canManageAdminTools = Boolean(state.user?.can_manage_admin_tools);
  if (!users.length) {
    elements.adminUsersTable.className = "table-wrap empty-state";
    elements.adminUsersTable.textContent = "Zatiaľ bez registrovaných používateľov.";
    if (elements.adminUserDetail) {
      elements.adminUserDetail.className = "panel-card empty-state";
      elements.adminUserDetail.textContent = "Žiadny používateľ nezodpovedá aktuálnemu filtru.";
    }
    return;
  }
  elements.adminUsersTable.className = "table-wrap";
  elements.adminUsersTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Meno</th>
          <th>Email</th>
          <th>Rola</th>
          <th>Členstvo</th>
          <th>Platné do</th>
          <th>Akcie</th>
        </tr>
      </thead>
      <tbody>
        ${users.map((user) => `
          <tr>
            <td>${escapeHtml(user.name || "—")}</td>
            <td class="mono">${escapeHtml(user.email || "")}</td>
            <td>${escapeHtml(user.role || "user")}</td>
            <td>${escapeHtml(user.membership_status || "inactive")}</td>
            <td>${escapeHtml(formatDate(user.membership_valid_until))}</td>
            <td>
              <div class="admin-actions">
                <button class="button button--ghost admin-action" data-user-id="${user.id}" data-action="detail" type="button">Detail</button>
                ${canManageAdminTools ? `<button class="button button--ghost admin-action" data-user-id="${user.id}" data-action="activate_30d" type="button">+30 dní</button>` : ""}
                ${canManageAdminTools ? `<button class="button button--ghost admin-action" data-user-id="${user.id}" data-action="deactivate" type="button">Deaktivovať</button>` : ""}
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
  elements.adminUsersTable.querySelectorAll(".admin-action").forEach((button) => {
    button.addEventListener("click", handleAdminAction);
  });
}

function getFilteredAdminUsers() {
  const users = state.admin?.users || [];
  const query = (elements.adminSearchInput?.value || "").trim().toLowerCase();
  const filter = elements.adminMembershipFilter?.value || "all";
  return users.filter((user) => {
    const haystack = `${user.name || ""} ${user.email || ""}`.toLowerCase();
    if (query && !haystack.includes(query)) {
      return false;
    }
    if (filter === "active" && user.membership_status !== "active") {
      return false;
    }
    if (filter === "inactive" && user.membership_status === "active") {
      return false;
    }
    if (filter === "admin" && user.role !== "admin") {
      return false;
    }
    return true;
  });
}

async function handleAdminAction(event) {
  const button = event.currentTarget;
  const userId = Number(button.dataset.userId);
  const action = button.dataset.action;
  if (action === "detail") {
    await openAdminUserDetail(userId);
    return;
  }
  if (!state.user?.can_manage_admin_tools) {
    window.alert("Členstvá môže upravovať len hlavný správca.");
    return;
  }
  button.disabled = true;
  try {
    const response = await fetch("/api/admin/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, action }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Admin akcia zlyhala.");
    }
    await fetchAdminPanel();
  } catch (error) {
    window.alert(error.message);
  } finally {
    button.disabled = false;
  }
}

async function openAdminUserDetail(userId) {
  if (!elements.adminUserDetail) {
    return;
  }
  elements.adminUserDetail.className = "panel-card empty-state";
  elements.adminUserDetail.textContent = "Načítavam detail používateľa...";
  try {
    const response = await fetch(`/api/admin/user-detail?user_id=${encodeURIComponent(String(userId))}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Detail používateľa sa nepodarilo načítať.");
    }
    renderAdminUserDetail(payload);
  } catch (error) {
    elements.adminUserDetail.className = "panel-card empty-state";
    elements.adminUserDetail.textContent = error.message;
  }
}

function renderAdminUserDetail(payload) {
  const user = payload.user;
  const activity = payload.activity || [];
  const canManageAdminTools = Boolean(state.user?.can_manage_admin_tools);
  elements.adminUserDetail.className = "panel-card";
  elements.adminUserDetail.innerHTML = `
    <div class="admin-user-detail__head">
      <div>
        <strong>${escapeHtml(user.name || "Používateľ")}</strong>
        <p class="panel-copy">${escapeHtml(user.email || "")}</p>
      </div>
      <span class="pill">${escapeHtml(user.role === "admin" ? "Admin" : "Používateľ")}</span>
    </div>
    <div class="account-card">
      <div class="account-card__row"><strong>Registrovaný od</strong><span>${escapeHtml(formatDate(user.created_at))}</span></div>
      <div class="account-card__row"><strong>Stav členstva</strong><span>${escapeHtml(user.membership_status || "inactive")}</span></div>
      <div class="account-card__row"><strong>Platné do</strong><span>${escapeHtml(formatDate(user.membership_valid_until))}</span></div>
    </div>
    ${canManageAdminTools ? `<form id="adminMembershipForm" class="inline-form">
      <label class="auth-field auth-field--inline">
        <span>Predĺžiť o dni</span>
        <input id="adminMembershipDays" type="number" min="1" max="365" value="30">
      </label>
      <div class="admin-actions">
        <button class="button button--primary" type="submit">Predĺžiť členstvo</button>
        <button id="adminDeactivateBtn" class="button button--ghost" type="button">Deaktivovať</button>
        <button id="adminRoleBtn" class="button button--ghost" type="button">${user.role === "admin" ? "Nastaviť ako používateľ" : "Nastaviť ako admin"}</button>
      </div>
    </form>` : `<p class="panel-copy">Tento administrátorský účet má prístup k prehľadu, ale zmeny členstva a rolí môže robiť len hlavný správca.</p>`}
    <p id="adminUserMessage" class="auth-message" hidden></p>
    <div class="section-head section-head--tight">
      <div>
        <p class="section-kicker">História používateľa</p>
        <h3>Posledné aktivity</h3>
      </div>
    </div>
    <div id="adminUserActivity" class="activity-list"></div>
  `;

  const membershipForm = document.getElementById("adminMembershipForm");
  const daysInput = document.getElementById("adminMembershipDays");
  const deactivateBtn = document.getElementById("adminDeactivateBtn");
  const roleBtn = document.getElementById("adminRoleBtn");
  const messageEl = document.getElementById("adminUserMessage");
  renderActivityList(document.getElementById("adminUserActivity"), activity);

  membershipForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitAdminMembershipAction(user.id, "activate_days", {
      days: Number(daysInput?.value || 30),
      messageEl,
    });
  });
  deactivateBtn?.addEventListener("click", async () => {
    await submitAdminMembershipAction(user.id, "deactivate", { messageEl });
  });
  roleBtn?.addEventListener("click", async () => {
    await submitAdminRoleUpdate(user.id, user.role === "admin" ? "user" : "admin", messageEl);
  });
}

async function submitAdminMembershipAction(userId, action, { days = 0, messageEl } = {}) {
  try {
    const response = await fetch("/api/admin/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, action, days }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Admin akcia zlyhala.");
    }
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.textContent = "Zmena bola uložená.";
      messageEl.classList.remove("auth-message--error");
    }
    await fetchAdminPanel();
    await openAdminUserDetail(userId);
    if (state.user && state.user.id === userId) {
      await refreshCurrentUser();
      renderAccessState();
    }
  } catch (error) {
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.textContent = error.message;
      messageEl.classList.add("auth-message--error");
    } else {
      window.alert(error.message);
    }
  }
}

async function submitAdminRoleUpdate(userId, role, messageEl) {
  try {
    const response = await fetch("/api/admin/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, role }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Rolu sa nepodarilo zmeniť.");
    }
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.textContent = "Rola bola aktualizovaná.";
      messageEl.classList.remove("auth-message--error");
    }
    await fetchAdminPanel();
    await openAdminUserDetail(userId);
    if (state.user && state.user.id === userId) {
      await refreshCurrentUser();
      renderAccessState();
    }
  } catch (error) {
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.textContent = error.message;
      messageEl.classList.add("auth-message--error");
    } else {
      window.alert(error.message);
    }
  }
}

function exportAdminUsers() {
  const users = getFilteredAdminUsers();
  if (!users.length) {
    window.alert("Nie sú k dispozícii žiadni používatelia na export.");
    return;
  }
  downloadGenericCsv(
    "unifyo-pouzivatelia.csv",
    ["meno", "email", "rola", "clenstvo", "platne_do", "registrovany_od"],
    users.map((user) => ({
      meno: user.name || "",
      email: user.email || "",
      rola: user.role || "user",
      clenstvo: user.membership_status || "inactive",
      platne_do: user.membership_valid_until || "",
      registrovany_od: user.created_at || "",
    }))
  );
}

async function handleAccountUpdateSubmit(event) {
  event.preventDefault();
  if (!state.user) {
    return;
  }
  try {
    const response = await fetch("/api/account/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: elements.accountNameInput.value.trim(),
        email: elements.accountEmailInput.value.trim(),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Účet sa nepodarilo aktualizovať.");
    }
    state.user = payload.user;
    state.account = payload;
    elements.accountUpdateMessage.hidden = false;
    elements.accountUpdateMessage.textContent = "Účet bol aktualizovaný.";
    elements.accountUpdateMessage.classList.remove("auth-message--error");
    renderAccessState();
    renderAccountPanel();
  } catch (error) {
    elements.accountUpdateMessage.hidden = false;
    elements.accountUpdateMessage.textContent = error.message;
    elements.accountUpdateMessage.classList.add("auth-message--error");
  }
}

async function handleAccountPasswordSubmit(event) {
  event.preventDefault();
  if (!state.user) {
    return;
  }
  try {
    const response = await fetch("/api/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: elements.accountCurrentPassword.value,
        new_password: elements.accountNewPassword.value,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Heslo sa nepodarilo zmeniť.");
    }
    elements.accountCurrentPassword.value = "";
    elements.accountNewPassword.value = "";
    elements.accountPasswordMessage.hidden = false;
    elements.accountPasswordMessage.textContent = "Heslo bolo zmenené.";
    elements.accountPasswordMessage.classList.remove("auth-message--error");
  } catch (error) {
    elements.accountPasswordMessage.hidden = false;
    elements.accountPasswordMessage.textContent = error.message;
    elements.accountPasswordMessage.classList.add("auth-message--error");
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  clearAuthMessage();

  const name = elements.authName.value.trim();
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;
  const endpoint = state.authMode === "register" ? "/api/register" : "/api/login";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Autentifikácia zlyhala.");
    }

    state.user = payload.user;
    closeAuthModal();
    renderAccessState();
    if (state.authMode === "register") {
      window.alert("Účet bol vytvorený. Teraz môžeš aktivovať členstvo cez Stripe.");
    }
  } catch (error) {
    setAuthMessage(error.message, true);
  }
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  state.user = null;
  state.account = null;
  state.admin = null;
  resetApp();
  renderAccessState();
}

function openResetRequestModal() {
  closeAuthModal();
  elements.resetRequestEmail.value = elements.authEmail.value.trim();
  elements.resetRequestMessage.hidden = true;
  elements.resetRequestMessage.textContent = "";
  elements.resetRequestMessage.classList.remove("auth-message--error");
  elements.resetRequestModal.hidden = false;
  syncModalState();
}

function closeResetRequestModal() {
  elements.resetRequestModal.hidden = true;
  syncModalState();
}

function openResetPasswordModal(token) {
  elements.resetPasswordForm.dataset.token = token;
  elements.resetPasswordInput.value = "";
  elements.resetPasswordMessage.hidden = true;
  elements.resetPasswordMessage.textContent = "";
  elements.resetPasswordMessage.classList.remove("auth-message--error");
  elements.resetPasswordModal.hidden = false;
  syncModalState();
}

function closeResetPasswordModal() {
  elements.resetPasswordModal.hidden = true;
  syncModalState();
}

async function handleResetRequestSubmit(event) {
  event.preventDefault();
  elements.resetRequestMessage.hidden = true;
  elements.resetRequestMessage.classList.remove("auth-message--error");
  const submitButton = elements.resetRequestForm.querySelector('button[type="submit"]');
  const originalLabel = submitButton ? submitButton.textContent : "";
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Odosielam...";
  }

  try {
    const response = await fetch("/api/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: elements.resetRequestEmail.value.trim() }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Obnova hesla zlyhala.");
    }
    elements.resetRequestMessage.hidden = false;
    elements.resetRequestMessage.textContent = "Ak účet existuje, poslali sme ti link na obnovu hesla.";
    window.alert("Ak účet existuje, poslali sme ti link na obnovu hesla.");
  } catch (error) {
    elements.resetRequestMessage.hidden = false;
    elements.resetRequestMessage.textContent = error.message;
    elements.resetRequestMessage.classList.add("auth-message--error");
    window.alert(error.message);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  }
}

async function handleResetPasswordSubmit(event) {
  event.preventDefault();
  elements.resetPasswordMessage.hidden = true;
  elements.resetPasswordMessage.classList.remove("auth-message--error");

  try {
    const response = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: elements.resetPasswordForm.dataset.token || "",
        password: elements.resetPasswordInput.value,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Nastavenie nového hesla zlyhalo.");
    }
    closeResetPasswordModal();
    openAuthModal("login");
    setAuthMessage("Nové heslo bolo uložené. Teraz sa môžeš prihlásiť.");
  } catch (error) {
    elements.resetPasswordMessage.hidden = false;
    elements.resetPasswordMessage.textContent = error.message;
    elements.resetPasswordMessage.classList.add("auth-message--error");
  }
}

async function startCheckoutFlow() {
  if (!state.user) {
    openAuthModal("register");
    return;
  }
  if (state.user.membership_active) {
    if (elements.fileInput) {
      elements.fileInput.click();
    }
    return;
  }
  await startProCheckout();
}

function handleUnlockUploadAction() {
  if (state.user?.membership_active) {
    elements.fileInput.click();
    return;
  }
  startCheckoutFlow();
}

async function startProCheckout() {
  try {
    const response = await fetch("/api/create-checkout-session", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        openAuthModal("login");
      }
      throw new Error(payload.error || "Stripe checkout sa nepodarilo spustiť.");
    }
    window.location.href = payload.url;
  } catch (error) {
    window.alert(error.message);
  }
}

function handleUploadBoxClick(event) {
  if (event.target.closest("button")) {
    return;
  }
  if (state.user?.membership_active) {
    elements.fileInput.click();
    return;
  }
  startCheckoutFlow();
}

function handleUploadDragOver(event) {
  event.preventDefault();
  if (!state.user?.membership_active) {
    return;
  }
  elements.uploadBox.classList.add("is-dragover");
}

function handleUploadDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    elements.uploadBox.classList.remove("is-dragover");
  }
}

function handleUploadDrop(event) {
  event.preventDefault();
  elements.uploadBox.classList.remove("is-dragover");
  if (!state.user?.membership_active) {
    startCheckoutFlow();
    return;
  }
  const files = Array.from(event.dataTransfer?.files || []);
  if (!files.length) {
    return;
  }
  state.files.push(...files);
  setUploadPhase("ready", 0);
  renderSelectedFiles();
  renderAccessState();
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

async function disableServiceWorkers() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ("caches" in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
  }
}

function handleFileSelection(event) {
  if (!state.user?.membership_active) {
    startCheckoutFlow();
    return;
  }
  const files = Array.from(event.target.files || []);
  if (!files.length) {
    return;
  }

  state.files.push(...files);
  setUploadPhase("ready", 0);
  renderSelectedFiles();
  renderAccessState();
  elements.fileInput.value = "";
}

async function processFiles() {
  if (!state.files.length) {
    return;
  }

  elements.mergeBtn.disabled = true;
  elements.mergeBtn.textContent = "Spracúvam...";
  startUploadProgressLoop();

  const formData = new FormData();
  state.files.forEach((file) => formData.append("files", file, file.name));

  try {
    const response = await fetch("/api/process", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Spracovanie zlyhalo.");
    }

    state.datasets = payload.datasets || [];
    state.mergedContacts = payload.rows || [];
    state.removedDuplicates = payload.removed_duplicates || [];
    state.report = payload.report || state.report;
    setUploadPhase("done", 100);

    renderDatasetResults();
    renderSummary();
    renderResultTable();
    renderDuplicatesAudit();
  } catch (error) {
    setUploadPhase(state.files.length ? "ready" : "idle", 0);
    window.alert(`Nepodarilo sa spracovať súbory: ${error.message}`);
  } finally {
    renderAccessState();
    elements.mergeBtn.textContent = "Vyčistiť a zlúčiť";
  }
}

function renderSelectedFiles() {
  if (!state.files.length) {
    elements.datasetList.className = "dataset-list empty-state";
    elements.datasetList.textContent = "Zatiaľ nie sú načítané žiadne súbory.";
    return;
  }

  elements.datasetList.className = "dataset-list";
  elements.datasetList.innerHTML = state.files.map((file) => `
    <article class="dataset-item">
      <div>
        <div class="dataset-item__head">
          <h3 class="dataset-item__name">${escapeHtml(file.name)}</h3>
          <span class="dataset-item__type">${escapeHtml(getFileExtension(file.name).toUpperCase() || "SÚBOR")}</span>
        </div>
        <p class="dataset-item__meta">Pripravené na spracovanie</p>
        <div class="dataset-item__mapping">
          <span class="pill">stav: čaká na import</span>
        </div>
      </div>
    </article>
  `).join("");
}

function renderDatasetResults() {
  if (!state.datasets.length) {
    renderSelectedFiles();
    return;
  }

  elements.datasetList.className = "dataset-list";
  elements.datasetList.innerHTML = "";

  state.datasets.forEach((dataset) => {
    const fragment = elements.datasetItemTemplate.content.cloneNode(true);
    fragment.querySelector(".dataset-item__name").textContent = dataset.file_name;
    fragment.querySelector(".dataset-item__type").textContent = getFileExtension(dataset.file_name).toUpperCase() || "SÚBOR";
    fragment.querySelector(".dataset-item__meta").textContent =
      `${dataset.total_rows} riadkov, ${dataset.valid_contacts} použiteľných kontaktov`;
    fragment.querySelector(".dataset-item__mapping").innerHTML = renderMapping(dataset.mapping);
    elements.datasetList.appendChild(fragment);
  });
}

function renderMapping(mapping) {
  return [
    renderPill("meno", mapping?.meno),
    renderPill("priezvisko", mapping?.priezvisko),
    renderPill("celé meno", mapping?.cele_meno),
    renderPill("email", mapping?.email),
    renderPill("telefón", mapping?.telefon),
  ].join("");
}

function renderPill(label, index) {
  return `<span class="pill">${escapeHtml(label)}: ${index === null || index === undefined ? "nenájdené" : "nájdené"}</span>`;
}

function renderSummary() {
  elements.totalRows.textContent = String(state.report.pocet_importovanych_zaznamov || 0);
  elements.validContacts.textContent = String(
    (state.report.pocet_importovanych_zaznamov || 0) - (state.report.pocet_vyradenych_bez_emailu_a_telefonu || 0),
  );
  elements.mergedContacts.textContent = String(state.report.pocet_finalnych_kontaktov || 0);
  elements.duplicatesRemoved.textContent = String(state.report.pocet_odstranenych_duplicit || 0);
  elements.droppedInvalid.textContent = String(state.report.pocet_vyradenych_bez_emailu_a_telefonu || 0);
  elements.downloadCsvBtn.disabled = !state.mergedContacts.length;
  elements.downloadXlsxBtn.disabled = !state.mergedContacts.length;
}

function renderResultTable() {
  if (!state.mergedContacts.length) {
    elements.resultTable.className = "table-wrap empty-state";
    elements.resultTable.textContent = "Zatiaľ bez výsledkov.";
    return;
  }

  const rows = state.mergedContacts.map((contact) => `
    <tr>
      <td>${escapeHtml(contact.meno || "")}</td>
      <td>${escapeHtml(contact.priezvisko || "")}</td>
      <td class="mono">${escapeHtml(contact.email || "")}</td>
      <td class="mono">${escapeHtml(contact["telefón"] || "")}</td>
    </tr>
  `).join("");

  elements.resultTable.className = "table-wrap";
  elements.resultTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Meno</th>
          <th>Priezvisko</th>
          <th>Email</th>
          <th>Telefón</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function resetApp() {
  state.files = [];
  state.datasets = [];
  state.mergedContacts = [];
  state.removedDuplicates = [];
  state.report = {
    pocet_importovanych_zaznamov: 0,
    pocet_odstranenych_duplicit: 0,
    pocet_vyradenych_bez_emailu_a_telefonu: 0,
    pocet_finalnych_kontaktov: 0,
  };
  setUploadPhase("idle", 0);

  renderSelectedFiles();
  renderSummary();
  elements.resultTable.className = "table-wrap empty-state";
  elements.resultTable.textContent = "Zatiaľ bez výsledkov.";
  elements.duplicatesAudit.className = "empty-state";
  elements.duplicatesAudit.textContent = "Zatiaľ bez odstránených duplicitných záznamov.";
  renderAccessState();
  elements.downloadCsvBtn.disabled = true;
  elements.downloadXlsxBtn.disabled = true;
}

function renderDuplicatesAudit() {
  if (!state.removedDuplicates.length) {
    elements.duplicatesAudit.className = "empty-state";
    elements.duplicatesAudit.textContent = "Neboli odstránené žiadne duplicitné záznamy.";
    return;
  }

  elements.duplicatesAudit.className = "audit-list";
  elements.duplicatesAudit.innerHTML = state.removedDuplicates.map((item) => `
    <article class="audit-card">
      <div class="audit-card__head">
        <span class="pill pill--warn">odstránené ako duplicita</span>
        <span class="pill">${escapeHtml(item.reason || "duplicitný záznam")}</span>
      </div>
      <div class="audit-grid">
        <div class="audit-block audit-block--removed">
          <h3>Vymazané</h3>
          ${renderAuditLines(item.removed)}
        </div>
        <div class="audit-block audit-block--kept">
          <h3>Ponechané</h3>
          ${renderAuditLines(item.kept)}
        </div>
      </div>
    </article>
  `).join("");
}

function renderAuditLines(contact) {
  return `
    <div class="line-stack">
      <div><strong>Meno:</strong> ${escapeHtml(contact?.meno || "")}</div>
      <div><strong>Priezvisko:</strong> ${escapeHtml(contact?.priezvisko || "")}</div>
      <div><strong>Email:</strong> <span class="mono">${escapeHtml(contact?.email || "")}</span></div>
      <div><strong>Telefón:</strong> <span class="mono">${escapeHtml(contact?.["telefón"] || "")}</span></div>
      <div><strong>Súbor:</strong> ${escapeHtml(contact?.zdroj || "")}</div>
      <div><strong>Riadok:</strong> ${escapeHtml(contact?.riadok || "")}</div>
    </div>
  `;
}

async function downloadXlsx(filename, rows) {
  const response = await fetch("/api/export-xlsx", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filename, rows }),
  });

  if (!response.ok) {
    let message = "Export zlyhal.";
    try {
      const payload = await response.json();
      message = payload.error || message;
    } catch (_error) {
      // ignore invalid error payload
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  triggerDownload(blob, filename);
}

function downloadCsv(filename, rows) {
  const header = ["meno", "priezvisko", "email", "telefón"];
  downloadGenericCsv(filename, header, rows);
}

function downloadGenericCsv(filename, header, rows) {
  const csvRows = [
    header.join(","),
    ...rows.map((row) => header.map((field) => escapeCsvValue(row[field] || "")).join(",")),
  ];

  const blob = new Blob(["\ufeff", csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, filename);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getFileExtension(fileName) {
  const parts = String(fileName || "").split(".");
  return parts.length > 1 ? parts.pop() : "";
}
