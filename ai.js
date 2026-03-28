const aiState = {
  user: null,
  threads: [],
  activeThreadId: 0,
  messages: [],
  typing: false,
};

const aiElements = {
  sidebar: document.getElementById("aiSidebar"),
  sidebarBackdrop: document.getElementById("aiSidebarBackdrop"),
  sidebarToggle: document.getElementById("aiSidebarToggle"),
  accountBtn: document.getElementById("aiAccountBtn"),
  logoutBtn: document.getElementById("aiLogoutBtn"),
  checkoutBtn: document.getElementById("aiCheckoutBtn"),
  loginLink: document.getElementById("aiLoginLink"),
  membershipPill: document.getElementById("aiMembershipPill"),
  lockedState: document.getElementById("aiLockedState"),
  lockedTitle: document.getElementById("aiLockedTitle"),
  lockedText: document.getElementById("aiLockedText"),
  chatReady: document.getElementById("aiChatReady"),
  chatFeed: document.getElementById("aiChatFeed"),
  chatForm: document.getElementById("aiChatForm"),
  chatInput: document.getElementById("aiChatInput"),
  chatSubmit: document.getElementById("aiChatSubmit"),
  chatMessage: document.getElementById("aiChatMessage"),
  chatHeadline: document.getElementById("aiChatHeadline"),
  promptButtons: Array.from(document.querySelectorAll(".js-ai-prompt")),
  newThreadBtn: document.getElementById("aiNewThreadBtn"),
  threadList: document.getElementById("aiThreadList"),
  threadCount: document.getElementById("aiThreadCount"),
};

bootstrapAi();

async function bootstrapAi() {
  await disableServiceWorkers();
  bindAiEvents();
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
  aiElements.threadList?.addEventListener("click", handleThreadListClick);
  aiElements.newThreadBtn?.addEventListener("click", handleNewThreadClick);
  aiElements.chatInput?.addEventListener("input", () => autoResizeTextarea(aiElements.chatInput));
  aiElements.chatInput?.addEventListener("keydown", handleChatKeydown);
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
  [aiElements.chatInput, aiElements.chatSubmit].forEach((element) => {
    if (element) {
      element.disabled = !hasMembership;
    }
  });
  aiElements.promptButtons.forEach((button) => {
    button.disabled = !hasMembership;
  });
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
    aiElements.chatHeadline.textContent = activeThread?.title || "Praktický chat pre každodennú prácu";
  }
  renderThreadList();
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
      <p>Napíš situáciu z praxe a dostaneš stručnú, praktickú odpoveď so zrozumiteľným ďalším krokom.</p>
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

async function handleChatSubmit(event) {
  event.preventDefault();
  if (!aiState.user?.membership_active) {
    await startCheckoutFlow();
    return;
  }

  const message = aiElements.chatInput?.value.trim() || "";
  if (message.length < 2) {
    setInlineMessage(aiElements.chatMessage, "Napíš správu pre AI asistenta.", true);
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
      content: message,
      created_at: new Date().toISOString(),
      review_status: "approved",
    },
  ];
  renderMessages();
  aiElements.chatForm.reset();
  autoResizeTextarea(aiElements.chatInput);
  aiElements.chatSubmit.disabled = true;
  aiElements.chatSubmit.textContent = "Posielam...";

  try {
    const response = await fetch("/api/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, thread_id: aiState.activeThreadId }),
    });
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
    aiState.typing = false;
    aiElements.chatSubmit.disabled = false;
    aiElements.chatSubmit.textContent = "Odoslať";
    renderAssistantData();
  }
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
