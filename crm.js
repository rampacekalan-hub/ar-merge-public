"use strict";

const crmState = {
  me: null,
  overview: null,
  meta: null,
  selectedUserId: 0,
  activeSection: "dashboard",
};

const crmEls = {};

document.addEventListener("DOMContentLoaded", () => {
  bindCrmElements();
  bindCrmEvents();
  tickCrmClock();
  setInterval(tickCrmClock, 30000);
  initializeCrm().catch((error) => {
    renderCrmError(normalizeCrmError(error?.message || "CRM sa nepodarilo načítať."));
  });
});

function bindCrmElements() {
  [
    "crmCurrentTime",
    "crmUserBadge",
    "crmErrorBanner",
    "crmDashboardStats",
    "crmHealthCards",
    "crmAlertList",
    "crmUsersTable",
    "crmUserSegments",
    "crmBillingCards",
    "crmBillingTimeline",
    "crmAiCards",
    "crmAiTimeline",
    "crmPromptCards",
    "crmPromptDomains",
    "crmMonitoringCards",
    "crmMonitoringTimeline",
    "crmAuditTimeline",
    "crmRemovedTimeline",
    "crmSettingsGrid",
    "crmUserModal",
    "crmUserModalBackdrop",
    "crmUserModalClose",
    "crmUserModalBody",
    "crmUserSearch",
    "crmUserFilter",
    "crmExportUsers",
  ].forEach((id) => {
    crmEls[id] = document.getElementById(id);
  });
  crmEls.navLinks = Array.from(document.querySelectorAll("[data-crm-target]"));
  crmEls.sections = Array.from(document.querySelectorAll(".crm-section"));
}

function bindCrmEvents() {
  crmEls.navLinks.forEach((button) => {
    button.addEventListener("click", () => activateCrmSection(button.dataset.crmTarget || "dashboard"));
  });
  crmEls.crmUserSearch?.addEventListener("input", () => renderCrmUsers());
  crmEls.crmUserFilter?.addEventListener("change", () => renderCrmUsers());
  crmEls.crmExportUsers?.addEventListener("click", exportCrmUsers);
  crmEls.crmUserModalClose?.addEventListener("click", closeCrmUserModal);
  crmEls.crmUserModalBackdrop?.addEventListener("click", closeCrmUserModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && crmEls.crmUserModal && !crmEls.crmUserModal.hidden) {
      closeCrmUserModal();
    }
  });
}

async function initializeCrm() {
  const [me, overview, meta] = await Promise.all([
    crmFetch("/api/me"),
    crmFetch("/api/admin/overview"),
    crmFetch("/api/crm/meta"),
  ]);
  crmState.me = me?.user || null;
  crmState.overview = overview || { users: [], activity: [], removed_accounts: [], stats: {} };
  crmState.meta = meta || {};
  if (!crmState.me?.is_admin) {
    window.location.replace("/app.html");
    return;
  }
  crmEls.crmUserBadge.textContent = crmState.me.can_manage_admin_tools ? "Hlavný admin" : "Admin";
  renderCrmAll();
}

function renderCrmAll() {
  hideCrmError();
  renderCrmDashboard();
  renderCrmUsers();
  renderCrmBilling();
  renderCrmAi();
  renderCrmPrompts();
  renderCrmMonitoring();
  renderCrmAudit();
  renderCrmSettings();
}

function activateCrmSection(target) {
  crmState.activeSection = target;
  crmEls.navLinks.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.crmTarget === target);
  });
  crmEls.sections.forEach((section) => {
    section.classList.toggle("is-active", section.id === `crmSection-${target}`);
  });
}

