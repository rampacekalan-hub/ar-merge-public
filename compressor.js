const state = {
  user: null,
  file: null,
  result: null,
  isBusy: false,
  uploadUi: {
    phase: "idle",
    progress: 0,
    progressTimer: null,
  },
};

const elements = {
  accountBtn: document.getElementById("accountBtn"),
  accountStatus: document.getElementById("accountStatus"),
  accountSummary: document.getElementById("accountSummary"),
  appShortcutBtn: document.getElementById("appShortcutBtn"),
  compressBtn: document.getElementById("compressBtn"),
  compressForm: document.getElementById("compressForm"),
  compressHeroBtn: document.getElementById("compressHeroBtn"),
  compressedSize: document.getElementById("compressedSize"),
  downloadBtn: document.getElementById("downloadBtn"),
  fileInput: document.getElementById("fileInput"),
  membershipBtn: document.getElementById("membershipBtn"),
  openAppBtn: document.getElementById("openAppBtn"),
  originalSize: document.getElementById("originalSize"),
  pickFileBtn: document.getElementById("pickFileBtn"),
  pricingBtn: document.getElementById("pricingBtn"),
  resetBtn: document.getElementById("resetBtn"),
  resultMessage: document.getElementById("resultMessage"),
  resultStatus: document.getElementById("resultStatus"),
  selectedFileSummary: document.getElementById("selectedFileSummary"),
  sidebar: document.getElementById("sidebar"),
  sidebarBackdrop: document.getElementById("sidebarBackdrop"),
  sidebarGroupToggles: document.querySelectorAll(".sidebar-group__toggle"),
  sidebarLinks: document.querySelectorAll(".sidebar__link"),
  sidebarToggle: document.getElementById("sidebarToggle"),
  targetSize: document.getElementById("targetSize"),
  targetSizeInput: document.getElementById("targetSizeInput"),
  uploadBox: document.getElementById("uploadBox"),
  uploadProgress: document.getElementById("uploadProgress"),
  uploadProgressBar: document.getElementById("uploadProgressBar"),
  uploadStateBadge: document.getElementById("uploadStateBadge"),
  uploadStateText: document.getElementById("uploadStateText"),
};

const SUPPORTED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);

bootstrap();

async function bootstrap() {
  disableServiceWorkers();
  bindEvents();
  renderResult();
  renderSelectedFile();
  renderUploadState();
  await refreshCurrentUser();
  renderAccessState();
}

function bindEvents() {
  elements.accountBtn?.addEventListener("click", openAppPage);
  elements.appShortcutBtn?.addEventListener("click", openAppPage);
  elements.compressForm?.addEventListener("submit", handleCompressSubmit);
  elements.compressHeroBtn?.addEventListener("click", handleUploadBoxClick);
  elements.downloadBtn?.addEventListener("click", downloadResult);
  elements.fileInput?.addEventListener("change", handleFileSelection);
  elements.membershipBtn?.addEventListener("click", openAppPage);
  elements.openAppBtn?.addEventListener("click", openAppPage);
  elements.pickFileBtn?.addEventListener("click", handleUploadBoxClick);
  elements.pricingBtn?.addEventListener("click", openAppPage);
  elements.resetBtn?.addEventListener("click", resetPage);
  elements.sidebarBackdrop?.addEventListener("click", closeSidebar);
  elements.sidebarLinks.forEach((link) => link.addEventListener("click", closeSidebar));
  elements.sidebarGroupToggles.forEach((toggle) => toggle.addEventListener("click", handleSidebarGroupToggle));
  elements.sidebarToggle?.addEventListener("click", toggleSidebar);
  elements.targetSizeInput?.addEventListener("input", renderResult);
  elements.uploadBox?.addEventListener("click", handleUploadBoxClick);
  elements.uploadBox?.addEventListener("keydown", handleUploadBoxKeydown);
  elements.uploadBox?.addEventListener("dragover", handleUploadDragOver);
  elements.uploadBox?.addEventListener("dragleave", handleUploadDragLeave);
  elements.uploadBox?.addEventListener("drop", handleUploadDrop);
  document.addEventListener("keydown", handleEscape);
}

async function refreshCurrentUser() {
  try {
    const response = await fetch("/api/me");
    const payload = await response.json();
    state.user = payload.user;
  } catch (_error) {
    state.user = null;
  }
}

