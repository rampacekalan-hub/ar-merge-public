const state = {
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
  demoBtn: document.getElementById("demoBtn"),
  demoInfoBtn: document.getElementById("demoInfoBtn"),
  startFreeBtn: document.getElementById("startFreeBtn"),
  pricingFreeBtn: document.getElementById("pricingFreeBtn"),
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
  demoModal: document.getElementById("demoModal"),
  demoModalBackdrop: document.getElementById("demoModalBackdrop"),
  demoModalClose: document.getElementById("demoModalClose"),
  demoModalDismiss: document.getElementById("demoModalDismiss"),
  demoModalLoad: document.getElementById("demoModalLoad"),
  promoModal: document.getElementById("promoModal"),
  promoModalBackdrop: document.getElementById("promoModalBackdrop"),
  promoModalClose: document.getElementById("promoModalClose"),
  promoModalStart: document.getElementById("promoModalStart"),
};

bootstrap();

function bootstrap() {
  disableServiceWorkers();
  elements.fileInput.addEventListener("change", handleFileSelection);
  elements.demoBtn.addEventListener("click", loadDemoFiles);
  elements.demoInfoBtn.addEventListener("click", openDemoModal);
  elements.startFreeBtn.addEventListener("click", startFreeTrial);
  elements.pricingFreeBtn.addEventListener("click", startFreeTrial);
  elements.buyProBtn.addEventListener("click", startProCheckout);
  elements.mergeBtn.addEventListener("click", processFiles);
  elements.resetBtn.addEventListener("click", resetApp);
  elements.demoModalBackdrop.addEventListener("click", closeDemoModal);
  elements.demoModalClose.addEventListener("click", closeDemoModal);
  elements.demoModalDismiss.addEventListener("click", closeDemoModal);
  elements.demoModalLoad.addEventListener("click", async () => {
    closeDemoModal();
    await loadDemoFiles();
  });
  elements.promoModalBackdrop.addEventListener("click", closePromoModal);
  elements.promoModalClose.addEventListener("click", closePromoModal);
  elements.promoModalStart.addEventListener("click", () => {
    closePromoModal();
    startFreeTrial();
  });
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
}

function openDemoModal() {
  elements.demoModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeDemoModal() {
  elements.demoModal.hidden = true;
  syncModalState();
}

function handleModalEscape(event) {
  if (event.key !== "Escape") {
    return;
  }

  if (!elements.demoModal.hidden) {
    closeDemoModal();
  }
  if (!elements.promoModal.hidden) {
    closePromoModal();
  }
}

function maybeOpenPromoModal() {
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
  const hasOpenModal = !elements.demoModal.hidden || !elements.promoModal.hidden;
  document.body.classList.toggle("modal-open", hasOpenModal);
}

function startFreeTrial() {
  elements.fileInput.scrollIntoView({ behavior: "smooth", block: "center" });
}

function startProCheckout() {
  const paymentLink = window.AR_MERGE_BILLING?.stripePaymentLink || "";
  if (!paymentLink) {
    window.alert("Stripe Payment Link este nie je nastaveny. Doplň ho v billing-config.js.");
    return;
  }
  window.location.href = paymentLink;
}

async function loadDemoFiles() {
  elements.demoBtn.disabled = true;
  elements.demoBtn.textContent = "Nahrávam ukážku...";

  try {
    const demoFiles = await Promise.all([
      fetchDemoFile("examples/contacts_a.csv"),
      fetchDemoFile("examples/contacts_b.csv"),
    ]);

    state.files = demoFiles;
    renderSelectedFiles();
    elements.mergeBtn.disabled = false;
  } catch (error) {
    window.alert(`Ukážku sa nepodarilo načítať: ${error.message}`);
  } finally {
    elements.demoBtn.disabled = false;
    elements.demoBtn.textContent = "Načítať ukážku";
  }
}

async function fetchDemoFile(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error("Demo súbor sa nepodarilo načítať.");
  }

  const blob = await response.blob();
  const fileName = path.split("/").pop() || "demo.csv";
  return new File([blob], fileName, { type: blob.type || "text/csv" });
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
  const files = Array.from(event.target.files || []);
  if (!files.length) {
    return;
  }

  state.files.push(...files);
  renderSelectedFiles();
  elements.mergeBtn.disabled = state.files.length === 0;
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
    elements.mergeBtn.disabled = state.files.length === 0;
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
  elements.mergeBtn.disabled = true;
  elements.demoBtn.disabled = false;
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
