const state = {
  user: null,
  account: null,
  admin: null,
  accountAssistantProfile: null,
  accountAssistantOverview: null,
  assistant: {
    profile: null,
    messages: [],
  },
  mode: "chooser",
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
  compression: {
    file: null,
    result: null,
    isBusy: false,
    isOversize: false,
    estimateSeconds: 0,
    startedAt: 0,
    timingTimer: null,
    uploadUi: {
      phase: "idle",
      progress: 0,
      progressTimer: null,
    },
  },
  chooserDealDismissed: false,
  sessionTimer: null,
  heartbeatTimer: null,
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
  premiumHeroCard: document.getElementById("premiumHeroCard"),
  premiumHeroLabel: document.getElementById("premiumHeroLabel"),
  premiumHeroNote: document.getElementById("premiumHeroNote"),
  memberThankYouPanel: document.getElementById("memberThankYouPanel"),
  accountSummary: document.getElementById("accountSummary"),
  accountMenuBtn: document.getElementById("accountMenuBtn"),
  adminMenuBtn: document.getElementById("adminMenuBtn"),
  uploadTitle: document.getElementById("uploadTitle"),
  uploadSubtitle: document.getElementById("uploadSubtitle"),
  unlockUploadBtn: document.getElementById("unlockUploadBtn"),
  buyToolbarBtn: document.getElementById("buyToolbarBtn"),
  buyProBtn: document.getElementById("buyProBtn"),
  pricingCtaBtn: document.getElementById("pricingCtaBtn"),
  pricingCard: document.getElementById("pricingCard"),
  openContactsBtn: document.getElementById("openContactsBtn"),
  openCompressorBtn: document.getElementById("openCompressorBtn"),
  openAssistantBtn: document.getElementById("openAssistantBtn"),
  compressFeatureStatus: document.getElementById("compressFeatureStatus"),
  assistantSubtitle: document.getElementById("assistantSubtitle"),
  assistantHeadline: document.getElementById("assistantHeadline"),
  assistantFocus: document.getElementById("assistantFocus"),
  assistantStats: document.getElementById("assistantStats"),
  assistantRefreshBtn: document.getElementById("assistantRefreshBtn"),
  assistantPromptChips: document.getElementById("assistantPromptChips"),
  assistantChatFeed: document.getElementById("assistantChatFeed"),
  assistantChatForm: document.getElementById("assistantChatForm"),
  assistantChatInput: document.getElementById("assistantChatInput"),
  assistantChatSubmit: document.getElementById("assistantChatSubmit"),
  assistantChatMessage: document.getElementById("assistantChatMessage"),
  modeContactsBtn: document.getElementById("modeContactsBtn"),
  modeCompressBtn: document.getElementById("modeCompressBtn"),
  modeAssistantBtn: document.getElementById("modeAssistantBtn"),
  heroModeContactsBtn: document.getElementById("heroModeContactsBtn"),
  heroModeCompressBtn: document.getElementById("heroModeCompressBtn"),
  appModesSection: document.getElementById("aplikacia-mody"),
  appMembershipPromo: document.getElementById("appMembershipPromo"),
  appMembershipPromoBtn: document.getElementById("appMembershipPromoBtn"),
  workspaceMembershipPromo: document.getElementById("workspaceMembershipPromo"),
  workspaceMembershipPromoBtn: document.getElementById("workspaceMembershipPromoBtn"),
  contentShell: document.getElementById("contentShell"),
  workspaceHeaderMain: document.getElementById("workspaceHeaderMain"),
  workspaceGrid: document.getElementById("workspaceGrid"),
  contactsWorkspace: document.getElementById("contactsWorkspace"),
  compressWorkspace: document.getElementById("compressWorkspace"),
  assistantWorkspace: document.getElementById("assistantWorkspace"),
  contactsNavLinks: document.querySelectorAll(".js-contacts-link"),
  assistantNavLinks: document.querySelectorAll(".js-assistant-link"),
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
  checkoutSuccessModal: document.getElementById("checkoutSuccessModal"),
  checkoutSuccessBackdrop: document.getElementById("checkoutSuccessBackdrop"),
  checkoutSuccessClose: document.getElementById("checkoutSuccessClose"),
  checkoutSuccessMessage: document.getElementById("checkoutSuccessMessage"),
  authModal: document.getElementById("authModal"),
  authModalBackdrop: document.getElementById("authModalBackdrop"),
  authModalClose: document.getElementById("authModalClose"),
  authOfferNote: document.getElementById("authOfferNote"),
  authRegisterTab: document.getElementById("authRegisterTab"),
  authLoginTab: document.getElementById("authLoginTab"),
  authForm: document.getElementById("authForm"),
  authNameField: document.getElementById("authNameField"),
  authName: document.getElementById("authName"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  authConsentFields: document.getElementById("authConsentFields"),
  authAcceptTerms: document.getElementById("authAcceptTerms"),
  authAcceptPrivacy: document.getElementById("authAcceptPrivacy"),
  authMarketingConsent: document.getElementById("authMarketingConsent"),
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
  checkoutModal: document.getElementById("checkoutModal"),
  checkoutModalBackdrop: document.getElementById("checkoutModalBackdrop"),
  checkoutModalClose: document.getElementById("checkoutModalClose"),
  checkoutCancelBtn: document.getElementById("checkoutCancelBtn"),
  checkoutConsentCheckbox: document.getElementById("checkoutConsentCheckbox"),
  checkoutProceedBtn: document.getElementById("checkoutProceedBtn"),
  checkoutMessage: document.getElementById("checkoutMessage"),
  accountPanel: document.getElementById("accountPanel"),
  accountPanelBackdrop: document.getElementById("accountPanelBackdrop"),
  accountPanelClose: document.getElementById("accountPanelClose"),
  accountPanelSummary: document.getElementById("accountPanelSummary"),
  accountSubscriptionCard: document.getElementById("accountSubscriptionCard"),
  accountAiMemory: document.getElementById("accountAiMemory"),
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
  adminUserDetailModal: document.getElementById("adminUserDetailModal"),
  adminUserDetailBackdrop: document.getElementById("adminUserDetailBackdrop"),
  adminUserDetailClose: document.getElementById("adminUserDetailClose"),
  adminStats: document.getElementById("adminStats"),
  adminSearchInput: document.getElementById("adminSearchInput"),
  adminMembershipFilter: document.getElementById("adminMembershipFilter"),
  adminExportBtn: document.getElementById("adminExportBtn"),
  adminUsersTable: document.getElementById("adminUsersTable"),
  adminUserDetail: document.getElementById("adminUserDetail"),
  adminActivityList: document.getElementById("adminActivityList"),
  adminRemovedList: document.getElementById("adminRemovedList"),
  sidebar: document.getElementById("sidebar"),
  sidebarToggle: document.getElementById("sidebarToggle"),
  sidebarRailToggle: document.getElementById("sidebarRailToggle"),
  sidebarBackdrop: document.getElementById("sidebarBackdrop"),
  sidebarLinks: document.querySelectorAll(".sidebar__link"),
  sidebarGroupToggles: document.querySelectorAll(".sidebar-group__toggle"),
  compressFileInput: document.getElementById("compressFileInput"),
  compressUploadBox: document.getElementById("compressUploadBox"),
  compressStateBadge: document.getElementById("compressStateBadge"),
  compressStateText: document.getElementById("compressStateText"),
  compressProgress: document.getElementById("compressProgress"),
  compressProgressBar: document.getElementById("compressProgressBar"),
  compressTimingRow: document.getElementById("compressTimingRow"),
  compressElapsedInfo: document.getElementById("compressElapsedInfo"),
  compressEstimateInfo: document.getElementById("compressEstimateInfo"),
  compressEtaInfo: document.getElementById("compressEtaInfo"),
  compressSelectBtn: document.getElementById("compressSelectBtn"),
  compressForm: document.getElementById("compressForm"),
  compressTargetInput: document.getElementById("compressTargetInput"),
  compressRunBtn: document.getElementById("compressRunBtn"),
  compressResetBtn: document.getElementById("compressResetBtn"),
  compressOriginal: document.getElementById("compressOriginal"),
  compressFinal: document.getElementById("compressFinal"),
  compressStatus: document.getElementById("compressStatus"),
  compressTime: document.getElementById("compressTime"),
  compressResultMessage: document.getElementById("compressResultMessage"),
  compressDownloadBtn: document.getElementById("compressDownloadBtn"),
  stickyDealBar: document.getElementById("stickyDealBar"),
  stickyDealClose: document.getElementById("stickyDealClose"),
  chooserDealMini: document.getElementById("chooserDealMini"),
  chooserDealMiniClose: document.getElementById("chooserDealMiniClose"),
  chooserDealMiniAction: document.getElementById("chooserDealMiniAction"),
};

const SIDEBAR_COLLAPSED_KEY = "unifyo_sidebar_collapsed";
const STICKY_DEAL_DISMISSED_KEY = "unifyo_sticky_deal_dismissed";
const CHOOSER_DEAL_DISMISSED_KEY = "unifyo_chooser_deal_dismissed";
const COMPRESS_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);
const ONLINE_COMPRESS_UI_LIMIT_BYTES = 100 * 1024 * 1024;

function getCurrentLang() {
  return window.localStorage.getItem("unifyo_lang") === "en" ? "en" : "sk";
}

function tr(sk, en) {
  return getCurrentLang() === "en" ? en : sk;
}

function getCurrentSearchParams() {
  try {
    return new URLSearchParams(window.location.search || "");
  } catch (_error) {
    return new URLSearchParams("");
  }
}

function buildRelativeLocationFromParams(params) {
  const search = params.toString();
  const pathname = window.location.pathname || "/";
  const hash = window.location.hash || "";
  return `${pathname}${search ? `?${search}` : ""}${hash}`;
}

function replaceCurrentSearchParams(params) {
  const next = buildRelativeLocationFromParams(params);
  try {
    window.history.replaceState({}, "", next);
  } catch (_error) {
    window.location.hash = window.location.hash || "";
  }
}

function normalizeUiErrorMessage(message, fallbackSk = "Nastala technická chyba. Skús to prosím znova.") {
  const raw = String(message || "").trim();
  if (!raw) {
    return fallbackSk;
  }
  const normalized = raw.toLowerCase();
  if (normalized.includes("expected pattern") || normalized.includes("did not match")) {
    return tr(
      "Nastala technická chyba v konfigurácii platby. Skús to znovu o chvíľu alebo kontaktuj podporu na info@unifyo.online.",
      "There is a technical issue in payment configuration. Please try again shortly or contact support at info@unifyo.online."
    );
  }
  if (normalized.includes("failed to fetch") || normalized.includes("networkerror")) {
    return tr(
      "Nepodarilo sa spojiť so serverom. Skontroluj pripojenie a skús to znova.",
      "Could not connect to the server. Check your connection and try again."
    );
  }
  return raw;
}

function getApiFallbackBases() {
  const candidates = [];
  if (window.location?.protocol?.startsWith("http")) {
    candidates.push(window.location.origin.replace(/\/+$/, ""));
  }
  candidates.push("https://unifyo.online", "https://www.unifyo.online");
  const dedupe = new Set();
  return candidates.filter((item) => {
    const normalized = String(item || "").trim();
    if (!normalized || dedupe.has(normalized)) {
      return false;
    }
    dedupe.add(normalized);
    return true;
  });
}

async function appFetch(input, init) {
  try {
    return await window.fetch(input, init);
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    const isPatternError = message.includes("expected pattern") || message.includes("did not match");
    const isRelativePath = typeof input === "string" && input.startsWith("/");
    if ((isPatternError || message.includes("failed to fetch") || message.includes("networkerror")) && isRelativePath) {
      const bases = getApiFallbackBases();
      let lastError = error;
      for (const base of bases) {
        const fallbackUrl = `${base}${input}`;
        try {
          return await window.fetch(fallbackUrl, init);
        } catch (fallbackError) {
          lastError = fallbackError;
        }
      }
      throw lastError;
    }
    throw error;
  }
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch (_error) {
    return {};
  }
}

function hasUnlockedAccess(user = state.user) {
  if (!user) {
    return false;
  }
  if (user.is_admin) {
    return true;
  }
  if (user.membership_active) {
    return true;
  }
  if (user.membership_status === "active") {
    return true;
  }
  if (user.membership_valid_until) {
    const until = new Date(user.membership_valid_until).getTime();
    if (!Number.isNaN(until) && until > Date.now()) {
      return true;
    }
  }
  return false;
}

bootstrap();

