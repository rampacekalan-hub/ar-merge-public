const aiState = {
  user: null,
  profile: null,
  messages: [],
  typing: false,
};

const aiElements = {
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
  profileForm: document.getElementById("aiProfileForm"),
  profileFocus: document.getElementById("aiProfileFocus"),
  profileNotes: document.getElementById("aiProfileNotes"),
  profileSubmit: document.getElementById("aiProfileSubmit"),
  profileMessage: document.getElementById("aiProfileMessage"),
  promptButtons: Array.from(document.querySelectorAll(".js-ai-prompt")),
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
  aiElements.accountBtn?.addEventListener("click", handleAccountClick);
  aiElements.logoutBtn?.addEventListener("click", handleLogout);
  aiElements.checkoutBtn?.addEventListener("click", startCheckoutFlow);
  aiElements.chatForm?.addEventListener("submit", handleChatSubmit);
  aiElements.profileForm?.addEventListener("submit", handleProfileSubmit);
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
      ? `Členstvo aktívne${user.membership_valid_until ? ` do ${formatDate(user.membership_valid_until)}` : ""}`
      : isLoggedIn
        ? "Členstvo neaktívne"
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
      ? "Prihlás sa a odomkni Unifyo AI"
      : "Aktivuj členstvo a otvor si AI chat";
  }
  if (aiElements.lockedText) {
    aiElements.lockedText.textContent = !isLoggedIn
      ? "Vytvor si účet v Unifyo a získaš prístup k AI asistentovi pre dennú prácu finančného sprostredkovateľa."
      : "Po aktivácii členstva získaš plný prístup k AI chatu s pamäťou, follow-upmi, plánovaním dňa a klientskou komunikáciou.";
  }
  if (aiElements.checkoutBtn) {
    aiElements.checkoutBtn.classList.toggle("is-hidden", !isLoggedIn || hasMembership);
  }
  if (aiElements.loginLink) {
    aiElements.loginLink.textContent = isLoggedIn ? "Prejsť do aplikácie" : "Prihlásiť sa / Registrovať";
  }
  [aiElements.chatInput, aiElements.chatSubmit, aiElements.profileFocus, aiElements.profileNotes, aiElements.profileSubmit].forEach((element) => {
    if (element) {
      element.disabled = !hasMembership;
    }
  });
  aiElements.promptButtons.forEach((button) => {
    button.disabled = !hasMembership;
  });
}

async function loadAssistant() {
  try {
    const response = await fetch("/api/assistant");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "AI asistent sa nepodarilo načítať.");
    }
    aiState.profile = payload.profile || {};
    aiState.messages = payload.messages || [];
    renderAssistantData();
  } catch (error) {
    renderEmptyChat(error.message, true);
  }
}

function renderAssistantData() {
  if (aiElements.profileFocus) {
    aiElements.profileFocus.value = aiState.profile?.focus || "";
  }
  if (aiElements.profileNotes) {
    aiElements.profileNotes.value = aiState.profile?.notes || "";
  }
  if (aiElements.chatHeadline) {
    aiElements.chatHeadline.textContent = aiState.messages.length
      ? "Pokračuj tam, kde si skončil"
      : "Napíš, čo dnes potrebuješ vyriešiť";
  }
  autoResizeTextarea(aiElements.chatInput);
  renderMessages();
}

function renderMessages() {
  if (!aiState.messages.length) {
    renderEmptyChat();
    return;
  }

  aiElements.chatFeed.className = "ai-chat-feed";
  aiElements.chatFeed.innerHTML = aiState.messages.map((message) => `
    <article class="ai-chat-message ai-chat-message--${escapeHtml(message.role || "assistant")}">
      <div class="ai-chat-message__meta">
        <span>${escapeHtml(message.role === "user" ? "Ty" : "Unifyo AI")}</span>
        <span>${escapeHtml(formatDateTime(message.created_at))}</span>
      </div>
      <div class="ai-chat-message__bubble">${formatMessageHtml(message.content || "")}</div>
    </article>
  `).join("");

  if (aiState.typing) {
    aiElements.chatFeed.insertAdjacentHTML(
      "beforeend",
      `
        <article class="ai-chat-message ai-chat-message--assistant">
          <div class="ai-chat-message__meta">
            <span>Unifyo AI</span>
            <span>práve teraz</span>
          </div>
          <div class="ai-chat-message__bubble ai-chat-message__bubble--typing">
            <span></span><span></span><span></span>
          </div>
        </article>
      `
    );
  }

  aiElements.chatFeed.scrollTop = aiElements.chatFeed.scrollHeight;
}

function renderEmptyChat(message = "", isError = false) {
  if (message) {
    aiElements.chatFeed.className = `ai-chat-feed empty-state${isError ? " auth-message auth-message--error" : ""}`;
    aiElements.chatFeed.textContent = message;
    return;
  }

  aiElements.chatFeed.className = "ai-chat-feed empty-state";
  aiElements.chatFeed.innerHTML = `
    <div class="ai-empty">
      <span class="pill">Pripravené</span>
      <h3>Začni jednou vetou</h3>
      <p>Napíš, čo potrebuješ dnes vyriešiť, a AI navrhne ďalší postup.</p>
    </div>
  `;
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

  setInlineMessage(aiElements.chatMessage, "", false, true);
  aiState.typing = true;
  aiState.messages = [...aiState.messages, { role: "user", content: message, created_at: new Date().toISOString() }];
  renderMessages();
  aiElements.chatForm.reset();
  autoResizeTextarea(aiElements.chatInput);
  aiElements.chatSubmit.disabled = true;
  aiElements.chatSubmit.textContent = "Odosielam...";

  try {
    const response = await fetch("/api/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "AI asistent neodpovedal.");
    }
    aiState.profile = payload.profile || aiState.profile || {};
    aiState.messages = payload.messages || aiState.messages;
    setInlineMessage(aiElements.chatMessage, "", false, true);
  } catch (error) {
    setInlineMessage(aiElements.chatMessage, error.message, true);
  } finally {
    aiState.typing = false;
    aiElements.chatSubmit.disabled = false;
    aiElements.chatSubmit.textContent = "Odoslať";
    renderMessages();
  }
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  if (!aiState.user?.membership_active) {
    await startCheckoutFlow();
    return;
  }

  try {
    setInlineMessage(aiElements.profileMessage, "", false, true);
    aiElements.profileSubmit.disabled = true;
    aiElements.profileSubmit.textContent = "Ukladám...";
    const response = await fetch("/api/assistant/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        focus: aiElements.profileFocus?.value.trim() || "",
        notes: aiElements.profileNotes?.value.trim() || "",
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Pamäť AI asistenta sa nepodarilo uložiť.");
    }
    aiState.profile = payload.profile || {};
    setInlineMessage(aiElements.profileMessage, "Pamäť asistenta bola uložená.", false);
  } catch (error) {
    setInlineMessage(aiElements.profileMessage, error.message, true);
  } finally {
    aiElements.profileSubmit.disabled = false;
    aiElements.profileSubmit.textContent = "Uložiť pamäť";
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
  textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 52), 220)}px`;
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
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}
