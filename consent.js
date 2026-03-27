(function () {
  const STORAGE_KEY = "ar_merge_cookie_consent";
  const DEFAULT_CONSENT = {
    necessary: true,
    preferences: false,
    analytics: false,
    marketing: false,
  };

  const TRACKING_CONFIG = {
    // Doplň sem reálne ID pri ostrom spustení analytiky a marketingu.
    // Prázdne hodnoty znamenajú, že sa nič nenačíta ani po súhlase.
    ga4MeasurementId: "",
    metaPixelId: "",
  };

  function readConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_CONSENT, ...JSON.parse(raw) } : null;
    } catch (_error) {
      return null;
    }
  }

  function writeConsent(consent) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  }

  function loadScript(src, attributes = {}) {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    Object.entries(attributes).forEach(([key, value]) => script.setAttribute(key, value));
    document.head.appendChild(script);
  }

  function enableAnalytics() {
    if (!TRACKING_CONFIG.ga4MeasurementId || window.__arMergeAnalyticsLoaded) {
      return;
    }
    window.__arMergeAnalyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", TRACKING_CONFIG.ga4MeasurementId, { anonymize_ip: true });
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(TRACKING_CONFIG.ga4MeasurementId)}`);
  }

  function enableMarketing() {
    if (!TRACKING_CONFIG.metaPixelId || window.__arMergeMarketingLoaded) {
      return;
    }
    window.__arMergeMarketingLoaded = true;
    window.fbq = window.fbq || function fbq() {
      (window.fbq.q = window.fbq.q || []).push(arguments);
    };
    window.fbq("init", TRACKING_CONFIG.metaPixelId);
    window.fbq("track", "PageView");
    loadScript("https://connect.facebook.net/en_US/fbevents.js");
  }

  function applyConsent(consent) {
    if (consent.analytics) {
      enableAnalytics();
    }
    if (consent.marketing) {
      enableMarketing();
    }
  }

  function createBanner() {
    const wrapper = document.createElement("div");
    wrapper.className = "cookie-banner";
    wrapper.innerHTML = `
      <div class="cookie-banner__card">
        <div>
          <strong>Nastavenie cookies</strong>
          <p>Používame nevyhnutné cookies a po vašom súhlase aj analytické alebo marketingové technológie.</p>
        </div>
        <div class="cookie-banner__actions">
          <button type="button" class="button button--ghost" data-action="customize">Nastaviť</button>
          <button type="button" class="button button--ghost" data-action="reject">Odmietnuť voliteľné</button>
          <button type="button" class="button button--primary" data-action="accept">Prijať všetko</button>
        </div>
      </div>
    `;

    wrapper.addEventListener("click", (event) => {
      const action = event.target.getAttribute("data-action");
      if (!action) {
        return;
      }

      if (action === "accept") {
        const consent = { ...DEFAULT_CONSENT, preferences: true, analytics: true, marketing: true };
        writeConsent(consent);
        applyConsent(consent);
        wrapper.remove();
      }

      if (action === "reject") {
        const consent = { ...DEFAULT_CONSENT };
        writeConsent(consent);
        wrapper.remove();
      }

      if (action === "customize") {
        openPreferencesModal(wrapper);
      }
    });

    return wrapper;
  }

  function openPreferencesModal(banner) {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal__backdrop"></div>
      <div class="modal__dialog">
        <button type="button" class="modal__close" aria-label="Zavrieť">×</button>
        <p class="section-kicker">Cookies</p>
        <h2>Preferencie cookies</h2>
        <div class="cookie-preferences">
          <label class="cookie-option">
            <span>
              <strong>Nevyhnutné</strong>
              <small>Tieto cookies sú potrebné na fungovanie webu.</small>
            </span>
            <input type="checkbox" checked disabled>
          </label>
          <label class="cookie-option">
            <span>
              <strong>Preferenčné</strong>
              <small>Uloženie nastavení a voľby súhlasu.</small>
            </span>
            <input type="checkbox" data-key="preferences">
          </label>
          <label class="cookie-option">
            <span>
              <strong>Analytické</strong>
              <small>Meranie používania webu a zlepšovanie služby.</small>
            </span>
            <input type="checkbox" data-key="analytics">
          </label>
          <label class="cookie-option">
            <span>
              <strong>Marketingové</strong>
              <small>Meranie kampaní a remarketing, ak budú aktivované.</small>
            </span>
            <input type="checkbox" data-key="marketing">
          </label>
        </div>
        <div class="modal__actions">
          <button type="button" class="button button--ghost" data-action="close">Zatvoriť</button>
          <button type="button" class="button button--primary" data-action="save">Uložiť výber</button>
        </div>
      </div>
    `;

    const existing = readConsent() || DEFAULT_CONSENT;
    modal.querySelectorAll("input[data-key]").forEach((input) => {
      input.checked = Boolean(existing[input.getAttribute("data-key")]);
    });

    function close() {
      modal.remove();
      document.body.classList.remove("modal-open");
    }

    modal.addEventListener("click", (event) => {
      if (event.target.classList.contains("modal__backdrop") || event.target.classList.contains("modal__close")) {
        close();
      }

      const action = event.target.getAttribute("data-action");
      if (action === "close") {
        close();
      }

      if (action === "save") {
        const consent = { ...DEFAULT_CONSENT };
        modal.querySelectorAll("input[data-key]").forEach((input) => {
          consent[input.getAttribute("data-key")] = input.checked;
        });
        writeConsent(consent);
        applyConsent(consent);
        banner.remove();
        close();
      }
    });

    document.body.appendChild(modal);
    document.body.classList.add("modal-open");
  }

  function createFooterLink() {
    const footer = document.querySelector(".site-footer");
    if (!footer) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "site-footer__button";
    button.textContent = "Nastavenie cookies";
    button.addEventListener("click", () => openPreferencesModal({ remove() {} }));
    footer.appendChild(button);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const consent = readConsent();
    if (consent) {
      applyConsent(consent);
    } else {
      document.body.appendChild(createBanner());
    }
    createFooterLink();
  });
})();