async function bootstrap() {
  disableServiceWorkers();
  state.mode = getModeFromUrl();
  renderMode();
  await refreshCurrentUser();
  if (window.location.pathname.endsWith("/admin.html")) {
    openAdminPanel();
  }
  elements.fileInput?.addEventListener("change", handleFileSelection);
  elements.uploadBox?.addEventListener("click", handleUploadBoxClick);
  elements.uploadBox?.addEventListener("dragover", handleUploadDragOver);
  elements.uploadBox?.addEventListener("dragleave", handleUploadDragLeave);
  elements.uploadBox?.addEventListener("drop", handleUploadDrop);
  elements.buyHeroBtn?.addEventListener("click", startCheckoutFlow);
  elements.accountBtn?.addEventListener("click", () => {
    if (state.user) {
      openAccountPanel();
      return;
    }
    openAuthModal("login");
  });
  elements.accountMenuBtn?.addEventListener("click", () => {
    closeSidebar();
    if (state.user) {
      openAccountPanel();
      return;
    }
    openAuthModal("login");
  });
  elements.adminMenuBtn?.addEventListener("click", () => {
    closeSidebar();
    if (window.location.pathname.endsWith("/admin.html")) {
      openAdminPanel();
      return;
    }
    window.location.href = "/admin.html";
  });
  elements.logoutBtn?.addEventListener("click", logout);
  elements.unlockUploadBtn?.addEventListener("click", handleUnlockUploadAction);
  elements.appMembershipPromoBtn?.addEventListener("click", startCheckoutFlow);
  elements.workspaceMembershipPromoBtn?.addEventListener("click", startCheckoutFlow);
  elements.buyToolbarBtn?.addEventListener("click", startCheckoutFlow);
  elements.buyProBtn?.addEventListener("click", startCheckoutFlow);
  elements.pricingCtaBtn?.addEventListener("click", startCheckoutFlow);
  elements.openContactsBtn?.addEventListener("click", () => navigateToMode("contacts"));
  elements.openCompressorBtn?.addEventListener("click", handleOpenCompressorAction);
  elements.openAssistantBtn?.addEventListener("click", handleOpenAssistantAction);
  elements.modeContactsBtn?.addEventListener("click", () => navigateToMode("contacts"));
  elements.modeCompressBtn?.addEventListener("click", () => navigateToMode("compress"));
  elements.modeAssistantBtn?.addEventListener("click", handleOpenAssistantAction);
  elements.heroModeContactsBtn?.addEventListener("click", () => navigateToMode("contacts"));
  elements.heroModeCompressBtn?.addEventListener("click", () => navigateToMode("compress"));
  elements.assistantRefreshBtn?.addEventListener("click", fetchAssistantDashboard);
  elements.assistantChatForm?.addEventListener("submit", handleAssistantChatSubmit);
  elements.assistantPromptChips?.querySelectorAll(".assistant-chip").forEach((button) => {
    button.addEventListener("click", handleAssistantPromptClick);
  });
  elements.mergeBtn?.addEventListener("click", processFiles);
  elements.resetBtn?.addEventListener("click", resetApp);
  elements.compressUploadBox?.addEventListener("click", handleCompressionUploadClick);
  elements.compressUploadBox?.addEventListener("keydown", handleCompressionUploadKeydown);
  elements.compressUploadBox?.addEventListener("dragover", handleCompressionDragOver);
  elements.compressUploadBox?.addEventListener("dragleave", handleCompressionDragLeave);
  elements.compressUploadBox?.addEventListener("drop", handleCompressionDrop);
  elements.compressFileInput?.addEventListener("change", handleCompressionFileSelection);
  elements.compressSelectBtn?.addEventListener("click", handleCompressionUploadClick);
  elements.compressForm?.addEventListener("submit", handleCompressionSubmit);
  elements.compressResetBtn?.addEventListener("click", resetCompressionState);
  elements.compressDownloadBtn?.addEventListener("click", handleCompressionDownload);
  elements.compressTargetInput?.addEventListener("input", renderCompressionResult);
  elements.stickyDealClose?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    dismissStickyDealBar();
  });
  elements.chooserDealMiniClose?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    dismissChooserDealMini();
  });
  elements.chooserDealMiniAction?.addEventListener("click", async () => {
    if (!state.user) {
      openAuthModal("login");
      return;
    }
    openCheckoutModal();
  });
  elements.promoModalBackdrop?.addEventListener("click", closePromoModal);
  elements.promoModalClose?.addEventListener("click", closePromoModal);
  elements.promoModalAuth?.addEventListener("click", () => {
    closePromoModal();
    openAuthModal("login");
  });
  elements.promoModalStart?.addEventListener("click", async () => {
    closePromoModal();
    await startCheckoutFlow();
  });
  elements.authModalBackdrop?.addEventListener("click", closeAuthModal);
  elements.authModalClose?.addEventListener("click", closeAuthModal);
  elements.authRegisterTab?.addEventListener("click", () => setAuthMode("register"));
  elements.authLoginTab?.addEventListener("click", () => setAuthMode("login"));
  elements.authForm?.addEventListener("submit", handleAuthSubmit);
  elements.forgotPasswordBtn?.addEventListener("click", openResetRequestModal);
  elements.resetRequestBackdrop?.addEventListener("click", closeResetRequestModal);
  elements.resetRequestClose?.addEventListener("click", closeResetRequestModal);
  elements.resetRequestForm?.addEventListener("submit", handleResetRequestSubmit);
  elements.checkoutSuccessBackdrop?.addEventListener("click", closeCheckoutSuccessModal);
  elements.checkoutSuccessClose?.addEventListener("click", closeCheckoutSuccessModal);
  elements.resetPasswordBackdrop?.addEventListener("click", closeResetPasswordModal);
  elements.resetPasswordClose?.addEventListener("click", closeResetPasswordModal);
  elements.resetPasswordForm?.addEventListener("submit", handleResetPasswordSubmit);
  elements.checkoutModalBackdrop?.addEventListener("click", closeCheckoutModal);
  elements.checkoutModalClose?.addEventListener("click", closeCheckoutModal);
  elements.checkoutCancelBtn?.addEventListener("click", closeCheckoutModal);
  elements.checkoutProceedBtn?.addEventListener("click", confirmCheckoutFlow);
  elements.accountPanelBackdrop?.addEventListener("click", closeAccountPanel);
  elements.accountPanelClose?.addEventListener("click", closeAccountPanel);
  elements.accountUpdateForm?.addEventListener("submit", handleAccountUpdateSubmit);
  elements.accountPasswordForm?.addEventListener("submit", handleAccountPasswordSubmit);
  elements.adminPanelBackdrop?.addEventListener("click", closeAdminPanel);
  elements.adminPanelClose?.addEventListener("click", closeAdminPanel);
  elements.adminUserDetailBackdrop?.addEventListener("click", closeAdminUserDetailModal);
  elements.adminUserDetailClose?.addEventListener("click", closeAdminUserDetailModal);
  elements.adminSearchInput?.addEventListener("input", renderAdminUsers);
  elements.adminMembershipFilter?.addEventListener("change", renderAdminUsers);
  elements.adminExportBtn?.addEventListener("click", exportAdminUsers);
  elements.sidebarToggle?.addEventListener("click", toggleSidebar);
  elements.sidebarRailToggle?.addEventListener("click", toggleSidebarRail);
  elements.sidebarBackdrop?.addEventListener("click", closeSidebar);
  elements.sidebarLinks.forEach((link) => link.addEventListener("click", closeSidebar));
  elements.sidebarGroupToggles.forEach((toggle) => toggle.addEventListener("click", handleSidebarGroupToggle));
  window.addEventListener("scroll", handleWindowScroll, { passive: true });
  document.addEventListener("keydown", handleModalEscape);
  window.addEventListener("unifyo-language-change", handleLanguageChange);
  elements.downloadCsvBtn?.addEventListener("click", () => {
    if (state.mergedContacts.length) {
      downloadCsv("kontakty_final.csv", state.mergedContacts);
    }
  });
  elements.downloadXlsxBtn?.addEventListener("click", async () => {
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
  renderCompressionAccessState();
  renderCompressionResult();
  renderStickyDealBar();
  renderChooserDealMini();
  if (shouldAutoOpenAdminPanel()) {
    openAdminPanel();
    clearPanelQueryParams();
  } else if (shouldAutoOpenAccountPanel()) {
    openAccountPanel();
    clearPanelQueryParams();
  } else if (shouldAutoStartCheckout()) {
    if (!state.user) {
      openAuthModal("login");
    } else if (!hasUnlockedAccess()) {
      openCheckoutModal();
    }
    clearPanelQueryParams();
  }
}

function renderAccessState() {
  const hasMembership = hasUnlockedAccess();
  const isLoggedIn = Boolean(state.user);
  const isAdmin = Boolean(state.user?.is_admin);
  const canManageAdminTools = Boolean(state.user?.can_manage_admin_tools);
  const accountLabel = state.user?.name?.trim() || state.user?.email || tr("Prihlásiť sa", "Sign in");
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
    elements.buyHeroBtn.textContent = hasMembership ? tr("Nahrať súbory", "Upload files") : isLoggedIn ? tr("Odomknúť import", "Unlock import") : tr("Začať čistenie", "Start cleanup");
    elements.buyHeroBtn.disabled = false;
    elements.buyHeroBtn.classList.toggle("is-hidden", hasMembership);
  }
  if (elements.unlockUploadBtn) {
    elements.unlockUploadBtn.textContent = hasMembership ? tr("Nahrať súbory", "Upload files") : isLoggedIn ? tr("Odomknúť import", "Unlock import") : tr("Nahrať a vyčistiť", "Upload and clean");
    elements.unlockUploadBtn.disabled = false;
  }
  if (elements.buyProBtn) {
    elements.buyProBtn.textContent = hasMembership ? tr("Členstvo je aktívne", "Membership is active") : tr("Aktivovať za 1,99 € / mesiac", "Activate for €1.99 / month");
    elements.buyProBtn.disabled = false;
    elements.buyProBtn.classList.toggle("is-hidden", hasMembership);
  }
  if (elements.pricingCtaBtn) {
    elements.pricingCtaBtn.textContent = hasMembership ? tr("Nahrať a vyčistiť", "Upload and clean") : tr("Vyčistiť moje kontakty", "Clean my contacts");
    elements.pricingCtaBtn.disabled = false;
    elements.pricingCtaBtn.classList.toggle("is-hidden", hasMembership);
  }
  if (elements.pricingCard) {
    elements.pricingCard.classList.toggle("is-hidden", hasMembership);
  }
  if (elements.appMembershipPromo) {
    elements.appMembershipPromo.hidden = hasMembership || !isLoggedIn;
  }
  if (elements.workspaceMembershipPromo) {
    elements.workspaceMembershipPromo.hidden = hasMembership || !isLoggedIn;
  }
  if (elements.memberThankYouPanel) {
    elements.memberThankYouPanel.hidden = !hasMembership;
    if (hasMembership) {
      const greetingName = state.user?.name?.trim() || state.user?.email || tr("ďakujeme", "thank you");
      elements.memberThankYouPanel.querySelector(".member-thankyou__title").textContent = getCurrentLang() === "en"
        ? `Thanks, ${greetingName}!`
        : `Ďakujeme, ${greetingName}!`;
      elements.memberThankYouPanel.querySelector(".member-thankyou__note").textContent = getCurrentLang() === "en"
        ? "We appreciate your membership. We are a Slovak company and keep improving Unifyo — we will notify you about new features."
        : "Vážime si tvoje členstvo. Sme slovenská firma a Unifyo neustále vylepšujeme — o novinkách ťa budeme informovať.";
    }
  }
  if (elements.openCompressorBtn) {
    elements.openCompressorBtn.textContent = hasMembership
      ? tr("Prepnúť na kompresiu", "Switch to compression")
      : isLoggedIn
        ? tr("Aktivovať členstvo pre kompresiu", "Activate membership for compression")
        : tr("Prihlásiť sa a odomknúť kompresiu", "Sign in to unlock compression");
  }
  if (elements.openAssistantBtn) {
    elements.openAssistantBtn.textContent = hasMembership
      ? tr("Otvoriť AI chat", "Open AI chat")
      : isLoggedIn
        ? tr("Aktivovať členstvo pre AI asistenta", "Activate membership for AI assistant")
        : tr("Prihlásiť sa a odomknúť AI asistenta", "Sign in to unlock AI assistant");
  }
  if (elements.compressFeatureStatus) {
    elements.compressFeatureStatus.textContent = hasMembership
      ? tr("Všetky pracovné moduly sú odomknuté. Môžeš prepínať medzi kontaktmi, kompresiou aj AI asistentom.", "All work modules are unlocked. You can switch between contacts, compression and the AI assistant.")
      : isLoggedIn
        ? tr("Kompresia sa odomkne hneď po aktivácii členstva.", "Compression unlocks immediately after membership activation.")
        : tr("Dostupné po prihlásení a aktivácii členstva.", "Available after sign-in and membership activation.");
  }
  if (elements.fileInput) {
    elements.fileInput.disabled = !hasMembership;
  }
  if (elements.accountBtn) {
    elements.accountBtn.textContent = isLoggedIn ? accountLabel : tr("Prihlásiť sa", "Sign in");
  }
  if (elements.accountMenuBtn) {
    elements.accountMenuBtn.textContent = isLoggedIn ? tr("Účet a nastavenia", "Account and settings") : tr("Prihlásiť sa / Registrovať", "Sign in / Register");
  }
  if (elements.adminMenuBtn) {
    elements.adminMenuBtn.classList.toggle("is-hidden", !isAdmin);
  }
  if (elements.logoutBtn) {
    elements.logoutBtn.classList.toggle("is-hidden", !isLoggedIn);
  }
  if (elements.accountStatus) {
    if (isAdmin && !state.user?.membership_active) {
      elements.accountStatus.textContent = getCurrentLang() === "en"
        ? `Signed-in account ${accountLabel} has full admin access. Membership activation is not required for administrator tools.`
        : `Prihlásený účet ${accountLabel} má plný administrátorský prístup. Aktivácia členstva nie je pre správcu potrebná.`;
    } else if (hasMembership) {
      elements.accountStatus.textContent = getCurrentLang() === "en"
        ? `Signed-in account ${accountLabel} has active membership${membershipUntil !== "—" ? ` until ${membershipUntil}` : ""}${canManageAdminTools ? " and full admin access." : isAdmin ? " and admin access." : "."}`
        : `Prihlásený účet ${accountLabel} má aktívne členstvo${membershipUntil !== "—" ? ` do ${membershipUntil}` : ""}${canManageAdminTools ? " a plný správca prístup." : isAdmin ? " a zároveň administrátorský prístup." : "."}`;
    } else if (isLoggedIn) {
      elements.accountStatus.textContent = getCurrentLang() === "en"
        ? `Signed-in account ${accountLabel} does not have active membership yet. Activation is available from €1.99 / month${canManageAdminTools ? ", but the account still has full admin access." : isAdmin ? ", but the account still has admin access." : "."}`
        : `Prihlásený účet ${accountLabel} ešte nemá aktívne členstvo. Aktivácia je dostupná od 1,99 € / mesiac${canManageAdminTools ? ", ale účet má plný správca prístup." : isAdmin ? ", ale účet má administrátorský prístup." : "."}`;
    } else {
      elements.accountStatus.textContent = tr("Vytvor si účet, aktivuj členstvo od 1,99 € / mesiac a vyčisti svoje kontakty, súbory aj AI workflow na jednom mieste.", "Create an account, activate membership from €1.99 / month and unlock contacts, file compression and AI workflows in one place.");
    }
  }
  if (elements.authOfferNote) {
    elements.authOfferNote.hidden = hasMembership;
  }
  if (elements.premiumHeroCard) {
    elements.premiumHeroCard.classList.toggle("is-active", hasMembership);
  }
  if (elements.premiumHeroLabel) {
    elements.premiumHeroLabel.textContent = hasMembership ? tr("Členstvo aktívne", "Membership active") : tr("Limitovaná akcia", "Limited offer");
  }
  if (elements.premiumHeroNote) {
    elements.premiumHeroNote.textContent = hasMembership
      ? (getCurrentLang() === "en"
          ? `Premium access is active${membershipUntil !== "—" ? ` until ${membershipUntil}` : ""}`
          : `Premium prístup je aktívny${membershipUntil !== "—" ? ` do ${membershipUntil}` : ""}`)
      : tr("Premium prístup • cena platí iba teraz", "Premium access • price valid for now only");
  }
  const accountGroupToggle = document.querySelector('[data-sidebar-group="account"]');
  const accountGroupContent = document.querySelector('[data-sidebar-group-content="account"]');
  if (accountGroupToggle && accountGroupContent && isAdmin) {
    accountGroupContent.classList.remove("is-collapsed");
    accountGroupToggle.setAttribute("aria-expanded", "true");
  }
  if (elements.uploadTitle) {
    elements.uploadTitle.textContent = hasMembership
      ? tr("Import je odomknutý a pripravený", "Import is unlocked and ready")
      : tr("Plný import je súčasťou členského prístupu", "Full import is part of membership");
  }
  if (elements.uploadSubtitle) {
    elements.uploadSubtitle.textContent = hasMembership
      ? tr("Nahraj vlastné CSV, XLSX alebo XLS súbory a systém ich automaticky vyčistí.", "Upload your own CSV, XLSX or XLS files and the system will clean them automatically.")
      : isLoggedIn
        ? tr("Účet je pripravený. Aktivuj členstvo cez Stripe a odomkni plný import a export.", "Your account is ready. Activate membership via Stripe to unlock full import and export.")
        : tr("Najprv sa zaregistruj, prihlás sa a aktivuj členstvo na 1 mesiac.", "Register, sign in and activate membership for 1 month first.");
  }
  renderAccountSummary();
  renderUploadState();
  renderCompressionAccessState();
  renderAssistantAccessState();
  renderMode();
  renderStickyDealBar();
  renderChooserDealMini();
}

