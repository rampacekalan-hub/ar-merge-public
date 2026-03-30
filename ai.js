const aiState = {
  user: null,
  threads: [],
  activeThreadId: 0,
  messages: [],
  expandedMessages: {},
  typing: false,
  typingPhase: 0,
  typingTimer: null,
  attachments: [],
  mobileUploadToken: "",
  mobileUploadPoll: null,
  lastRenderedTitle: "",
  freshAssistantKey: "",
  freshAssistantResetTimer: null,
  sessionTimer: null,
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
  {
    key: "table",
    labelSk: "Vytvor tabuľku",
    labelEn: "Create table",
    promptSk: "Spracuj tento obsah do prehľadnej tabuľky vhodnej na rýchle porovnanie:",
    promptEn: "Turn this content into a clear comparison table suitable for quick review:",
  },
  {
    key: "pdf-ready",
    labelSk: "Priprav PDF osnovu",
    labelEn: "Prepare PDF outline",
    promptSk: "Priprav čistý, PDF-ready text alebo osnovu, ktorú bude možné rovno exportovať alebo vložiť do dokumentu:",
    promptEn: "Prepare a clean PDF-ready text or outline that can be exported or pasted into a document right away:",
  },
];

function hasAiAccess(user = aiState.user) {
  return Boolean(user?.membership_active || user?.is_admin);
}

const FOLLOWUP_ACTIONS = [
  {
    key: "more",
    labelSk: "Zisti viac",
    labelEn: "Learn more",
    promptSk: "Rozšír túto odpoveď do dlhšej, ale stále praktickej verzie. Zachovaj jasnú štruktúru a doplň užitočné detaily:\n\n{content}",
    promptEn: "Expand this answer into a longer but still practical version. Keep a clear structure and add useful details:\n\n{content}",
  },
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
  attachImageBtn: document.getElementById("aiAttachImageBtn"),
  attachQrBtn: document.getElementById("aiAttachQrBtn"),
  attachMenu: document.querySelector(".ai-attach-menu"),
  attachmentBar: document.getElementById("aiAttachmentBar"),
  chatSubmit: document.getElementById("aiChatSubmit"),
  chatMessage: document.getElementById("aiChatMessage"),
  chatHeadline: document.getElementById("aiChatHeadline"),
  newThreadBtn: document.getElementById("aiNewThreadBtn"),
  threadList: document.getElementById("aiThreadList"),
  threadCount: document.getElementById("aiThreadCount"),
  sidebarQuickActions: document.getElementById("aiSidebarQuickActions"),
  quickActionBar: document.getElementById("aiQuickActionBar"),
  toolLinks: document.getElementById("aiToolLinks"),
  qrModal: document.getElementById("aiQrModal"),
  qrModalBackdrop: document.getElementById("aiQrModalBackdrop"),
  qrModalClose: document.getElementById("aiQrModalClose"),
  qrImage: document.getElementById("aiQrImage"),
  qrStatus: document.getElementById("aiQrStatus"),
  qrOpenLink: document.getElementById("aiQrOpenLink"),
};

bootstrapAi();

