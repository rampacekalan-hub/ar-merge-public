const aiState = {
  user: null,
  threads: [],
  activeThreadId: 0,
  messages: [],
  typing: false,
  attachment: null,
  renaming: false,
};

const aiElements = {
  sidebar: document.getElementById("aiSidebar"),
  sidebarBackdrop: document.getElementById("aiSidebarBackdrop"),
  sidebarToggle: document.getElementById("aiSidebarToggle"),
  accountBtn: document.getElementById("aiAccountBtn"),
  logoutBtn: document.getElementById("aiLogoutBtn"),
  adminBtn: document.getElementById("aiAdminBtn"),
  checkoutBtn: document.getElementById("aiCheckoutBtn"),
  loginLink: document.getElementById("aiLoginLink"),
  nowPill: document.getElementById("aiNowPill"),
  membershipPill: document.getElementById("aiMembershipPill"),
  lockedState: document.getElementById("aiLockedState"),
  lockedTitle: document.getElementById("aiLockedTitle"),
  lockedText: document.getElementById("aiLockedText"),
  chatReady: document.getElementById("aiChatReady"),
  chatFeed: document.getElementById("aiChatFeed"),
  chatForm: document.getElementById("aiChatForm"),
  composerShell: document.querySelector(".ai-chatboard__composer-shell"),
  chatInput: document.getElementById("aiChatInput"),
  imageInput: document.getElementById("aiImageInput"),
  attachBtn: document.getElementById("aiAttachBtn"),
  attachmentBar: document.getElementById("aiAttachmentBar"),
  chatSubmit: document.getElementById("aiChatSubmit"),
  chatMessage: document.getElementById("aiChatMessage"),
  chatHeadline: document.getElementById("aiChatHeadline"),
  renameThreadBtn: document.getElementById("aiRenameThreadBtn"),
  renameForm: document.getElementById("aiRenameForm"),
  renameInput: document.getElementById("aiRenameInput"),
  renameCancelBtn: document.getElementById("aiRenameCancelBtn"),
  promptButtons: Array.from(document.querySelectorAll(".js-ai-prompt")),
  newThreadBtn: document.getElementById("aiNewThreadBtn"),
  threadList: document.getElementById("aiThreadList"),
  threadCount: document.getElementById("aiThreadCount"),
};

bootstrapAi();

async function bootstrapAi() {
  await disableServiceWorkers();
  bindAiEvents();
  startNowTicker();
  await refreshAiUser();
  renderAiState();
  if (aiState.user?.membership_active) {
    await loadAssistant();
  }
}

function bindAiEvents() {
  aiElements.sidebarToggle?.addEventListener("click", () => {
    document.body.classList.toggle("ai-sidebar-open");
  });
  aiElements.sidebarBackdrop?.addEventListener("click", () => {
    document.body.classList.remove("ai-sidebar-open");
  });
  aiElements.accountBtn?.addEventListener("click", handleAccountClick);
  aiElements.logoutBtn?.addEventListener("click", handleLogout);
  aiElements.checkoutBtn?.addEventListener("click", startCheckoutFlow);
  aiElements.chatForm?.addEventListener("submit", handleChatSubmit);
  aiElements.chatFeed?.addEventListener("click", handleChatFeedClick);
  aiElements.attachmentBar?.addEventListener("click", handleAttachmentBarClick);
  aiElements.threadList?.addEventListener("click", handleThreadListClick);
  aiElements.newThreadBtn?.addEventListener("click", handleNewThreadClick);
  aiElements.renameThreadBtn?.addEventListener("click", openRenameThread);
  aiElements.renameCancelBtn?.addEventListener("click", closeRenameThread);
  aiElements.renameForm?.addEventListener("submit", handleRenameThreadSubmit);
  aiElements.chatInput?.addEventListener("input", () => autoResizeTextarea(aiElements.chatInput));
  aiElements.chatInput?.addEventListener("keydown", handleChatKeydown);
  aiElements.chatInput?.addEventListener("paste", handleChatPaste);
  aiElements.attachBtn?.addEventListener("click", () => aiElements.imageInput?.click());
  aiElements.imageInput?.addEventListener("change", handleAttachmentSelection);
  aiElements.composerShell?.addEventListener("dragover", handleComposerDragOver);
  aiElements.composerShell?.addEventListener("dragleave", handleComposerDragLeave);
  aiElements.composerShell?.addEventListener("drop", handleComposerDrop);
  aiElements.promptButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!aiElements.chatInput) {
        return;
      }
      aiElements.chatInput.value = button.dataset.prompt || "";
      autoResizeTextarea(aiElements.chatInput);
      aiElements.chatInput.focus();
    });
  });
}