function renderCrmDashboard() {
  const stats = crmState.overview?.stats || {};
  crmEls.crmDashboardStats.className = "summary-grid summary-grid--admin";
  crmEls.crmDashboardStats.innerHTML = [
    statCard("Používatelia", stats.total_users || 0, "Celkovo účtov v systéme"),
    statCard("Aktívne členstvá", stats.active_memberships || 0, "Prístup s plateným členstvom"),
    statCard("Online teraz", stats.online_users || 0, "Používatelia aktívni za 5 min."),
    statCard("Registrácie za 30 dní", stats.recent_registrations || 0, "Nové účty za posledný mesiac"),
    statCard("AI správy", stats.ai_messages || 0, "Všetky AI odpovede a vstupy"),
    statCard("AI aktívni používatelia", stats.ai_active_users || 0, "Používatelia s AI aktivitou"),
    statCard("Unikátne IP", stats.recent_unique_ips || 0, "Rôzne IP v posledných logoch"),
    statCard("Admin zásahy", stats.recent_admin_actions || 0, "Citlivé zásahy admina"),
  ].join("");

  crmEls.crmHealthCards.className = "summary-grid summary-grid--admin";
  crmEls.crmHealthCards.innerHTML = [
    healthCard("CRM API", "V poriadku", "active"),
    healthCard("Stripe", crmState.meta?.billing?.stripe_enabled ? "Pripojené" : "Chýba konfigurácia", crmState.meta?.billing?.stripe_enabled ? "active" : "inactive"),
    healthCard("AI model", crmState.meta?.ai?.model || "—", "neutral"),
    healthCard("Prompt verzia", crmState.meta?.ai?.prompt_version || "—", "neutral"),
    healthCard("Web overenie", crmState.meta?.ai?.web_search_enabled ? "Zapnuté" : "Vypnuté", crmState.meta?.ai?.web_search_enabled ? "active" : "warning"),
    healthCard("Max. kompresia súboru", `${crmState.meta?.limits?.max_compress_file_mb || "—"} MB`, "neutral"),
  ].join("");

  const alerts = [];
  if (crmState.meta?.billing?.price_validation_error) {
    alerts.push(activityItem("Billing konfigurácia potrebuje pozornosť.", crmState.meta.billing.price_validation_error, "billing"));
  }
  if (!crmState.meta?.ai?.web_search_enabled) {
    alerts.push(activityItem("AI ide bez webového overenia.", "Pre aktuálne dátové otázky nebude mať live kontext.", "ai"));
  }
  const lastActivity = (crmState.overview?.activity || []).slice(0, 6);
  crmEls.crmAlertList.className = alerts.length || lastActivity.length ? "activity-list" : "activity-list empty-state";
  crmEls.crmAlertList.innerHTML = alerts.length
    ? alerts.join("")
    : lastActivity.length
      ? renderCrmActivity(lastActivity, { showMeta: true })
      : "Momentálne nie sú žiadne kritické upozornenia.";
}

