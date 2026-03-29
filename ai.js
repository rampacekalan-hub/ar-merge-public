const aiState = {
  user: null,
  threads: [],
  activeThreadId: 0,
  messages: [],
  typing: false,
  attachment: null,
  renaming: false,
};

const QUICK_ACTIONS = [
  {
    key: "client-explain",
    labelSk: "Vysvetli klientovi",
    labelEn: "Explain to client",
    promptSk: "Vysvetli túto tému jednoducho a zrozumiteľne pre klienta na Slovensku:",
    promptEn: "Explain this topic simply and clearly for a client in Slovakia:",
  },
  {
    key: "objection",
    labelSk: "Odpoveď na námietku",
    labelEn: "Handle objection",
    promptSk: "Navrhni profesionálnu odpoveď na túto námietku klienta:",
    promptEn: "Draft a professional response to this client objection:",
  },
  {
    key: "email",
    labelSk: "Napíš email",
    labelEn: "Write email",
    promptSk: "Napíš stručný profesionálny email klientovi na základe tohto textu:",
    promptEn: "Write a concise professional email to the client based on this text:",
  },
  {
    key: "summary",
    labelSk: "Zhrň text",
    labelEn: "Summarize text",
    promptSk: "Zhrň mi tento text do 5 prehľadných bodov:",
    promptEn: "Summarize this text into 5 clear bullet points:",
  },
  {
    key: "simplify",
    labelSk: "Zjednoduš text",
    labelEn: "Simplify text",
    promptSk: "Zjednoduš tento text do bežného jazyka, aby mu klient rozumel:",
    promptEn: "Simplify this text into plain language a client will understand:",
  },
  {
    key: "client-message",
    labelSk: "Správa pre klienta",
    labelEn: "Client message",
    promptSk: "Priprav krátku správu pre klienta na základe tejto situácie:",
    promptEn: "Prepare a short message for the client based on this situation:",
  },
  {
    key: "next-step",
    labelSk: "Navrhni ďalší postup",
    labelEn: "Suggest next steps",
    promptSk: "Navrhni ďalší najlepší postup v tejto situácii:",
    promptEn: "Suggest the best next step in this situation:",
  },
  {
    key: "document-summary",
    labelSk: "Zhrň dokument",
    labelEn: "Summarize document",
    promptSk: "Zhrň mi tento dokument stručne a prakticky:",
    promptEn: "Summarize this document briefly and practically:",
  },
  {
    key: "rewrite-pro",
    labelSk: "Preformuluj profesionálne",
    labelEn: "Rewrite professionally",
    promptSk: "Preformuluj tento text profesionálnejšie a vecnejšie:",
    promptEn: "Rewrite this text in a more professional and concise way:",
  },
  {
    key: "short-version",
    labelSk: "Urob stručnú verziu",
    labelEn: "Make it shorter",
    promptSk: "Skráť tento text na stručnú verziu s hlavnou pointou:",
    promptEn: "Shorten this text into a concise version with the main point:",
  },
];

const FOLLOWUP_ACTIONS = [
  {
    key: "shorten",
    labelSk: "Skrátiť",
    labelEn: "Shorter",
    promptSk: "Skráť túto odpoveď na stručnú praktickú verziu:\n\n{content}",
    promptEn: "Shorten this answer into a concise practical version:\n\n{content}",
  },
  {
    key: "for-client",
    labelSk: "Pre klienta",
    labelEn: "For client",
    promptSk: "Preformuluj túto odpoveď jednoducho pre klienta:\n\n{content}",
    promptEn: "Rewrite this answer in simple language for a client:\n\n{content}",
  },
  {
    key: "formal",
    labelSk: "Formálnejšie",
    labelEn: "More formal",
    promptSk: "Preformuluj túto odpoveď formálnejšie a profesionálnejšie:\n\n{content}",
    promptEn: "Rewrite this answer in a more formal professional tone:\n\n{content}",
  },
  {
    key: "simple",
    labelSk: "Jednoduchšie",
    labelEn: "Simpler",
    promptSk: "Zjednoduš túto odpoveď do bežného jazyka:\n\n{content}",
    promptEn: "Simplify this answer into plain language:\n\n{content}",
  },
  {
    key: "email",
    labelSk: "Ako email",
    labelEn: "As email",
    promptSk: "Premeň túto odpoveď na stručný email klientovi:\n\n{content}",
    promptEn: "Turn this answer into a concise client email:\n\n{content}",
  },
  {
    key: "message",
    labelSk: "Ako správa",
    labelEn: "As message",
    promptSk: "Premeň túto odpoveď na krátku správu pre klienta:\n\n{content}",
    promptEn: "Turn this answer into a short message for the client:\n\n{content}",
  },
];