function getModeFromUrl() {
  const view = getCurrentSearchParams().get("view");
  if (view === "contacts" || view === "compress" || view === "assistant") {
    return view;
  }
  return "chooser";
}

function setMode(mode) {
  if (!["chooser", "contacts", "compress", "assistant"].includes(mode)) {
    return;
  }
  state.mode = mode;
  renderMode();
}

function navigateToMode(mode) {
  const nextMode = mode === "contacts" || mode === "compress" || mode === "assistant" ? mode : "chooser";
  const params = getCurrentSearchParams();
  if (nextMode === "chooser") {
    params.delete("view");
  } else {
    params.set("view", nextMode);
  }
  window.location.href = buildRelativeLocationFromParams(params);
}

function renderMode() {
  const isChooser = state.mode === "chooser";
  const isContacts = state.mode === "contacts";
  const isCompress = state.mode === "compress";
  const isAssistant = state.mode === "assistant";

  if (isAssistant) {
    window.location.replace("/ai.html");
    return;
  }

  document.body.classList.toggle("mode-chooser", isChooser);
  document.body.classList.toggle("mode-contacts", isContacts);
  document.body.classList.toggle("mode-compress", isCompress);
  document.body.classList.toggle("mode-assistant", isAssistant);

  elements.appModesSection?.classList.toggle("is-hidden", !isChooser);
  elements.workspaceGrid?.classList.toggle("is-hidden", isChooser);
  elements.contactsWorkspace?.classList.toggle("is-hidden", !isContacts);
  elements.compressWorkspace?.classList.toggle("is-hidden", !isCompress);
  elements.assistantWorkspace?.classList.toggle("is-hidden", !isAssistant);
  elements.modeContactsBtn?.classList.toggle("is-active", isContacts);
  elements.modeCompressBtn?.classList.toggle("is-active", isCompress);
  elements.modeAssistantBtn?.classList.toggle("is-active", isAssistant);
  elements.heroModeContactsBtn?.classList.toggle("is-active", isContacts);
  elements.heroModeCompressBtn?.classList.toggle("is-active", isCompress);
  elements.contactsNavLinks.forEach((link) => link.classList.toggle("is-hidden", !isContacts));
  elements.assistantNavLinks.forEach((link) => link.classList.toggle("is-hidden", !isAssistant));

  if (elements.modeContactsBtn) {
    elements.modeContactsBtn.setAttribute("aria-pressed", String(isContacts));
  }
  if (elements.modeCompressBtn) {
    elements.modeCompressBtn.setAttribute("aria-pressed", String(isCompress));
  }
  if (elements.modeAssistantBtn) {
    elements.modeAssistantBtn.setAttribute("aria-pressed", String(isAssistant));
  }
  if (elements.heroModeContactsBtn) {
    elements.heroModeContactsBtn.setAttribute("aria-pressed", String(isContacts));
  }
  if (elements.heroModeCompressBtn) {
    elements.heroModeCompressBtn.setAttribute("aria-pressed", String(isCompress));
  }
  if (isAssistant && hasUnlockedAccess()) {
    fetchAssistantDashboard();
  }
  renderChooserDealMini();
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

  const membershipActive = hasUnlockedAccess();
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
  if (!elements.checkoutModal.hidden) {
    closeCheckoutModal();
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
  if (hasUnlockedAccess()) {
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
    !elements.checkoutModal.hidden ||
    !elements.accountPanel.hidden ||
    !elements.adminPanel.hidden;
  document.body.classList.toggle("modal-open", hasOpenModal);
}

function openAuthModal(mode = "register") {
  setAuthMode(mode);
  clearAuthMessage();
  if (mode === "register") {
    elements.authPassword.value = "";
    if (elements.authAcceptTerms) elements.authAcceptTerms.checked = false;
    if (elements.authAcceptPrivacy) elements.authAcceptPrivacy.checked = false;
    if (elements.authMarketingConsent) elements.authMarketingConsent.checked = false;
  }
  elements.authModal.hidden = false;
  syncModalState();
}

function closeAuthModal() {
  elements.authModal.hidden = true;
  syncModalState();
}

function openCheckoutModal() {
  if (!state.user) {
    openAuthModal("login");
    return;
  }
  elements.checkoutConsentCheckbox.checked = false;
  elements.checkoutMessage.hidden = true;
  elements.checkoutMessage.textContent = "";
  elements.checkoutMessage.classList.remove("auth-message--error");
  elements.checkoutModal.hidden = false;
  syncModalState();
}

function closeCheckoutModal() {
  elements.checkoutModal.hidden = true;
  syncModalState();
}

async function openAccountPanel() {
  if (!state.user) {
    openAuthModal("login");
    return;
  }
  elements.accountPanel.hidden = false;
  syncModalState();
  await fetchAccountPanel();
}

function closeAccountPanel() {
  elements.accountPanel.hidden = true;
  syncModalState();
}

function startCheckoutFromAccountPanel() {
  closeAccountPanel();
  closeAuthModal();
  closePromoModal();
  closeCheckoutModal();
  // Ensure panel/backdrop is fully removed before showing checkout.
  window.setTimeout(() => {
    startCheckoutFlow();
  }, 260);
}

async function openAdminPanel() {
  if (!elements.adminPanel) {
    await fetchAdminPanel();
    return;
  }
  if (!state.user) {
    openAuthModal("login");
    return;
  }
  if (!state.user?.is_admin) {
    window.alert("Administrácia je dostupná len pre správcu.");
    return;
  }
  elements.adminPanel.hidden = false;
  syncModalState();
  await fetchAdminPanel();
}

function closeAdminPanel() {
  if (elements.adminPanel) {
    elements.adminPanel.hidden = true;
  }
  syncModalState();
}

function openCheckoutSuccessModal(message) {
  if (!elements.checkoutSuccessModal || !elements.checkoutSuccessMessage) {
    return;
  }
  elements.checkoutSuccessMessage.textContent = message;
  elements.checkoutSuccessModal.hidden = false;
  syncModalState();
}

function closeCheckoutSuccessModal() {
  if (!elements.checkoutSuccessModal) {
    return;
  }
  elements.checkoutSuccessModal.hidden = true;
  syncModalState();
}

function openAdminUserDetailModal() {
  if (!elements.adminUserDetailModal) {
    return;
  }
  elements.adminUserDetailModal.hidden = false;
  syncModalState();
}

function closeAdminUserDetailModal() {
  if (!elements.adminUserDetailModal) {
    return;
  }
  elements.adminUserDetailModal.hidden = true;
  syncModalState();
}

function shouldAutoOpenAdminPanel() {
  const params = getCurrentSearchParams();
  return params.get("openAdmin") === "1";
}

function shouldAutoOpenAccountPanel() {
  const params = getCurrentSearchParams();
  return params.get("openAccount") === "1";
}

function shouldAutoStartCheckout() {
  const params = getCurrentSearchParams();
  return params.get("startCheckout") === "1";
}

function clearPanelQueryParams() {
  const params = getCurrentSearchParams();
  const hasAccount = params.get("openAccount") === "1";
  const hasAdmin = params.get("openAdmin") === "1";
  const hasCheckout = params.get("startCheckout") === "1";
  if (!hasAccount && !hasAdmin && !hasCheckout) {
    return;
  }
  params.delete("openAccount");
  params.delete("openAdmin");
  params.delete("startCheckout");
  replaceCurrentSearchParams(params);
}

function handleLanguageChange() {
  renderAccessState();
  renderCompressionAccessState();
  renderCompressionResult();
  renderAssistantAccessState();
  renderAccountSummary();
  renderAccountPanel();
  setAuthMode(state.authMode);
}

function setAuthMode(mode) {
  state.authMode = mode;
  if (!elements.authRegisterTab || !elements.authLoginTab || !elements.authSubmitBtn || !elements.authPassword) {
    return;
  }
  const isRegister = mode === "register";
  elements.authRegisterTab.classList.toggle("auth-switch__button--active", isRegister);
  elements.authLoginTab.classList.toggle("auth-switch__button--active", !isRegister);
  elements.authSubmitBtn.textContent = isRegister ? tr("Vytvoriť účet", "Create account") : tr("Prihlásiť sa", "Sign in");
  elements.authPassword.autocomplete = isRegister ? "new-password" : "current-password";
  elements.authNameField.classList.toggle("is-hidden", !isRegister);
  elements.authConsentFields?.classList.toggle("is-hidden", !isRegister);
  elements.forgotPasswordBtn?.classList.toggle("is-hidden", isRegister);
}

function setAuthMessage(message, isError = false) {
  if (!elements.authMessage) {
    return;
  }
  elements.authMessage.hidden = false;
  elements.authMessage.textContent = message;
  elements.authMessage.classList.toggle("auth-message--error", isError);
}

function clearAuthMessage() {
  if (!elements.authMessage) {
    return;
  }
  elements.authMessage.hidden = true;
  elements.authMessage.textContent = "";
  elements.authMessage.classList.remove("auth-message--error");
}

async function refreshCurrentUser() {
  let response;
  let payload;
  try {
    response = await appFetch("/api/me");
    payload = await response.json();
    state.user = payload.user;
  } catch (_error) {
    state.user = null;
  }
  scheduleSessionAutoLogout();
  startHeartbeat();

  const params = getCurrentSearchParams();
  const checkoutState = params.get("checkout");
  const resetToken = params.get("reset_token");
  if (checkoutState === "success") {
    try {
      const refreshResponse = await appFetch("/api/refresh-membership");
      const refreshPayload = await refreshResponse.json();
      if (refreshResponse.ok) {
        state.user = refreshPayload.user;
      }
    } catch (_error) {
      // ignore sync issue here; current state stays visible
    }

    if (hasUnlockedAccess()) {
      openCheckoutSuccessModal(
        tr(
          "Ďakujeme za nákup! Členstvo je aktívne a môžeš naplno využívať Unifyo.",
          "Thanks for your purchase! Your membership is active and Unifyo is unlocked."
        )
      );
    } else if (!state.user) {
      openCheckoutSuccessModal(
        tr(
          "Platba prebehla. Prihlás sa znova a členstvo sa následne zosynchronizuje.",
          "Your payment went through. Please sign in again and the membership will sync."
        )
      );
    } else {
      openCheckoutSuccessModal(
        tr(
          "Platba prebehla. Členstvo sa ešte synchronizuje, skús stránku obnoviť o pár sekúnd.",
          "Payment completed. Membership is syncing, please refresh in a few seconds."
        )
      );
    }
  }
  if (checkoutState === "cancel") {
    window.alert("Platba bola zrušená.");
  }
  if (checkoutState) {
    params.delete("checkout");
    replaceCurrentSearchParams(params);
  }
  if (resetToken) {
    openResetPasswordModal(resetToken);
    params.delete("reset_token");
    replaceCurrentSearchParams(params);
  }
}

function scheduleSessionAutoLogout() {
  if (state.sessionTimer) {
    window.clearTimeout(state.sessionTimer);
    state.sessionTimer = null;
  }
  const expiry = state.user?.session_expires_at ? new Date(state.user.session_expires_at).getTime() : 0;
  if (!expiry || Number.isNaN(expiry)) {
    return;
  }
  const waitMs = Math.max(0, expiry - Date.now());
  if (!waitMs) {
    logout();
    return;
  }
  state.sessionTimer = window.setTimeout(() => {
    logout();
  }, waitMs);
}

function startHeartbeat() {
  if (state.heartbeatTimer) {
    window.clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = null;
  }
  if (!state.user) {
    return;
  }
  const pingOnce = async () => {
    try {
      const response = await appFetch("/api/ping", { method: "POST" });
      const payload = await response.json();
      if (response.ok && payload.user) {
        state.user = payload.user;
      }
    } catch (_error) {
      // ignore heartbeat failures
    }
  };
  pingOnce();
  state.heartbeatTimer = window.setInterval(pingOnce, 60000);
}

async function fetchAccountPanel() {
  if (!state.user) {
    return;
  }
  elements.accountPanelSummary.className = "account-summary empty-state";
  elements.accountPanelSummary.textContent = "Načítavam údaje o účte...";
  if (elements.accountAiMemory) {
    elements.accountAiMemory.className = "account-summary empty-state";
    elements.accountAiMemory.textContent = "Načítavam AI pamäť...";
  }
  if (elements.accountSubscriptionCard) {
    elements.accountSubscriptionCard.className = "account-summary empty-state";
    elements.accountSubscriptionCard.textContent = "Načítavam údaje o predplatnom...";
  }
  elements.accountActivityList.className = "empty-state";
  elements.accountActivityList.textContent = "Načítavam aktivitu...";
  try {
    const [accountResponse, profileResponse, assistantResponse] = await Promise.all([
      appFetch("/api/account"),
      hasUnlockedAccess() ? appFetch("/api/assistant/profile") : Promise.resolve(null),
      hasUnlockedAccess() ? appFetch("/api/assistant") : Promise.resolve(null),
    ]);
    const payload = await accountResponse.json();
    if (!accountResponse.ok) {
      throw new Error(payload.error || "Údaje o účte sa nepodarilo načítať.");
    }
    state.account = payload;
    if (profileResponse) {
      const profilePayload = await profileResponse.json();
      state.accountAssistantProfile = profileResponse.ok ? profilePayload.profile || null : null;
    } else {
      state.accountAssistantProfile = null;
    }
    if (assistantResponse) {
      const assistantPayload = await assistantResponse.json();
      state.accountAssistantOverview = assistantResponse.ok
        ? {
            threads: assistantPayload.threads || [],
            messages: assistantPayload.messages || [],
          }
        : null;
    } else {
      state.accountAssistantOverview = null;
    }
    renderAccountPanel();
  } catch (error) {
    state.account = { user: state.user, activity: [] };
    state.accountAssistantProfile = null;
    state.accountAssistantOverview = null;
    renderAccountPanel();
    elements.accountActivityList.className = "empty-state";
    elements.accountActivityList.textContent = `Aktivita sa nepodarila načítať: ${error.message}`;
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
  if (elements.adminRemovedList) {
    elements.adminRemovedList.className = "empty-state";
    elements.adminRemovedList.textContent = "Načítavam odstránené a deaktivované účty...";
  }
  try {
    const response = await appFetch("/api/admin/overview");
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(payload.error || "Admin dáta sa nepodarilo načítať.");
    }
    state.admin = payload;
    renderAdminPanel();
  } catch (error) {
    const message = normalizeUiErrorMessage(error.message, tr("Admin dáta sa nepodarilo načítať.", "Failed to load admin data."));
    if (elements.adminStats) {
      elements.adminStats.className = "summary-grid summary-grid--admin empty-state";
      elements.adminStats.textContent = message;
    }
    elements.adminUsersTable.className = "table-wrap empty-state";
    elements.adminUsersTable.textContent = message;
    elements.adminActivityList.className = "empty-state";
    elements.adminActivityList.textContent = message;
    if (elements.adminRemovedList) {
      elements.adminRemovedList.className = "empty-state";
      elements.adminRemovedList.textContent = message;
    }
  }
}

function formatDate(value) {
  if (!value) {
    return tr("—", "—");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return tr("—", "—");
  }
  return new Intl.DateTimeFormat(getCurrentLang() === "en" ? "en-GB" : "sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function formatReviewStatus(value) {
  if (value === "approved") {
    return tr("Schválené", "Approved");
  }
  if (value === "needs_review") {
    return tr("Na kontrolu", "Needs review");
  }
  return tr("AI návrh", "AI draft");
}

function truncateText(value, length = 60) {
  const text = String(value || "").trim();
  if (text.length <= length) {
    return text;
  }
  return `${text.slice(0, length - 1).trimEnd()}…`;
}

function renderAccountSubscriptionCard() {
  if (!elements.accountSubscriptionCard) {
    return;
  }
  const subscription = state.account?.subscription || {};
  const user = state.account?.user || state.user;
  if (!user) {
    elements.accountSubscriptionCard.className = "account-summary empty-state";
    elements.accountSubscriptionCard.textContent = tr("Prihlás sa a zobrazia sa údaje o predplatnom.", "Sign in to see subscription details.");
    return;
  }
  const isActive = hasUnlockedAccess(user);
  const isAdminOnlyAccess = Boolean(user?.is_admin && !user?.membership_active);
  const registration = user.registration_consent_at
    ? `${tr("GDPR a podmienky potvrdené", "Privacy and terms confirmed")} • ${formatDateTime(user.registration_consent_at)}`
    : tr("Registračné súhlasy zatiaľ neevidujeme.", "Registration consents are not recorded yet.");
  const checkout = user.checkout_consent_at
    ? `${tr("Predplatné potvrdené", "Checkout consent recorded")} • ${formatDateTime(user.checkout_consent_at)}`
    : tr("Súhlas pred platbou sa zobrazí pri pokračovaní na Stripe.", "The payment consent appears before continuing to Stripe.");
  elements.accountSubscriptionCard.className = "account-summary";
  elements.accountSubscriptionCard.innerHTML = `
    <article class="account-card">
      <div class="account-card__row"><strong>${escapeHtml(tr("Interné číslo objednávky", "Internal order number"))}</strong><span>${escapeHtml(subscription.last_order_number || user.membership_last_order_number || "—")}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Číslo predplatného", "Subscription number"))}</strong><span>${escapeHtml(subscription.internal_subscription_number || user.membership_internal_subscription_number || "—")}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Stripe subscription ID", "Stripe subscription ID"))}</strong><span class="mono">${escapeHtml(subscription.stripe_subscription_id || user.membership_stripe_subscription_id || "—")}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Ďalšie obnovenie", "Next renewal"))}</strong><span>${escapeHtml(formatDate(subscription.next_renewal_at || user.membership_next_renewal_at))}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Stav v Stripe", "Stripe status"))}</strong><span>${escapeHtml(isAdminOnlyAccess ? tr("Admin prístup", "Admin access") : subscription.stripe_status || user.membership_stripe_status || (isActive ? "active" : "inactive"))}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Stav ukončenia", "Cancellation status"))}</strong><span>${escapeHtml(subscription.cancel_at_period_end || user.membership_cancel_at_period_end ? tr("Ukončí sa ku koncu obdobia", "Ends at period end") : tr("Pokračuje", "Continuing"))}</span></div>
      <div class="account-card__note">${escapeHtml(registration)}</div>
      <div class="account-card__note">${escapeHtml(checkout)}</div>
      ${isAdminOnlyAccess ? `
        <div class="account-card__note">${escapeHtml(tr("Správca má trvalý prístup bez potreby plateného členstva.", "Administrator access stays unlocked without paid membership."))}</div>
      ` : isActive ? `
        <div class="account-card__cta">
          <button id="cancelSubscriptionBtn" class="button button--ghost" type="button">${escapeHtml(tr("Zrušiť predplatné", "Cancel subscription"))}</button>
        </div>
      ` : `
        <div class="account-card__cta">
          <button id="accountSubscriptionCheckoutBtn" class="button button--primary" type="button">${escapeHtml(tr("Aktivovať členstvo za 1,99 €", "Activate membership for €1.99"))}</button>
        </div>
      `}
    </article>
  `;
  document.getElementById("accountSubscriptionCheckoutBtn")?.addEventListener("click", startCheckoutFromAccountPanel);
  document.getElementById("cancelSubscriptionBtn")?.addEventListener("click", cancelSubscriptionFlow);
}

function renderAccountSummary() {
  if (!elements.accountSummary) {
    return;
  }
  if (!state.user) {
    elements.accountSummary.className = "account-summary empty-state";
    elements.accountSummary.textContent = tr("Zatiaľ nie si prihlásený.", "You are not signed in yet.");
    return;
  }

  const showMembershipDates = Boolean(state.user.membership_active);
  const hasAccess = hasUnlockedAccess(state.user);
  elements.accountSummary.className = "account-summary";
  elements.accountSummary.innerHTML = `
    <article class="account-card">
      <div class="account-card__row"><strong>${escapeHtml(tr("Meno", "Name"))}</strong><span>${escapeHtml(state.user.name || "—")}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("E-mail", "Email"))}</strong><span>${escapeHtml(state.user.email || "")}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Rola", "Role"))}</strong><span>${escapeHtml(state.user.is_admin ? "Admin" : tr("Používateľ", "User"))}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Registrovaný od", "Registered since"))}</strong><span>${escapeHtml(formatDate(state.user.created_at))}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Stav členstva", "Membership status"))}</strong><span>${escapeHtml(state.user.is_admin && !state.user.membership_active ? tr("Admin prístup", "Admin access") : hasAccess ? tr("Aktívne", "Active") : tr("Neaktívne", "Inactive"))}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Členstvo od", "Membership from"))}</strong><span>${escapeHtml(showMembershipDates ? formatDate(state.user.membership_started_at) : "—")}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Platné do", "Valid until"))}</strong><span>${escapeHtml(showMembershipDates ? formatDate(state.user.membership_valid_until) : "—")}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Naposledy prihlásený", "Last login"))}</strong><span>${escapeHtml(formatDateTime(state.user.last_login_at))}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Naposledy aktívny", "Last seen"))}</strong><span>${escapeHtml(formatDateTime(state.user.last_seen_at))}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Cena", "Price"))}</strong><span>${escapeHtml(tr("1,99 € / mesiac", "€1.99 / month"))}</span></div>
      ${hasAccess ? "" : `
        <div class="account-card__cta">
          <button id="accountSummaryCheckoutBtn" class="button button--primary" type="button">${escapeHtml(tr("Aktivovať členstvo za 1,99 €", "Activate membership for €1.99"))}</button>
        </div>
      `}
    </article>
  `;
  document.getElementById("accountSummaryCheckoutBtn")?.addEventListener("click", startCheckoutFromAccountPanel);
}

function renderAccountPanel() {
  const user = state.account?.user || state.user;
  if (!user) {
    elements.accountPanelSummary.className = "account-summary empty-state";
    elements.accountPanelSummary.textContent = tr("Zatiaľ nie si prihlásený.", "You are not signed in yet.");
    if (elements.accountAiMemory) {
      elements.accountAiMemory.className = "account-summary empty-state";
      elements.accountAiMemory.textContent = tr("AI pamäť sa zobrazí po prihlásení.", "AI memory will appear after signing in.");
    }
    renderAccountSubscriptionCard();
    return;
  }
  const showMembershipDates = Boolean(user.membership_active);
  const hasAccess = hasUnlockedAccess(user);
  elements.accountPanelSummary.className = "account-summary";
  elements.accountPanelSummary.innerHTML = `
    <article class="account-card">
      <div class="account-card__row"><strong>${escapeHtml(tr("Meno", "Name"))}</strong><span>${escapeHtml(user.name || "—")}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("E-mail", "Email"))}</strong><span>${escapeHtml(user.email || "")}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Registrovaný od", "Registered since"))}</strong><span>${escapeHtml(formatDate(user.created_at))}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Stav členstva", "Membership status"))}</strong><span>${escapeHtml(user.is_admin && !user.membership_active ? tr("Admin prístup", "Admin access") : hasAccess ? tr("Aktívne", "Active") : tr("Neaktívne", "Inactive"))}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Členstvo od", "Membership from"))}</strong><span>${escapeHtml(showMembershipDates ? formatDate(user.membership_started_at) : "—")}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Platné do", "Valid until"))}</strong><span>${escapeHtml(showMembershipDates ? formatDate(user.membership_valid_until) : "—")}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Rola", "Role"))}</strong><span>${escapeHtml(user.is_admin ? "Admin" : tr("Používateľ", "User"))}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Naposledy prihlásený", "Last login"))}</strong><span>${escapeHtml(formatDateTime(user.last_login_at))}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Naposledy aktívny", "Last seen"))}</strong><span>${escapeHtml(formatDateTime(user.last_seen_at))}</span></div>
      ${hasAccess ? "" : `
        <div class="account-card__cta">
          <button id="accountPanelCheckoutBtn" class="button button--primary" type="button">${escapeHtml(tr("Aktivovať členstvo za 1,99 €", "Activate membership for €1.99"))}</button>
        </div>
      `}
      <div class="account-card__cta">
        <button id="accountDeleteBtn" class="button button--ghost admin-action--danger" type="button">${escapeHtml(tr("Zrušiť účet", "Delete account"))}</button>
      </div>
    </article>
  `;
  document.getElementById("accountPanelCheckoutBtn")?.addEventListener("click", startCheckoutFromAccountPanel);
  document.getElementById("accountDeleteBtn")?.addEventListener("click", handleAccountDelete);
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
  renderAccountAiMemory();
  renderAccountSubscriptionCard();
  renderActivityList(elements.accountActivityList, state.account?.activity || []);
}

function renderAccountAiMemory() {
  if (!elements.accountAiMemory) {
    return;
  }
  if (!hasUnlockedAccess()) {
    elements.accountAiMemory.className = "account-summary empty-state";
    elements.accountAiMemory.textContent = tr(
      "Po aktivácii členstva tu uvidíš AI pamäť, hlavné témy a pracovný kontext.",
      "After activating membership, you will see AI memory, key topics and working context here."
    );
    return;
  }
  const profile = state.accountAssistantProfile || {};
  const overview = state.accountAssistantOverview || {};
  const threadCount = Array.isArray(overview.threads) ? overview.threads.length : 0;
  const messageCount = Array.isArray(overview.messages) ? overview.messages.length : 0;
  const focus = String(profile.focus || "").trim();
  const notes = String(profile.notes || "").trim();
  const topics = notes
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
  const relevancePercent = Math.min(98, 34 + threadCount * 9 + Math.min(messageCount, 24));
  const memoryHealth = messageCount >= 10
    ? tr("Silná", "Strong")
    : messageCount >= 4
      ? tr("Stabilná", "Stable")
      : tr("Rozbieha sa", "Growing");
  elements.accountAiMemory.className = "account-summary";
  elements.accountAiMemory.innerHTML = `
    <article class="account-card">
      <div class="account-ai-stats">
        <article class="account-ai-stat account-ai-stat--focus">
          <span>${escapeHtml(tr("Aktívny fokus", "Active focus"))}</span>
          <strong>${escapeHtml(focus || tr("Denný pracovný kontext", "Daily work context"))}</strong>
        </article>
        <article class="account-ai-stat account-ai-stat--threads">
          <span>${escapeHtml(tr("Chaty", "Chats"))}</span>
          <strong>${escapeHtml(String(threadCount))}</strong>
        </article>
        <article class="account-ai-stat account-ai-stat--messages">
          <span>${escapeHtml(tr("Správy", "Messages"))}</span>
          <strong>${escapeHtml(String(messageCount))}</strong>
        </article>
        <article class="account-ai-stat account-ai-stat--memory">
          <span>${escapeHtml(tr("Pamäť", "Memory"))}</span>
          <strong>${escapeHtml(memoryHealth)}</strong>
        </article>
        <article class="account-ai-stat account-ai-stat--relevance">
          <span>${escapeHtml(tr("Relevancia", "Relevance"))}</span>
          <strong>${escapeHtml(String(relevancePercent))}%</strong>
        </article>
      </div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Aktuálne smerovanie", "Current direction"))}</strong><span class="account-ai-badge">${escapeHtml(focus || tr("Denný pracovný kontext", "Daily work context"))}</span></div>
      <div class="account-card__row"><strong>${escapeHtml(tr("Aktualizované", "Updated"))}</strong><span>${escapeHtml(formatDate(profile.updated_at))}</span></div>
      <div class="account-ai-topics">
        <strong>${escapeHtml(tr("Čo si AI práve pamätá", "What AI is currently carrying"))}</strong>
        <div class="account-ai-topics__list">
          ${topics.length
            ? topics.map((topic) => `<span class="account-ai-topic">${escapeHtml(topic)}</span>`).join("")
            : `<span class="account-ai-topic">${escapeHtml(tr("Pracovný kontext sa ešte len tvorí", "Working context is still forming"))}</span>`}
        </div>
      </div>
      <div class="account-card__note">${escapeHtml(notes || tr("AI si drží pracovný kontext, klientské témy a smerovanie konverzácií naprieč chatmi.", "AI keeps working context, client topics and conversation direction across chats."))}</div>
    </article>
  `;
}

function renderActivityList(target, items) {
  const collapsed = collapseActivityFeed(items);
  if (!collapsed.length) {
    target.className = "empty-state";
    target.textContent = tr("Zatiaľ bez aktivity.", "No activity yet.");
    return;
  }
  target.className = "activity-list";
  target.innerHTML = collapsed.map((item) => `
    <article class="activity-card">
      <div class="activity-card__head">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${escapeHtml(formatDateTime(item.last_at))}</span>
      </div>
      <div class="activity-card__meta">
        ${item.actor ? `<span>${escapeHtml(item.actor)}</span>` : ""}
        ${item.count > 1 ? `<span>${escapeHtml(String(item.count))}×</span>` : ""}
        ${item.files ? `<span>${escapeHtml(String(item.files))} súbory</span>` : ""}
        ${item.status ? `<span>${escapeHtml(item.status)}</span>` : ""}
        ${item.ip ? `<span>${escapeHtml(item.ip)}</span>` : ""}
        ${item.target ? `<span>${escapeHtml(item.target)}</span>` : ""}
        ${item.subscriptionStatus ? `<span>${escapeHtml(tr("Stav", "Status"))}: ${escapeHtml(item.subscriptionStatus)}</span>` : ""}
        ${item.membershipValidUntil ? `<span>${escapeHtml(tr("Platné do", "Valid until"))}: ${escapeHtml(formatDate(item.membershipValidUntil))}</span>` : ""}
        ${item.orderNumber ? `<span>${escapeHtml(tr("Objednávka", "Order"))}: ${escapeHtml(item.orderNumber)}</span>` : ""}
        ${item.subscriptionId ? `<span class="mono">${escapeHtml(tr("Stripe sub", "Stripe sub"))}: ${escapeHtml(item.subscriptionId)}</span>` : ""}
      </div>
    </article>
  `).join("");
}

function collapseActivityFeed(items, limit = 12) {
  if (!Array.isArray(items) || !items.length) {
    return [];
  }
  const buckets = [];
  const bucketMap = new Map();
  for (const item of items) {
    const dayKey = formatDate(item.created_at);
    const typeKey = item.event_type || item.event_label || "activity";
    const actorKey = item.user_email || item.user_name || "";
    const key = `${typeKey}|${actorKey}|${dayKey}`;
    const files = Number(item.meta?.files || 0);
    if (bucketMap.has(key)) {
      const bucket = bucketMap.get(key);
      bucket.count += 1;
      bucket.files += files;
      bucket.last_at = bucket.last_at && bucket.last_at > item.created_at ? bucket.last_at : item.created_at;
      continue;
    }
    const bucket = {
      label: item.event_label || item.event_type || "Aktivita",
      actor: item.user_name || item.user_email || "",
      count: 1,
      files,
      status: item.meta?.status || "",
      ip: item.meta?.ip || "",
      target: item.meta?.target_user_email || item.meta?.contact_email || "",
      subscriptionStatus: item.meta?.membership_status || "",
      membershipValidUntil: item.meta?.membership_valid_until || "",
      orderNumber: item.meta?.last_order_number || "",
      subscriptionId: item.meta?.stripe_subscription_id || "",
      last_at: item.created_at || "",
    };
    buckets.push(bucket);
    bucketMap.set(key, bucket);
    if (buckets.length >= limit) {
      break;
    }
  }
  return buckets;
}

function renderAdminPanel() {
  renderAdminStats();
  renderAdminUsers();
  const removedItems = (state.admin?.removed_accounts || []).map((item) => ({
    event_label: item.label,
    event_type: item.event_type,
    created_at: item.created_at,
    meta: {
      ip: item.ip,
      target_user_email: item.email,
      status: item.event_type === "admin_account_deleted" ? "Vymazané" : "Deaktivované",
      membership_status: item.membership_status || "",
      membership_valid_until: item.membership_valid_until || "",
      stripe_subscription_id: item.stripe_subscription_id || "",
      last_order_number: item.last_order_number || "",
    },
  }));
  renderActivityList(elements.adminActivityList, state.admin?.activity || []);
  renderActivityList(elements.adminRemovedList, removedItems);
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
      <span>Online teraz</span>
      <strong>${escapeHtml(String(stats.online_users || 0))}</strong>
    </article>
    <article class="summary-card">
      <span>Registrácie za 30 dní</span>
      <strong>${escapeHtml(String(stats.recent_registrations || 0))}</strong>
    </article>
    <article class="summary-card">
      <span>AI aktívni používatelia</span>
      <strong>${escapeHtml(String(stats.ai_active_users || 0))}</strong>
    </article>
    <article class="summary-card">
      <span>AI vlákna</span>
      <strong>${escapeHtml(String(stats.ai_threads || 0))}</strong>
    </article>
    <article class="summary-card">
      <span>AI správy</span>
      <strong>${escapeHtml(String(stats.ai_messages || 0))}</strong>
    </article>
    <article class="summary-card">
      <span>Aktivity za 30 dní</span>
      <strong>${escapeHtml(String(stats.recent_logs || 0))}</strong>
    </article>
    <article class="summary-card">
      <span>Unikátne IP</span>
      <strong>${escapeHtml(String(stats.recent_unique_ips || 0))}</strong>
    </article>
    <article class="summary-card">
      <span>Admin zásahy</span>
      <strong>${escapeHtml(String(stats.recent_admin_actions || 0))}</strong>
    </article>
    <article class="summary-card">
      <span>Deaktivované účty</span>
      <strong>${escapeHtml(String(stats.deactivated_accounts || 0))}</strong>
    </article>
    <article class="summary-card">
      <span>Vymazané účty</span>
      <strong>${escapeHtml(String(stats.deleted_accounts || 0))}</strong>
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
          <th>Online</th>
          <th>Naposledy</th>
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
            <td>${user.is_online ? "● online" : "—"}</td>
            <td>${escapeHtml(formatDateTime(user.last_seen_at || user.last_login_at))}</td>
            <td>
              <div class="admin-actions">
                <button class="button button--ghost admin-action" data-user-id="${user.id}" data-action="detail" type="button">Detail</button>
                ${canManageAdminTools ? `<button class="button button--ghost admin-action" data-user-id="${user.id}" data-action="deactivate" type="button">Deaktivovať</button>` : ""}
                ${canManageAdminTools ? `<button class="button button--ghost admin-action admin-action--danger" data-user-id="${user.id}" data-action="delete_account" type="button">Vymazať účet</button>` : ""}
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
  if (action === "delete_account") {
    const confirmed = window.confirm("Naozaj chceš používateľovi vymazať účet? Ak bola strhnutá platba, e-mailom odíde informácia o vrátení peňazí do 1 týždňa.");
    if (!confirmed) {
      return;
    }
  }
  if (action === "deactivate") {
    const confirmed = window.confirm("Naozaj chceš účet deaktivovať? Používateľ stratí aktívne členstvo a bude odhlásený.");
    if (!confirmed) {
      return;
    }
  }
  if (!state.user?.can_manage_admin_tools) {
    window.alert("Členstvá môže upravovať len hlavný správca.");
    return;
  }
  button.disabled = true;
  try {
    const response = await appFetch("/api/admin/membership", {
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

async function openAdminUserDetail(userId, threadId = 0) {
  if (!elements.adminUserDetail) {
    return;
  }
  elements.adminUserDetail.className = "panel-card empty-state";
  elements.adminUserDetail.textContent = "Načítavam detail používateľa...";
  try {
    const query = new URLSearchParams({ user_id: String(userId) });
    if (threadId) {
      query.set("thread_id", String(threadId));
    }
    const response = await appFetch(`/api/admin/user-detail?${query.toString()}`);
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(payload.error || "Detail používateľa sa nepodarilo načítať.");
    }
    renderAdminUserDetail(payload);
  } catch (error) {
    elements.adminUserDetail.className = "panel-card empty-state";
    elements.adminUserDetail.textContent = normalizeUiErrorMessage(error.message, tr("Detail používateľa sa nepodarilo načítať.", "Failed to load user detail."));
  }
}

function renderAdminUserDetail(payload) {
  const user = payload.user;
  const activity = payload.activity || [];
  const assistantStats = payload.assistant_stats || {};
  const subscriptionPayload = payload.subscription || {};
  const subscription = subscriptionPayload.membership || subscriptionPayload || {};
  const registrationConsent = payload.registration_consent || {};
  const checkoutConsent = payload.checkout_consent || {};
  const canManageAdminTools = Boolean(state.user?.can_manage_admin_tools);
  elements.adminUserDetail.className = "panel-card";
  const membershipStatus = (() => {
    const fallbackStatus = user.membership_status || "inactive";
    if (user.membership_status === "active") {
      return "active";
    }
    if (user.membership_valid_until) {
      const untilTs = new Date(user.membership_valid_until).getTime();
      if (!Number.isNaN(untilTs) && untilTs > Date.now()) {
        return "active";
      }
    }
    return subscription.status || fallbackStatus;
  })();

  const statusLabel = membershipStatus === "active"
    ? '<span class="status-pill status-pill--active">Aktívne</span>'
    : '<span class="status-pill status-pill--inactive">Neaktívne</span>';
  const roleLabel = user.role === "admin"
    ? '<span class="status-pill status-pill--admin">Admin</span>'
    : '<span class="status-pill status-pill--neutral">Používateľ</span>';

  elements.adminUserDetail.innerHTML = `
    <div class="admin-user-detail__head">
      <div>
        <strong>${escapeHtml(user.name || "Používateľ")}</strong>
        <p class="panel-copy">${escapeHtml(user.email || "")}</p>
      </div>
      <div class="status-pill-group">
        ${roleLabel}
        ${statusLabel}
      </div>
    </div>
    <div class="account-card">
      <div class="account-card__row"><strong>Registrovaný od</strong><span>${escapeHtml(formatDate(user.created_at))}</span></div>
      <div class="account-card__row"><strong>Stav členstva</strong><span>${escapeHtml(membershipStatus)}</span></div>
      <div class="account-card__row"><strong>Platné do</strong><span>${escapeHtml(formatDate(subscription.valid_until || user.membership_valid_until))}</span></div>
      <div class="account-card__row"><strong>Naposledy prihlásený</strong><span>${escapeHtml(formatDateTime(user.last_login_at))}</span></div>
      <div class="account-card__row"><strong>Naposledy aktívny</strong><span>${escapeHtml(formatDateTime(user.last_seen_at))}</span></div>
      <div class="account-card__row"><strong>Online</strong><span>${user.is_online ? "● online" : "—"}</span></div>
      <div class="account-card__row"><strong>Posledná IP</strong><span class="mono">${escapeHtml(user.last_seen_ip || "—")}</span></div>
      <div class="account-card__row"><strong>Posledný agent</strong><span>${escapeHtml(truncateText(user.last_seen_agent || "—", 80))}</span></div>
    </div>
    <div class="account-card">
      <div class="account-card__row"><strong>Číslo objednávky</strong><span>${escapeHtml(subscription.last_order_number || user.last_order_number || "—")}</span></div>
      <div class="account-card__row"><strong>Číslo predplatného</strong><span>${escapeHtml(subscription.internal_subscription_number || user.internal_subscription_number || "—")}</span></div>
      <div class="account-card__row"><strong>Stripe subscription ID</strong><span class="mono">${escapeHtml(subscription.stripe_subscription_id || "—")}</span></div>
      <div class="account-card__row"><strong>Stripe status</strong><span>${escapeHtml(subscription.stripe_status || "—")}</span></div>
      <div class="account-card__row"><strong>Ďalšie obnovenie</strong><span>${escapeHtml(formatDate(subscription.next_renewal_at))}</span></div>
      <div class="account-card__row"><strong>Zrušené</strong><span>${escapeHtml(subscription.cancelled_at ? formatDate(subscription.cancelled_at) : "—")}</span></div>
      <div class="account-card__row"><strong>Registračný súhlas</strong><span>${escapeHtml(user.registration_consent_at ? formatDateTime(user.registration_consent_at) : "—")}</span></div>
      <div class="account-card__row"><strong>Checkout súhlas</strong><span>${escapeHtml(user.checkout_consent_at ? formatDateTime(user.checkout_consent_at) : "—")}</span></div>
    </div>
    <p class="panel-copy">Číslo objednávky a predplatného sú interné identifikátory. Stripe ID slúži na dohľadanie platby v Stripe, stav ukazuje, či je predplatné aktívne alebo ukončené.</p>
    <div class="account-card">
      <div class="account-card__row"><strong>Reg. súhlas IP</strong><span class="mono">${escapeHtml(registrationConsent.ip_address || "—")}</span></div>
      <div class="account-card__row"><strong>Reg. legal verzia</strong><span>${escapeHtml(registrationConsent.legal_version || "—")}</span></div>
      <div class="account-card__row"><strong>Marketing súhlas</strong><span>${escapeHtml(registrationConsent.marketing_consent ? "Áno" : "Nie")}</span></div>
      <div class="account-card__row"><strong>Checkout IP</strong><span class="mono">${escapeHtml(checkoutConsent.ip_address || "—")}</span></div>
      <div class="account-card__row"><strong>Checkout verzia</strong><span>${escapeHtml(checkoutConsent.consent_version || "—")}</span></div>
      <div class="account-card__row"><strong>Checkout text</strong><span>${escapeHtml(checkoutConsent.consent_text ? truncateText(checkoutConsent.consent_text, 120) : "—")}</span></div>
    </div>
    ${canManageAdminTools ? `<div class="admin-actions">
      <button id="adminDeactivateBtn" class="button button--ghost" type="button">Deaktivovať účet</button>
      <button id="adminDeleteBtn" class="button button--ghost admin-action--danger" type="button">Vymazať účet</button>
      <button id="adminRoleBtn" class="button button--ghost" type="button">${user.role === "admin" ? "Nastaviť ako používateľ" : "Nastaviť ako admin"}</button>
      <button id="adminForceSyncBtn" class="button button--ghost" type="button">Vynútiť Stripe sync</button>
    </div>
    <p class="panel-copy">Vymazanie účtu je finálne. Používateľ dostane e-mail a informáciu, že prípadné vrátenie platby bude vybavené do 7 dní.</p>` : `<p class="panel-copy">Tento administrátorský účet má prístup k prehľadu, ale zmeny členstva a rolí môže robiť len hlavný správca.</p>`}
    <p id="adminUserMessage" class="auth-message" hidden></p>
    <div class="section-head section-head--tight">
      <div>
        <p class="section-kicker">AI štatistiky používateľa</p>
        <h3>Pracovný kontext a využitie</h3>
      </div>
      <button id="adminAssistantResetBtn" class="button button--ghost" type="button">Vymazať AI pamäť</button>
    </div>
    <div class="summary-grid summary-grid--admin-user">
      <article class="summary-card summary-card--accent">
        <span>Fokus</span>
        <strong>${escapeHtml(assistantStats.focus || "—")}</strong>
        <small class="summary-card__hint">Hlavná pracovná téma</small>
      </article>
      <article class="summary-card">
        <span>Chaty (vlákna)</span>
        <strong>${escapeHtml(String(assistantStats.thread_count || 0))}</strong>
        <small class="summary-card__hint">Počet konverzácií</small>
      </article>
      <article class="summary-card">
        <span>Správy</span>
        <strong>${escapeHtml(String(assistantStats.message_count || 0))}</strong>
        <small class="summary-card__hint">Všetky správy používateľa</small>
      </article>
      <article class="summary-card">
        <span>AI odpovede</span>
        <strong>${escapeHtml(String(assistantStats.assistant_count || 0))}</strong>
        <small class="summary-card__hint">Odpovede vygenerované AI</small>
      </article>
      <article class="summary-card">
        <span>Web overenia</span>
        <strong>${escapeHtml(String(assistantStats.web_count || 0))}</strong>
        <small class="summary-card__hint">Dopyty na externé zdroje</small>
      </article>
      <article class="summary-card">
        <span>Obrázky</span>
        <strong>${escapeHtml(String(assistantStats.image_count || 0))}</strong>
        <small class="summary-card__hint">Počet priložených obrázkov</small>
      </article>
      <article class="summary-card">
        <span>Relevancia</span>
        <strong>${escapeHtml(String(assistantStats.relevance_percent || 0))}%</strong>
        <small class="summary-card__hint">Kvalita kontextu z pamäte</small>
      </article>
      <article class="summary-card">
        <span>Naposledy aktívny</span>
        <strong>${escapeHtml(formatDateTime(assistantStats.last_message_at))}</strong>
        <small class="summary-card__hint">Posledná odpoveď AI</small>
      </article>
    </div>
    <div class="account-card">
      <div class="account-card__row"><strong>Aktívne témy</strong><span>${escapeHtml((assistantStats.topics || []).join(", ") || "Zatiaľ bez tém")}</span></div>
    </div>
    <div class="section-head section-head--tight">
      <div>
        <p class="section-kicker">História používateľa</p>
        <h3>Posledné aktivity</h3>
      </div>
    </div>
    <div id="adminUserActivity" class="activity-list"></div>
  `;

  if (elements.adminUserDetailModal) {
    openAdminUserDetailModal();
  }

  const deactivateBtn = document.getElementById("adminDeactivateBtn");
  const deleteBtn = document.getElementById("adminDeleteBtn");
  const roleBtn = document.getElementById("adminRoleBtn");
  const forceSyncBtn = document.getElementById("adminForceSyncBtn");
  const messageEl = document.getElementById("adminUserMessage");
  renderActivityList(document.getElementById("adminUserActivity"), activity);

  deactivateBtn?.addEventListener("click", async () => {
    const confirmed = window.confirm("Naozaj chceš účet deaktivovať? Používateľ príde o členstvo a bude odhlásený.");
    if (!confirmed) {
      return;
    }
    await submitAdminMembershipAction(user.id, "deactivate", { messageEl });
  });
  deleteBtn?.addEventListener("click", async () => {
    const confirmed = window.confirm("Naozaj chceš účet vymazať? Používateľ dostane e-mail a prípadné vrátenie peňazí bude komunikované do 1 týždňa.");
    if (!confirmed) {
      return;
    }
    await submitAdminMembershipAction(user.id, "delete_account", { messageEl });
  });
  roleBtn?.addEventListener("click", async () => {
    await submitAdminRoleUpdate(user.id, user.role === "admin" ? "user" : "admin", messageEl);
  });
  forceSyncBtn?.addEventListener("click", async () => {
    await submitAdminForceSync(user.id, messageEl);
  });
  document.getElementById("adminAssistantResetBtn")?.addEventListener("click", async () => {
    await submitAdminAssistantMemoryReset(user.id, messageEl);
  });
}

async function submitAdminForceSync(userId, messageEl) {
  try {
    const response = await appFetch("/api/admin/force-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(payload.error || "Stripe sync sa nepodarilo spustiť.");
    }
    await openAdminUserDetail(userId);
  } catch (error) {
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.textContent = normalizeUiErrorMessage(error.message, tr("Stripe sync sa nepodarilo spustiť.", "Stripe sync failed."));
      messageEl.classList.add("auth-message--error");
    } else {
      window.alert(normalizeUiErrorMessage(error.message, tr("Stripe sync sa nepodarilo spustiť.", "Stripe sync failed.")));
    }
  }
}

async function submitAdminAssistantReview(userId, messageId, reviewStatus, threadId, messageEl) {
  try {
    const response = await appFetch("/api/admin/assistant-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, message_id: messageId, review_status: reviewStatus }),
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(payload.error || "AI review sa nepodarilo uložiť.");
    }
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.textContent = "AI odpoveď bola aktualizovaná.";
      messageEl.classList.remove("auth-message--error");
    }
    await openAdminUserDetail(userId, Number(threadId || 0));
  } catch (error) {
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.textContent = normalizeUiErrorMessage(error.message, tr("AI review sa nepodarilo uložiť.", "Could not save AI review."));
      messageEl.classList.add("auth-message--error");
    }
  }
}

async function submitAdminAssistantMemoryReset(userId, messageEl) {
  if (!window.confirm("Naozaj chceš vymazať AI históriu a pamäť tohto používateľa?")) {
    return;
  }
  try {
    const response = await appFetch("/api/admin/assistant-memory-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(payload.error || "AI pamäť sa nepodarilo vymazať.");
    }
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.textContent = "AI história a pamäť používateľa boli vymazané.";
      messageEl.classList.remove("auth-message--error");
    }
    await openAdminUserDetail(userId, 0);
  } catch (error) {
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.textContent = normalizeUiErrorMessage(error.message, tr("AI pamäť sa nepodarilo vymazať.", "Could not clear AI memory."));
      messageEl.classList.add("auth-message--error");
    }
  }
}

async function submitAdminMembershipAction(userId, action, { days = 0, messageEl } = {}) {
  try {
    const response = await appFetch("/api/admin/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, action, days }),
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(payload.error || "Admin akcia zlyhala.");
    }
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.textContent = "Zmena bola uložená.";
      messageEl.classList.remove("auth-message--error");
    }
    await fetchAdminPanel();
    if (action !== "delete_account") {
      await openAdminUserDetail(userId);
    } else {
      elements.adminUserDetail.className = "panel-card empty-state";
      elements.adminUserDetail.textContent = "Účet bol vymazaný.";
    }
    if (state.user && state.user.id === userId) {
      await refreshCurrentUser();
      renderAccessState();
    }
  } catch (error) {
    if (messageEl) {
      messageEl.hidden = false;
      messageEl.textContent = normalizeUiErrorMessage(error.message, tr("Admin akcia zlyhala.", "Admin action failed."));
      messageEl.classList.add("auth-message--error");
    } else {
      window.alert(normalizeUiErrorMessage(error.message, tr("Admin akcia zlyhala.", "Admin action failed.")));
    }
  }
}