function renderCrmUsers() {
  const users = getFilteredCrmUsers();
  const segments = getCrmUserSegments(crmState.overview?.users || []);
  crmEls.crmUserSegments.className = "summary-grid summary-grid--admin";
  crmEls.crmUserSegments.innerHTML = [
    statCard("Admin účty", segments.admins, "Používatelia s admin rolou"),
    statCard("Bežní používatelia", segments.standard, "Koncové účty"),
    statCard("Online teraz", segments.online, "Aktívni v reálnom čase"),
    statCard("Bez členstva", segments.noMembership, "Bez plateného prístupu"),
    statCard("Zrušené predplatné", segments.cancelAtPeriodEnd, "Stále aktívne do konca obdobia"),
    statCard("Expirované", segments.expired, "Členstvo už skončilo"),
  ].join("");

  if (!users.length) {
    crmEls.crmUsersTable.className = "table-wrap empty-state";
    crmEls.crmUsersTable.textContent = "Žiadny používateľ nezodpovedá aktuálnemu filtru.";
    return;
  }

  crmEls.crmUsersTable.className = "table-wrap crm-table";
  crmEls.crmUsersTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Používateľ</th>
          <th>Rola</th>
          <th>Členstvo</th>
          <th>Platné do</th>
          <th>Online</th>
          <th>Posledná aktivita</th>
          <th>Akcie</th>
        </tr>
      </thead>
      <tbody>
        ${users.map((user) => `
          <tr>
            <td>
              <div class="crm-table__name">
                <strong>${escapeHtml(user.name || "Používateľ")}</strong>
                <span class="crm-table__meta mono">${escapeHtml(user.email || "")}</span>
              </div>
            </td>
            <td>${statusPill(user.role === "admin" ? "Admin" : "Používateľ", user.role === "admin" ? "admin" : "neutral")}</td>
            <td>${membershipPill(user)}</td>
            <td>${escapeHtml(formatDate(user.membership_valid_until))}</td>
            <td>${user.is_online ? statusPill("Online", "active") : statusPill("Offline", "neutral")}</td>
            <td>${escapeHtml(formatDateTime(user.last_seen_at || user.last_login_at))}</td>
            <td>
              <div class="admin-actions">
                <button class="button button--ghost crm-user-action" type="button" data-user-id="${user.id}" data-action="detail">Detail</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  crmEls.crmUsersTable.querySelectorAll(".crm-user-action").forEach((button) => {
    button.addEventListener("click", () => openCrmUserDetail(Number(button.dataset.userId || 0)));
  });
}

function renderCrmBilling() {
  const users = crmState.overview?.users || [];
  const active = users.filter((user) => user.membership_status === "active").length;
  const cancelled = users.filter((user) => user.membership_status === "cancelled").length;
  const expiring = users.filter((user) => user.membership_valid_until && new Date(user.membership_valid_until).getTime() < Date.now() + 7 * 24 * 3600 * 1000).length;
  crmEls.crmBillingCards.className = "summary-grid summary-grid--admin";
  crmEls.crmBillingCards.innerHTML = [
    statCard("Aktívne predplatné", active, "Používatelia so živým prístupom"),
    statCard("Cancel at period end", cancelled, "Zrušené, ale stále platné"),
    statCard("Expiruje do 7 dní", expiring, "Vyžaduje kontrolu obnovy"),
    statCard("Price ID", crmState.meta?.billing?.price_id || "—", "Aktívny Stripe price"),
    statCard("Právna verzia", crmState.meta?.billing?.legal_version || "—", "Verzia obchodných podmienok"),
    statCard("Checkout consent", crmState.meta?.billing?.checkout_consent_version || "—", "Verzia súhlasu pred platbou"),
  ].join("");

  const billingEvents = (crmState.overview?.activity || []).filter((item) => {
    const type = String(item.event_type || "");
    return type.includes("subscription") || type.includes("checkout") || type.includes("stripe");
  }).slice(0, 14);
  crmEls.crmBillingTimeline.className = billingEvents.length ? "activity-list" : "activity-list empty-state";
  crmEls.crmBillingTimeline.innerHTML = billingEvents.length
    ? renderCrmActivity(billingEvents, { showMeta: true })
    : "Zatiaľ bez billing udalostí.";
}

function renderCrmAi() {
  const stats = crmState.overview?.stats || {};
  const aiEvents = (crmState.overview?.activity || []).filter((item) => {
    const type = String(item.event_type || "");
    return type.includes("assistant") || type.includes("ai") || type.includes("chat");
  }).slice(0, 14);

  crmEls.crmAiCards.className = "summary-grid summary-grid--admin";
  crmEls.crmAiCards.innerHTML = [
    statCard("AI správy", stats.ai_messages || 0, "Všetky správy v AI"),
    statCard("Vlákna", stats.ai_threads || 0, "Konverzačné vlákna"),
    statCard("Používatelia", stats.ai_active_users || 0, "Používatelia aktívni v AI"),
    statCard("Model", crmState.meta?.ai?.model || "—", "Aktuálne používaný model"),
    statCard("Prompt verzia", crmState.meta?.ai?.prompt_version || "—", "Nasadená prompt logika"),
    statCard("Trusted domains", (crmState.meta?.ai?.trusted_domains || []).length, "Domény pre overovanie"),
  ].join("");

  crmEls.crmAiTimeline.className = aiEvents.length ? "activity-list" : "activity-list empty-state";
  crmEls.crmAiTimeline.innerHTML = aiEvents.length
    ? renderCrmActivity(aiEvents, { showMeta: true })
    : "Zatiaľ bez AI udalostí.";
}

function renderCrmPrompts() {
  const domains = crmState.meta?.ai?.trusted_domains || [];
  crmEls.crmPromptCards.className = "summary-grid summary-grid--admin";
  crmEls.crmPromptCards.innerHTML = [
    statCard("Prompt verzia", crmState.meta?.ai?.prompt_version || "—", "Aktuálne nasadený prompt set"),
    statCard("Jazyk trhu", "SK", "Primárny slovenský kontext"),
    statCard("Web validácia", crmState.meta?.ai?.web_search_enabled ? "Aktívna" : "Neaktívna", "Použitie pri aktuálnych témach"),
    statCard("Interný režim", "Praktický asistent", "AI vedená na financie a sprostredkovanie"),
  ].join("");

  crmEls.crmPromptDomains.className = domains.length ? "crm-chip-list" : "crm-chip-list empty-state";
  crmEls.crmPromptDomains.innerHTML = domains.length
    ? domains.map((domain) => `<span class="crm-chip">${escapeHtml(domain)}</span>`).join("")
    : "Zatiaľ bez dôveryhodných domén.";
}

function renderCrmMonitoring() {
  const stats = crmState.overview?.stats || {};
  crmEls.crmMonitoringCards.className = "summary-grid summary-grid--admin";
  crmEls.crmMonitoringCards.innerHTML = [
    statCard("API request limit", `${crmState.meta?.limits?.max_request_body_mb || "—"} MB`, "Max. request body"),
    statCard("Kontakt import", `${crmState.meta?.limits?.max_contact_file_mb || "—"} MB`, "Max. CSV/XLSX vstup"),
    statCard("Kompresia", `${crmState.meta?.limits?.max_compress_file_mb || "—"} MB`, "Max. kompresný vstup"),
    statCard("AI obrázky", `${crmState.meta?.limits?.max_ai_image_mb || "—"} MB`, "Max. veľkosť prílohy"),
    statCard("Recent logs", stats.recent_logs || 0, "Aktivity za 30 dní"),
    statCard("Deleted accounts", stats.deleted_accounts || 0, "Vymazané účty celkovo"),
  ].join("");

  const incidentItems = (crmState.overview?.activity || []).filter((item) => {
    const text = `${item.event_type || ""} ${item.event_label || ""}`.toLowerCase();
    return text.includes("error") || text.includes("fail") || text.includes("cancel") || text.includes("deleted");
  }).slice(0, 12);
  crmEls.crmMonitoringTimeline.className = incidentItems.length ? "activity-list" : "activity-list empty-state";
  crmEls.crmMonitoringTimeline.innerHTML = incidentItems.length
    ? renderCrmActivity(incidentItems, { showMeta: true })
    : "Momentálne bez incidentov.";
}

function renderCrmAudit() {
  const activity = crmState.overview?.activity || [];
  const removed = crmState.overview?.removed_accounts || [];
  crmEls.crmAuditTimeline.className = activity.length ? "activity-list" : "activity-list empty-state";
  crmEls.crmAuditTimeline.innerHTML = activity.length
    ? renderCrmActivity(activity.slice(0, 20), { showMeta: true })
    : "Audit log je zatiaľ prázdny.";

  crmEls.crmRemovedTimeline.className = removed.length ? "activity-list" : "activity-list empty-state";
  crmEls.crmRemovedTimeline.innerHTML = removed.length
    ? removed.map((item) => activityItem(
        item.label || "Zásah do účtu",
        [
          item.email || "Bez e-mailu",
          item.membership_status ? `stav: ${item.membership_status}` : "",
          item.last_order_number ? `objednávka: ${item.last_order_number}` : "",
        ].filter(Boolean).join(" · "),
        item.event_type === "admin_account_deleted" ? "danger" : "warning",
        formatDateTime(item.created_at)
      )).join("")
    : "Zatiaľ bez vymazaných alebo deaktivovaných účtov.";
}

function renderCrmSettings() {
  crmEls.crmSettingsGrid.className = "summary-grid summary-grid--admin";
  crmEls.crmSettingsGrid.innerHTML = [
    statCard("Support e-mail", crmState.meta?.crm?.support_email || "—", "Primárny support kontakt"),
    statCard("App base URL", crmState.meta?.crm?.app_base_url || "—", "Verejná adresa aplikácie"),
    statCard("Stripe", crmState.meta?.billing?.stripe_enabled ? "Aktívny" : "Chýba", "Billing provider"),
    statCard("Trusted domains", (crmState.meta?.ai?.trusted_domains || []).join(", ") || "—", "Domény pre overovanie AI"),
    statCard("CRM verzia", crmState.meta?.crm?.version || "—", "Interná verzia riadiacej vrstvy"),
    statCard("Cena / price id", crmState.meta?.billing?.price_id || "—", "Napojené na Stripe"),
  ].join("");
}

async function openCrmUserDetail(userId) {
  if (!userId || !crmEls.crmUserModalBody) {
    return;
  }
  crmState.selectedUserId = userId;
  crmEls.crmUserModal.hidden = false;
  crmEls.crmUserModalBody.className = "crm-empty";
  crmEls.crmUserModalBody.textContent = "Načítavam detail používateľa...";
  try {
    const payload = await crmFetch(`/api/admin/user-detail?user_id=${encodeURIComponent(String(userId))}`);
    renderCrmUserModal(payload);
  } catch (error) {
    crmEls.crmUserModalBody.className = "crm-empty";
    crmEls.crmUserModalBody.textContent = normalizeCrmError(error?.message || "Detail používateľa sa nepodarilo načítať.");
  }
}

function closeCrmUserModal() {
  if (crmEls.crmUserModal) {
    crmEls.crmUserModal.hidden = true;
  }
}

function renderCrmUserModal(payload) {
  const user = payload.user || {};
  const subscriptionPayload = payload.subscription || {};
  const subscription = subscriptionPayload.membership || subscriptionPayload || {};
  const registrationConsent = payload.registration_consent || {};
  const checkoutConsent = payload.checkout_consent || {};
  const ai = payload.assistant_stats || {};
  const activity = payload.activity || [];
  const membershipState = user.membership_status || subscription.status || "inactive";
  const canManage = Boolean(crmState.me?.can_manage_admin_tools);

  crmEls.crmUserModalBody.className = "";
  crmEls.crmUserModalBody.innerHTML = `
    <div class="crm-modal__head">
      <div>
        <h2 class="crm-modal__title">${escapeHtml(user.name || "Používateľ")}</h2>
        <p class="crm-modal__subtitle">${escapeHtml(user.email || "")}</p>
      </div>
      <div class="status-pill-group">
        ${statusPill(user.role === "admin" ? "Admin" : "Používateľ", user.role === "admin" ? "admin" : "neutral")}
        ${membershipPill({ membership_status: membershipState, membership_valid_until: user.membership_valid_until })}
        ${user.is_online ? statusPill("Online", "active") : statusPill("Offline", "neutral")}
      </div>
    </div>

    <div class="crm-modal-grid crm-modal-grid--two">
      <section class="crm-detail-card">
        <h4>Základné údaje</h4>
        <div class="crm-detail-list">
          ${detailRow("Registrovaný od", formatDate(user.created_at))}
          ${detailRow("Naposledy prihlásený", formatDateTime(user.last_login_at))}
          ${detailRow("Naposledy aktívny", formatDateTime(user.last_seen_at))}
          ${detailRow("Posledná IP", user.last_seen_ip || "—", true)}
          ${detailRow("Posledný agent", user.last_seen_agent || "—")}
        </div>
      </section>

      <section class="crm-detail-card">
        <h4>Členstvo a billing</h4>
        <div class="crm-detail-list">
          ${detailRow("Stav", membershipState || "—")}
          ${detailRow("Platné do", formatDate(subscription.valid_until || user.membership_valid_until))}
          ${detailRow("Ďalšie obnovenie", formatDate(subscription.next_renewal_at))}
          ${detailRow("Stripe subscription", subscription.stripe_subscription_id || "—", true)}
          ${detailRow("Stripe status", subscription.stripe_status || "—")}
          ${detailRow("Objednávka", subscription.last_order_number || "—")}
          ${detailRow("Predplatné číslo", subscription.internal_subscription_number || "—")}
          ${detailRow("Zrušené", subscription.cancelled_at ? formatDateTime(subscription.cancelled_at) : "—")}
        </div>
      </section>

      <section class="crm-detail-card">
        <h4>Právne súhlasy</h4>
        <div class="crm-detail-list">
          ${detailRow("Registračný súhlas", registrationConsent.created_at ? formatDateTime(registrationConsent.created_at) : "—")}
          ${detailRow("Reg. IP", registrationConsent.ip_address || "—", true)}
          ${detailRow("Marketing", registrationConsent.marketing_consent ? "Áno" : "Nie")}
          ${detailRow("Reg. verzia", registrationConsent.legal_version || "—")}
          ${detailRow("Checkout súhlas", checkoutConsent.created_at ? formatDateTime(checkoutConsent.created_at) : "—")}
          ${detailRow("Checkout IP", checkoutConsent.ip_address || "—", true)}
          ${detailRow("Checkout verzia", checkoutConsent.consent_version || "—")}
          ${detailRow("Consent text", checkoutConsent.consent_text || "—")}
        </div>
      </section>

      <section class="crm-detail-card">
        <h4>AI využitie</h4>
        <div class="crm-detail-list">
          ${detailRow("Fokus", ai.focus || "—")}
          ${detailRow("Vlákna", String(ai.thread_count || 0))}
          ${detailRow("Správy", String(ai.message_count || 0))}
          ${detailRow("AI odpovede", String(ai.assistant_count || 0))}
          ${detailRow("Obrázky", String(ai.image_count || 0))}
          ${detailRow("Web overenia", String(ai.web_count || 0))}
          ${detailRow("Relevancia pamäte", `${Number(ai.relevance_percent || 0)} %`)}
          ${detailRow("Témy", (ai.topics || []).join(", ") || "—")}
        </div>
      </section>
    </div>

    ${canManage ? `
      <div class="crm-actions">
        <button class="button button--ghost" type="button" data-crm-admin-action="deactivate" data-user-id="${user.id}">Deaktivovať účet</button>
        <button class="button button--ghost admin-action--danger" type="button" data-crm-admin-action="delete_account" data-user-id="${user.id}">Vymazať účet</button>
        <button class="button button--ghost" type="button" data-crm-admin-role="${user.role === "admin" ? "user" : "admin"}" data-user-id="${user.id}">${user.role === "admin" ? "Nastaviť ako používateľ" : "Nastaviť ako admin"}</button>
        <button class="button button--ghost" type="button" data-crm-force-sync data-user-id="${user.id}">Vynútiť Stripe sync</button>
        <button class="button button--ghost" type="button" data-crm-memory-reset data-user-id="${user.id}">Vymazať AI pamäť</button>
      </div>
      <p class="crm-kpi-note">Citlivé akcie sú logované do audit trailu. Zmeny rolí, Stripe sync aj zásahy do AI pamäte ostávajú dohľadateľné.</p>
    ` : ""}

    <section class="crm-detail-card" style="margin-top:18px;">
      <h4>Posledné aktivity používateľa</h4>
      <div class="activity-list">
        ${activity.length ? renderCrmActivity(activity, { showMeta: true }) : `<div class="crm-empty">Používateľ zatiaľ nemá históriu aktivít.</div>`}
      </div>
    </section>
  `;

  crmEls.crmUserModalBody.querySelectorAll("[data-crm-admin-action]").forEach((button) => {
    button.addEventListener("click", () => submitCrmMembershipAction(Number(button.dataset.userId || 0), button.dataset.crmAdminAction));
  });
  crmEls.crmUserModalBody.querySelectorAll("[data-crm-admin-role]").forEach((button) => {
    button.addEventListener("click", () => submitCrmRoleUpdate(Number(button.dataset.userId || 0), button.dataset.crmAdminRole));
  });
  crmEls.crmUserModalBody.querySelectorAll("[data-crm-force-sync]").forEach((button) => {
    button.addEventListener("click", () => submitCrmForceSync(Number(button.dataset.userId || 0)));
  });
  crmEls.crmUserModalBody.querySelectorAll("[data-crm-memory-reset]").forEach((button) => {
    button.addEventListener("click", () => submitCrmAssistantMemoryReset(Number(button.dataset.userId || 0)));
  });
}

async function submitCrmMembershipAction(userId, action) {
  if (!userId) {
    return;
  }
  if (action === "delete_account" && !window.confirm("Naozaj chceš účet vymazať? Táto akcia je finálna a odošle používateľovi e-mail.")) {
    return;
  }
  if (action === "deactivate" && !window.confirm("Naozaj chceš účet deaktivovať? Používateľ stratí prístup a členstvo sa ukončí.")) {
    return;
  }
  try {
    await crmFetch("/api/admin/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, action }),
    });
    await refreshCrmData({ reopenUserId: action === "delete_account" ? 0 : userId });
  } catch (error) {
    renderCrmError(normalizeCrmError(error?.message || "Admin akcia zlyhala."));
  }
}

async function submitCrmRoleUpdate(userId, role) {
  try {
    await crmFetch("/api/admin/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, role }),
    });
    await refreshCrmData({ reopenUserId: userId });
  } catch (error) {
    renderCrmError(normalizeCrmError(error?.message || "Rolu sa nepodarilo zmeniť."));
  }
}

async function submitCrmForceSync(userId) {
  try {
    await crmFetch("/api/admin/force-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    await refreshCrmData({ reopenUserId: userId });
  } catch (error) {
    renderCrmError(normalizeCrmError(error?.message || "Stripe sync sa nepodarilo spustiť."));
  }
}

async function submitCrmAssistantMemoryReset(userId) {
  if (!window.confirm("Naozaj chceš vymazať AI pamäť tohto používateľa?")) {
    return;
  }
  try {
    await crmFetch("/api/admin/assistant-memory-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    await refreshCrmData({ reopenUserId: userId });
  } catch (error) {
    renderCrmError(normalizeCrmError(error?.message || "AI pamäť sa nepodarilo vymazať."));
  }
}

async function refreshCrmData({ reopenUserId = 0 } = {}) {
  const [overview, meta] = await Promise.all([
    crmFetch("/api/admin/overview"),
    crmFetch("/api/crm/meta"),
  ]);
  crmState.overview = overview || crmState.overview;
  crmState.meta = meta || crmState.meta;
  renderCrmAll();
  if (reopenUserId) {
    await openCrmUserDetail(reopenUserId);
  } else {
    closeCrmUserModal();
  }
}

function getFilteredCrmUsers() {
  const query = String(crmEls.crmUserSearch?.value || "").trim().toLowerCase();
  const filter = String(crmEls.crmUserFilter?.value || "all");
  return (crmState.overview?.users || []).filter((user) => {
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
    if (filter === "online" && !user.is_online) {
      return false;
    }
    return true;
  });
}

function getCrmUserSegments(users) {
  return {
    admins: users.filter((user) => user.role === "admin").length,
    standard: users.filter((user) => user.role !== "admin").length,
    online: users.filter((user) => user.is_online).length,
    noMembership: users.filter((user) => user.membership_status !== "active").length,
    cancelAtPeriodEnd: users.filter((user) => user.membership_status === "cancelled").length,
    expired: users.filter((user) => user.membership_valid_until && new Date(user.membership_valid_until).getTime() < Date.now()).length,
  };
}

function exportCrmUsers() {
  const rows = getFilteredCrmUsers();
  if (!rows.length) {
    window.alert("Nie sú k dispozícii žiadni používatelia na export.");
    return;
  }
  const headers = ["meno", "email", "rola", "clenstvo", "platne_do", "online", "naposledy_aktivny"];
  const csvRows = [headers.join(",")].concat(
    rows.map((user) => [
      csvCell(user.name || ""),
      csvCell(user.email || ""),
      csvCell(user.role || "user"),
      csvCell(user.membership_status || "inactive"),
      csvCell(user.membership_valid_until || ""),
      csvCell(user.is_online ? "online" : "offline"),
      csvCell(user.last_seen_at || user.last_login_at || ""),
    ].join(","))
  );
  const blob = new Blob(["\ufeff" + csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "unifyo-crm-users.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderCrmActivity(items, { showMeta = false } = {}) {
  return items.map((item) => {
    const meta = item.meta || {};
    const chips = [];
    if (item.user_name || item.user_email) {
      chips.push(`<span class="status-pill status-pill--neutral">${escapeHtml(item.user_name || item.user_email)}</span>`);
    }
    if (showMeta && meta.ip) {
      chips.push(`<span class="status-pill status-pill--neutral mono">${escapeHtml(meta.ip)}</span>`);
    }
    if (showMeta && meta.status) {
      chips.push(statusPill(meta.status, "neutral"));
    }
    if (showMeta && meta.target_user_email) {
      chips.push(`<span class="status-pill status-pill--neutral mono">${escapeHtml(meta.target_user_email)}</span>`);
    }
    if (showMeta && meta.stripe_subscription_id) {
      chips.push(`<span class="status-pill status-pill--neutral mono">${escapeHtml(truncateText(meta.stripe_subscription_id, 22))}</span>`);
    }
    const subtitle = item.event_label || item.event_type || "Systémová udalosť";
    return activityItem(
      subtitle,
      chips.join(" "),
      inferActivityTone(item.event_type || ""),
      formatDateTime(item.created_at),
      true
    );
  }).join("");
}

function activityItem(title, body, tone = "neutral", trailing = "", rawBody = false) {
  return `
    <article class="activity-card">
      <div class="activity-card__head">
        <strong>${escapeHtml(title)}</strong>
        ${trailing ? `<span class="status-pill status-pill--neutral">${escapeHtml(trailing)}</span>` : ""}
      </div>
      <div class="activity-card__body ${tone === "danger" ? "activity-card__body--danger" : ""}">
        ${rawBody ? body : escapeHtml(body)}
      </div>
    </article>
  `;
}

function statCard(label, value, hint) {
  return `
    <article class="summary-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <small class="summary-card__hint">${escapeHtml(hint)}</small>
    </article>
  `;
}

function healthCard(label, value, tone) {
  return `
    <article class="summary-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <small class="summary-card__hint">${statusPill(tone === "active" ? "OK" : tone === "warning" ? "Pozor" : tone === "inactive" ? "Chýba" : "Info", tone)}</small>
    </article>
  `;
}

function detailRow(label, value, code = false) {
  const safeValue = escapeHtml(String(value || "—"));
  return `
    <div class="crm-detail-row">
      <strong>${escapeHtml(label)}</strong>
      ${code ? `<code>${safeValue}</code>` : `<span>${safeValue}</span>`}
    </div>
  `;
}

function membershipPill(user) {
  const status = user.membership_status || "inactive";
  if (status === "active") {
    return statusPill("Aktívne", "active");
  }
  if (status === "cancelled") {
    return statusPill("Zrušené / dobieha", "warning");
  }
  return statusPill("Neaktívne", "inactive");
}

function statusPill(label, tone = "neutral") {
  const map = {
    active: "status-pill--active",
    warning: "status-pill--warning",
    inactive: "status-pill--inactive",
    admin: "status-pill--admin",
    neutral: "status-pill--neutral",
  };
  return `<span class="status-pill ${map[tone] || map.neutral}">${escapeHtml(label)}</span>`;
}

function inferActivityTone(eventType) {
  const text = String(eventType || "").toLowerCase();
  if (text.includes("deleted") || text.includes("error") || text.includes("fail")) {
    return "danger";
  }
  if (text.includes("cancel") || text.includes("deactivate")) {
    return "warning";
  }
  return "neutral";
}

async function crmFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    payload = {};
  }
  if (!response.ok) {
    throw new Error(payload.error || response.statusText || "Požiadavka zlyhala.");
  }
  return payload;
}

function tickCrmClock() {
  if (!crmEls.crmCurrentTime) {
    return;
  }
  crmEls.crmCurrentTime.textContent = new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function renderCrmError(message) {
  if (!crmEls.crmErrorBanner) {
    return;
  }
  crmEls.crmErrorBanner.hidden = false;
  crmEls.crmErrorBanner.textContent = message;
}

function hideCrmError() {
  if (!crmEls.crmErrorBanner) {
    return;
  }
  crmEls.crmErrorBanner.hidden = true;
  crmEls.crmErrorBanner.textContent = "";
}

function formatDate(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function truncateText(value, maxLength = 120) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function normalizeCrmError(message) {
  const text = String(message || "").trim();
  if (!text || text === "null is not an object") {
    return "CRM narazilo na chybu v dátach. Skús obnoviť stránku.";
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

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}