function renderAccessState() {
  const isLoggedIn = Boolean(state.user);
  const hasMembership = Boolean(state.user?.membership_active);
  const accountLabel = state.user?.name?.trim() || state.user?.email || "Prihlásiť sa";
  const membershipUntil = formatDate(state.user?.membership_valid_until);

  if (elements.accountBtn) {
    elements.accountBtn.textContent = isLoggedIn ? accountLabel : "Prihlásiť sa";
  }

  if (elements.accountStatus) {
    if (hasMembership) {
      elements.accountStatus.textContent = `Prihlásený účet ${accountLabel} má aktívne členstvo${membershipUntil !== "—" ? ` do ${membershipUntil}` : ""} a kompresia je pripravená.`;
    } else if (isLoggedIn) {
      elements.accountStatus.textContent = `Prihlásený účet ${accountLabel} ešte nemá aktívne členstvo. Otvor aplikáciu a aktivuj prístup, potom môžeš komprimovať vlastné súbory.`;
    } else {
      elements.accountStatus.textContent = "Prihlás sa a aktivuj členstvo, potom môžeš zmenšiť PDF, JPG, PNG alebo WEBP.";
    }
  }

  if (!elements.accountSummary) {
    return;
  }

  if (!state.user) {
    elements.accountSummary.className = "account-summary empty-state";
    elements.accountSummary.textContent = "Zatiaľ nie si prihlásený.";
  } else {
    elements.accountSummary.className = "account-summary";
    elements.accountSummary.innerHTML = `
      <article class="account-card">
        <div class="account-card__row"><strong>Meno</strong><span>${escapeHtml(state.user.name || "—")}</span></div>
        <div class="account-card__row"><strong>E-mail</strong><span>${escapeHtml(state.user.email || "—")}</span></div>
        <div class="account-card__row"><strong>Stav členstva</strong><span>${escapeHtml(hasMembership ? "Aktívne" : "Neaktívne")}</span></div>
        <div class="account-card__row"><strong>Členstvo od</strong><span>${escapeHtml(formatDate(state.user.membership_started_at))}</span></div>
        <div class="account-card__row"><strong>Platné do</strong><span>${escapeHtml(membershipUntil)}</span></div>
      </article>
    `;
  }

  if (elements.pickFileBtn) {
    elements.pickFileBtn.textContent = hasMembership ? (state.file ? "Vybrať iný súbor" : "Vybrať súbor") : "Otvoriť účet v aplikácii";
  }
  if (elements.compressHeroBtn) {
    elements.compressHeroBtn.textContent = hasMembership ? (state.file ? "Zmeniť súbor" : "Vybrať súbor") : "Účet a členstvo";
  }
  if (elements.membershipBtn) {
    elements.membershipBtn.textContent = hasMembership ? "Otvoriť aplikáciu" : "Účet a členstvo";
  }
  if (elements.compressBtn) {
    elements.compressBtn.disabled = !hasMembership || !state.file || state.isBusy;
  }

  renderUploadState();
}

function renderUploadState() {
  if (!elements.uploadBox || !elements.uploadStateBadge || !elements.uploadStateText || !elements.uploadProgress || !elements.uploadProgressBar) {
    return;
  }

  const hasMembership = Boolean(state.user?.membership_active);
  const hasFile = Boolean(state.file);
  const { phase, progress } = state.uploadUi;

  elements.uploadBox.classList.toggle("upload--locked", !hasMembership);
  elements.uploadBox.classList.toggle("upload--ready", hasMembership && hasFile && phase !== "processing");
  elements.uploadBox.classList.toggle("upload--processing", phase === "processing");
  elements.uploadBox.classList.toggle("upload--done", phase === "done");

  let badge = "Pripravené";
  let text = "Vyber súbor a nastav cieľovú veľkosť.";
  let showProgress = false;

  if (!hasMembership) {
    badge = "Uzamknuté";
    text = "Kompresia je súčasťou aktívneho členstva.";
  } else if (phase === "processing") {
    badge = "Spracovanie";
    text = "Práve pripravujeme menšiu verziu súboru.";
    showProgress = true;
  } else if (phase === "done") {
    badge = "Hotovo";
    text = "Výsledok je pripravený nižšie na stiahnutie.";
  } else if (hasFile) {
    badge = "Súbor pripravený";
    text = `${state.file.name} čaká na kompresiu.`;
  }

  elements.uploadStateBadge.textContent = badge;
  elements.uploadStateText.textContent = text;
  elements.uploadProgress.hidden = !showProgress;
  elements.uploadProgressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
}