async function submitAdminRoleUpdate(userId, role, messageEl) {
  try {
    const response = await appFetch("/api/admin/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, role }),
    });
    const payload = await readJsonResponse(response);
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
      messageEl.textContent = normalizeUiErrorMessage(error.message, tr("Rolu sa nepodarilo zmeniť.", "Could not update role."));
      messageEl.classList.add("auth-message--error");
    } else {
      window.alert(normalizeUiErrorMessage(error.message, tr("Rolu sa nepodarilo zmeniť.", "Could not update role.")));
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
    const response = await appFetch("/api/account/update", {
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
    const response = await appFetch("/api/account/change-password", {
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

  if (state.authMode === "register" && (!elements.authAcceptTerms.checked || !elements.authAcceptPrivacy.checked)) {
    const consentError = tr("Pre vytvorenie účtu musíš potvrdiť Obchodné podmienky aj GDPR.", "To create your account, you must confirm the terms and privacy.");
    setAuthMessage(consentError, true);
    window.alert(consentError);
    return;
  }

  try {
    const response = await appFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        accept_terms: state.authMode === "register" ? elements.authAcceptTerms.checked : false,
        accept_privacy: state.authMode === "register" ? elements.authAcceptPrivacy.checked : false,
        marketing_consent: state.authMode === "register" ? elements.authMarketingConsent.checked : false,
      }),
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(payload.error || "Autentifikácia zlyhala.");
    }

    state.user = payload.user;
    closeAuthModal();
    renderAccessState();
    if (state.authMode === "register") {
      window.alert("Účet bol vytvorený. Teraz môžeš potvrdiť objednávku a aktivovať členstvo cez Stripe.");
    }
  } catch (error) {
    setAuthMessage(normalizeUiErrorMessage(error.message, tr("Autentifikácia zlyhala.", "Authentication failed.")), true);
  }
}

async function logout() {
  await appFetch("/api/logout", { method: "POST" });
  state.user = null;
  state.account = null;
  state.admin = null;
  state.assistant = { profile: null, messages: [] };
  if (state.heartbeatTimer) {
    window.clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = null;
  }
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
    const response = await appFetch("/api/request-password-reset", {
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
    const response = await appFetch("/api/reset-password", {
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
    await playDiscountEffect();
    openAuthModal("login");
    return;
  }
  if (hasUnlockedAccess()) {
    if (state.mode === "chooser") {
      navigateToMode("contacts");
      return;
    }
    if (state.mode === "compress" && elements.compressFileInput) {
      openFilePicker(elements.compressFileInput);
      return;
    }
    if (elements.fileInput) {
      openFilePicker(elements.fileInput);
    }
    return;
  }
  closeAccountPanel();
  closeAdminPanel();
  closeAuthModal();
  closePromoModal();
  await playDiscountEffect();
  openCheckoutModal();
}

function handleUnlockUploadAction() {
  if (hasUnlockedAccess()) {
    openFilePicker(elements.fileInput);
    return;
  }
  startCheckoutFlow();
}

function handleOpenCompressorAction() {
  navigateToMode("compress");
}

function handleOpenAssistantAction() {
  if (hasUnlockedAccess()) {
    window.location.href = "/ai.html";
    return;
  }
  if (!state.user) {
    openAuthModal("login");
    return;
  }
  startCheckoutFlow();
}

async function startProCheckout() {
  try {
    const response = await appFetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkout_consent_accepted: true }),
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      if (response.status === 401) {
        openAuthModal("login");
      }
      const fallback = `${tr("Stripe checkout sa nepodarilo spustiť.", "Stripe checkout failed to start.")} (HTTP ${response.status})`;
      throw new Error(normalizeUiErrorMessage(payload.error || fallback, fallback));
    }
    if (payload?.url) {
      window.location.href = payload.url;
      return;
    }
    throw new Error(tr("Stripe checkout URL nie je dostupná.", "Stripe checkout URL is not available."));
  } catch (error) {
    window.alert(normalizeUiErrorMessage(error.message, tr("Stripe checkout sa nepodarilo spustiť.", "Stripe checkout failed to start.")));
  }
}

async function confirmCheckoutFlow() {
  if (!elements.checkoutConsentCheckbox.checked) {
    const consentError = tr("Bez potvrdenia súhlasu nemôžeš pokračovať na platbu.", "You must confirm the consent before continuing to payment.");
    elements.checkoutMessage.hidden = false;
    elements.checkoutMessage.textContent = consentError;
    elements.checkoutMessage.classList.add("auth-message--error");
    window.alert(consentError);
    return;
  }
  elements.checkoutProceedBtn.disabled = true;
  elements.checkoutMessage.hidden = true;
  try {
    closeCheckoutModal();
    await startProCheckout();
  } catch (error) {
    elements.checkoutMessage.hidden = false;
    elements.checkoutMessage.textContent = error.message;
    elements.checkoutMessage.classList.add("auth-message--error");
  } finally {
    elements.checkoutProceedBtn.disabled = false;
  }
}

async function cancelSubscriptionFlow() {
  const confirmed = window.confirm(tr(
    "Naozaj chceš zrušiť predplatné? Ďalšia platba sa už nenaúčtuje a prístup zostane aktívny do konca zaplateného obdobia.",
    "Do you really want to cancel the subscription? No further payment will be charged and access will remain active until the end of the paid period."
  ));
  if (!confirmed) {
    return;
  }
  try {
    const response = await appFetch("/api/account/cancel-subscription", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Predplatné sa nepodarilo zrušiť.");
    }
    window.alert(payload.message || tr("Predplatné bolo úspešne zrušené.", "The subscription has been cancelled."));
    await refreshCurrentUser();
    await fetchAccountPanel();
    renderAccessState();
  } catch (error) {
    window.alert(error.message);
  }
}

async function handleAccountDelete() {
  const confirmed = window.confirm(tr(
    "Naozaj chceš natrvalo zrušiť účet? Účet aj dáta sa odstránia a prípadné predplatné sa ukončí ku koncu obdobia.",
    "Do you really want to permanently delete your account? Your data will be removed and any subscription will be cancelled at period end."
  ));
  if (!confirmed) {
    return;
  }
  try {
    const response = await appFetch("/api/account/delete", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || tr("Účet sa nepodarilo zrušiť.", "Account deletion failed."));
    }
    window.alert(payload.message || tr("Účet bol zrušený.", "Account deleted."));
    await logout();
  } catch (error) {
    window.alert(error.message);
  }
}