async function bootstrapAi() {
  await disableServiceWorkers();
  bindAiEvents();
  startNowTicker();
  await refreshAiUser();
  renderAiState();
  if (hasAiAccess()) {
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
  aiElements.sidebar?.addEventListener("click", (event) => {
    event.stopPropagation();
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
  aiElements.attachImageBtn?.addEventListener("click", () => {
    aiElements.attachMenu?.removeAttribute("open");
    aiElements.imageInput?.click();
  });
  aiElements.attachQrBtn?.addEventListener("click", () => {
    aiElements.attachMenu?.removeAttribute("open");
    openQrUploadModal();
  });
  aiElements.imageInput?.addEventListener("change", handleAttachmentSelection);
  aiElements.composerShell?.addEventListener("dragover", handleComposerDragOver);
  aiElements.composerShell?.addEventListener("dragleave", handleComposerDragLeave);
  aiElements.composerShell?.addEventListener("drop", handleComposerDrop);
  aiElements.sidebarQuickActions?.addEventListener("click", handleQuickActionClick);
  aiElements.quickActionBar?.addEventListener("click", handleQuickActionClick);
  aiElements.qrModalClose?.addEventListener("click", closeQrUploadModal);
  aiElements.qrModalBackdrop?.addEventListener("click", closeQrUploadModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && aiElements.qrModal && !aiElements.qrModal.hidden) {
      closeQrUploadModal();
    }
    if (event.key === "Escape" && aiElements.attachMenu?.hasAttribute("open")) {
      aiElements.attachMenu.removeAttribute("open");
    }
  });
  document.addEventListener("click", handleOutsideAttachMenuClick);
  window.addEventListener("resize", syncAiSidebarViewportState);
  syncAiSidebarViewportState();
}

function syncAiSidebarViewportState() {
  if (window.innerWidth > 1240) {
    document.body.classList.remove("ai-sidebar-open");
  }
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
  scheduleAiSessionAutoLogout();
}

function scheduleAiSessionAutoLogout() {
  if (aiState.sessionTimer) {
    window.clearTimeout(aiState.sessionTimer);
    aiState.sessionTimer = null;
  }
  const expiresAt = aiState.user?.session_expires_at ? new Date(aiState.user.session_expires_at).getTime() : 0;
  if (!expiresAt) {
    return;
  }
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) {
    handleLogout();
    return;
  }
  aiState.sessionTimer = window.setTimeout(() => {
    handleLogout();
  }, remaining);
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
  const hasMembership = hasAiAccess(user);

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
  if (aiElements.attachImageBtn) {
    aiElements.attachImageBtn.disabled = !hasMembership;
  }
  if (aiElements.attachQrBtn) {
    aiElements.attachQrBtn.disabled = !hasMembership;
  }
  if (aiElements.attachMenu) {
    aiElements.attachMenu.classList.toggle("is-disabled", !hasMembership);
  }
  [aiElements.chatInput, aiElements.chatSubmit].forEach((element) => {
    if (element) {
      element.disabled = !hasMembership;
    }
  });
  renderQuickActions();
  renderToolLinks();
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
    const nextTitle = formatThreadTitle(activeThread?.title || "");
    aiElements.chatHeadline.textContent = nextTitle;
    if (nextTitle !== aiState.lastRenderedTitle) {
      aiElements.chatHeadline.classList.remove("is-refreshing");
      void aiElements.chatHeadline.offsetWidth;
      aiElements.chatHeadline.classList.add("is-refreshing");
      aiState.lastRenderedTitle = nextTitle;
    }
  }
  renderThreadList();
  renderAttachmentBar();
  autoResizeTextarea(aiElements.chatInput);
  renderMessages();
  if (aiElements.chatInput && hasAiAccess()) {
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
  if (!hasAiAccess()) {
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
    <article class="ai-thread-item${Number(thread.id) === Number(aiState.activeThreadId) ? " is-active" : ""}">
      <button
        class="ai-thread-item__main"
        type="button"
        data-thread-open="${thread.id}"
      >
        <strong>${escapeHtml(formatThreadTitle(thread.title || ""))}</strong>
        <span>${escapeHtml(thread.last_message ? truncateText(thread.last_message, 70) : tr("Pripravené na pokračovanie", "Ready to continue"))}</span>
        <small>${escapeHtml(thread.last_message_at ? formatDateTime(thread.last_message_at) : formatDate(thread.created_at))}</small>
      </button>
      <button
        class="ai-thread-item__delete"
        type="button"
        data-thread-delete="${thread.id}"
        aria-label="${escapeHtml(tr("Vymazať konverzáciu", "Delete conversation"))}"
        title="${escapeHtml(tr("Vymazať konverzáciu", "Delete conversation"))}"
      >×</button>
    </article>
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
            ${message.role === "assistant" && message.meta?.used_web_search ? `<span class="ai-source-pill">${escapeHtml(tr("Web kontext", "Web context"))}</span>` : ""}
            ${message.role === "assistant" ? `<button class="ai-copy-btn js-ai-copy" type="button">${escapeHtml(tr("Kopírovať", "Copy"))}</button>` : ""}
          </div>
          ${renderMessageContent(message, index)}
          ${renderMessageSource(message)}
          ${renderMessageAttachment(message)}
          ${renderGeneratedAsset(message)}
          ${renderFollowupActions(message, index)}
        </div>
      </div>
    </article>
  `).join("");

  if (aiState.typing) {
    const typingSteps = [
      tr("Analyzujem zadanie", "Analyzing request"),
      tr("Overujem súvislosti", "Checking context"),
      tr("Skladám odpoveď", "Composing reply"),
    ];
    const typingLabel = typingSteps[aiState.typingPhase % typingSteps.length];
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
              <div class="ai-message__typing-wrap">
                <div class="ai-message__typing-orbit"><span></span><span></span><span></span></div>
                <div class="ai-message__typing-copy">
                  <span class="ai-message__typing-label">${escapeHtml(typingLabel)}</span>
                  <span class="ai-message__typing-subtle">${escapeHtml(tr("Pracujem s kontextom konverzácie", "Working with conversation context"))}</span>
                </div>
              </div>
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
  if (!aiState.attachments.length) {
    aiElements.attachmentBar.classList.add("is-hidden");
    aiElements.attachmentBar.innerHTML = "";
    return;
  }
  aiElements.attachmentBar.classList.remove("is-hidden");
  aiElements.attachmentBar.innerHTML = aiState.attachments.map((attachment, index) => `
    <div class="ai-attachment-chip">
      <img class="ai-attachment-chip__preview" src="${escapeHtml(attachment.previewUrl || "")}" alt="${escapeHtml(attachment.name)}">
      <div class="ai-attachment-chip__copy">
        <span class="ai-attachment-chip__label">${escapeHtml(tr("Obrázok", "Image"))} ${index + 1}</span>
        <strong>${escapeHtml(attachment.name)}</strong>
      </div>
      <button class="ai-attachment-chip__remove" type="button" data-action="remove-attachment" data-attachment-index="${index}">×</button>
    </div>
  `).join("");
}

function renderQuickActions() {
  const allActions = QUICK_ACTIONS.slice(0, 10);
  if (aiElements.sidebarQuickActions) {
    aiElements.sidebarQuickActions.innerHTML = renderQuickActionRollup(
      tr("Najčastejšie akcie", "Most used actions"),
      allActions,
      "stack"
    );
  }
  if (aiElements.quickActionBar) {
    const primaryActions = allActions.slice(0, 3);
    const extraActions = allActions.slice(3);
    aiElements.quickActionBar.innerHTML = `
      ${primaryActions.map((action) => renderQuickActionButton(action, "chip")).join("")}
      ${renderQuickActionRollup(tr("Viac akcií", "More actions"), extraActions, "chip")}
    `;
  }
  const disabled = !hasAiAccess();
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
        <span class="pill">${escapeHtml(tr("Pripravené", "Ready"))}</span>
        <h3>${escapeHtml(tr("Začni otázkou alebo jednou akciou", "Start with a question or one action"))}</h3>
        <p>${escapeHtml(tr("Pomôžem s odpoveďou klientovi, emailom, zhrnutím aj vysvetlením.", "I can help with client replies, emails, summaries and explanations."))}</p>
      </div>
      <div class="ai-empty-state__actions">
        ${QUICK_ACTIONS.slice(0, 3).map((action) => renderQuickActionButton(action, "chip")).join("")}
        ${renderQuickActionRollup(tr("Viac akcií", "More actions"), QUICK_ACTIONS.slice(3, 10), "chip")}
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

function renderToolLinks() {
  if (!aiElements.toolLinks) {
    return;
  }
  aiElements.toolLinks.innerHTML = "";
}

function renderMessageSource(message) {
  if (!message || message.role !== "assistant") {
    return "";
  }
  const meta = message.meta || {};
  const rawSources = Array.isArray(meta.web_sources) ? meta.web_sources : [];
  const normalizedSources = [];
  const seen = new Set();

  rawSources.forEach((source) => {
    try {
      const url = new URL(String(source || "").trim());
      const href = url.href;
      const hostname = url.hostname.replace(/^www\./, "");
      if (!href || seen.has(href)) {
        return;
      }
      seen.add(href);
      normalizedSources.push({ href, hostname });
    } catch (_error) {
      // ignore invalid source urls
    }
  });

  if (!normalizedSources.length) {
    const text = String(message.content || "");
    const urlMatch = text.match(/https?:\/\/[^\s)<]+/);
    if (urlMatch) {
      try {
        const fallbackUrl = new URL(urlMatch[0]);
        normalizedSources.push({
          href: fallbackUrl.href,
          hostname: fallbackUrl.hostname.replace(/^www\./, ""),
        });
      } catch (_error) {
        // ignore invalid fallback url
      }
    }
  }

  if (!meta.used_web_search && !normalizedSources.length) {
    return "";
  }

  const sourceCount = Number(meta.web_source_count || normalizedSources.length || 0);
  const confidencePercent = Number(meta.web_confidence_percent || 0);

  return `
    <div class="ai-message__source-group">
      <div class="ai-message__source-row">
        ${confidencePercent > 0 ? `<span class="ai-message__source-badge">${escapeHtml(tr("Istota", "Confidence"))}: ${escapeHtml(String(confidencePercent))}%</span>` : ""}
        ${sourceCount > 0 ? `<span class="ai-message__source-badge">${escapeHtml(tr("Zdroje", "Sources"))}: ${escapeHtml(String(sourceCount))}</span>` : ""}
        ${normalizedSources.map((source) => `
          <a class="ai-message__source-link" href="${escapeHtml(source.href)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(source.hostname)}
          </a>
        `).join("")}
      </div>
    </div>
  `;
}

async function handleChatFeedClick(event) {
  const expandButton = event.target.closest(".js-ai-expand");
  if (expandButton) {
    const expandKey = String(expandButton.dataset.expandKey || "");
    if (expandKey) {
      aiState.expandedMessages[expandKey] = !aiState.expandedMessages[expandKey];
      renderMessages();
    }
    return;
  }

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
  const rollup = button.closest(".ai-actions-rollup");
  if (rollup) {
    rollup.removeAttribute("open");
  }
  applyPromptToComposer(button.dataset.prompt || "");
}

async function handleThreadListClick(event) {
  const deleteButton = event.target.closest("[data-thread-delete]");
  if (deleteButton) {
    const deleteThreadId = Number(deleteButton.dataset.threadDelete || "0");
    if (deleteThreadId) {
      await deleteThread(deleteThreadId);
    }
    return;
  }
  const button = event.target.closest("[data-thread-open]");
  if (!button) {
    return;
  }
  const threadId = Number(button.dataset.threadOpen || "0");
  if (!threadId || threadId === Number(aiState.activeThreadId)) {
    return;
  }
  document.body.classList.remove("ai-sidebar-open");
  await loadAssistant(threadId);
}

async function deleteThread(threadId) {
  if (!threadId) {
    return;
  }
  const ok = window.confirm(
    tr(
      "Naozaj chceš vymazať túto konverzáciu? Pamäť AI zostane zachovaná.",
      "Do you really want to delete this conversation? AI memory will stay preserved."
    )
  );
  if (!ok) {
    return;
  }
  try {
    const response = await fetch("/api/assistant/thread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", thread_id: threadId, lang: getCurrentLang() }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || tr("Konverzáciu sa nepodarilo vymazať.", "Could not delete conversation."));
    }
    aiState.threads = payload.threads || [];
    aiState.activeThreadId = Number(payload.active_thread_id || 0);
    aiState.messages = payload.messages || [];
    persistActiveThread(aiState.activeThreadId);
    renderAssistantData();
  } catch (error) {
    setInlineMessage(aiElements.chatMessage, error.message, true);
  }
}

function handleAttachmentSelection(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) {
    return;
  }
  setAttachments(files);
}

function setAttachments(files) {
  if (!files.length) {
    return;
  }
  clearAttachment(false);
  const validFiles = [];
  files.forEach((file) => {
    if (!String(file.type || "").startsWith("image/")) {
      return;
    }
    validFiles.push({
      file,
      name: file.name,
      type: file.type,
      previewUrl: URL.createObjectURL(file),
    });
  });
  if (!validFiles.length) {
    setInlineMessage(aiElements.chatMessage, tr("AI aktuálne podporuje iba obrázky.", "AI currently supports images only."), true);
    return;
  }
  aiState.attachments = validFiles;
  renderAttachmentBar();
  setInlineMessage(aiElements.chatMessage, "", false, true);
}

function clearAttachment(resetInput = true) {
  aiState.attachments.forEach((attachment) => {
    if (attachment.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
  });
  aiState.attachments = [];
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
  const index = Number(button.dataset.attachmentIndex || "-1");
  if (Number.isNaN(index) || index < 0 || index >= aiState.attachments.length) {
    clearAttachment();
    return;
  }
  const [removed] = aiState.attachments.splice(index, 1);
  if (removed?.previewUrl) {
    URL.revokeObjectURL(removed.previewUrl);
  }
  if (!aiState.attachments.length && aiElements.imageInput) {
    aiElements.imageInput.value = "";
  }
  renderAttachmentBar();
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
  const files = Array.from(event.dataTransfer?.files || []);
  if (files.length) {
    setAttachments(files);
  }
}

function handleOutsideAttachMenuClick(event) {
  if (!aiElements.attachMenu || !aiElements.attachMenu.hasAttribute("open")) {
    return;
  }
  if (!aiElements.attachMenu.contains(event.target)) {
    aiElements.attachMenu.removeAttribute("open");
  }
}

async function openQrUploadModal() {
  if (!hasAiAccess()) {
    await startCheckoutFlow();
    return;
  }
  if (!aiElements.qrModal) {
    return;
  }
  aiElements.qrModal.hidden = false;
  document.body.classList.add("modal-open");
  updateQrStatus(tr("Pripravujem QR kód…", "Preparing QR code…"));
  if (aiElements.qrImage) {
    aiElements.qrImage.removeAttribute("src");
  }
  if (aiElements.qrOpenLink) {
    aiElements.qrOpenLink.href = "#";
  }
  try {
    const response = await fetch("/api/assistant-mobile-upload-session", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || tr("QR upload sa nepodarilo pripraviť.", "Could not prepare QR upload."));
    }
    aiState.mobileUploadToken = String(payload.token || "");
    if (aiElements.qrOpenLink) {
      aiElements.qrOpenLink.href = payload.upload_url || "#";
    }
    if (aiElements.qrImage) {
      aiElements.qrImage.src = buildQrImageUrl(payload.upload_url || "");
    }
    updateQrStatus(tr("Naskenuj QR a odošli fotku z mobilu.", "Scan the QR and send a photo from your phone."));
    startQrPolling();
  } catch (error) {
    updateQrStatus(error.message || tr("QR upload sa nepodarilo pripraviť.", "Could not prepare QR upload."), true);
  }
}

function closeQrUploadModal() {
  if (aiElements.qrModal) {
    aiElements.qrModal.hidden = true;
  }
  document.body.classList.remove("modal-open");
  stopQrPolling();
  aiState.mobileUploadToken = "";
}

function updateQrStatus(text, isError = false) {
  if (!aiElements.qrStatus) {
    return;
  }
  aiElements.qrStatus.textContent = text;
  aiElements.qrStatus.classList.toggle("auth-message--error", isError);
}

function buildQrImageUrl(uploadUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(String(uploadUrl || ""))}`;
}

function startQrPolling() {
  stopQrPolling();
  aiState.mobileUploadPoll = window.setInterval(checkQrUploadStatus, 1600);
  checkQrUploadStatus();
}

function stopQrPolling() {
  if (aiState.mobileUploadPoll) {
    window.clearInterval(aiState.mobileUploadPoll);
    aiState.mobileUploadPoll = null;
  }
}

async function checkQrUploadStatus() {
  if (!aiState.mobileUploadToken) {
    return;
  }
  try {
    const response = await fetch(`/api/assistant-mobile-upload-status?token=${encodeURIComponent(aiState.mobileUploadToken)}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || tr("QR upload sa nepodarilo načítať.", "Could not load QR upload status."));
    }
    if (!payload.uploaded) {
      return;
    }
    await setAttachmentFromDataUrl(payload.attachment_preview, payload.attachment_name, payload.attachment_type);
    updateQrStatus(tr("Fotka je pripravená v AI chate.", "The photo is ready in the AI chat."));
    closeQrUploadModal();
  } catch (error) {
    updateQrStatus(error.message || tr("QR upload sa nepodarilo načítať.", "Could not load QR upload status."), true);
  }
}

async function setAttachmentFromDataUrl(dataUrl, filename, mimeType) {
  if (!dataUrl) {
    return;
  }
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], filename || "image", { type: mimeType || blob.type || "image/jpeg" });
  setAttachments([file]);
}

async function handleNewThreadClick() {
  if (!hasAiAccess()) {
    await startCheckoutFlow();
    return;
  }
  try {
    const response = await fetch("/api/assistant/thread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: tr("Nový chat", "New chat"), lang: getCurrentLang() }),
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
  setAttachments([file]);
}

function applyPromptToComposer(prompt) {
  if (!aiElements.chatInput || !hasAiAccess()) {
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

function startTypingAnimation() {
  stopTypingAnimation();
  aiState.typingPhase = 0;
  aiState.typingTimer = window.setInterval(() => {
    aiState.typingPhase += 1;
    if (aiState.typing) {
      renderMessages();
    }
  }, 1150);
}

function stopTypingAnimation() {
  if (aiState.typingTimer) {
    window.clearInterval(aiState.typingTimer);
    aiState.typingTimer = null;
  }
}

function markLatestAssistantMessageFresh() {
  const assistantMessages = aiState.messages.filter((message) => message.role === "assistant");
  const latestAssistant = assistantMessages[assistantMessages.length - 1];
  if (!latestAssistant) {
    return;
  }
  const latestIndex = aiState.messages.lastIndexOf(latestAssistant);
  aiState.freshAssistantKey = getExpandKey(latestAssistant, latestIndex);
  if (aiState.freshAssistantResetTimer) {
    window.clearTimeout(aiState.freshAssistantResetTimer);
  }
  aiState.freshAssistantResetTimer = window.setTimeout(() => {
    aiState.freshAssistantKey = "";
  }, 900);
}

async function handleChatSubmit(event) {
  event.preventDefault();
  if (!hasAiAccess()) {
    await startCheckoutFlow();
    return;
  }

  const message = aiElements.chatInput?.value.trim() || "";
  if (message.length < 2 && !aiState.attachments.length) {
    setInlineMessage(aiElements.chatMessage, tr("Napíš správu alebo prilož obrázok pre AI asistenta.", "Write a message or attach an image for the AI assistant."), true);
    return;
  }

  if (!aiState.activeThreadId) {
    await handleNewThreadClick();
  }

  setInlineMessage(aiElements.chatMessage, "", false, true);
  aiState.typing = true;
  startTypingAnimation();
  aiState.messages = [
    ...aiState.messages,
    {
      role: "user",
      content: message || (aiState.attachments.length ? tr("Vyhodnoť prosím priložené obrázky.", "Please evaluate the attached images.") : ""),
      created_at: new Date().toISOString(),
      review_status: "approved",
      meta: aiState.attachments.length
        ? {
            attachment_name: aiState.attachments[0].name,
            attachment_preview: aiState.attachments[0].previewUrl,
            attachments: aiState.attachments.map((attachment) => ({
              attachment_name: attachment.name,
              attachment_preview: attachment.previewUrl,
              attachment_type: attachment.type,
            })),
          }
        : {},
    },
  ];
  renderMessages();
  aiElements.chatForm.reset();
  autoResizeTextarea(aiElements.chatInput);
  aiElements.chatSubmit.disabled = true;
  aiElements.chatSubmit.textContent = tr("AI premýšľa…", "AI is thinking…");

  try {
    const response = await sendAssistantMessage(message);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || tr("AI asistent neodpovedal.", "AI did not answer."));
    }
    aiState.threads = payload.threads || aiState.threads;
    aiState.activeThreadId = Number(payload.active_thread_id || aiState.activeThreadId || 0);
    aiState.messages = payload.messages || aiState.messages;
    markLatestAssistantMessageFresh();
    setInlineMessage(aiElements.chatMessage, "", false, true);
  } catch (error) {
    setInlineMessage(aiElements.chatMessage, error.message, true);
  } finally {
    clearAttachment();
    aiState.typing = false;
    stopTypingAnimation();
    aiElements.chatSubmit.disabled = false;
    aiElements.chatSubmit.textContent = tr("Odoslať", "Send");
    renderAssistantData();
  }
}

async function sendAssistantMessage(message) {
  if (aiState.attachments.length) {
    const formData = new FormData();
    formData.append("message", message);
    formData.append("thread_id", String(aiState.activeThreadId || 0));
    formData.append("lang", getCurrentLang());
    aiState.attachments.forEach((attachment) => {
      formData.append("attachment", attachment.file);
    });
    return fetch("/api/assistant/chat", {
      method: "POST",
      body: formData,
    });
  }
  return fetch("/api/assistant/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, thread_id: aiState.activeThreadId, lang: getCurrentLang() }),
  });
}

function handleAccountClick() {
  window.location.href = "/app.html?openAccount=1";
}

async function handleLogout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/ai.html";
}

async function startCheckoutFlow() {
  if (!aiState.user) {
    window.location.href = "/app.html?startCheckout=1";
    return;
  }
  if (hasAiAccess()) {
    return;
  }
  window.location.href = "/app.html?startCheckout=1";
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
  let tableLines = [];

  function flushList() {
    if (!listItems.length) {
      return;
    }
    blocks.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join("")}</ul>`);
    listItems = [];
  }

  function flushTable() {
    if (!tableLines.length) {
      return;
    }
    const renderedTable = renderMarkdownTable(tableLines);
    if (renderedTable) {
      blocks.push(renderedTable);
    } else {
      tableLines.forEach((line) => {
        blocks.push(`<p>${formatInlineText(line)}</p>`);
      });
    }
    tableLines = [];
  }

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      flushTable();
      return;
    }
    if (trimmed.includes("|") && /^\|?.+\|.+/.test(trimmed)) {
      flushList();
      tableLines.push(trimmed);
      return;
    }
    flushTable();
    if (/^(zdroj|source)\s*:/i.test(trimmed)) {
      flushList();
      return;
    }
    const sectionOnlyMatch = trimmed.match(/^(\d+[.)]\s*)?(priama odpoveď|stručné vysvetlenie|odporúčaný ďalší krok|direct answer|short explanation|recommended next step)\s*:?\s*$/i);
    if (sectionOnlyMatch) {
      flushList();
      return;
    }
    const inlineSectionMatch = trimmed.match(/^(\d+[.)]\s*)?(priama odpoveď|stručné vysvetlenie|odporúčaný ďalší krok|direct answer|short explanation|recommended next step)\s*:\s*(.+)$/i);
    const contentLine = inlineSectionMatch ? inlineSectionMatch[3].trim() : trimmed;
    if (!contentLine) {
      flushList();
      return;
    }
    const headingMatch = contentLine.match(/^#{1,6}\s+(.+)$/);
    const bulletMatch = contentLine.match(/^[-*•]\s+(.+)$/);
    const numberedMatch = contentLine.match(/^\d+[.)]\s+(.+)$/);
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
    blocks.push(`<p>${formatInlineText(contentLine)}</p>`);
  });

  flushList();
  flushTable();
  return blocks.join("");
}

