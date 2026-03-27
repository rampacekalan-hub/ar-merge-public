const state = {
  user: null,
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
};

const elements = {
  fileInput: document.getElementById("fileInput"),
  uploadBox: document.getElementById("uploadBox"),
  buyHeroBtn: document.getElementById("buyHeroBtn"),
  accountBtn: document.getElementById("accountBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  accountStatus: document.getElementById("accountStatus"),
  accountSummary: document.getElementById("accountSummary"),
  uploadTitle: document.getElementById("uploadTitle"),
  uploadSubtitle: document.getElementById("uploadSubtitle"),
  unlockUploadBtn: document.getElementById("unlockUploadBtn"),
  buyToolbarBtn: document.getElementById("buyToolbarBtn"),
  buyProBtn: document.getElementById("buyProBtn"),
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
};

bootstrap();

async function bootstrap() {
  disableServiceWorkers();
  await refreshCurrentUser();
  elements.fileInput.addEventListener("change", handleFileSelection);
  elements.uploadBox.addEventListener("click", handleUploadBoxClick);
  elements.buyHeroBtn.addEventListener("click", startCheckoutFlow);
  elements.accountBtn.addEventListener("click", () => openAuthModal(state.user ? "login" : "register"));
  elements.logoutBtn.addEventListener("click", logout);
  elements.unlockUploadBtn.addEventListener("click", startProCheckout);
  elements.buyToolbarBtn.addEventListener("click", startCheckoutFlow);
  elements.buyProBtn.addEventListener("click", startCheckoutFlow);
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
  renderAccessState();
}

function renderAccessState() {
  const hasMembership = Boolean(state.user?.membership_active);
  const isLoggedIn = Boolean(state.user);
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
    elements.buyHeroBtn.textContent = hasMembership ? "Členstvo aktívne" : "Aktivovať členstvo";
    elements.buyHeroBtn.disabled = false;
  }
  if (elements.unlockUploadBtn) {
    elements.unlockUploadBtn.textContent = hasMembership ? "Vybrať súbory" : "Aktivovať cez Stripe";
    elements.unlockUploadBtn.disabled = false;
  }
  if (elements.buyProBtn) {
    elements.buyProBtn.textContent = hasMembership ? "Členstvo aktívne" : "Aktivovať za 0,99 € / mesiac";
    elements.buyProBtn.disabled = hasMembership;
  }
  if (elements.fileInput) {
    elements.fileInput.disabled = !hasMembership;
  }
  if (elements.accountBtn) {
    elements.accountBtn.textContent = isLoggedIn ? accountLabel : "Prihlásiť sa";
  }
  if (elements.logoutBtn) {
    elements.logoutBtn.classList.toggle("is-hidden", !isLoggedIn);
  }
  if (elements.accountStatus) {
    if (hasMembership) {
      elements.accountStatus.textContent = `Prihlásený účet ${accountLabel} má aktívne členstvo${membershipUntil !== "—" ? ` do ${membershipUntil}` : ""}.`;
    } else if (isLoggedIn) {
      elements.accountStatus.textContent = `Prihlásený účet ${accountLabel} ešte nemá aktívne členstvo.`;
    } else {
      elements.accountStatus.textContent = "Vytvor si účet a aktivuj mesačné členstvo pre vlastný import databáz.";
    }
  }
  if (elements.uploadTitle) {
    elements.uploadTitle.textContent = hasMembership
      ? "Import pre tvoje členstvo je odomknutý"
      : "Plný import je súčasťou členského prístupu";
  }
  if (elements.uploadSubtitle) {
    elements.uploadSubtitle.textContent = hasMembership
      ? "Môžeš nahrať vlastné CSV, XLSX alebo XLS súbory a spracovať ich."
      : isLoggedIn
        ? "Účet je pripravený. Aktivuj členstvo cez Stripe a potom sa odomkne vlastný import."
        : "Najprv sa zaregistruj, prihlás sa a aktivuj členstvo na 1 mesiac.";
  }
  renderAccountSummary();
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

function syncModalState() {
  const hasOpenModal =
    !elements.promoModal.hidden ||
    !elements.authModal.hidden ||
    !elements.resetRequestModal.hidden ||
    !elements.resetPasswordModal.hidden;
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
      <div class="account-card__row"><strong>Registrovaný od</strong><span>${escapeHtml(formatDate(state.user.created_at))}</span></div>
      <div class="account-card__row"><strong>Stav členstva</strong><span>${escapeHtml(state.user.membership_active ? "Aktívne" : "Neaktívne")}</span></div>
      <div class="account-card__row"><strong>Členstvo od</strong><span>${escapeHtml(formatDate(state.user.membership_started_at))}</span></div>
      <div class="account-card__row"><strong>Platné do</strong><span>${escapeHtml(formatDate(state.user.membership_valid_until))}</span></div>
    </article>
  `;
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
    renderAccessState();
    return;
  }
  await startProCheckout();
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

    renderDatasetResults();
    renderSummary();
    renderResultTable();
    renderDuplicatesAudit();
  } catch (error) {
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