function playDiscountEffect() {
  document.body.classList.remove("discount-effect");
  void document.body.offsetWidth;
  document.body.classList.add("discount-effect");
  window.setTimeout(() => {
    document.body.classList.remove("discount-effect");
  }, 760);
  return new Promise((resolve) => window.setTimeout(resolve, 420));
}

function handleWindowScroll() {
  renderStickyDealBar();
}

function dismissStickyDealBar() {
  state.stickyDealDismissed = true;
  window.localStorage.setItem(STICKY_DEAL_DISMISSED_KEY, "1");
  if (elements.stickyDealBar) {
    elements.stickyDealBar.hidden = true;
  }
  renderStickyDealBar();
}

function dismissChooserDealMini() {
  state.chooserDealDismissed = true;
  window.localStorage.setItem(CHOOSER_DEAL_DISMISSED_KEY, "1");
  if (elements.chooserDealMini) {
    elements.chooserDealMini.hidden = true;
  }
}

function renderChooserDealMini() {
  if (!elements.chooserDealMini) {
    return;
  }
  const shouldShow = false;
  elements.chooserDealMini.hidden = !shouldShow;
}

function renderStickyDealBar() {
  if (!elements.stickyDealBar) {
    return;
  }
  const shouldShow = false;
  elements.stickyDealBar.hidden = !shouldShow;
}