function renderMarkdownTable(lines) {
  if (!Array.isArray(lines) || lines.length < 2) {
    return "";
  }
  const rows = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim()));
  if (rows.length < 2) {
    return "";
  }
  const separatorIndex = rows.findIndex((row) => row.every((cell) => /^:?-{2,}:?$/.test(cell)));
  if (separatorIndex !== 1) {
    return "";
  }
  const headers = rows[0];
  const bodyRows = rows.slice(2).filter((row) => row.some((cell) => cell));
  if (!headers.length || !bodyRows.length) {
    return "";
  }
  return `
    <div class="ai-message__table-wrap">
      <table class="ai-message__table">
        <thead>
          <tr>${headers.map((cell) => `<th>${formatInlineText(cell)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${bodyRows.map((row) => `<tr>${headers.map((_, index) => `<td>${formatInlineText(row[index] || "")}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function getExpandKey(message, index) {
  return `${message.created_at || "now"}-${index}`;
}

function shouldCollapseMessageText(text) {
  const normalized = String(text || "").replace(/\r/g, "").trim();
  if (!normalized) {
    return false;
  }
  const lineCount = normalized.split("\n").filter((line) => line.trim()).length;
  return lineCount >= 4 || normalized.length >= 360;
}

function renderMessageContent(message, index) {
  const html = formatMessageHtml(message.content || "");
  const expandKey = getExpandKey(message, index);
  const freshClass = message.role === "assistant" && aiState.freshAssistantKey === expandKey ? " ai-message__content--fresh" : "";
  if (!html) {
    return `<div class="ai-message__content${freshClass}"></div>`;
  }
  const collapsible = message.role === "assistant" && shouldCollapseMessageText(message.content || "");
  if (!collapsible) {
    return `<div class="ai-message__content${freshClass}">${html}</div>`;
  }
  const expanded = Boolean(aiState.expandedMessages[expandKey]);
  return `
    <div class="ai-message__content${freshClass}${expanded ? " is-expanded" : " is-collapsed"}" data-expand-key="${escapeHtml(expandKey)}">
      ${html}
    </div>
    <button class="ai-message__expand js-ai-expand" type="button" data-expand-key="${escapeHtml(expandKey)}">
      ${escapeHtml(expanded ? tr("Zobraziť menej", "Show less") : tr("Zobraziť viac", "Show more"))}
    </button>
  `;
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

function renderQuickActionRollup(label, actions, variant = "chip", openByDefault = false) {
  return `
    <details class="ai-actions-rollup ai-actions-rollup--${variant}"${openByDefault ? " open" : ""}>
      <summary>${escapeHtml(label)}</summary>
      <div class="ai-actions-rollup__menu">
        ${actions.map((action) => renderQuickActionButton(action, variant)).join("")}
      </div>
    </details>
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
  return tr("AI návrh", "AI draft");
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
  const compact = normalized.split(/\s+/).slice(0, 8).join(" ");
  return truncateText(compact, 56);
}

function renderMessageAttachment(message) {
  const attachments = Array.isArray(message?.meta?.attachments)
    ? message.meta.attachments
    : (message?.meta?.attachment_preview ? [message.meta] : []);
  if (!attachments.length) {
    return "";
  }
  return attachments.map((attachment) => `
    <div class="ai-message__attachment">
      <img src="${escapeHtml(String(attachment.attachment_preview || ""))}" alt="${escapeHtml(String(attachment.attachment_name || ""))}">
      <div class="ai-message__attachment-copy">
        <span>${escapeHtml(tr("Priložený obrázok", "Attached image"))}</span>
        <strong>${escapeHtml(String(attachment.attachment_name || ""))}</strong>
      </div>
    </div>
  `).join("");
}

function renderGeneratedAsset(message) {
  const url = String(message?.meta?.generated_asset_url || "").trim();
  const name = String(message?.meta?.generated_asset_name || "").trim();
  const kind = String(message?.meta?.generated_asset_kind || "").trim();
  if (!url || !name) {
    return "";
  }
  return `
    <div class="ai-message__download">
      <a class="ai-message__download-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" download="${escapeHtml(name)}">
        ${escapeHtml(kind === "pdf" ? tr("Stiahnuť PDF", "Download PDF") : tr("Stiahnuť súbor", "Download file"))}
      </a>
      <span class="ai-message__download-name">${escapeHtml(name)}</span>
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