function renderSelectedFile() {
  if (!elements.selectedFileSummary) {
    return;
  }

  if (!state.file) {
    elements.selectedFileSummary.className = "account-summary empty-state";
    elements.selectedFileSummary.textContent = "Zatiaľ nie je vybraný žiadny súbor.";
    return;
  }

  const extension = getFileExtension(state.file.name).toUpperCase() || "SÚBOR";
  elements.selectedFileSummary.className = "account-summary";
  elements.selectedFileSummary.innerHTML = `
    <article class="account-card">
      <div class="account-card__row"><strong>Názov</strong><span>${escapeHtml(state.file.name)}</span></div>
      <div class="account-card__row"><strong>Typ</strong><span>${escapeHtml(extension)}</span></div>
      <div class="account-card__row"><strong>Veľkosť</strong><span>${escapeHtml(formatMegabytes(state.file.size))}</span></div>
      <div class="account-card__row"><strong>Cieľ</strong><span>${escapeHtml(formatTargetInputValue())}</span></div>
    </article>
  `;
}

function renderResult() {
  const targetLabel = formatTargetInputValue();
  if (elements.targetSize) {
    elements.targetSize.textContent = targetLabel;
  }

  if (!state.result) {
    if (elements.originalSize) {
      elements.originalSize.textContent = state.file ? formatMegabytes(state.file.size) : "0 MB";
    }
    if (elements.compressedSize) {
      elements.compressedSize.textContent = "0 MB";
    }
    if (elements.resultStatus) {
      elements.resultStatus.textContent = "Čaká na spracovanie";
    }
    if (elements.resultMessage) {
      elements.resultMessage.className = "empty-state";
      elements.resultMessage.textContent = "Zatiaľ bez výsledku. Nahraj súbor a spusti kompresiu.";
    }
    if (elements.downloadBtn) {
      elements.downloadBtn.disabled = true;
    }
    renderSelectedFile();
    return;
  }

  if (elements.originalSize) {
    const originalBytes = state.result.error ? state.file?.size || 0 : state.result.originalBytes;
    elements.originalSize.textContent = formatMegabytes(originalBytes);
  }
  if (elements.compressedSize) {
    elements.compressedSize.textContent = state.result.error ? "—" : formatMegabytes(state.result.compressedBytes);
  }
  if (elements.resultStatus) {
    elements.resultStatus.textContent = state.result.error ? "Chyba" : formatStatus(state.result.status, state.result.reachedTarget);
  }

  if (state.result.error) {
    elements.resultMessage.className = "auth-message auth-message--error compress-message";
    elements.resultMessage.textContent = state.result.error;
    elements.downloadBtn.disabled = true;
  } else {
    elements.resultMessage.className = "compress-message";
    elements.resultMessage.textContent = buildResultMessage(state.result);
    elements.downloadBtn.disabled = false;
  }

  renderSelectedFile();
}

function handleUploadBoxClick(event) {
  if (event) {
    event.preventDefault();
  }
  if (!state.user?.membership_active) {
    openAppPage();
    return;
  }
  elements.fileInput?.click();
}

function handleUploadBoxKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  event.preventDefault();
  handleUploadBoxClick();
}

function handleUploadDragOver(event) {
  event.preventDefault();
  if (!state.user?.membership_active) {
    return;
  }
  elements.uploadBox?.classList.add("is-dragover");
}

function handleUploadDragLeave() {
  elements.uploadBox?.classList.remove("is-dragover");
}

function handleUploadDrop(event) {
  event.preventDefault();
  elements.uploadBox?.classList.remove("is-dragover");
  if (!state.user?.membership_active) {
    openAppPage();
    return;
  }
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    setSelectedFile(file);
  }
}

function handleFileSelection(event) {
  const file = event.target.files?.[0];
  if (file) {
    setSelectedFile(file);
  }
}

function setSelectedFile(file) {
  const extension = getFileExtension(file.name).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    window.alert("Podporované sú len PDF, JPG, JPEG, PNG a WEBP.");
    return;
  }

  state.file = file;
  state.result = null;
  setUploadPhase("idle", 0);
  renderAccessState();
  renderSelectedFile();
  renderResult();
}