function openFilePicker(input) {
  if (!input) {
    return;
  }
  try {
    input.disabled = false;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
  } catch (_error) {
  }
  input.click();
}

function handleUploadBoxClick(event) {
  if (event.target.closest("button")) {
    return;
  }
  if (hasUnlockedAccess()) {
    openFilePicker(elements.fileInput);
    return;
  }
  startCheckoutFlow();
}

function handleUploadDragOver(event) {
  event.preventDefault();
  if (!hasUnlockedAccess()) {
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
  if (!hasUnlockedAccess()) {
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

function renderCompressionAccessState() {
  const hasMembership = hasUnlockedAccess();
  const hasFile = Boolean(state.compression.file);

  if (elements.compressFileInput) {
    elements.compressFileInput.disabled = !hasMembership;
  }
  if (elements.compressSelectBtn) {
    elements.compressSelectBtn.textContent = hasMembership ? (hasFile ? tr("Vybrať iný súbor", "Choose another file") : tr("Vybrať súbor", "Choose file")) : tr("Aktivovať členstvo", "Activate membership");
  }
  if (elements.compressRunBtn) {
    elements.compressRunBtn.disabled = !hasMembership || !hasFile || state.compression.isBusy || state.compression.isOversize;
  }
  renderCompressionUploadState();
}

function renderAssistantAccessState() {
  const hasMembership = hasUnlockedAccess();
  if (elements.assistantSubtitle) {
    elements.assistantSubtitle.textContent = hasMembership
      ? tr("Konverzačný asistent, ktorý ti pomáha s denným plánom, follow-upmi, komunikáciou s klientmi a organizáciou práce.", "A conversational assistant that helps with your daily plan, follow-ups, client communication and work organization.")
      : state.user
        ? tr("AI asistent sa odomkne hneď po aktivácii členstva.", "The AI assistant unlocks immediately after membership activation.")
        : tr("Prihlás sa a aktivuj členstvo, aby sa odomkol AI asistent pre finančné sprostredkovanie.", "Sign in and activate membership to unlock the AI assistant for financial intermediation.");
  }
  [elements.assistantChatForm].forEach((form) => {
    form?.querySelectorAll("input, select, textarea, button").forEach((field) => {
      field.disabled = !hasMembership;
    });
  });
  elements.assistantPromptChips?.querySelectorAll(".assistant-chip").forEach((button) => {
    button.disabled = !hasMembership;
  });
  if (!hasMembership) {
    renderAssistantLockedState();
    return;
  }
  renderAssistantDashboard();
}

function renderAssistantLockedState() {
  if (elements.assistantHeadline) {
    elements.assistantHeadline.textContent = tr("AI asistent sa odomkne po aktivácii členstva.", "The AI assistant unlocks after membership activation.");
  }
  if (elements.assistantFocus) {
    elements.assistantFocus.textContent = tr("Po odomknutí môžeš písať s AI asistentom, ktorý pripraví plán dňa a pomôže s klientskou komunikáciou.", "After unlocking, you can chat with an AI assistant that prepares your daily plan and helps with client communication.");
  }
  if (elements.assistantStats) {
    elements.assistantStats.innerHTML = `
      <article class="summary-card">
        <span>Denný briefing</span>
        <strong>AI</strong>
      </article>
      <article class="summary-card">
        <span>Kontext</span>
        <strong>Asistent</strong>
      </article>
      <article class="summary-card">
        <span>Komunikácia</span>
        <strong>Follow-upy</strong>
      </article>
      <article class="summary-card">
        <span>Pomoc</span>
        <strong>Práca dňa</strong>
      </article>
    `;
  }
  if (elements.assistantChatFeed) {
    elements.assistantChatFeed.className = "assistant-chat-feed empty-state";
    elements.assistantChatFeed.textContent = tr("Aktivuj členstvo a AI asistent sa odomkne pre konverzáciu a pracovnú pomoc.", "Activate membership and the AI assistant will unlock for chat and daily work help.");
  }
}

async function fetchAssistantDashboard() {
  if (!hasUnlockedAccess() || state.mode !== "assistant") {
    return;
  }
  try {
    const response = await appFetch("/api/assistant");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "AI asistent sa nepodarilo načítať.");
    }
    state.assistant = payload;
    renderAssistantDashboard();
  } catch (error) {
    if (elements.assistantChatFeed) {
      elements.assistantChatFeed.className = "assistant-chat-feed empty-state";
      elements.assistantChatFeed.textContent = error.message;
    }
  }
}

function renderAssistantDashboard() {
  const messages = Array.isArray(state.assistant?.messages) ? state.assistant.messages : [];
  if (elements.assistantHeadline) {
    elements.assistantHeadline.textContent = messages.length
      ? tr("AI asistent má načítaný kontext tvojej práce.", "The AI assistant has your work context loaded.")
      : tr("Napíš, s čím dnes potrebuješ pomôcť.", "Write what you need help with today.");
  }
  if (elements.assistantFocus) {
    elements.assistantFocus.textContent = tr("Asistent odpovedá prakticky, po slovensky a navrhuje ďalšie kroky pre tvoju prax.", "The assistant replies practically and suggests the next best steps for your work.");
  }
  if (elements.assistantChatFeed) {
    if (!messages.length) {
      elements.assistantChatFeed.className = "assistant-chat-feed empty-state";
      elements.assistantChatFeed.textContent = tr("AI asistent je pripravený. Pošli prvú správu a začneš konverzáciu.", "The AI assistant is ready. Send your first message to begin.");
    } else {
      elements.assistantChatFeed.className = "assistant-chat-feed";
      elements.assistantChatFeed.innerHTML = messages.map((message) => `
        <article class="assistant-message assistant-message--${escapeHtml(message.role || "assistant")}">
          <span class="assistant-message__role">${escapeHtml(formatAssistantRole(message.role))}</span>
          <div class="assistant-message__bubble">${formatMessageHtml(message.content || "")}</div>
          <span class="assistant-message__time">${escapeHtml(formatDateTime(message.created_at))}</span>
        </article>
      `).join("");
      elements.assistantChatFeed.scrollTop = elements.assistantChatFeed.scrollHeight;
    }
  }
}

function estimateCompressionSeconds(file, targetMb) {
  const sizeMb = (file?.size || 0) / (1024 * 1024);
  const target = Math.max(Number.parseFloat(targetMb || "0.5") || 0.5, 0.05);
  const ratio = sizeMb / target;
  const extension = getFileExtension(file?.name || "").toLowerCase();

  let seconds = 8 + sizeMb * 3.4;
  if (extension === "pdf") {
    seconds += sizeMb * 2.1;
  }
  if (extension === "png") {
    seconds += sizeMb * 3.4;
  }
  if (ratio > 1.25) {
    seconds += ratio * 5.5;
  }
  return Math.max(6, Math.min(600, Math.round(seconds)));
}

function stopCompressionTimingLoop() {
  if (state.compression.timingTimer) {
    window.clearInterval(state.compression.timingTimer);
    state.compression.timingTimer = null;
  }
}

function startCompressionTimingLoop() {
  stopCompressionTimingLoop();
  state.compression.startedAt = Date.now();
  state.compression.timingTimer = window.setInterval(() => {
    renderCompressionUploadState();
    renderCompressionResult();
  }, 1000);
}

function setCompressionUploadPhase(phase, progress = state.compression.uploadUi.progress) {
  if (state.compression.uploadUi.progressTimer) {
    window.clearInterval(state.compression.uploadUi.progressTimer);
    state.compression.uploadUi.progressTimer = null;
  }
  if (phase !== "processing") {
    stopCompressionTimingLoop();
  }
  state.compression.uploadUi.phase = phase;
  state.compression.uploadUi.progress = progress;
  renderCompressionUploadState();
}

function startCompressionProgressLoop() {
  startCompressionTimingLoop();
  setCompressionUploadPhase("processing", 12);
  state.compression.uploadUi.progressTimer = window.setInterval(() => {
    const elapsedSeconds = state.compression.startedAt ? Math.round((Date.now() - state.compression.startedAt) / 1000) : 0;
    const estimate = Math.max(state.compression.estimateSeconds || 10, 1);
    const projected = Math.min(92, Math.round((elapsedSeconds / estimate) * 100));
    if (projected > state.compression.uploadUi.progress) {
      state.compression.uploadUi.progress = projected;
      renderCompressionUploadState();
      return;
    }
    if (state.compression.uploadUi.progress >= 92) {
      return;
    }
    state.compression.uploadUi.progress += Math.random() > 0.5 ? 4 : 3;
    renderCompressionUploadState();
  }, 280);
}

function renderCompressionUploadState() {
  if (
    !elements.compressUploadBox ||
    !elements.compressStateBadge ||
    !elements.compressStateText ||
    !elements.compressProgress ||
    !elements.compressProgressBar
  ) {
    return;
  }

  const hasMembership = hasUnlockedAccess();
  const hasFile = Boolean(state.compression.file);
  const { phase, progress } = state.compression.uploadUi;
  const elapsedSeconds = state.compression.startedAt ? Math.round((Date.now() - state.compression.startedAt) / 1000) : 0;
  const estimateSeconds = Math.max(state.compression.estimateSeconds || 0, 0);
  const remainingSeconds = Math.max(0, estimateSeconds - elapsedSeconds);
  const isEstimateExceeded = estimateSeconds > 0 && elapsedSeconds >= estimateSeconds;

  elements.compressUploadBox.classList.toggle("upload--locked", !hasMembership);
  elements.compressUploadBox.classList.toggle("upload--ready", hasMembership && hasFile && phase !== "processing");
  elements.compressUploadBox.classList.toggle("upload--processing", phase === "processing");
  elements.compressUploadBox.classList.toggle("upload--done", phase === "done");

  let badge = "Pripravené";
  let text = "Vyber súbor a nastav cieľovú veľkosť.";
  let showProgress = false;
  let showTiming = false;
  let etaText = "Čas a odhad sa zobrazia po spustení kompresie.";
  let elapsedText = "—";
  let estimateText = "—";

  if (!hasMembership) {
    badge = "Uzamknuté";
    text = "Kompresia je dostupná po aktivácii členstva.";
  } else if (phase === "processing") {
    badge = "Spracovanie";
    text = "Pripravujeme menšiu verziu súboru. Pri väčších súboroch to môže trvať dlhšie.";
    showProgress = true;
    showTiming = true;
    elapsedText = formatDuration(elapsedSeconds);
    estimateText = isEstimateExceeded ? `>${formatDuration(estimateSeconds)}` : formatDuration(estimateSeconds || 0);
    etaText = isEstimateExceeded
      ? `Spracovanie trvá dlhšie než pôvodný odhad. Pokračujeme ďalej, kým nebude výstup pripravený.`
      : `Prešlo ${formatDuration(elapsedSeconds)} • odhad zostáva približne ${formatDuration(remainingSeconds)}.`;
  } else if (phase === "done") {
    badge = "Hotovo";
    text = "Výsledok je pripravený na stiahnutie.";
    showTiming = true;
    elapsedText = elapsedSeconds ? formatDuration(elapsedSeconds) : "—";
    estimateText = "Dokončené";
    etaText = elapsedSeconds ? `Spracovanie trvalo približne ${formatDuration(elapsedSeconds)}.` : "Spracovanie je dokončené.";
  } else if (hasFile && state.compression.isOversize) {
    badge = "Limit online verzie";
    text = `${state.compression.file.name} je väčší než 100 MB, čo je nad limit aktuálnej online verzie.`;
    showTiming = true;
    estimateText = "Nad limit";
    etaText = "Pre väčšie súbory než 100 MB bude potrebné výkonnejšie spracovanie na pozadí.";
  } else if (hasFile) {
    badge = "Súbor pripravený";
    text = `${state.compression.file.name} čaká na kompresiu.`;
    showTiming = true;
    estimateText = formatDuration(state.compression.estimateSeconds || estimateCompressionSeconds(state.compression.file, normalizeCompressionTarget()));
    etaText = `Odhad spracovania: približne ${estimateText}.`;
  }

  elements.compressStateBadge.textContent = badge;
  elements.compressStateText.textContent = text;
  if (elements.compressTimingRow) {
    elements.compressTimingRow.hidden = !showTiming;
  }
  if (elements.compressElapsedInfo) {
    elements.compressElapsedInfo.textContent = elapsedText;
  }
  if (elements.compressEstimateInfo) {
    elements.compressEstimateInfo.textContent = estimateText;
  }
  if (elements.compressEtaInfo) {
    elements.compressEtaInfo.textContent = etaText;
  }
  elements.compressProgress.hidden = !showProgress;
  elements.compressProgressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
}

function requestCompressionAccess() {
  if (hasUnlockedAccess()) {
    return true;
  }
  setMode("compress");
  document.getElementById("kompresia-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (!state.user) {
    openAuthModal("login");
    return false;
  }
  window.alert("Na kompresiu súborov potrebuješ aktívne členstvo. Otváram aktiváciu.");
  startCheckoutFlow();
  return false;
}

function handleCompressionUploadClick(event) {
  if (event?.currentTarget === elements.compressUploadBox && event.target.closest("button, label")) {
    return;
  }
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (!requestCompressionAccess()) {
    return;
  }
  openFilePicker(elements.compressFileInput);
}

function handleCompressionUploadKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  event.preventDefault();
  handleCompressionUploadClick();
}

