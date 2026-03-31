"use strict";

const crmState = {
  me: null,
  overview: null,
  meta: null,
  templates: [],
  selectedUserId: 0,
  userModalOpen: false,
  userModalRequestId: 0,
  selectedTemplateKey: "",
  activeSection: "dashboard",
  refreshTimer: 0,
  lastLoadedAt: 0,
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
    "crmKpiLegend",
    "crmDashboardActions",
    "crmHealthCards",
    "crmAlertList",
    "crmUsersTable",
    "crmUserSegments",
    "crmUserQuickActions",
    "crmBillingCards",
    "crmBillingTimeline",
    "crmAiCards",
    "crmAiLegend",
    "crmAiPerformance",
    "crmAiConfig",
    "crmAiTracking",
    "crmAiWorkflows",
    "crmAiTimeline",
    "crmPromptCards",
    "crmPromptDomains",
    "crmMonitoringCards",
    "crmMonitoringTimeline",
    "crmAuditTimeline",
    "crmRemovedTimeline",
    "crmAdminActions",
    "crmSettingsGrid",
    "crmSettingsSyncMeta",
    "crmEmailTemplateList",
    "crmEmailTemplateEditor",
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
  bindCrmAiTabs();
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
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopCrmAutoRefresh();
    } else {
      startCrmAutoRefresh();
    }
  });
}

function bindCrmAiTabs() {
  const tabs = Array.from(document.querySelectorAll("[data-ai-tab]"));
  if (!tabs.length) {
    return;
  }
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.aiTab;
      tabs.forEach((btn) => btn.classList.toggle("is-active", btn === tab));
      document.querySelectorAll(".crm-ai-panel").forEach((panel) => {
        panel.classList.toggle("is-active", panel.id === `crmAiPanel-${target}`);
      });
    });
  });
}

async function initializeCrm() {
  const [me, overview, meta, templatesPayload] = await Promise.all([
    crmFetch("/api/me"),
    crmFetch("/api/admin/overview"),
    crmFetch("/api/crm/meta"),
    crmFetch("/api/crm/email-templates"),
  ]);
  crmState.me = me?.user || null;
  crmState.overview = overview || { users: [], activity: [], removed_accounts: [], stats: {} };
  crmState.meta = meta || {};
  crmState.templates = templatesPayload?.templates || [];
  crmState.selectedTemplateKey = crmState.templates[0]?.template_key || "";
  crmState.lastLoadedAt = Date.now();
  if (!crmState.me?.is_admin) {
    window.location.replace("/app.html");
    return;
  }
  crmEls.crmUserBadge.textContent = crmState.me.can_manage_admin_tools ? "Hlavný admin" : "Admin";
  renderCrmAll();
  startCrmAutoRefresh();
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
  if (Date.now() - (crmState.lastLoadedAt || 0) > 30000) {
    refreshCrmData({ reopenUserId: crmState.userModalOpen ? (crmState.selectedUserId || 0) : 0, silent: true }).catch(() => {});
  }
}

function renderCrmDashboard() {
  const stats = crmState.overview?.stats || {};
  crmEls.crmDashboardStats.className = "summary-grid summary-grid--admin crm-kpi-grid";
  crmEls.crmDashboardStats.innerHTML = [
    statCard("Používatelia", stats.total_users || 0, "Celkovo účtov v systéme", "kpi"),
    statCard("Aktívne členstvá", stats.active_memberships || 0, "Prístup s plateným členstvom", "kpi"),
    statCard("Online teraz", stats.online_users || 0, "Používatelia aktívni za 5 min.", "kpi"),
    statCard("Registrácie za 30 dní", stats.recent_registrations || 0, "Nové účty za posledný mesiac", "kpi"),
    statCard("Unikátne IP", stats.recent_unique_ips || 0, "Rôzne IP v posledných logoch", "kpi"),
    statCard("Admin zásahy", stats.recent_admin_actions || 0, "Citlivé zásahy admina", "kpi"),
    statCard("Aktivity 30 dní", stats.recent_logs || 0, "Súhrn systémovej aktivity", "kpi"),
    statCard("Vymazané účty", stats.deleted_accounts || 0, "Celkový počet vymazaných účtov", "kpi"),
  ].join("");

  if (crmEls.crmKpiLegend) {
    crmEls.crmKpiLegend.className = "crm-legend-row";
    crmEls.crmKpiLegend.innerHTML = [
      legendPill("Zelená", "Všetko je v poriadku alebo aktívne.", "active"),
      legendPill("Žltá", "Treba skontrolovať alebo dobieha zmena.", "warning"),
      legendPill("Sivá", "Informačný alebo neutrálne sledovaný údaj.", "neutral"),
      legendPill("Červená", "Chyba, výpadok alebo chýbajúca väzba.", "inactive"),
    ].join("");
  }

  renderCrmDashboardActions();

  crmEls.crmHealthCards.className = "summary-grid summary-grid--admin crm-health-grid";
  crmEls.crmHealthCards.innerHTML = [
    healthCard("CRM API", "V poriadku", "active"),
    healthCard("Stripe", crmState.meta?.billing?.stripe_enabled ? "Pripojené" : "Chýba konfigurácia", crmState.meta?.billing?.stripe_enabled ? "active" : "inactive"),
    healthCard("Max. kompresia súboru", `${crmState.meta?.limits?.max_compress_file_mb || "—"} MB`, "neutral"),
    healthCard("Import kontaktov", `${crmState.meta?.limits?.max_contact_file_mb || "—"} MB`, "neutral"),
    healthCard("AI obrázky", `${crmState.meta?.limits?.max_ai_image_mb || "—"} MB`, "neutral"),
  ].join("");

  const alerts = [];
  if (crmState.meta?.billing?.price_validation_error) {
    alerts.push(activityItem("Billing konfigurácia potrebuje pozornosť.", crmState.meta.billing.price_validation_error, "billing"));
  }
  const lastActivity = (crmState.overview?.activity || []).slice(0, 6);
  crmEls.crmAlertList.className = alerts.length || lastActivity.length ? "activity-list" : "activity-list empty-state";
  crmEls.crmAlertList.innerHTML = alerts.length
    ? alerts.join("")
    : lastActivity.length
      ? renderCrmActivity(lastActivity, { showMeta: true })
      : "Momentálne nie sú žiadne kritické upozornenia.";
}

function renderCrmDashboardActions() {
  if (!crmEls.crmDashboardActions) {
    return;
  }
  crmEls.crmDashboardActions.className = "crm-action-grid crm-action-grid--compact";
  crmEls.crmDashboardActions.innerHTML = [
    crmActionCard("Obnoviť celé CRM", "Načíta čerstvé dáta bez obnovy celej stránky.", "refresh"),
    crmActionCard("Nové registrácie", "Skontroluj nových používateľov, súhlasy a onboarding.", "users-filter-recent"),
    crmActionCard("Neaktívne účty", "Rýchly pohľad na účty bez členstva alebo bez aktivity.", "users-filter-inactive"),
    crmActionCard("Online teraz", "Otvor len účty, ktoré sú práve v systéme.", "users-filter-online"),
    crmActionCard("Billing a Stripe", "Skontroluj platby, zrušenia a synchronizácie.", "billing"),
    crmActionCard("AI a používanie", "Pozri čo sa AI učí, čo používa a kde potrebuje zásah.", "ai"),
    crmActionCard("Audit a história", "Skontroluj zásahy admina a citlivé udalosti v systéme.", "audit"),
    crmActionCard("Nastavenia systému", "Uprav email šablóny, právne verzie a globálne pravidlá.", "settings"),
  ].join("");
  bindCrmAdminActionButtons(crmEls.crmDashboardActions);
}

function renderCrmUsers() {
  const users = getFilteredCrmUsers();
  const segments = getCrmUserSegments(crmState.overview?.users || []);
  crmEls.crmUserSegments.className = "summary-grid summary-grid--admin crm-segment-grid";
  crmEls.crmUserSegments.innerHTML = [
    statCard("Admin účty", segments.admins, "Používatelia s admin rolou", "segment"),
    statCard("Bežní používatelia", segments.standard, "Koncové účty", "segment"),
    statCard("Online teraz", segments.online, "Aktívni v reálnom čase", "segment"),
    statCard("Bez členstva", segments.noMembership, "Bez plateného prístupu", "segment"),
    statCard("Zrušené predplatné", segments.cancelAtPeriodEnd, "Stále aktívne do konca obdobia", "segment"),
    statCard("Expirované", segments.expired, "Členstvo už skončilo", "segment"),
  ].join("");

  renderCrmUserQuickActions();

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
                ${crmState.me?.can_manage_admin_tools ? `<button class="button button--ghost crm-user-sync" type="button" data-user-id="${user.id}">Sync</button>` : ""}
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
  crmEls.crmUsersTable.querySelectorAll(".crm-user-sync").forEach((button) => {
    button.addEventListener("click", () => submitCrmForceSync(Number(button.dataset.userId || 0)));
  });
}