const EMPTY_STATE_EXAMPLES = [
  {
    sk: "Vysvetli klientovi rozdiel medzi týmito možnosťami.",
    en: "Explain the difference between these options to a client.",
  },
  {
    sk: "Napíš mi stručnú odpoveď pre klienta.",
    en: "Write a concise reply for the client.",
  },
  {
    sk: "Zhrň mi tento dokument do dôležitých bodov.",
    en: "Summarize this document into the key points.",
  },
  {
    sk: "Preformuluj toto profesionálne a stručne.",
    en: "Rewrite this professionally and concisely.",
  },
];

function getCurrentLang() {
  return window.localStorage.getItem("unifyo_lang") === "en" ? "en" : "sk";
}

function tr(sk, en) {
  return getCurrentLang() === "en" ? en : sk;
}

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
  newThreadBtn: document.getElementById("aiNewThreadBtn"),
  threadList: document.getElementById("aiThreadList"),
  threadCount: document.getElementById("aiThreadCount"),
  sidebarQuickActions: document.getElementById("aiSidebarQuickActions"),
  quickActionBar: document.getElementById("aiQuickActionBar"),
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
  aiElements.chatInput?.addEventListener("input", () => autoResizeTextarea(aiElements.chatInput));
  aiElements.chatInput?.addEventListener("keydown", handleChatKeydown);
  aiElements.chatInput?.addEventListener("paste", handleChatPaste);
  aiElements.attachBtn?.addEventListener("click", () => aiElements.imageInput?.click());
  aiElements.imageInput?.addEventListener("change", handleAttachmentSelection);
  aiElements.composerShell?.addEventListener("dragover", handleComposerDragOver);
  aiElements.composerShell?.addEventListener("dragleave", handleComposerDragLeave);
  aiElements.composerShell?.addEventListener("drop", handleComposerDrop);
  aiElements.sidebarQuickActions?.addEventListener("click", handleQuickActionClick);
  aiElements.quickActionBar?.addEventListener("click", handleQuickActionClick);
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
  aiElements.nowPill.textContent = new Intl.DateTimeFormat(getCurrentLang() === "en" ? "en-GB" : "sk-SK", {
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
    aiElements.accountBtn.textContent = isLoggedIn ? (user.name?.trim() || user.email || tr("Účet", "Account")) : tr("Prihlásiť sa", "Sign in");
  }
  if (aiElements.logoutBtn) {
    aiElements.logoutBtn.classList.toggle("is-hidden", !isLoggedIn);
  }
  if (aiElements.adminBtn) {
    aiElements.adminBtn.classList.toggle("is-hidden", !Boolean(user?.is_admin));
  }
  if (aiElements.membershipPill) {
    aiElements.membershipPill.textContent = hasMembership
      ? tr(`Aktívne do ${formatDate(user.membership_valid_until)}`, `Active until ${formatDate(user.membership_valid_until)}`)
      : isLoggedIn
        ? tr("Bez aktívneho členstva", "No active membership")
        : tr("Vyžaduje prihlásenie", "Login required");
  }
  if (aiElements.lockedState) {
    aiElements.lockedState.classList.toggle("is-hidden", hasMembership);
  }
  if (aiElements.chatReady) {
    aiElements.chatReady.classList.toggle("is-hidden", !hasMembership);
  }
  if (aiElements.lockedTitle) {
    aiElements.lockedTitle.textContent = !isLoggedIn
      ? tr("Prihlás sa a otvor si Unifyo AI", "Sign in and unlock Unifyo AI")
      : tr("Aktivuj členstvo a začni AI chat", "Activate membership and start the AI chat");
  }
  if (aiElements.lockedText) {
    aiElements.lockedText.textContent = !isLoggedIn
      ? tr("Po prihlásení získaš pracovný AI chat pre slovenského finančného sprostredkovateľa.", "After signing in, you get a working AI chat built for Slovak financial intermediaries.")
      : tr("Po aktivácii členstva môžeš používať AI chat, kontakty aj kompresiu v jednom účte.", "After activating membership, you can use AI chat, contact cleanup and compression in one account.");
  }
  if (aiElements.checkoutBtn) {
    aiElements.checkoutBtn.classList.toggle("is-hidden", !isLoggedIn || hasMembership);
  }
  if (aiElements.loginLink) {
    aiElements.loginLink.textContent = isLoggedIn ? tr("Prejsť do aplikácie", "Go to app") : tr("Prihlásiť sa / Registrovať", "Sign in / Register");
  }
  if (aiElements.newThreadBtn) {
    aiElements.newThreadBtn.disabled = !hasMembership;
  }
  if (aiElements.attachBtn) {
    aiElements.attachBtn.disabled = !hasMembership;
  }
  [aiElements.chatInput, aiElements.chatSubmit].forEach((element) => {
    if (element) {
      element.disabled = !hasMembership;
    }
  });
  renderQuickActions();
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
    aiElements.chatHeadline.textContent = formatThreadTitle(activeThread?.title || "");
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
    aiElements.threadList.textContent = tr("História chatov sa zobrazí po aktivácii členstva.", "Conversation history will appear after membership activation.");
    return;
  }
  if (!aiState.threads.length) {
    aiElements.threadList.className = "ai-thread-list empty-state";
    aiElements.threadList.textContent = tr("Zatiaľ bez chatov. Začni nový.", "No chats yet. Start a new one.");
    return;
  }
  aiElements.threadList.className = "ai-thread-list";
  aiElements.threadList.innerHTML = aiState.threads.map((thread) => `
    <button
      class="ai-thread-item${Number(thread.id) === Number(aiState.activeThreadId) ? " is-active" : ""}"
      type="button"
      data-thread-id="${thread.id}"
    >
      <strong>${escapeHtml(formatThreadTitle(thread.title || ""))}</strong>
      <span>${escapeHtml(thread.last_message ? truncateText(thread.last_message, 70) : tr("Pripravené na pokračovanie", "Ready to continue"))}</span>
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
            <span>${escapeHtml(message.role === "user" ? tr("Ty", "You") : "Unifyo AI")}</span>
            <span>${escapeHtml(formatDateTime(message.created_at))}</span>
            ${message.role === "assistant" ? `<span class="ai-review-pill ai-review-pill--${escapeHtml(message.review_status || "unreviewed")}">${escapeHtml(formatReviewStatus(message.review_status))}</span>` : ""}
            ${message.role === "assistant" ? `<button class="ai-copy-btn js-ai-copy" type="button">${escapeHtml(tr("Kopírovať", "Copy"))}</button>` : ""}
          </div>
          <div class="ai-message__content">${formatMessageHtml(message.content || "")}</div>
          ${renderMessageAttachment(message)}
          ${renderFollowupActions(message, index)}
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
                <span>${escapeHtml(tr("práve teraz", "right now"))}</span>
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
      <img class="ai-attachment-chip__preview" src="${escapeHtml(aiState.attachment.previewUrl || "")}" alt="${escapeHtml(aiState.attachment.name)}">
      <div class="ai-attachment-chip__copy">
        <span class="ai-attachment-chip__label">${escapeHtml(tr("Obrázok", "Image"))}</span>
        <strong>${escapeHtml(aiState.attachment.name)}</strong>
      </div>
      <button class="ai-attachment-chip__remove" type="button" data-action="remove-attachment">×</button>
    </div>
  `;
}