function startNowTicker() {
  renderNowPill();
  window.setInterval(renderNowPill, 30_000);
}

function renderNowPill() {
  if (!aiElements.nowPill) {
    return;
  }
  const now = new Date();
  aiElements.nowPill.textContent = new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
}

async function refreshAiUser() {
  const response = await fetch("/api/me");
  const payload = await response.json();
  aiState.user = payload.user || null;
}

function getThreadStorageKey() {
  const userId = aiState.user?.id || "guest";
  return `unifyo_ai_active_thread_${userId}`;
}

function persistActiveThread(threadId) {
  if (!aiState.user) {
    return;
  }
  if (threadId) {
    window.localStorage.setItem(getThreadStorageKey(), String(threadId));
    return;
  }
  window.localStorage.removeItem(getThreadStorageKey());
}

function getPreferredThreadId() {
  if (!aiState.user) {
    return 0;
  }
  const value = window.localStorage.getItem(getThreadStorageKey()) || "";
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function renderAiState() {
  const user = aiState.user;
  const isLoggedIn = Boolean(user);
  const hasMembership = Boolean(user?.membership_active);

  if (aiElements.accountBtn) {
    aiElements.accountBtn.textContent = isLoggedIn ? (user.name?.trim() || user.email || "Účet") : "Prihlásiť sa";
  }
  if (aiElements.logoutBtn) {
    aiElements.logoutBtn.classList.toggle("is-hidden", !isLoggedIn);
  }
  if (aiElements.adminBtn) {
    aiElements.adminBtn.classList.toggle("is-hidden", !Boolean(user?.is_admin));
  }
  if (aiElements.membershipPill) {
    aiElements.membershipPill.textContent = hasMembership
      ? `Aktívne do ${formatDate(user.membership_valid_until)}`
      : isLoggedIn
        ? "Bez aktívneho členstva"
        : "Vyžaduje prihlásenie";
  }
  if (aiElements.lockedState) {
    aiElements.lockedState.classList.toggle("is-hidden", hasMembership);
  }
  if (aiElements.chatReady) {
    aiElements.chatReady.classList.toggle("is-hidden", !hasMembership);
  }
  if (aiElements.lockedTitle) {
    aiElements.lockedTitle.textContent = !isLoggedIn
      ? "Prihlás sa a otvor si Unifyo AI"
      : "Aktivuj členstvo a začni AI chat";
  }
  if (aiElements.lockedText) {
    aiElements.lockedText.textContent = !isLoggedIn
      ? "Po prihlásení získaš pracovný AI chat pre slovenského finančného sprostredkovateľa."
      : "Po aktivácii členstva môžeš používať AI chat, kontakty aj kompresiu v jednom účte.";
  }
  if (aiElements.checkoutBtn) {
    aiElements.checkoutBtn.classList.toggle("is-hidden", !isLoggedIn || hasMembership);
  }
  if (aiElements.loginLink) {
    aiElements.loginLink.textContent = isLoggedIn ? "Prejsť do aplikácie" : "Prihlásiť sa / Registrovať";
  }
  if (aiElements.newThreadBtn) {
    aiElements.newThreadBtn.disabled = !hasMembership;
  }
  if (aiElements.renameThreadBtn) {
    aiElements.renameThreadBtn.disabled = !hasMembership || !aiState.activeThreadId;
  }
  if (aiElements.attachBtn) {
    aiElements.attachBtn.disabled = !hasMembership;
  }
  [aiElements.chatInput, aiElements.chatSubmit].forEach((element) => {
    if (element) {
      element.disabled = !hasMembership;
    }
  });
  aiElements.promptButtons.forEach((button) => {
    button.disabled = !hasMembership;
  });
  renderAttachmentBar();
  renderThreadList();
}

async function loadAssistant(threadId = 0) {
  try {
    const effectiveThreadId = threadId || getPreferredThreadId() || Number(aiState.activeThreadId || 0);
    const suffix = effectiveThreadId ? `?thread_id=${encodeURIComponent(String(effectiveThreadId))}` : "";
    const response = await fetch(`/api/assistant${suffix}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "AI asistent sa nepodarilo načítať.");
    }
    aiState.threads = payload.threads || [];
    aiState.activeThreadId = Number(payload.active_thread_id || 0);
    aiState.messages = payload.messages || [];
    persistActiveThread(aiState.activeThreadId);
    renderAssistantData();
  } catch (error) {
    renderEmptyChat(error.message, true);
  }
}

function renderAssistantData() {
  const activeThread = getActiveThread();
  if (aiElements.chatHeadline) {
    aiElements.chatHeadline.textContent = activeThread?.title || "Nový chat";
  }
  if (aiElements.renameInput && activeThread) {
    aiElements.renameInput.value = activeThread.title || "";
  }
  renderThreadList();
  renderAttachmentBar();
  autoResizeTextarea(aiElements.chatInput);
  renderMessages();
  if (aiElements.chatInput && aiState.user?.membership_active) {
    aiElements.chatInput.focus();
  }
}

function getActiveThread() {
  return aiState.threads.find((thread) => Number(thread.id) === Number(aiState.activeThreadId)) || null;
}

function renderThreadList() {
  if (!aiElements.threadList) {
    return;
  }
  if (aiElements.threadCount) {
    aiElements.threadCount.textContent = String(aiState.threads.length || 0);
  }
  if (!aiState.user?.membership_active) {
    aiElements.threadList.className = "ai-thread-list empty-state";
    aiElements.threadList.textContent = "História chatov sa zobrazí po aktivácii členstva.";
    return;
  }
  if (!aiState.threads.length) {
    aiElements.threadList.className = "ai-thread-list empty-state";
    aiElements.threadList.textContent = "Zatiaľ bez chatov. Začni nový.";
    return;
  }
  aiElements.threadList.className = "ai-thread-list";
  aiElements.threadList.innerHTML = aiState.threads.map((thread) => `
    <button
      class="ai-thread-item${Number(thread.id) === Number(aiState.activeThreadId) ? " is-active" : ""}"
      type="button"
      data-thread-id="${thread.id}"
    >
      <strong>${escapeHtml(thread.title || "Nový chat")}</strong>
      <span>${escapeHtml(thread.last_message ? truncateText(thread.last_message, 70) : "Pripravené na pokračovanie")}</span>
      <small>${escapeHtml(thread.last_message_at ? formatDateTime(thread.last_message_at) : formatDate(thread.created_at))}</small>
    </button>
  `).join("");
}

function renderMessages() {
  if (!aiState.messages.length) {
    renderEmptyChat();
    return;
  }

  aiElements.chatFeed.className = "ai-chatboard__feed";
  aiElements.chatFeed.innerHTML = aiState.messages.map((message, index) => `
    <article class="ai-message ai-message--${escapeHtml(message.role || "assistant")}" data-message-index="${index}">
      <div class="ai-message__row ai-message__row--${escapeHtml(message.role || "assistant")}">
        <div class="ai-message__bubble">
          <div class="ai-message__meta">
            <span>${escapeHtml(message.role === "user" ? "Ty" : "Unifyo AI")}</span>
            <span>${escapeHtml(formatDateTime(message.created_at))}</span>
            ${message.role === "assistant" ? `<span class="ai-review-pill ai-review-pill--${escapeHtml(message.review_status || "unreviewed")}">${escapeHtml(formatReviewStatus(message.review_status))}</span>` : ""}
            ${message.role === "assistant" ? '<button class="ai-copy-btn js-ai-copy" type="button">Kopírovať</button>' : ""}
          </div>
          <div class="ai-message__content">${formatMessageHtml(message.content || "")}</div>
        </div>
      </div>
    </article>
  `).join("");

  if (aiState.typing) {
    aiElements.chatFeed.insertAdjacentHTML(
      "beforeend",
      `
        <article class="ai-message ai-message--assistant">
          <div class="ai-message__row ai-message__row--assistant">
            <div class="ai-message__bubble ai-message__bubble--typing">
              <div class="ai-message__meta">
                <span>Unifyo AI</span>
                <span>práve teraz</span>
              </div>
              <div class="ai-message__typing"><span></span><span></span><span></span></div>
            </div>
          </div>
        </article>
      `
    );
  }

  aiElements.chatFeed.scrollTop = aiElements.chatFeed.scrollHeight;
}

function renderAttachmentBar() {
  if (!aiElements.attachmentBar) {
    return;
  }
  if (!aiState.attachment) {
    aiElements.attachmentBar.classList.add("is-hidden");
    aiElements.attachmentBar.innerHTML = "";
    return;
  }
  aiElements.attachmentBar.classList.remove("is-hidden");
  aiElements.attachmentBar.innerHTML = `
    <div class="ai-attachment-chip">
      <span class="ai-attachment-chip__label">Obrázok</span>
      <strong>${escapeHtml(aiState.attachment.name)}</strong>
      <button class="ai-attachment-chip__remove" type="button" data-action="remove-attachment">×</button>
    </div>
  `;
}

function renderEmptyChat(message = "", isError = false) {
  if (message) {
    aiElements.chatFeed.className = `ai-chatboard__feed empty-state${isError ? " auth-message auth-message--error" : ""}`;
    aiElements.chatFeed.textContent = message;
    return;
  }

  aiElements.chatFeed.className = "ai-chatboard__feed empty-state";
  aiElements.chatFeed.innerHTML = `
    <div class="ai-empty-state">
      <span class="pill">Nový chat</span>
      <h3>Začni prvou otázkou</h3>
      <p>Napíš situáciu z praxe, pridaj obrázok alebo screenshot a dostaneš stručnú, praktickú odpoveď s ďalším krokom.</p>
    </div>
  `;
}

async function handleChatFeedClick(event) {
  const button = event.target.closest(".js-ai-copy");
  if (!button) {
    return;
  }
  const messageContainer = button.closest(".ai-message");
  if (!messageContainer) {
    return;
  }
  const index = Number(messageContainer.dataset.messageIndex || "-1");
  if (Number.isNaN(index) || index < 0 || index >= aiState.messages.length) {
    return;
  }
  const message = aiState.messages[index];
  if (!message || message.role !== "assistant" || !message.content) {
    return;
  }
  try {
    await navigator.clipboard.writeText(String(message.content));
    const previousLabel = button.textContent;
    button.textContent = "Skopírované";
    setTimeout(() => {
      button.textContent = previousLabel;
    }, 1400);
  } catch (_error) {
    setInlineMessage(aiElements.chatMessage, "Kopírovanie sa nepodarilo. Skús to znova.", true);
  }
}

async function handleThreadListClick(event) {
  const button = event.target.closest("[data-thread-id]");
  if (!button) {
    return;
  }
  const threadId = Number(button.dataset.threadId || "0");
  if (!threadId || threadId === Number(aiState.activeThreadId)) {
    return;
  }
  document.body.classList.remove("ai-sidebar-open");
  await loadAssistant(threadId);
}

function handleAttachmentSelection(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  setAttachment(file);
}

function setAttachment(file) {
  if (!file) {
    return;
  }
  if (!String(file.type || "").startsWith("image/")) {
    setInlineMessage(aiElements.chatMessage, "AI aktuálne podporuje iba obrázky.", true);
    return;
  }
  aiState.attachment = file;
  renderAttachmentBar();
  setInlineMessage(aiElements.chatMessage, "", false, true);
}

function clearAttachment() {
  aiState.attachment = null;
  if (aiElements.imageInput) {
    aiElements.imageInput.value = "";
  }
  renderAttachmentBar();
}

function handleAttachmentBarClick(event) {
  const button = event.target.closest('[data-action="remove-attachment"]');
  if (!button) {
    return;
  }
  clearAttachment();
}

function handleComposerDragOver(event) {
  event.preventDefault();
  aiElements.composerShell?.classList.add("is-dragover");
}

function handleComposerDragLeave(event) {
  if (event.target === aiElements.composerShell || !aiElements.composerShell?.contains(event.relatedTarget)) {
    aiElements.composerShell?.classList.remove("is-dragover");
  }
}

function handleComposerDrop(event) {
  event.preventDefault();
  aiElements.composerShell?.classList.remove("is-dragover");
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    setAttachment(file);
  }
}

function openRenameThread() {
  const activeThread = getActiveThread();
  if (!activeThread || !aiElements.renameForm || !aiElements.renameInput) {
    return;
  }
  aiState.renaming = true;
  aiElements.renameForm.classList.remove("is-hidden");
  aiElements.renameInput.value = activeThread.title || "";
  aiElements.renameInput.focus();
  aiElements.renameInput.select();
}

function closeRenameThread() {
  aiState.renaming = false;
  aiElements.renameForm?.classList.add("is-hidden");
}

async function handleRenameThreadSubmit(event) {
  event.preventDefault();
  const activeThread = getActiveThread();
  const title = aiElements.renameInput?.value.trim() || "";
  if (!activeThread || title.length < 2) {
    setInlineMessage(aiElements.chatMessage, "Zadaj názov chatu.", true);
    return;
  }
  try {
    const response = await fetch("/api/assistant/thread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rename",
        thread_id: activeThread.id,
        title,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Názov chatu sa nepodarilo uložiť.");
    }
    aiState.threads = payload.threads || aiState.threads;
    aiState.activeThreadId = Number(payload.thread?.id || aiState.activeThreadId || 0);
    aiState.messages = payload.messages || aiState.messages;
    closeRenameThread();
    renderAssistantData();
  } catch (error) {
    setInlineMessage(aiElements.chatMessage, error.message, true);
  }
}

async function handleNewThreadClick() {
  if (!aiState.user?.membership_active) {
    await startCheckoutFlow();
    return;
  }
  try {
    const response = await fetch("/api/assistant/thread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nový chat" }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Nový chat sa nepodarilo vytvoriť.");
    }
    aiState.threads = payload.threads || [];
    aiState.activeThreadId = Number(payload.thread?.id || 0);
    aiState.messages = payload.messages || [];
    persistActiveThread(aiState.activeThreadId);
    document.body.classList.remove("ai-sidebar-open");
    renderAssistantData();
  } catch (error) {
    setInlineMessage(aiElements.chatMessage, error.message, true);
  }
}

function handleChatKeydown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    aiElements.chatForm?.requestSubmit();
  }
}

function handleChatPaste(event) {
  const items = Array.from(event.clipboardData?.items || []);
  const imageItem = items.find((item) => String(item.type || "").startsWith("image/"));
  if (!imageItem) {
    return;
  }
  const file = imageItem.getAsFile();
  if (!file) {
    return;
  }
  event.preventDefault();
  setAttachment(file);
}

async function handleChatSubmit(event) {
  event.preventDefault();
  if (!aiState.user?.membership_active) {
    await startCheckoutFlow();
    return;
  }

  const message = aiElements.chatInput?.value.trim() || "";
  if (message.length < 2 && !aiState.attachment) {
    setInlineMessage(aiElements.chatMessage, "Napíš správu alebo prilož obrázok pre AI asistenta.", true);
    return;
  }

  if (!aiState.activeThreadId) {
    await handleNewThreadClick();
  }

  setInlineMessage(aiElements.chatMessage, "", false, true);
  aiState.typing = true;
  aiState.messages = [
    ...aiState.messages,
    {
      role: "user",
      content: aiState.attachment ? `${message || "Vyhodnoť prosím priložený obrázok."}\n\n[Priložený obrázok: ${aiState.attachment.name}]` : message,
      created_at: new Date().toISOString(),
      review_status: "approved",
      meta: aiState.attachment ? { attachment_name: aiState.attachment.name } : {},
    },
  ];
  renderMessages();
  aiElements.chatForm.reset();
  autoResizeTextarea(aiElements.chatInput);
  aiElements.chatSubmit.disabled = true;
  aiElements.chatSubmit.textContent = "Posielam...";

  try {
    const response = await sendAssistantMessage(message);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "AI asistent neodpovedal.");
    }
    aiState.threads = payload.threads || aiState.threads;
    aiState.activeThreadId = Number(payload.active_thread_id || aiState.activeThreadId || 0);
    aiState.messages = payload.messages || aiState.messages;
    setInlineMessage(aiElements.chatMessage, "", false, true);
  } catch (error) {
    setInlineMessage(aiElements.chatMessage, error.message, true);
  } finally {
    clearAttachment();
    aiState.typing = false;
    aiElements.chatSubmit.disabled = false;
    aiElements.chatSubmit.textContent = "Odoslať";
    renderAssistantData();
  }
}

async function sendAssistantMessage(message) {
  if (aiState.attachment) {
    const formData = new FormData();
    formData.append("message", message);
    formData.append("thread_id", String(aiState.activeThreadId || 0));
    formData.append("attachment", aiState.attachment);
    return fetch("/api/assistant/chat", {
      method: "POST",
      body: formData,
    });
  }
  return fetch("/api/assistant/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, thread_id: aiState.activeThreadId }),
  });
}

function handleAccountClick() {
  window.location.href = "/app.html";
}

async function handleLogout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/ai.html";
}

async function startCheckoutFlow() {
  if (!aiState.user) {
    window.location.href = "/app.html";
    return;
  }
  if (aiState.user.membership_active) {
    return;
  }

  try {
    const response = await fetch("/api/create-checkout-session", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      window.alert(payload.error || "Stripe checkout sa nepodarilo spustiť.");
      return;
    }
    window.location.href = payload.url;
  } catch (_error) {
    window.alert("Stripe checkout sa nepodarilo spustiť.");
  }
}

function setInlineMessage(target, text, isError = false, hidden = false) {
  if (!target) {
    return;
  }
  target.hidden = hidden || !text;
  target.textContent = text;
  target.classList.toggle("auth-message--error", isError);
}

function autoResizeTextarea(textarea) {
  if (!textarea) {
    return;
  }
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 60), 220)}px`;
}

function formatMessageHtml(text) {
  let formatted = escapeHtml(text).replace(/\n/g, "<br>");
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

function formatReviewStatus(value) {
  if (value === "approved") {
    return "Schválené";
  }
  if (value === "needs_review") {
    return "Na kontrolu";
  }
  return "Bez kontroly";
}

function truncateText(value, length = 60) {
  const text = String(value || "").trim();
  if (text.length <= length) {
    return text;
  }
  return `${text.slice(0, length - 1).trimEnd()}…`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function formatDateTime(value) {
  if (!value) {
    return "práve teraz";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "práve teraz";
  }
  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
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
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}