function handleCompressionDragOver(event) {
  event.preventDefault();
  if (!hasUnlockedAccess()) {
    return;
  }
  elements.compressUploadBox?.classList.add("is-dragover");
}

function handleCompressionDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    elements.compressUploadBox?.classList.remove("is-dragover");
  }
}

function handleCompressionDrop(event) {
  event.preventDefault();
  elements.compressUploadBox?.classList.remove("is-dragover");
  if (!requestCompressionAccess()) {
    return;
  }
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    setCompressionFile(file);
  }
}

function handleCompressionFileSelection(event) {
  if (!requestCompressionAccess()) {
    return;
  }
  const file = event.target.files?.[0];
  if (file) {
    setCompressionFile(file);
  }
  if (elements.compressFileInput) {
    elements.compressFileInput.value = "";
  }
}

function setCompressionFile(file) {
  const extension = getFileExtension(file.name).toLowerCase();
  if (!COMPRESS_EXTENSIONS.has(extension)) {
    window.alert("Podporované sú len PDF, JPG, JPEG, PNG a WEBP.");
    return;
  }
  state.compression.file = file;
  state.compression.isOversize = file.size > ONLINE_COMPRESS_UI_LIMIT_BYTES;
  state.compression.result = state.compression.isOversize
    ? {
        error: "Tento súbor je väčší než 100 MB. Aktuálna online verzia podporuje kompresiu do 100 MB.",
      }
    : null;
  state.compression.estimateSeconds = estimateCompressionSeconds(file, normalizeCompressionTarget());
  state.compression.startedAt = 0;
  setCompressionUploadPhase("idle", 0);
  renderCompressionAccessState();
  renderCompressionResult();
}