function renderQuickActions() {
  const topActions = QUICK_ACTIONS.slice(0, 6);
  const allActions = QUICK_ACTIONS.slice(0, 10);
  if (aiElements.sidebarQuickActions) {
    aiElements.sidebarQuickActions.innerHTML = allActions.map((action) => renderQuickActionButton(action, "stack")).join("");
  }
  if (aiElements.quickActionBar) {
    aiElements.quickActionBar.innerHTML = topActions.map((action) => renderQuickActionButton(action, "chip")).join("");
  }
  const disabled = !aiState.user?.membership_active;
  document.querySelectorAll(".js-ai-prompt").forEach((button) => {
    button.disabled = disabled;
  });
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
      <div class="ai-empty-state__hero">
        <span class="pill">${escapeHtml(tr("Pripravené na prácu", "Ready to work"))}</span>
        <h3>${escapeHtml(tr("AI asistent pre slovenských finančných sprostredkovateľov", "AI assistant for Slovak financial intermediaries"))}</h3>
        <p>${escapeHtml(tr("Pomôže ti s komunikáciou, zhrnutím, vysvetlením aj formuláciou odpovedí. Začni otázkou alebo klikni na jednu z pripravených akcií.", "It helps with communication, summaries, explanations and response drafting. Start with a question or use one of the prepared actions."))}</p>
      </div>
      <div class="ai-empty-state__grid">
        <section class="ai-empty-panel">
          <span class="ai-empty-panel__label">${escapeHtml(tr("Čo vie vybaviť", "What it can handle"))}</span>
          <div class="ai-empty-panel__list">
            <div class="ai-empty-panel__item">${escapeHtml(tr("Vysvetlenie témy klientovi jednoduchšie", "Explain a topic to a client more simply"))}</div>
            <div class="ai-empty-panel__item">${escapeHtml(tr("Stručný email, správa alebo follow-up", "Concise email, message or follow-up"))}</div>
            <div class="ai-empty-panel__item">${escapeHtml(tr("Zhrnutie dokumentu a dôležitých bodov", "Summary of a document and the key points"))}</div>
            <div class="ai-empty-panel__item">${escapeHtml(tr("Návrh ďalšieho postupu v situácii", "Suggested next step in a situation"))}</div>
          </div>
        </section>
        <section class="ai-empty-panel">
          <span class="ai-empty-panel__label">${escapeHtml(tr("Najpoužívanejšie akcie", "Most used actions"))}</span>
          <div class="ai-empty-state__actions">
            ${QUICK_ACTIONS.slice(0, 8).map((action) => renderQuickActionButton(action, "chip")).join("")}
          </div>
        </section>
      </div>
      <section class="ai-empty-panel ai-empty-panel--examples">
        <span class="ai-empty-panel__label">${escapeHtml(tr("Príklady otázok", "Example questions"))}</span>
        <div class="ai-empty-state__examples">
          ${EMPTY_STATE_EXAMPLES.map((example) => `
            <button class="ai-example-chip js-ai-prompt" type="button" data-prompt="${escapeHtml(getCurrentLang() === "en" ? example.en : example.sk)}">
              ${escapeHtml(getCurrentLang() === "en" ? example.en : example.sk)}
            </button>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

async function handleChatFeedClick(event) {
  const followupButton = event.target.closest(".js-ai-followup");
  if (followupButton) {
    const messageContainer = followupButton.closest(".ai-message");
    const index = Number(messageContainer?.dataset.messageIndex || "-1");
    const actionKey = followupButton.dataset.followupAction || "";
    if (!Number.isNaN(index) && aiState.messages[index] && actionKey) {
      applyFollowupAction(actionKey, aiState.messages[index]);
    }
    return;
  }

  const promptButton = event.target.closest(".js-ai-prompt");
  if (promptButton) {
    applyPromptToComposer(promptButton.dataset.prompt || "");
    return;
  }

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
    button.textContent = tr("Skopírované", "Copied");
    setTimeout(() => {
      button.textContent = previousLabel;
    }, 1400);
  } catch (_error) {
    setInlineMessage(aiElements.chatMessage, tr("Kopírovanie sa nepodarilo. Skús to znova.", "Copy failed. Try again."), true);
  }
}

function handleQuickActionClick(event) {
  const button = event.target.closest(".js-ai-prompt");
  if (!button) {
    return;
  }
  applyPromptToComposer(button.dataset.prompt || "");
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
    setInlineMessage(aiElements.chatMessage, tr("AI aktuálne podporuje iba obrázky.", "AI currently supports images only."), true);
    return;
  }
  clearAttachment(false);
  aiState.attachment = {
    file,
    name: file.name,
    type: file.type,
    previewUrl: URL.createObjectURL(file),
  };
  renderAttachmentBar();
  setInlineMessage(aiElements.chatMessage, "", false, true);
}

function clearAttachment(resetInput = true) {
  aiState.attachment = null;
  if (resetInput && aiElements.imageInput) {
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
      throw new Error(payload.error || tr("Nový chat sa nepodarilo vytvoriť.", "Could not create a new chat."));
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

function applyPromptToComposer(prompt) {
  if (!aiElements.chatInput || !aiState.user?.membership_active) {
    return;
  }
  aiElements.chatInput.value = String(prompt || "");
  autoResizeTextarea(aiElements.chatInput);
  aiElements.chatInput.focus();
}

function applyFollowupAction(actionKey, message) {
  const config = FOLLOWUP_ACTIONS.find((item) => item.key === actionKey);
  if (!config || !message?.content) {
    return;
  }
  const template = getCurrentLang() === "en" ? config.promptEn : config.promptSk;
  applyPromptToComposer(template.replace("{content}", String(message.content).trim()));
}

async function handleChatSubmit(event) {
  event.preventDefault();
  if (!aiState.user?.membership_active) {
    await startCheckoutFlow();
    return;
  }

  const message = aiElements.chatInput?.value.trim() || "";
  if (message.length < 2 && !aiState.attachment) {
    setInlineMessage(aiElements.chatMessage, tr("Napíš správu alebo prilož obrázok pre AI asistenta.", "Write a message or attach an image for the AI assistant."), true);
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
      content: message || (aiState.attachment ? tr("Vyhodnoť prosím priložený obrázok.", "Please evaluate the attached image.") : ""),
      created_at: new Date().toISOString(),
      review_status: "approved",
      meta: aiState.attachment
        ? { attachment_name: aiState.attachment.name, attachment_preview: aiState.attachment.previewUrl }
        : {},
    },
  ];
  renderMessages();
  aiElements.chatForm.reset();
  autoResizeTextarea(aiElements.chatInput);
  aiElements.chatSubmit.disabled = true;
  aiElements.chatSubmit.textContent = tr("Posielam...", "Sending...");

  try {
    const response = await sendAssistantMessage(message);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || tr("AI asistent neodpovedal.", "AI did not answer."));
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
    aiElements.chatSubmit.textContent = tr("Odoslať", "Send");
    renderAssistantData();
  }
}

async function sendAssistantMessage(message) {
  if (aiState.attachment) {
    const formData = new FormData();
    formData.append("message", message);
    formData.append("thread_id", String(aiState.activeThreadId || 0));
    formData.append("attachment", aiState.attachment.file);
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
      window.alert(payload.error || tr("Stripe checkout sa nepodarilo spustiť.", "Stripe checkout could not be started."));
      return;
    }
    window.location.href = payload.url;
  } catch (_error) {
    window.alert(tr("Stripe checkout sa nepodarilo spustiť.", "Stripe checkout could not be started."));
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
    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (headingMatch) {
      flushList();
      blocks.push(`<p><strong>${formatInlineText(headingMatch[1])}</strong></p>`);
      return;
    }
    if (bulletMatch || numberedMatch) {
      const content = bulletMatch ? bulletMatch[1] : numberedMatch[1];
      listItems.push(formatInlineText(content));
      return;
    }
    flushList();
    blocks.push(`<p>${formatInlineText(trimmed)}</p>`);
  });

  flushList();
  return blocks.join("");
}

function formatInlineText(value) {
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

function renderQuickActionButton(action, variant = "chip") {
  const label = getCurrentLang() === "en" ? action.labelEn : action.labelSk;
  const prompt = getCurrentLang() === "en" ? action.promptEn : action.promptSk;
  return `
    <button
      class="ai-quick-action ai-quick-action--${variant} js-ai-prompt"
      type="button"
      data-prompt="${escapeHtml(prompt)}"
    >
      ${escapeHtml(label)}
    </button>
  `;
}

function renderFollowupActions(message, index) {
  if (message.role !== "assistant" || !message.content) {
    return "";
  }
  return `
    <div class="ai-message__actions" data-message-index="${index}">
      ${FOLLOWUP_ACTIONS.map((action) => `
        <button class="ai-followup-chip js-ai-followup" type="button" data-followup-action="${escapeHtml(action.key)}">
          ${escapeHtml(getCurrentLang() === "en" ? action.labelEn : action.labelSk)}
        </button>
      `).join("")}
    </div>
  `;
}

function formatReviewStatus(value) {
  if (value === "approved") {
    return tr("Schválené", "Approved");
  }
  if (value === "needs_review") {
    return tr("Na kontrolu", "Needs review");
  }
  return tr("Bez kontroly", "Unchecked");
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
  return new Intl.DateTimeFormat(getCurrentLang() === "en" ? "en-GB" : "sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function formatDateTime(value) {
  if (!value) {
    return tr("práve teraz", "right now");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return tr("práve teraz", "right now");
  }
  return new Intl.DateTimeFormat(getCurrentLang() === "en" ? "en-GB" : "sk-SK", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatThreadTitle(value) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized === "Nový chat" || normalized === "New chat") {
    return tr("Nový chat", "New chat");
  }
  return normalized;
}

function renderMessageAttachment(message) {
  const attachmentName = String(message?.meta?.attachment_name || "").trim();
  const attachmentPreview = String(message?.meta?.attachment_preview || "").trim();
  if (!attachmentName || !attachmentPreview) {
    return "";
  }
  return `
    <div class="ai-message__attachment">
      <img src="${escapeHtml(attachmentPreview)}" alt="${escapeHtml(attachmentName)}">
      <div class="ai-message__attachment-copy">
        <span>${escapeHtml(tr("Priložený obrázok", "Attached image"))}</span>
        <strong>${escapeHtml(attachmentName)}</strong>
      </div>
    </div>
  `;
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

window.addEventListener("unifyo-language-change", () => {
  renderNowPill();
  renderAiState();
  renderAssistantData();
});