function renderCrmUserQuickActions() {
  if (!crmEls.crmUserQuickActions) {
    return;
  }
  crmEls.crmUserQuickActions.className = "crm-ops-board";
  crmEls.crmUserQuickActions.innerHTML = `
    <div class="crm-ops-board__filters">
      <button class="button button--ghost" type="button" data-crm-quick-filter="all">Všetci</button>
      <button class="button button--ghost" type="button" data-crm-quick-filter="active">Aktívne členstvá</button>
      <button class="button button--ghost" type="button" data-crm-quick-filter="online">Online teraz</button>
      <button class="button button--ghost" type="button" data-crm-quick-filter="admin">Admin účty</button>
      <button class="button button--ghost" type="button" data-crm-users-refresh>Obnoviť dáta</button>
    </div>
    <div class="crm-action-grid crm-action-grid--compact crm-ops-board__actions">
      ${crmActionCard("Nové registrácie", "Zameraj sa na nových používateľov za posledné dni a ich súhlasy.", "users-filter-recent")}
      ${crmActionCard("Neaktívne účty", "Rýchly pohľad na účty bez členstva alebo bez aktivity.", "users-filter-inactive")}
      ${crmActionCard("Online používatelia", "Skontroluj, kto je teraz v aplikácii a pracuje naživo.", "users-filter-online")}
      ${crmActionCard("Admin účty", "Pracuj len s internými správcovskými účtami.", "users-filter-admin")}
    </div>
  `;
  crmEls.crmUserQuickActions.querySelectorAll("[data-crm-quick-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      if (crmEls.crmUserFilter) {
        crmEls.crmUserFilter.value = button.dataset.crmQuickFilter || "all";
      }
      renderCrmUsers();
    });
  });
  crmEls.crmUserQuickActions.querySelector("[data-crm-users-refresh]")?.addEventListener("click", async () => {
    await refreshCrmData({ reopenUserId: crmState.userModalOpen ? (crmState.selectedUserId || 0) : 0, silent: true });
  });
  bindCrmAdminActionButtons(crmEls.crmUserQuickActions);
}