async function handleCompressionSubmit(event) {
  event.preventDefault();
  if (!requestCompressionAccess()) {
    return;
  }
  if (!state.compression.file || state.compression.isBusy) {
    return;
  }
  if (state.compression.isOversize) {
    return;
  }

  const targetMb = normalizeCompressionTarget();
  if (!targetMb) {
    window.alert("Zadaj platnú cieľovú veľkosť medzi 0,05 MB a 250 MB.");
    return;
  }

  const formData = new FormData();
  formData.append("file", state.compression.file);
  formData.append("target_mb", targetMb);

  state.compression.isBusy = true;
  state.compression.result = null;
  state.compression.estimateSeconds = estimateCompressionSeconds(state.compression.file, targetMb);
  startCompressionProgressLoop();
  renderCompressionAccessState();
  renderCompressionResult();

  try {
    const response = await appFetch("/api/compress-file", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let message = `Kompresia zlyhala (${response.status}).`;
      try {
        const responseText = await response.text();
        try {
          const payload = JSON.parse(responseText);
          message = payload.error || message;
        } catch (_parseError) {
          const cleaned = responseText
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (cleaned) {
            message = cleaned.slice(0, 240);
          }
        }
      } catch (_error) {
        // keep fallback message
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    state.compression.result = {
      blob,
      compressedBytes: parseNumericHeader(response.headers.get("X-Compression-Compressed-Bytes")),
      fileName: parseFileName(response.headers.get("Content-Disposition")) || "subor-zmenseny",
      originalBytes: parseNumericHeader(response.headers.get("X-Compression-Original-Bytes")),
      reachedTarget: response.headers.get("X-Compression-Reached-Target") === "1",
      status: response.headers.get("X-Compression-Status") || "compressed",
      targetBytes: parseNumericHeader(response.headers.get("X-Compression-Target-Bytes")),
      elapsedSeconds: state.compression.startedAt ? Math.round((Date.now() - state.compression.startedAt) / 1000) : 0,
    };
    setCompressionUploadPhase("done", 100);
  } catch (error) {
    const message = String(error?.message || "Kompresia zlyhala.");
    state.compression.result = {
      error: message.includes("Failed to fetch")
        ? "Server pri kompresii neodpovedal. Skús to prosím ešte raz."
        : message,
      elapsedSeconds: state.compression.startedAt ? Math.round((Date.now() - state.compression.startedAt) / 1000) : 0,
    };
    setCompressionUploadPhase("idle", 0);
  } finally {
    state.compression.isBusy = false;
    renderCompressionAccessState();
    renderCompressionResult();
  }
}

function renderCompressionResult() {
  if (!elements.compressOriginal || !elements.compressFinal || !elements.compressStatus || !elements.compressResultMessage || !elements.compressDownloadBtn) {
    return;
  }

  if (!state.compression.result) {
    elements.compressOriginal.textContent = state.compression.file ? formatMegabytes(state.compression.file.size) : "0 MB";
    elements.compressFinal.textContent = "0 MB";
    elements.compressStatus.textContent = tr("Čaká na spracovanie", "Waiting for processing");
    if (elements.compressTime) {
      elements.compressTime.textContent = state.compression.file ? formatDuration(state.compression.estimateSeconds || 0) : "—";
    }
    elements.compressResultMessage.className = "empty-state";
    elements.compressResultMessage.textContent = tr("Zatiaľ bez výsledku. Nahraj súbor a spusti kompresiu.", "No result yet. Upload a file and start compression.");
    elements.compressDownloadBtn.disabled = true;
    return;
  }

  const result = state.compression.result;
  if (result.error) {
    elements.compressOriginal.textContent = state.compression.file ? formatMegabytes(state.compression.file.size) : "0 MB";
    elements.compressFinal.textContent = "—";
    elements.compressStatus.textContent = tr("Chyba", "Error");
    if (elements.compressTime) {
      elements.compressTime.textContent = result.elapsedSeconds ? formatDuration(result.elapsedSeconds) : "—";
    }
    elements.compressResultMessage.className = "auth-message auth-message--error compress-message";
    elements.compressResultMessage.textContent = result.error;
    elements.compressDownloadBtn.disabled = true;
    return;
  }

  elements.compressOriginal.textContent = formatMegabytes(result.originalBytes);
  elements.compressFinal.textContent = formatMegabytes(result.compressedBytes);
  elements.compressStatus.textContent = formatCompressionStatus(result.status, result.reachedTarget);
  if (elements.compressTime) {
    elements.compressTime.textContent = result.elapsedSeconds ? formatDuration(result.elapsedSeconds) : "—";
  }
  elements.compressResultMessage.className = "compress-message";
  elements.compressResultMessage.textContent = buildCompressionMessage(result);
  elements.compressDownloadBtn.disabled = false;
}

function handleCompressionDownload() {
  const result = state.compression.result;
  if (!result || result.error || !result.blob) {
    return;
  }
  triggerDownload(result.blob, result.fileName || "subor-zmenseny");
}

function handleAssistantPromptClick(event) {
  const prompt = event.currentTarget.dataset.prompt || "";
  if (!prompt || !elements.assistantChatInput) {
    return;
  }
  elements.assistantChatInput.value = prompt;
  elements.assistantChatInput.focus();
}

async function handleAssistantChatSubmit(event) {
  event.preventDefault();
  if (!hasUnlockedAccess()) {
    startCheckoutFlow();
    return;
  }
  try {
    if (elements.assistantChatMessage) {
      elements.assistantChatMessage.hidden = true;
      elements.assistantChatMessage.textContent = "";
      elements.assistantChatMessage.classList.remove("auth-message--error");
    }
    const message = elements.assistantChatInput?.value.trim() || "";
    if (message.length < 2) {
      throw new Error(tr("Napíš správu pre AI asistenta.", "Write a message for the AI assistant."));
    }
    if (elements.assistantChatSubmit) {
      elements.assistantChatSubmit.disabled = true;
      elements.assistantChatSubmit.textContent = tr("AI premýšľa...", "AI is thinking...");
    }
    const response = await appFetch("/api/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "AI asistent neodpovedal.");
    }
    state.assistant = payload;
    if (elements.assistantChatForm) {
      elements.assistantChatForm.reset();
    }
    renderAssistantDashboard();
  } catch (error) {
    if (elements.assistantChatMessage) {
      elements.assistantChatMessage.hidden = false;
      elements.assistantChatMessage.textContent = error.message;
      elements.assistantChatMessage.classList.add("auth-message--error");
    }
  } finally {
    if (elements.assistantChatSubmit) {
      elements.assistantChatSubmit.disabled = false;
      elements.assistantChatSubmit.textContent = tr("Odoslať do AI asistenta", "Send to AI assistant");
    }
  }
}

function resetCompressionState() {
  state.compression.file = null;
  state.compression.result = null;
  state.compression.isBusy = false;
  state.compression.isOversize = false;
  state.compression.estimateSeconds = 0;
  state.compression.startedAt = 0;
  stopCompressionTimingLoop();
  setCompressionUploadPhase("idle", 0);
  if (elements.compressFileInput) {
    elements.compressFileInput.value = "";
  }
  renderCompressionAccessState();
  renderCompressionResult();
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

function formatAssistantRole(role) {
  if (role === "user") {
    return "Ty";
  }
  return "Unifyo AI";
}

function formatAssistantMeta(task) {
  const parts = [];
  if (task.due_date) {
    parts.push(`termín ${formatDate(task.due_date)}`);
  }
  const channelLabel = {
    followup: "follow-up",
    email: "e-mail",
    call: "telefonát",
    meeting: "stretnutie",
  }[task.channel] || "úloha";
  parts.push(channelLabel);
  return parts.join(" • ");
}

function formatAssistantStatus(status, priority) {
  if (status === "done") {
    return "Hotovo";
  }
  return {
    high: "Vysoká priorita",
    medium: "Stredná priorita",
    low: "Nízka priorita",
  }[priority] || "Otvorené";
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
  if (!hasUnlockedAccess()) {
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
    const response = await appFetch("/api/process", {
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
  resetCompressionState();
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
  const response = await appFetch("/api/export-xlsx", {
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

function formatMessageHtml(text) {
  const normalized = String(text || "").replace(/\r/g, "").trim();
  if (!normalized) {
    return "";
  }

  const lines = normalized.split("\n");
  const blocks = [];
  let listItems = [];

  function flushList() {
    if (!listItems.length) {
      return;
    }
    blocks.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join("")}</ul>`);
    listItems = [];
  }

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }
    const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (headingMatch) {
      flushList();
      blocks.push(`<p><strong>${formatInlineMessageText(headingMatch[1])}</strong></p>`);
      return;
    }
    if (bulletMatch || numberedMatch) {
      listItems.push(formatInlineMessageText((bulletMatch || numberedMatch)[1]));
      return;
    }
    flushList();
    blocks.push(`<p>${formatInlineMessageText(trimmed)}</p>`);
  });

  flushList();
  return blocks.join("");
}

function formatInlineMessageText(value) {
  let formatted = escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  formatted = formatted.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");
  formatted = formatted.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_match, label, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
  );
  formatted = formatted.replace(
    /(^|[\s>])(https?:\/\/[^\s<]+)/g,
    (_match, prefix, url) => `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );
  return formatted;
}

function getFileExtension(fileName) {
  const parts = String(fileName || "").split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function parseFileName(contentDisposition) {
  if (!contentDisposition) {
    return "";
  }
  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch (_error) {
      return utfMatch[1];
    }
  }
  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return plainMatch ? plainMatch[1] : "";
}

function parseNumericHeader(value) {
  const parsed = Number.parseInt(value || "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCompressionTarget() {
  const raw = String(elements.compressTargetInput?.value || "").trim().replace(",", ".");
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0.05 || parsed > 250) {
    return "";
  }
  return parsed.toFixed(2);
}

function formatMegabytes(bytes) {
  const safeValue = Number(bytes) || 0;
  return `${(safeValue / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  if (!safeSeconds) {
    return "menej než 1 s";
  }
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  if (!minutes) {
    return `${seconds} s`;
  }
  if (!seconds) {
    return `${minutes} min`;
  }
  return `${minutes} min ${seconds} s`;
}

function formatCompressionStatus(status, reachedTarget) {
  if (status === "already-small-enough") {
    return "Už spĺňa cieľ";
  }
  if (status === "already-optimized") {
    return "Bez ďalšieho zisku";
  }
  return reachedTarget ? "Cieľ splnený" : "Best effort";
}

function buildCompressionMessage(result) {
  if (result.status === "already-small-enough") {
    return `Súbor už bol menší než cieľ ${formatMegabytes(result.targetBytes)}, preto ostal bez zmeny.`;
  }
  if (result.status === "already-optimized") {
    return `Súbor sa nepodarilo zmenšiť pod ${formatMegabytes(result.targetBytes)} bez zhoršenia kvality.`;
  }
  if (result.reachedTarget) {
    return `Súbor sa zmenšil z ${formatMegabytes(result.originalBytes)} na ${formatMegabytes(result.compressedBytes)} pri cieli ${formatMegabytes(result.targetBytes)}.`;
  }
  return `Súbor sa zmenšil z ${formatMegabytes(result.originalBytes)} na ${formatMegabytes(result.compressedBytes)}. Cieľ ${formatMegabytes(result.targetBytes)} sa nepodarilo úplne dosiahnuť.`;
}