async function handleCompressSubmit(event) {
  if (event) {
    event.preventDefault();
  }

  if (!state.user?.membership_active) {
    openAppPage();
    return;
  }
  if (!state.file || state.isBusy) {
    return;
  }

  const targetMb = normalizeTargetInput();
  if (!targetMb) {
    window.alert("Zadaj platnú cieľovú veľkosť v MB.");
    return;
  }

  const formData = new FormData();
  formData.append("file", state.file);
  formData.append("target_mb", targetMb);

  state.isBusy = true;
  state.result = null;
  startUploadProgressLoop();
  renderAccessState();
  renderResult();

  try {
    const response = await fetch("/api/compress-file", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const cloned = response.clone();
      let message = "Kompresia zlyhala.";
      try {
        const payload = await response.json();
        message = payload.error || message;
      } catch (_error) {
        try {
          const rawText = await cloned.text();
          if (rawText && !rawText.includes("<") && !rawText.includes("@font-face")) {
            message = rawText.slice(0, 200);
          }
        } catch (_innerError) {
          // ignore invalid error payload
        }
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    state.result = {
      blob,
      compressedBytes: parseNumericHeader(response.headers.get("X-Compression-Compressed-Bytes")),
      fileName: parseFileName(response.headers.get("Content-Disposition")) || "subor-zmenseny",
      originalBytes: parseNumericHeader(response.headers.get("X-Compression-Original-Bytes")),
      reachedTarget: response.headers.get("X-Compression-Reached-Target") === "1",
      status: response.headers.get("X-Compression-Status") || "compressed",
      targetBytes: parseNumericHeader(response.headers.get("X-Compression-Target-Bytes")),
    };
    setUploadPhase("done", 100);
  } catch (error) {
    state.result = { error: error.message };
    setUploadPhase("idle", 0);
  } finally {
    state.isBusy = false;
    renderAccessState();
    renderResult();
    document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function downloadResult() {
  if (!state.result || state.result.error || !state.result.blob) {
    return;
  }
  triggerDownload(state.result.blob, state.result.fileName);
}

function resetPage() {
  state.file = null;
  state.result = null;
  state.isBusy = false;
  setUploadPhase("idle", 0);
  if (elements.fileInput) {
    elements.fileInput.value = "";
  }
  renderAccessState();
  renderSelectedFile();
  renderResult();
}

function startUploadProgressLoop() {
  setUploadPhase("processing", 12);
  state.uploadUi.progressTimer = window.setInterval(() => {
    if (state.uploadUi.progress >= 84) {
      return;
    }
    state.uploadUi.progress += Math.random() > 0.55 ? 11 : 7;
    renderUploadState();
  }, 280);
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

function toggleSidebar() {
  const willOpen = !document.body.classList.contains("sidebar-open");
  document.body.classList.toggle("sidebar-open", willOpen);
  if (elements.sidebarBackdrop) {
    elements.sidebarBackdrop.hidden = !willOpen;
  }
}

function closeSidebar() {
  document.body.classList.remove("sidebar-open");
  elements.uploadBox?.classList.remove("is-dragover");
  if (elements.sidebarBackdrop) {
    elements.sidebarBackdrop.hidden = true;
  }
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

function handleEscape(event) {
  if (event.key === "Escape") {
    closeSidebar();
  }
}

function openAppPage() {
  window.location.href = "/app.html";
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

function formatStatus(status, reachedTarget) {
  if (status === "already-small-enough") {
    return "Už spĺňa cieľ";
  }
  if (status === "already-optimized") {
    return "Bez ďalšieho zisku";
  }
  return reachedTarget ? "Cieľ splnený" : "Best effort";
}

function buildResultMessage(result) {
  if (result.status === "already-small-enough") {
    return `Súbor už bol menší než cieľ ${formatMegabytes(result.targetBytes)}, preto ostal bez zmeny.`;
  }
  if (result.status === "already-optimized") {
    return `Súbor sa nepodarilo zmenšiť pod ${formatMegabytes(result.targetBytes)} bez toho, aby výsledok narástol alebo sa zbytočne zhoršil.`;
  }
  if (result.reachedTarget) {
    return `Súbor sa zmenšil z ${formatMegabytes(result.originalBytes)} na ${formatMegabytes(result.compressedBytes)} pri cieli ${formatMegabytes(result.targetBytes)}.`;
  }
  return `Súbor sa zmenšil z ${formatMegabytes(result.originalBytes)} na ${formatMegabytes(result.compressedBytes)}, ale cieľ ${formatMegabytes(result.targetBytes)} sa nepodarilo úplne dosiahnuť.`;
}

function normalizeTargetInput() {
  const raw = String(elements.targetSizeInput?.value || "").trim().replace(",", ".");
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0.05 || parsed > 250) {
    return "";
  }
  return parsed.toFixed(2);
}

function formatTargetInputValue() {
  const normalized = normalizeTargetInput();
  return normalized ? `${normalized} MB` : "0.50 MB";
}

function formatMegabytes(value) {
  const safeValue = Number(value) || 0;
  const mbValue = safeValue / (1024 * 1024);
  if (mbValue < 0.1) {
    return `${Math.max(1, Math.round(safeValue / 1024))} KB`;
  }
  return `${mbValue.toFixed(2)} MB`;
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

async function disableServiceWorkers() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch (_error) {
    // ignore service worker cleanup issues
  }
}