function renderCrmBilling() {
  const users = crmState.overview?.users || [];
  const active = users.filter((user) => user.membership_status === "active").length;
  const cancelled = users.filter((user) => user.membership_status === "cancelled").length;
  const expiring = users.filter((user) => user.membership_valid_until && new Date(user.membership_valid_until).getTime() < Date.now() + 7 * 24 * 3600 * 1000).length;
  crmEls.crmBillingCards.className = "summary-grid summary-grid--admin crm-billing-grid";
  crmEls.crmBillingCards.innerHTML = [
    statCard("Aktívne predplatné", active, "Používatelia so živým prístupom", "metric"),
    statCard("Cancel at period end", cancelled, "Zrušené, ale stále platné", "metric"),
    statCard("Expiruje do 7 dní", expiring, "Vyžaduje kontrolu obnovy", "metric"),
    statCard("Price ID", crmState.meta?.billing?.price_id || "—", "Aktívny Stripe price", "metric"),
    statCard("Právna verzia", crmState.meta?.billing?.legal_version || "—", "Verzia obchodných podmienok", "metric"),
    statCard("Checkout consent", crmState.meta?.billing?.checkout_consent_version || "—", "Verzia súhlasu pred platbou", "metric"),
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
  const aiMessages = Number(stats.ai_messages || 0);
  const aiThreads = Number(stats.ai_threads || 0);
  const aiUsers = Number(stats.ai_active_users || 0);
  const assistantReplies = aiEvents.filter((item) => String(item.event_type || "").includes("assistant")).length;
  const webVerifiedEvents = aiEvents.filter((item) => JSON.stringify(item.meta || {}).includes("used_web_search")).length;
  const avgMessagesPerThread = aiThreads ? (aiMessages / aiThreads).toFixed(aiMessages / aiThreads >= 10 ? 0 : 1) : "0";
  const avgThreadsPerUser = aiUsers ? (aiThreads / aiUsers).toFixed(aiThreads / aiUsers >= 10 ? 0 : 1) : "0";
  const webUsageShare = aiMessages ? Math.min(100, Math.round((webVerifiedEvents / aiMessages) * 100)) : 0;
  const sourcesCount = (crmState.meta?.ai?.trusted_domains || []).length;

  crmEls.crmAiCards.className = "summary-grid summary-grid--admin crm-ai-grid";
  crmEls.crmAiCards.innerHTML = [
    statCard("AI správy", stats.ai_messages || 0, "Všetky správy v AI", "metric"),
    statCard("Vlákna", stats.ai_threads || 0, "Samostatné AI konverzácie", "metric"),
    statCard("Aktívni používatelia", stats.ai_active_users || 0, "Používatelia, ktorí AI reálne používajú", "metric"),
    statCard("Web overenie", `${webUsageShare} %`, "Podiel AI odpovedí s verejným overením", "metric"),
    statCard("Prompt verzia", crmState.meta?.ai?.prompt_version || "—", "Nasadená prompt logika", "metric"),
    statCard("Trusted domains", (crmState.meta?.ai?.trusted_domains || []).length, "Domény pre overovanie AI odpovedí", "metric"),
  ].join("");

  if (crmEls.crmAiLegend) {
    crmEls.crmAiLegend.className = "crm-legend-row";
    crmEls.crmAiLegend.innerHTML = [
      legendPill("Objem práce", "Koľko správ a vlákien AI reálne obslúžila.", "neutral"),
      legendPill("Kvalita overenia", "Podiel odpovedí, ktoré sa opierajú o webové zdroje.", "active"),
      legendPill("Prompt a pravidlá", "Aká logika je dnes nasadená v AI vrstve.", "admin"),
      legendPill("Trusted domains", "Zoznam domén, z ktorých môže AI bezpečne čerpať.", "neutral"),
    ].join("");
  }

  if (crmEls.crmAiPerformance) {
    crmEls.crmAiPerformance.className = "crm-panel-stack";
    crmEls.crmAiPerformance.innerHTML = `
      <div class="crm-insight-grid crm-insight-grid--ai-main">
        <section class="crm-ai-window crm-ai-window--primary">
          <div class="crm-ai-window__head">
            <div>
              <p class="crm-insight-card__subhead">AI výkon</p>
              <h4>Používanie a operátorské čísla</h4>
            </div>
            ${statusPill("Live insight", "admin")}
          </div>
          <div class="crm-user-ai-metrics crm-user-ai-metrics--wide">
            ${miniMetricCard("Správy / vlákno", avgMessagesPerThread, "Priemerná dĺžka konverzácie", Number(avgMessagesPerThread) >= 4 ? "active" : "neutral")}
            ${miniMetricCard("Vlákna / používateľ", avgThreadsPerUser, "Ako často sa AI vracia do práce", Number(avgThreadsPerUser) >= 1.5 ? "active" : "neutral")}
            ${miniMetricCard("Web overenie", `${webUsageShare} %`, "Podiel externého overenia", webUsageShare >= 35 ? "active" : webUsageShare > 0 ? "warning" : "neutral")}
            ${miniMetricCard("Zdroje", String(sourcesCount), "Počet trusted domains", sourcesCount >= 5 ? "active" : "warning")}
          </div>
          <div class="crm-detail-list">
            ${detailRow("Dominantný režim", avgMessagesPerThread >= 4 ? "Dlhšie konzultácie a klientské vysvetľovanie" : "Krátke operatívne odpovede")}
            ${detailRow("Pripravenosť AI", Number(stats.ai_messages || 0) > 0 ? "AI sa používa v reálnej prevádzke." : "Treba zvýšiť používanie medzi účtami.")}
            ${detailRow("Odporúčaný zásah", webUsageShare >= 35 ? "Stačí udržiavať prompt a trusted domains." : "Posilniť webové overenie a trusted domains.")}
          </div>
        </section>
        <section class="crm-ai-window">
          <div class="crm-ai-window__head">
            <div>
              <p class="crm-insight-card__subhead">AI kontext</p>
              <h4>Model, prompt a smerovanie</h4>
            </div>
            ${statusPill(crmState.meta?.ai?.web_search_enabled ? "Web overenie zapnuté" : "Bez webu", crmState.meta?.ai?.web_search_enabled ? "active" : "warning")}
          </div>
          <div class="crm-detail-list">
            ${detailRow("Model", crmState.meta?.ai?.model || "—")}
            ${detailRow("Prompt verzia", crmState.meta?.ai?.prompt_version || "—")}
            ${detailRow("Smerovanie", "Finančné sprostredkovanie, hypotéky, banky, poistenie")}
            ${detailRow("Trusted domains", (crmState.meta?.ai?.trusted_domains || []).join(", ") || "—")}
          </div>
        </section>
      </div>
    `;
  }

  if (crmEls.crmAiConfig) {
    crmEls.crmAiConfig.className = "crm-panel-stack";
    crmEls.crmAiConfig.innerHTML = `
      <section class="crm-ai-window crm-ai-window--sources">
        <div class="crm-ai-window__head">
          <div>
            <p class="crm-insight-card__subhead">Trusted domains</p>
            <h4>Zdroje používané pri overení</h4>
          </div>
          ${statusPill(`${sourcesCount} domén`, sourcesCount >= 5 ? "active" : "warning")}
        </div>
        <div class="crm-chip-list">
          ${sourcesCount
            ? crmState.meta.ai.trusted_domains.map((domain) => `<span class="crm-chip">${escapeHtml(domain)}</span>`).join("")
            : `<div class="crm-empty">Zatiaľ nie sú nastavené žiadne dôveryhodné domény.</div>`}
        </div>
        ${crmState.meta?.ai?.web_search_enabled ? "" : `<div class="crm-ai-warning">AI beží bez webového overenia. Aktuálne dátové otázky budú slabšie.</div>`}
      </section>
    `;
  }

  if (crmEls.crmAiTracking) {
    crmEls.crmAiTracking.className = "crm-panel-stack";
    crmEls.crmAiTracking.innerHTML = `
      <div class="crm-insight-grid crm-insight-grid--ai-track">
        <section class="crm-ai-window crm-ai-window--tracking">
          <div class="crm-ai-window__head">
            <div>
              <p class="crm-insight-card__subhead">AI tracking</p>
              <h4>Čo sa AI učí a kam smeruje</h4>
            </div>
            ${statusPill(Number(stats.ai_active_users || 0) > 0 ? "Reálny prevádzkový vstup" : "Málo dát", Number(stats.ai_active_users || 0) > 0 ? "active" : "warning")}
          </div>
          <div class="crm-detail-list">
            ${detailRow("Dominantné témy", aiEvents.length ? (crmState.overview?.users || []).flatMap((user) => ((user.ai_topics || []) || [])).slice(0, 6).join(", ") || "Financie, hypotéky, klientské odpovede" : "Zatiaľ bez stabilných tém")}
            ${detailRow("Štýl práce", avgMessagesPerThread >= 4 ? "Dlhšie konzultácie a vysvetľovanie klientom" : "Krátke operatívne odpovede a follow-upy")}
            ${detailRow("Odporúčaný zásah", webUsageShare >= 35 ? "Držať prompt verziu a kontrolovať trusted domains." : "Posilniť webové overovanie a AI onboarding v appke.")}
            ${detailRow("Operátorský výstup", Number(stats.ai_messages || 0) > 0 ? "AI je pripravená na každodennú prácu používateľov." : "Treba zvýšiť využitie AI medzi používateľmi.")}
          </div>
        </section>
        <div class="crm-ai-side-notes">
          ${insightNoteCard(
            "Z čoho AI čerpá",
            sourcesCount ? `${sourcesCount} overovacích domén` : "Zdroje treba doplniť",
            sourcesCount
              ? `AI má k dispozícii ${sourcesCount} dôveryhodných zdrojov pre live overenie a odpovede.`
              : "Bez dostatočného počtu trusted domains bude AI slabšia pri aktuálnych dátových témach.",
            sourcesCount >= 5 ? "active" : "warning"
          )}
          ${insightNoteCard(
            "Ako sa učí",
            Number(aiThreads || 0) > 0 ? "Buduje kontext z reálnych chatov" : "Zatiaľ málo reálneho tréningu",
            Number(aiThreads || 0) > 0
              ? `Priemerné zaťaženie je ${avgMessagesPerThread} správ na vlákno a ${avgThreadsPerUser} vlákna na používateľa.`
              : "Treba zvýšiť reálne používanie AI medzi používateľmi, aby mala stabilnejší pracovný kontext.",
            Number(aiThreads || 0) > 0 ? "active" : "neutral"
          )}
          ${insightNoteCard(
            "Čo má admin riešiť",
            webUsageShare >= 35 ? "AI je v zdravom režime" : "Treba posilniť kvalitu odpovedí",
            webUsageShare >= 35
              ? "Stačí sledovať trusted domains, prompt verziu a prípadné odchýlky v témach."
              : "Skontroluj prompt smerovanie, onboarding používateľov a frekvenciu webového overenia.",
            webUsageShare >= 35 ? "active" : "warning"
          )}
        </div>
      </div>
    `;
  }

  if (crmEls.crmAiWorkflows) {
    crmEls.crmAiWorkflows.className = "crm-action-grid crm-action-grid--compact";
    crmEls.crmAiWorkflows.innerHTML = [
      crmActionCard("Prejdi na AI aktivitu", "Otvoriť detail AI metrík a časovej osi používania.", "ai"),
      crmActionCard("Prejdi na prompty", "Skontrolovať prompt verziu, trusted domains a smerovanie AI.", "prompts"),
      crmActionCard("Monitoring AI", "Overiť, či AI beží s web overením a bez incidentov.", "monitoring"),
      crmActionCard("Obnoviť AI dáta", "Načítať nové AI štatistiky bez reloadu celej CRM sekcie.", "refresh"),
    ].join("");
    bindCrmAdminActionButtons(crmEls.crmAiWorkflows);
  }

  crmEls.crmAiTimeline.className = aiEvents.length ? "activity-list" : "activity-list empty-state";
  crmEls.crmAiTimeline.innerHTML = aiEvents.length
    ? renderCrmActivity(aiEvents, { showMeta: true })
    : "Zatiaľ bez AI udalostí.";
}

function renderCrmPrompts() {
  const domains = crmState.meta?.ai?.trusted_domains || [];
  crmEls.crmPromptCards.className = "summary-grid summary-grid--admin crm-prompt-grid";
  crmEls.crmPromptCards.innerHTML = [
    statCard("Prompt verzia", crmState.meta?.ai?.prompt_version || "—", "Aktuálne nasadený prompt set", "metric"),
    statCard("Jazyk trhu", "SK", "Primárny slovenský kontext", "metric"),
    statCard("Web validácia", crmState.meta?.ai?.web_search_enabled ? "Aktívna" : "Neaktívna", "Použitie pri aktuálnych témach", "metric"),
    statCard("Interný režim", "Praktický asistent", "AI vedená na financie a sprostredkovanie", "metric"),
  ].join("");

  crmEls.crmPromptDomains.className = domains.length ? "crm-chip-list" : "crm-chip-list empty-state";
  crmEls.crmPromptDomains.innerHTML = domains.length
    ? domains.map((domain) => `<span class="crm-chip">${escapeHtml(domain)}</span>`).join("")
    : "Zatiaľ bez dôveryhodných domén.";
}

function renderCrmMonitoring() {
  const stats = crmState.overview?.stats || {};
  crmEls.crmMonitoringCards.className = "summary-grid summary-grid--admin crm-monitoring-grid";
  crmEls.crmMonitoringCards.innerHTML = [
    statCard("API request limit", `${crmState.meta?.limits?.max_request_body_mb || "—"} MB`, "Max. request body", "metric"),
    statCard("Kontakt import", `${crmState.meta?.limits?.max_contact_file_mb || "—"} MB`, "Max. CSV/XLSX vstup", "metric"),
    statCard("Kompresia", `${crmState.meta?.limits?.max_compress_file_mb || "—"} MB`, "Max. kompresný vstup", "metric"),
    statCard("AI obrázky", `${crmState.meta?.limits?.max_ai_image_mb || "—"} MB`, "Max. veľkosť prílohy", "metric"),
    statCard("Recent logs", stats.recent_logs || 0, "Aktivity za 30 dní", "metric"),
    statCard("Deleted accounts", stats.deleted_accounts || 0, "Vymazané účty celkovo", "metric"),
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
  renderCrmAdminActions();
  if (crmEls.crmSettingsSyncMeta) {
    crmEls.crmSettingsSyncMeta.textContent = `Naposledy načítané ${formatDateTime(new Date().toISOString())}`;
  }
  crmEls.crmSettingsGrid.className = "crm-settings-list";
  crmEls.crmSettingsGrid.innerHTML = `
    <section class="crm-settings-overview">
      ${settingOverviewCard("Jadro", "Produkcia", "CRM beží nad živými používateľmi, billingom a AI vrstvou.", "active")}
      ${settingOverviewCard("Stripe", crmState.meta?.billing?.stripe_enabled ? "Aktívny" : "Chýba", crmState.meta?.billing?.stripe_enabled ? "Platby a predplatné sú napojené." : "Treba skontrolovať Stripe konfiguráciu.", crmState.meta?.billing?.stripe_enabled ? "active" : "warning")}
      ${settingOverviewCard("AI", crmState.meta?.ai?.model || "—", "Aktívny produkčný model a prompt verzia.", "admin")}
      ${settingOverviewCard("Právny rámec", crmState.meta?.billing?.legal_version || "—", "Verzia podmienok a checkout súhlasu, ktorá sa dnes používa.", "neutral")}
    </section>
    <section class="crm-settings-workflows">
      ${crmActionCard("Obnoviť metadáta", "Načíta čerstvé systémové, billing a AI údaje bez reloadu.", "refresh")}
      ${crmActionCard("Skontrolovať billing", "Prejdi na subscription lifecycle, Stripe stavy a renewal dátumy.", "billing")}
      ${crmActionCard("Skontrolovať AI vrstvu", "Otvor AI používanie, trusted domains a prompt verzie.", "ai")}
      ${crmActionCard("Audit súhlasov", "Prejdi do audit trailu a skontroluj právne záznamy.", "audit")}
    </section>
    <div class="crm-settings-columns">
      <div class="crm-settings-column">
        <section class="crm-settings-card">
          <div class="crm-settings-card__head">
            <h4>Jadro aplikácie</h4>
            <span class="status-pill status-pill--neutral">Produkcia</span>
          </div>
          <div class="crm-settings-rows">
            ${settingRow("Support e-mail", crmState.meta?.crm?.support_email || "—", "Primárny kontakt pre podporu.")}
            ${settingRow("App base URL", crmState.meta?.crm?.app_base_url || "—", "Verejná adresa aplikácie.", true)}
            ${settingRow("CRM verzia", crmState.meta?.crm?.version || "—", "Aktuálne nasadená riadiaca vrstva.")}
          </div>
        </section>
        <section class="crm-settings-card">
          <div class="crm-settings-card__head">
            <h4>Billing a právny rámec</h4>
            <span class="status-pill ${crmState.meta?.billing?.stripe_enabled ? "status-pill--active" : "status-pill--warning"}">${crmState.meta?.billing?.stripe_enabled ? "Stripe aktívny" : "Stripe chýba"}</span>
          </div>
          <div class="crm-settings-rows">
            ${settingRow("Stripe", crmState.meta?.billing?.stripe_enabled ? "Aktívny" : "Chýba", crmState.meta?.billing?.stripe_enabled ? "Billing provider je napojený." : "Skontroluj produkčný Stripe secret key.")}
            ${settingRow("Price ID", crmState.meta?.billing?.price_id || "—", "Aktívny produkt pre členstvo.", true)}
            ${settingRow("Právna verzia", crmState.meta?.billing?.legal_version || "—", "Verzia obchodných podmienok.")}
            ${settingRow("Checkout verzia", crmState.meta?.billing?.checkout_consent_version || "—", "Verzia povinného checkout súhlasu.")}
          </div>
        </section>
        <section class="crm-settings-card">
          <div class="crm-settings-card__head">
            <h4>Čo tu vieš spraviť</h4>
            <span class="status-pill status-pill--admin">Operátor</span>
          </div>
          <div class="crm-settings-rows">
            ${settingRow("Používatelia", "Filtrovať, otvárať detail, meniť roly a synchronizovať Stripe.", "Hlavná pracovná vrstva pre support a billing.")}
            ${settingRow("AI vrstva", "Kontrolovať využitie, trusted domains a prompt verziu.", "Prehľad kvality a prevádzky AI.")}
            ${settingRow("Monitoring", "Sledovať limity, incidenty a prevádzkové zdravie.", "Rýchly prehľad problémov.")}
            ${settingRow("Emaily", "Upravovať šablóny, ktoré reálne odchádzajú klientom.", "Bez zásahu do backend logiky odoslania.")}
          </div>
        </section>
      </div>
      <div class="crm-settings-column">
        <section class="crm-settings-card">
          <div class="crm-settings-card__head">
            <h4>AI a limity</h4>
            <span class="status-pill ${crmState.meta?.ai?.web_search_enabled ? "status-pill--active" : "status-pill--warning"}">${crmState.meta?.ai?.web_search_enabled ? "Web overenie aktívne" : "Web overenie vypnuté"}</span>
          </div>
          <div class="crm-settings-rows">
            ${settingRow("AI model", crmState.meta?.ai?.model || "—", "Produkčný model pre AI asistenta.")}
            ${settingRow("Prompt verzia", crmState.meta?.ai?.prompt_version || "—", "Aktívny prompt set.")}
            ${settingRow("Max. request", `${crmState.meta?.limits?.max_request_body_mb || "—"} MB`, "Limit pre request body.")}
            ${settingRow("Import kontaktov", `${crmState.meta?.limits?.max_contact_file_mb || "—"} MB`, "Maximálna veľkosť CSV/XLSX vstupu.")}
            ${settingRow("Kompresia súborov", `${crmState.meta?.limits?.max_compress_file_mb || "—"} MB`, "Maximálna veľkosť vstupu pre kompresiu.")}
            ${settingRow("AI obrázky", `${crmState.meta?.limits?.max_ai_image_mb || "—"} MB`, "Maximálna veľkosť obrázka pre AI.", false)}
          </div>
        </section>
        <section class="crm-settings-card">
          <div class="crm-settings-card__head">
            <h4>Prevádzka a kontrola</h4>
            <span class="status-pill status-pill--neutral">Live</span>
          </div>
          <div class="crm-settings-rows">
            ${settingRow("Posledná synchronizácia", formatDateTime(new Date().toISOString()), "Čas posledného načítania CRM dát.")}
            ${settingRow("Email šablóny", String((crmState.templates || []).length), "Počet editovateľných šablón v systéme.")}
            ${settingRow("Trusted domény", String((crmState.meta?.ai?.trusted_domains || []).length), "Zdroje pre AI webové overenie.")}
            ${settingRow("Auto refresh", "Každých 60 sekúnd", "CRM sa obnovuje automaticky aj ručne.")}
            ${settingRow("Admin nástroje", crmState.me?.can_manage_admin_tools ? "Rozšírené" : "Základné", "Úroveň dostupných zásahov pre aktuálny účet.")}
            ${settingRow("Aktívna sekcia", crmSectionLabel(crmState.activeSection), "Pracovný kontext, v ktorom sa práve nachádzaš.")}
          </div>
        </section>
      </div>
    </div>
    <section class="crm-settings-card crm-settings-card--domains">
      <div class="crm-settings-card__head">
        <h4>Dôveryhodné domény pre AI</h4>
        <span class="status-pill status-pill--neutral">${(crmState.meta?.ai?.trusted_domains || []).length} domén</span>
      </div>
      <div class="crm-chip-list">
        ${(crmState.meta?.ai?.trusted_domains || []).length
          ? crmState.meta.ai.trusted_domains.map((domain) => `<span class="crm-chip">${escapeHtml(domain)}</span>`).join("")
          : `<div class="crm-empty">Zatiaľ nie sú nastavené žiadne dôveryhodné domény.</div>`}
      </div>
      <div class="crm-domains-form">
        <label for="crmTrustedDomainsInput">Uprav zoznam domén (jedna doména na riadok)</label>
        <textarea id="crmTrustedDomainsInput" rows="4" placeholder="napr. nbs.sk"></textarea>
        <div class="crm-domains-form__actions">
          <button id="crmTrustedDomainsSave" class="button button--primary" type="button">Uložiť domény</button>
        </div>
      </div>
    </section>
    <section class="crm-settings-card crm-panel--embedded">
      <div class="crm-settings-card__head">
        <h4>Email šablóny</h4>
        <span class="status-pill status-pill--neutral">${String((crmState.templates || []).length)} šablón</span>
      </div>
      <div class="crm-template-layout">
        <div id="crmEmailTemplateList"></div>
        <div id="crmEmailTemplateEditor"></div>
      </div>
    </section>
  `;
  crmEls.crmEmailTemplateList = crmEls.crmSettingsGrid.querySelector("#crmEmailTemplateList");
  crmEls.crmEmailTemplateEditor = crmEls.crmSettingsGrid.querySelector("#crmEmailTemplateEditor");
  const workflowRoot = crmEls.crmSettingsGrid.querySelector(".crm-settings-workflows");
  if (workflowRoot) {
    bindCrmAdminActionButtons(workflowRoot);
  }
  bindCrmTrustedDomainsForm();
  renderCrmEmailTemplates();
}

function bindCrmTrustedDomainsForm() {
  if (!crmEls.crmSettingsGrid) {
    return;
  }
  const input = crmEls.crmSettingsGrid.querySelector("#crmTrustedDomainsInput");
  const saveBtn = crmEls.crmSettingsGrid.querySelector("#crmTrustedDomainsSave");
  if (!input || !saveBtn) {
    return;
  }
  input.value = (crmState.meta?.ai?.trusted_domains || []).join("\n");
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    try {
      const payload = { domains: input.value };
      const response = await fetch("/api/crm/trusted-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Nepodarilo sa uložiť domény.");
      }
      const data = await response.json().catch(() => ({}));
      if (data.trusted_domains) {
        crmState.meta.ai.trusted_domains = data.trusted_domains;
      }
      renderCrmSettings();
    } catch (error) {
      window.alert(error.message || "Nepodarilo sa uložiť domény.");
    } finally {
      saveBtn.disabled = false;
    }
  });
}

