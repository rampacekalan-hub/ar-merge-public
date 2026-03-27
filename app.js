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
  buyHeroBtn: document.getElementById("buyHeroBtn"),
  accountBtn: document.getElementById("accountBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  accountStatus: document.getElementById("accountStatus"),
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
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  authSubmitBtn: document.getElementById("authSubmitBtn"),
  authMessage: document.getElementById("authMessage"),
};

bootstrap();

async function bootstrap() {
  disableServiceWorkers();
  await refreshCurrentUser();
  elements.fileInput.addEventListener("change", handleFileSelection);
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
    elements.unlockUploadBtn.textContent = hasMembership ? "Import odomknutý" : "Aktivovať cez Stripe";
    elements.unlockUploadBtn.disabled = hasMembership;
  }
  if (elements.buyProBtn) {
    elements.buyProBtn.textContent = hasMembership ? "Členstvo aktívne" : "Aktivovať za 0,99 € / mesiac";
    elements.buyProBtn.disabled = hasMembership;
  }
  if (elements.fileInput) {
    elements.fileInput.disabled = !hasMembership;
  }
  if (elements.accountBtn) {
    elements.accountBtn.textContent = isLoggedIn ? state.user.email : "Prihlásiť sa";
  }
  if (elements.logoutBtn) {
    elements.logoutBtn.classList.toggle("is-hidden", !isLoggedIn);
  }
  if (elements.accountStatus) {
    if (hasMembership) {
      elements.accountStatus.textContent = `Prihlásený účet ${state.user.email} má aktívne členstvo.`;
    } else if (isLoggedIn) {
      elements.accountStatus.textContent = `Prihlásený účet ${state.user.email} ešte nemá aktívne členstvo.`;
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
  const hasOpenModal = !elements.promoModal.hidden || !elements.authModal.hidden;
  document.body.classList.toggle("modal-open", hasOpenModal);
}

function openAuthModal(mode = "register") {
  setAuthMode(mode);
  clearAuthMessage();
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
  if (checkoutState === "success" && state.user?.membership_active) {
    window.alert("Členstvo bolo úspešne aktivované.");
  }
  if (checkoutState === "cancel") {
    window.alert("Platba bola zrušená.");
  }
  if (checkoutState) {
    url.searchParams.delete("checkout");
    window.history.replaceState({}, "", url.toString());
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  clearAuthMessage();

  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;
  const endpoint = state.authMode === "register" ? "/api/register" : "/api/login";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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
  renderAccessState();
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