function renderCrmAdminActions() {
  if (!crmEls.crmAdminActions) {
    return;
  }
  crmEls.crmAdminActions.className = "crm-action-grid";
  crmEls.crmAdminActions.innerHTML = [
    crmActionCard("Obnoviť CRM dáta", "Stiahne nové KPI, používateľov, billing aj monitoring bez reloadu.", "refresh"),
    crmActionCard("Používatelia", "Otvorí správu účtov a členstiev s filtrami a detailom používateľa.", "users"),
    crmActionCard("Billing a Stripe", "Prejde na predplatné, Stripe stavy a billing udalosti.", "billing"),
    crmActionCard("AI a používanie", "Rýchly vstup do AI metrík, promptov a aktivity používateľov.", "ai"),
    crmActionCard("Monitoring", "Otvorí systémové incidenty, health stav a prevádzkové limity.", "monitoring"),
    crmActionCard("Audit a história", "Pozrie posledné zásahy, zmeny účtov a systémové udalosti.", "audit"),
    crmActionCard("Export používateľov", "Stiahne CSV aktuálne filtrovaných používateľov na ďalšiu prácu.", "export"),
    crmActionCard("Otvoriť aplikáciu", "Preskočí späť do produkčnej aplikácie v novom okne.", "open-app"),
  ].join("");

  bindCrmAdminActionButtons(crmEls.crmAdminActions);
}

function bindCrmAdminActionButtons(scope) {
  if (!scope) {
    return;
  }

  scope.querySelectorAll("[data-crm-admin-tool]").forEach((button) => {
    button.addEventListener("click", async () => {
      const tool = button.dataset.crmAdminTool || "";
      if (tool === "refresh") {
        button.disabled = true;
        try {
          await refreshCrmData({ reopenUserId: crmState.userModalOpen ? (crmState.selectedUserId || 0) : 0 });
        } finally {
          button.disabled = false;
        }
        return;
      }
      if (tool === "export") {
        exportCrmUsers();
        return;
      }
      if (tool === "open-app") {
        window.open("/app.html", "_blank", "noopener");
        return;
      }
      if (tool.startsWith("users-filter-")) {
        const filterMap = {
          "users-filter-recent": "recent",
          "users-filter-inactive": "inactive",
          "users-filter-online": "online",
          "users-filter-admin": "admin",
        };
        if (crmEls.crmUserFilter) {
          crmEls.crmUserFilter.value = filterMap[tool] || "all";
        }
        activateCrmSection("users");
        renderCrmUsers();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      activateCrmSection(tool);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function renderCrmEmailTemplates() {
  const templates = crmState.templates || [];
  if (!crmEls.crmEmailTemplateList || !crmEls.crmEmailTemplateEditor) {
    return;
  }
  if (!templates.length) {
    crmEls.crmEmailTemplateList.className = "crm-template-list empty-state";
    crmEls.crmEmailTemplateList.textContent = "Zatiaľ nie sú dostupné žiadne emailové šablóny.";
    crmEls.crmEmailTemplateEditor.className = "crm-template-editor empty-state";
    crmEls.crmEmailTemplateEditor.textContent = "Vyber šablónu a môžeš upraviť predmet aj text emailu.";
    return;
  }

  crmEls.crmEmailTemplateList.className = "crm-template-list";
  crmEls.crmEmailTemplateList.innerHTML = `
    <div class="crm-template-list__meta">
      <strong>${escapeHtml(String(templates.length))} šablón</strong>
      <span>Vyber si vzor, uprav predmet a telo a hneď vidíš, čo sa odosiela klientovi.</span>
    </div>
    ${templates.map((template) => `
      <button
        class="crm-template-item ${crmState.selectedTemplateKey === template.template_key ? "is-active" : ""}"
        type="button"
        data-crm-template-key="${escapeHtml(template.template_key)}"
      >
        <strong>${escapeHtml(template.label || template.template_key)}</strong>
        <span>${escapeHtml(template.subject_template || "")}</span>
        <small>${escapeHtml(truncateText(template.body_template || "", 120))}</small>
      </button>
    `).join("")}
  `;

  crmEls.crmEmailTemplateList.querySelectorAll("[data-crm-template-key]").forEach((button) => {
    button.addEventListener("click", () => {
      crmState.selectedTemplateKey = button.dataset.crmTemplateKey || "";
      renderCrmEmailTemplates();
    });
  });

  const selected = templates.find((item) => item.template_key === crmState.selectedTemplateKey) || templates[0];
  crmState.selectedTemplateKey = selected.template_key;
  crmEls.crmEmailTemplateEditor.className = "crm-template-editor";
  crmEls.crmEmailTemplateEditor.innerHTML = `
    <div class="crm-template-editor__head">
      <div>
        <h4>${escapeHtml(selected.label || selected.template_key)}</h4>
        <p>Napojené na reálne odosielané emaily. Zmeny sa použijú pri ďalšom odoslaní.</p>
      </div>
      <span class="status-pill status-pill--neutral mono">${escapeHtml(selected.template_key)}</span>
    </div>
    <div class="crm-template-preview-strip">
      <span class="status-pill status-pill--admin">Live šablóna</span>
      <span class="status-pill status-pill--neutral">Predmet aj telo sa ukladajú okamžite po potvrdení</span>
    </div>
    <label class="crm-template-field">
      <span>Predmet</span>
      <input id="crmTemplateSubject" type="text" value="${escapeHtml(selected.subject_template || "")}" />
    </label>
    <label class="crm-template-field">
      <span>Telo emailu</span>
      <textarea id="crmTemplateBody" rows="12">${escapeHtml(selected.body_template || "")}</textarea>
    </label>
    <div class="crm-template-actions">
      <button id="crmTemplateSave" class="button" type="button">Uložiť šablónu</button>
      <p class="crm-kpi-note">Premenné ako <code>{name}</code>, <code>{email}</code>, <code>{support_email}</code> alebo dátumy sa doplnia automaticky.</p>
    </div>
  `;
  crmEls.crmEmailTemplateEditor.querySelector("#crmTemplateSave")?.addEventListener("click", saveCrmEmailTemplate);
}

async function saveCrmEmailTemplate() {
  const templateKey = crmState.selectedTemplateKey;
  const subjectTemplate = crmEls.crmEmailTemplateEditor?.querySelector("#crmTemplateSubject")?.value?.trim() || "";
  const bodyTemplate = crmEls.crmEmailTemplateEditor?.querySelector("#crmTemplateBody")?.value?.trim() || "";
  if (!templateKey || !subjectTemplate || !bodyTemplate) {
    window.alert("Predmet aj telo emailu musia byť vyplnené.");
    return;
  }
  try {
    const payload = await crmFetch("/api/crm/email-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_key: templateKey, subject_template: subjectTemplate, body_template: bodyTemplate }),
    });
    crmState.templates = payload?.templates || crmState.templates;
    renderCrmEmailTemplates();
  } catch (error) {
    window.alert(normalizeCrmError(error?.message || "Šablónu sa nepodarilo uložiť."));
  }
}

async function openCrmUserDetail(userId) {
  if (!userId || !crmEls.crmUserModalBody) {
    return;
  }
  crmState.selectedUserId = userId;
  crmState.userModalOpen = true;
  const requestId = ++crmState.userModalRequestId;
  crmEls.crmUserModal.hidden = false;
  crmEls.crmUserModalBody.className = "crm-empty";
  crmEls.crmUserModalBody.textContent = "Načítavam detail používateľa...";
  try {
    const payload = await crmFetch(`/api/admin/user-detail?user_id=${encodeURIComponent(String(userId))}`);
    if (!crmState.userModalOpen || crmState.selectedUserId !== userId || crmState.userModalRequestId !== requestId) {
      return;
    }
    renderCrmUserModal(payload);
  } catch (error) {
    if (!crmState.userModalOpen || crmState.selectedUserId !== userId || crmState.userModalRequestId !== requestId) {
      return;
    }
    crmEls.crmUserModalBody.className = "crm-empty";
    crmEls.crmUserModalBody.textContent = normalizeCrmError(error?.message || "Detail používateľa sa nepodarilo načítať.");
  }
}

function closeCrmUserModal() {
  if (crmEls.crmUserModal) {
    crmEls.crmUserModal.hidden = true;
  }
  crmState.userModalOpen = false;
  crmState.selectedUserId = 0;
  crmState.userModalRequestId += 1;
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
      <div class="crm-operator-hero">
        <div class="crm-operator-hero__identity">
          <div class="crm-operator-hero__title-wrap">
            <h2 class="crm-modal__title">${escapeHtml(user.name || "Používateľ")}</h2>
            <p class="crm-modal__subtitle">${escapeHtml(user.email || "")}</p>
          </div>
          <div class="crm-profile-facts">
            <span class="crm-profile-fact crm-profile-fact--soft">
              <strong>Účet</strong>
              <span>${escapeHtml(user.role === "admin" ? "Admin používateľ" : "Bežný používateľ")}</span>
            </span>
            <span class="crm-profile-fact crm-profile-fact--active">
              <strong>Členstvo</strong>
              <span>${escapeHtml(membershipState === "active" ? `Aktívne do ${formatDate(subscription.valid_until || user.membership_valid_until) || "bez dátumu"}` : membershipState === "cancelled" ? "Zrušené, ale ešte aktívne do konca obdobia" : "Bez aktívneho prístupu")}</span>
            </span>
            <span class="crm-profile-fact crm-profile-fact--warning">
              <strong>Billing</strong>
              <span>${escapeHtml(subscription.stripe_subscription_id ? "Stripe prepojený a dohľadateľný" : "Bez Stripe väzby alebo ešte nesynchronizované")}</span>
            </span>
            <span class="crm-profile-fact crm-profile-fact--admin">
              <strong>AI využitie</strong>
              <span>${escapeHtml(`${Number(ai.message_count || 0)} správ v ${Number(ai.thread_count || 0)} vláknach`)}</span>
            </span>
          </div>
          <div class="crm-operator-status-board">
            <article class="crm-operator-status-card crm-operator-status-card--identity">
              <span>Pracovný profil</span>
              <strong>${escapeHtml(user.role === "admin" ? "Interný správca systému" : "Koncový používateľ služby")}</strong>
              <small>${escapeHtml(user.is_online ? "Aktuálne pracuje v systéme" : "Momentálne nie je online")}</small>
            </article>
            <article class="crm-operator-status-card crm-operator-status-card--billing">
              <span>Billing vrstva</span>
              <strong>${escapeHtml(subscription.stripe_subscription_id ? "Stripe prepojený" : "Bez Stripe väzby")}</strong>
              <small>${escapeHtml(subscription.stripe_status || "Čaká na synchronizáciu alebo bez billing záznamu")}</small>
            </article>
            <article class="crm-operator-status-card crm-operator-status-card--ai">
              <span>AI využitie</span>
              <strong>${escapeHtml(Number(ai.message_count || 0) > 0 ? "AI pracuje s dátami používateľa" : "AI profil je zatiaľ slabý")}</strong>
              <small>${escapeHtml((ai.topics || []).slice(0, 3).join(", ") || "Bez stabilných tém")}</small>
            </article>
          </div>
          <div class="crm-operator-strip">
            ${operatorStripItem("Rola", user.role === "admin" ? "Admin účet" : "Používateľský účet", user.role === "admin" ? "admin" : "neutral")}
            ${operatorStripItem("Členstvo", membershipState === "active" ? "Aktívne" : membershipState === "cancelled" ? "Dobieha" : "Neaktívne", membershipState === "active" ? "active" : membershipState === "cancelled" ? "warning" : "inactive")}
            ${operatorStripItem("Billing", subscription.stripe_subscription_id ? "Stripe prepojený" : "Bez Stripe väzby", subscription.stripe_subscription_id ? "active" : "warning")}
            ${operatorStripItem("AI profil", Number(ai.message_count || 0) > 0 ? "Používa AI v praxi" : "AI bez aktivity", Number(ai.message_count || 0) > 0 ? "active" : "neutral")}
            ${operatorStripItem("Súhlasy", registrationConsent.created_at && checkoutConsent.created_at ? "Zaevidované" : "Treba preveriť", registrationConsent.created_at && checkoutConsent.created_at ? "active" : "warning")}
            ${operatorStripItem("Posledný pohyb", formatDateTime(user.last_seen_at || user.last_login_at), user.is_online ? "active" : "neutral")}
          </div>
          <div class="crm-operator-hero__meta">
            <div class="crm-operator-badge">
              <strong>Pracovný stav</strong>
              <span>${user.is_online ? "Online session aktívna" : "Používateľ je momentálne offline"}</span>
            </div>
            <div class="crm-operator-badge">
              <strong>Billing vrstva</strong>
              <span>${subscription.stripe_subscription_id ? "Stripe väzba je aktívna" : "Stripe väzba zatiaľ chýba"}</span>
            </div>
            <div class="crm-operator-badge">
              <strong>AI režim</strong>
              <span>${Number(ai.message_count || 0) > 0 ? "AI sa používa v praxi" : "AI zatiaľ bez aktivity"}</span>
            </div>
            <div class="crm-operator-badge">
              <strong>Právny log</strong>
              <span>${registrationConsent.created_at && checkoutConsent.created_at ? "Súhlasy sú kompletne zaevidované" : "Treba preveriť consent logy"}</span>
            </div>
          </div>
        </div>
        <div class="crm-operator-hero__stats">
          ${miniMetricCard("AI správy", `${Number(ai.message_count || 0)}`, "Reálny objem AI práce", Number(ai.message_count || 0) > 0 ? "active" : "neutral")}
          ${miniMetricCard("Vlákna", `${Number(ai.thread_count || 0)}`, "Počet samostatných chatov", Number(ai.thread_count || 0) > 0 ? "active" : "neutral")}
          ${miniMetricCard("Web overenia", `${Number(ai.web_count || 0)}`, "Koľko AI odpovedí sa oprelo o web", Number(ai.web_count || 0) > 0 ? "active" : "warning")}
          ${miniMetricCard("Pamäť AI", `${Number(ai.relevance_percent || 0)} %`, "Odhad využiteľnosti naučeného kontextu", Number(ai.relevance_percent || 0) >= 60 ? "active" : Number(ai.relevance_percent || 0) > 0 ? "warning" : "neutral")}
        </div>
      </div>
      <div class="status-pill-group">
        ${statusPill(user.role === "admin" ? "Admin" : "Používateľ", user.role === "admin" ? "admin" : "neutral")}
        ${membershipPill({ membership_status: membershipState, membership_valid_until: user.membership_valid_until })}
        ${user.is_online ? statusPill("Online", "active") : statusPill("Offline", "neutral")}
      </div>
    </div>

    <div class="crm-user-summary">
      ${miniMetricCard("Účet", user.role === "admin" ? "Admin účet" : "Používateľ", user.is_online ? "Práve online" : "Momentálne offline", user.role === "admin" ? "admin" : "neutral")}
      ${miniMetricCard("Členstvo", membershipState === "active" ? "Aktívne" : membershipState === "cancelled" ? "Dobieha" : "Neaktívne", formatDate(subscription.valid_until || user.membership_valid_until) || "Bez dátumu", membershipState === "active" ? "active" : membershipState === "cancelled" ? "warning" : "inactive")}
      ${miniMetricCard("Billing", subscription.stripe_status || "Bez Stripe stavu", subscription.stripe_subscription_id ? "Stripe pripojený" : "Bez napojenia", subscription.stripe_subscription_id ? "active" : "warning")}
      ${miniMetricCard("AI používanie", `${Number(ai.message_count || 0)} správ`, `${Number(ai.thread_count || 0)} vlákien`, Number(ai.message_count || 0) > 0 ? "active" : "neutral")}
      ${miniMetricCard("Súhlasy", registrationConsent.created_at ? "Zaevidované" : "Chýbajú", registrationConsent.marketing_consent ? "Marketing áno" : "Marketing nie", registrationConsent.created_at ? "active" : "warning")}
      ${miniMetricCard("Posledná aktivita", formatDateTime(user.last_seen_at || user.last_login_at), user.last_seen_ip || "Bez IP", user.is_online ? "active" : "neutral")}
    </div>

    <div class="crm-insight-grid crm-insight-grid--triple crm-user-insights">
      ${insightNoteCard(
        "Operátorský pohľad",
        membershipState === "active" ? "Používateľ je odomknutý a pripravený pracovať." : membershipState === "cancelled" ? "Predplatné je zrušené, ale prístup ešte dobieha." : "Používateľ nemá aktívny platený prístup.",
        membershipState === "active"
          ? "Môžeš kontrolovať AI využitie, billing stav a prípadné problémy s aktivitou."
          : membershipState === "cancelled"
            ? "Sleduj koniec obdobia a billing komunikáciu pred expirácou."
            : "Ak má mať prístup, skontroluj checkout súhlas, Stripe väzbu a manuálnu synchronizáciu.",
        membershipState === "active" ? "active" : membershipState === "cancelled" ? "warning" : "inactive"
      )}
      ${insightNoteCard(
        "AI pracovný profil",
        Number(ai.message_count || 0) > 0 ? "AI sa používa na reálnu prácu." : "Používateľ AI zatiaľ skoro nevyužíva.",
        Number(ai.message_count || 0) > 0
          ? `Najsilnejšie témy: ${((ai.topics || []).slice(0, 3)).join(", ") || "bez tém"}.`
          : "Ak je členstvo aktívne a AI sa nevyužíva, odporúča sa onboarding alebo kontrola UX v aplikácii.",
        Number(ai.message_count || 0) > 0 ? "active" : "neutral"
      )}
      ${insightNoteCard(
        "Právny a billing stav",
        checkoutConsent.created_at && registrationConsent.created_at ? "Súhlasy sú záznamovo pokryté." : "Chýba časť dôkaznej stopy.",
        subscription.stripe_subscription_id
          ? "Stripe identifikátor je prítomný a billing sa dá dohľadať."
          : "Bez Stripe väzby sa oplatí preveriť checkout alebo manuálnu synchronizáciu.",
        checkoutConsent.created_at && registrationConsent.created_at ? "active" : "warning"
      )}
    </div>

    <div class="crm-modal-grid crm-modal-grid--two">
      <section class="crm-detail-card">
        <div class="crm-detail-card__head">
          <h4>Základné údaje</h4>
          <span class="crm-detail-card__note">Identita, session a posledný pohyb v systéme</span>
        </div>
        <div class="crm-detail-list">
          ${detailRow("Registrovaný od", formatDate(user.created_at))}
          ${detailRow("Naposledy prihlásený", formatDateTime(user.last_login_at))}
          ${detailRow("Naposledy aktívny", formatDateTime(user.last_seen_at))}
          ${detailRow("Posledná IP", user.last_seen_ip || "—", true)}
          ${detailRow("Posledný agent", user.last_seen_agent || "—")}
        </div>
      </section>

      <section class="crm-detail-card">
        <div class="crm-detail-card__head">
          <h4>Členstvo a billing</h4>
          <span class="crm-detail-card__note">Reálny stav predplatného a Stripe väzby</span>
        </div>
        <div class="crm-detail-list">
          ${detailStatusRow("Stav", membershipState === "active" ? "Aktívne" : membershipState === "cancelled" ? "Zrušené / dobieha" : "Neaktívne", membershipState === "active" ? "active" : membershipState === "cancelled" ? "warning" : "inactive")}
          ${detailRow("Platné do", formatDate(subscription.valid_until || user.membership_valid_until))}
          ${detailRow("Ďalšie obnovenie", formatDate(subscription.next_renewal_at))}
          ${detailRow("Stripe subscription", subscription.stripe_subscription_id || "—", true)}
          ${detailStatusRow("Stripe status", subscription.stripe_status || "—", subscription.stripe_status === "active" ? "active" : subscription.stripe_status === "canceled" || subscription.stripe_status === "cancelled" ? "warning" : "neutral")}
          ${detailRow("Objednávka", subscription.last_order_number || "—")}
          ${detailRow("Predplatné číslo", subscription.internal_subscription_number || "—")}
          ${detailRow("Zrušené", subscription.cancelled_at ? formatDateTime(subscription.cancelled_at) : "—")}
        </div>
        <p class="crm-kpi-note">Objednávka je interný identifikátor v Unifyo, Stripe subscription je externý billing identifikátor.</p>
      </section>

      <section class="crm-detail-card">
        <div class="crm-detail-card__head">
          <h4>Právne súhlasy</h4>
          <span class="crm-detail-card__note">GDPR, marketing a checkout evidencia</span>
        </div>
        <div class="crm-detail-list">
          ${detailStatusRow("Registračný súhlas", registrationConsent.created_at ? "Zaevidovaný" : "Chýba", registrationConsent.created_at ? "active" : "warning")}
          ${detailRow("Reg. IP", registrationConsent.ip_address || "—", true)}
          ${detailStatusRow("Marketing", registrationConsent.marketing_consent ? "Áno" : "Nie", registrationConsent.marketing_consent ? "active" : "neutral")}
          ${detailRow("Reg. verzia", registrationConsent.legal_version || "—")}
          ${detailStatusRow("Checkout súhlas", checkoutConsent.created_at ? "Zaevidovaný" : "Chýba", checkoutConsent.created_at ? "active" : "warning")}
          ${detailRow("Checkout IP", checkoutConsent.ip_address || "—", true)}
          ${detailRow("Checkout verzia", checkoutConsent.consent_version || "—")}
          ${detailRow("Consent text", checkoutConsent.consent_text || "—")}
        </div>
        <p class="crm-kpi-note">Tieto záznamy slúžia ako dôkazný log súhlasu pri registrácii a pred Stripe checkoutom.</p>
      </section>

      <section class="crm-detail-card">
        <div class="crm-detail-card__head">
          <h4>AI využitie</h4>
          <span class="crm-detail-card__note">Koľko používateľ reálne využíva AI nástroje</span>
        </div>
        <div class="crm-user-ai-metrics">
          ${miniMetricCard("Vlákna", String(ai.thread_count || 0), "Počet samostatných chatov", Number(ai.thread_count || 0) > 0 ? "active" : "neutral")}
          ${miniMetricCard("Správy", String(ai.message_count || 0), "Všetky user + AI správy", Number(ai.message_count || 0) > 0 ? "active" : "neutral")}
          ${miniMetricCard("AI odpovede", String(ai.assistant_count || 0), "Odpovede vygenerované AI", Number(ai.assistant_count || 0) > 0 ? "active" : "neutral")}
          ${miniMetricCard("Relevancia pamäte", `${Number(ai.relevance_percent || 0)} %`, "Odhad užitočnosti AI pamäte", Number(ai.relevance_percent || 0) >= 60 ? "active" : Number(ai.relevance_percent || 0) > 0 ? "warning" : "neutral")}
        </div>
        <div class="crm-detail-list">
          ${detailRow("Fokus", ai.focus || "—")}
          ${detailRow("Obrázky", String(ai.image_count || 0))}
          ${detailRow("Web overenia", String(ai.web_count || 0))}
          ${detailRow("Témy", (ai.topics || []).join(", ") || "—")}
        </div>
        <div class="crm-ai-readout">
          <div class="crm-ai-readout__item">
            <strong>Čo sa AI učí</strong>
            <span>${escapeHtml((ai.topics || []).length ? `Najčastejšie témy: ${(ai.topics || []).slice(0, 4).join(", ")}.` : "Zatiaľ sa nevytvorili stabilné tematické vzory.")}</span>
          </div>
          <div class="crm-ai-readout__item">
            <strong>Ako AI pracuje</strong>
            <span>${escapeHtml(Number(ai.web_count || 0) > 0 ? "Pri odpovediach využíva aj webové overenie a externé zdroje." : "Zatiaľ sa opiera hlavne o interný kontext a históriu používateľa.")}</span>
          </div>
          <div class="crm-ai-readout__item">
            <strong>Admin odporúčanie</strong>
            <span>${escapeHtml(Number(ai.relevance_percent || 0) >= 60 ? "Pamäť AI je dostatočne stabilná pre opakované workflow použitie." : "Oplatí sa podporiť konzistentnejšie používanie AI, aby sa profil používateľa stabilizoval.")}</span>
          </div>
        </div>
        <p class="crm-kpi-note">Fokus = dominantná pracovná oblasť používateľa. Relevancia pamäte ukazuje, nakoľko sa AI opiera o doterajší kontext používateľa.</p>
      </section>
    </div>

    <section class="crm-detail-card" style="margin-top:18px;">
      <h4>Email log</h4>
      <div class="activity-list crm-email-log-list">
        ${(payload.email_logs || []).length ? (payload.email_logs || []).map((item) => `
          <article class="activity-card crm-email-log-card">
            <div class="activity-card__head">
              <h4>${escapeHtml(item.subject || item.template_key || "Email")}</h4>
              <span>${escapeHtml(formatDateTime(item.created_at))}</span>
            </div>
            <div class="crm-chip-list crm-email-log-card__chips">
              <span class="status-pill status-pill--neutral mono">${escapeHtml(item.template_key || "manual")}</span>
              <span class="status-pill ${String(item.send_status || "sent") === "sent" ? "status-pill--active" : "status-pill--warning"}">${escapeHtml(item.send_status || "sent")}</span>
              <span class="status-pill status-pill--neutral mono">${escapeHtml(item.email || "—")}</span>
            </div>
            <p>${escapeHtml(item.body_preview || "Bez náhľadu obsahu.")}</p>
          </article>
        `).join("") : `<div class="crm-empty">Používateľ zatiaľ nemá evidované odoslané emaily.</div>`}
      </div>
    </section>

    ${canManage ? `
      <section class="crm-detail-card crm-detail-card--operator-actions">
        <div class="crm-detail-card__head">
          <h4>Operátorské workflow</h4>
          <span class="crm-detail-card__note">Citlivé zásahy sú auditované a spätne dohľadateľné.</span>
        </div>
        <div class="crm-action-grid crm-action-grid--compact crm-operator-workflows">
          ${crmUserWorkflowCard("Deaktivovať účet", "Zablokuje prístup a ukončí členstvo používateľa.", "deactivate", user.id)}
          ${crmUserWorkflowCard("Vymazať účet", "Finálne odstráni účet a odošle emailové upozornenie.", "delete_account", user.id, true)}
          ${crmUserWorkflowCard(user.role === "admin" ? "Znížiť na používateľa" : "Povoliť admin rolu", "Zmena práv používateľa v rámci systému.", "role", user.id)}
          ${crmUserWorkflowCard("Vynútiť Stripe sync", "Okamžite zosynchronizuje billing stav zo Stripe.", "sync", user.id)}
          ${crmUserWorkflowCard("Vymazať AI pamäť", "Resetuje naučený kontext AI používateľa.", "memory", user.id)}
        </div>
      </section>
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
  crmEls.crmUserModalBody.querySelectorAll("[data-crm-user-workflow]").forEach((button) => {
    const action = button.dataset.crmUserWorkflow || "";
    const workflowUserId = Number(button.dataset.userId || 0);
    button.addEventListener("click", () => {
      if (action === "sync") {
        submitCrmForceSync(workflowUserId);
      } else if (action === "memory") {
        submitCrmAssistantMemoryReset(workflowUserId);
      } else if (action === "role") {
        submitCrmRoleUpdate(workflowUserId, user.role === "admin" ? "user" : "admin");
      } else {
        submitCrmMembershipAction(workflowUserId, action);
      }
    });
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

async function refreshCrmData({ reopenUserId = 0, silent = false } = {}) {
  const [overview, meta] = await Promise.all([
    crmFetch("/api/admin/overview"),
    crmFetch("/api/crm/meta"),
  ]);
  crmState.overview = overview || crmState.overview;
  crmState.meta = meta || crmState.meta;
  crmState.lastLoadedAt = Date.now();
  renderCrmAll();
  if (crmState.userModalOpen && reopenUserId && crmState.selectedUserId === reopenUserId) {
    await openCrmUserDetail(reopenUserId);
  } else if (!crmState.userModalOpen) {
    closeCrmUserModal();
  }
  if (!silent && crmEls.crmSettingsSyncMeta) {
    crmEls.crmSettingsSyncMeta.textContent = `Naposledy načítané ${formatDateTime(new Date().toISOString())}`;
  }
}

function getFilteredCrmUsers() {
  const query = String(crmEls.crmUserSearch?.value || "").trim().toLowerCase();
  const filter = String(crmEls.crmUserFilter?.value || "all");
  const recentThreshold = Date.now() - (30 * 24 * 3600 * 1000);
  return (crmState.overview?.users || []).filter((user) => {
    const haystack = `${user.name || ""} ${user.email || ""}`.toLowerCase();
    if (query && !haystack.includes(query)) {
      return false;
    }
    if (filter === "recent") {
      const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
      if (!createdAt || createdAt < recentThreshold) {
        return false;
      }
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

function settingRow(label, value, hint = "", mono = false) {
  return `
    <div class="crm-setting-row">
      <div class="crm-setting-row__meta">
        <strong>${escapeHtml(label)}</strong>
        ${hint ? `<span>${escapeHtml(hint)}</span>` : ""}
      </div>
      <div class="crm-setting-row__value ${mono ? "crm-setting-row__value--mono" : ""}">${escapeHtml(value || "—")}</div>
    </div>
  `;
}

function crmActionCard(title, text, action) {
  return `
    <button class="crm-action-card crm-action-card--${escapeHtml(action)}" type="button" data-crm-admin-tool="${escapeHtml(action)}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(text)}</span>
    </button>
  `;
}

function legendPill(label, text, tone = "neutral") {
  return `
    <div class="crm-legend-pill crm-legend-pill--${escapeHtml(tone)}">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(text)}</span>
    </div>
  `;
}

function startCrmAutoRefresh() {
  stopCrmAutoRefresh();
  crmState.refreshTimer = window.setInterval(() => {
    refreshCrmData({ reopenUserId: crmState.userModalOpen ? (crmState.selectedUserId || 0) : 0, silent: true }).catch(() => {});
  }, 60000);
}

function stopCrmAutoRefresh() {
  if (crmState.refreshTimer) {
    window.clearInterval(crmState.refreshTimer);
    crmState.refreshTimer = 0;
  }
}

function renderCrmActivity(items, { showMeta = false } = {}) {
  return items.map((item) => {
    const meta = item.meta || {};
    const chips = [];
    const tone = inferActivityTone(item.event_type || "");
    if (showMeta) {
      chips.push(statusPill(
        tone === "danger" ? "Kritické" : tone === "warning" ? "Pozor" : "Info",
        tone === "danger" ? "inactive" : tone === "warning" ? "warning" : "neutral"
      ));
    }
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
      tone,
      formatDateTime(item.created_at),
      true
    );
  }).join("");
}

function activityItem(title, body, tone = "neutral", trailing = "", rawBody = false) {
  return `
    <article class="activity-card activity-card--${tone}">
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

function statCard(label, value, hint, variant = "default") {
  return `
    <article class="summary-card summary-card--${escapeHtml(variant)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <small class="summary-card__hint">${escapeHtml(hint)}</small>
    </article>
  `;
}

function healthCard(label, value, tone) {
  return `
    <article class="summary-card summary-card--health summary-card--${escapeHtml(tone || "neutral")}">
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

function detailStatusRow(label, value, tone = "neutral") {
  return `
    <div class="crm-detail-row">
      <strong>${escapeHtml(label)}</strong>
      <span>${statusPill(value, tone)}</span>
    </div>
  `;
}

function miniMetricCard(label, value, hint, tone = "neutral") {
  return `
    <article class="crm-mini-metric crm-mini-metric--${escapeHtml(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value || "—"))}</strong>
      <small>${escapeHtml(hint || "")}</small>
    </article>
  `;
}

function insightNoteCard(title, value, hint, tone = "neutral") {
  return `
    <article class="crm-insight-card crm-insight-card--${escapeHtml(tone)}">
      <div class="crm-insight-card__head">
        <h4>${escapeHtml(title)}</h4>
        ${statusPill(
          tone === "active" ? "OK" : tone === "warning" ? "Pozor" : tone === "inactive" ? "Riziko" : tone === "admin" ? "Admin" : "Info",
          tone === "inactive" ? "inactive" : tone
        )}
      </div>
      <strong class="crm-insight-card__value">${escapeHtml(String(value || "—"))}</strong>
      <p class="crm-insight-card__hint">${escapeHtml(hint || "")}</p>
    </article>
  `;
}

function settingOverviewCard(label, value, hint, tone = "neutral") {
  return `
    <article class="crm-settings-overview-card crm-settings-overview-card--${escapeHtml(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value || "—"))}</strong>
      <small>${escapeHtml(hint || "")}</small>
    </article>
  `;
}

function operatorStripItem(label, value, tone = "neutral") {
  return `
    <div class="crm-operator-strip__item crm-operator-strip__item--${escapeHtml(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value || "—"))}</strong>
      ${statusPill(
        tone === "active" ? "OK" : tone === "warning" ? "Pozor" : tone === "inactive" ? "Riziko" : tone === "admin" ? "Admin" : "Info",
        tone === "inactive" ? "inactive" : tone
      )}
    </div>
  `;
}

function crmUserWorkflowCard(title, text, action, userId, danger = false) {
  return `
    <button class="crm-action-card ${danger ? "crm-action-card--danger" : ""}" type="button" data-crm-user-workflow="${escapeHtml(action)}" data-user-id="${escapeHtml(String(userId))}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(text)}</span>
    </button>
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
    cache: "no-store",
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

function crmSectionLabel(section) {
  const labels = {
    dashboard: "Dashboard",
    users: "Používatelia",
    billing: "Billing a Stripe",
    ai: "AI a používanie",
    prompts: "Prompty",
    monitoring: "Monitoring",
    audit: "Audit a história",
    settings: "Nastavenia systému",
  };
  return labels[section] || "Dashboard";
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
