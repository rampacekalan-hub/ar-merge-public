(function () {
  const config = window.UNIFYO_PAGE_I18N || [];
  if (!config.length) {
    return;
  }

  const storageKey = "unifyo_lang";
  const saved = window.localStorage.getItem(storageKey);
  const lang = saved === "en" ? "en" : "sk";

  function buildSwitch() {
    const host =
      document.querySelector("[data-lang-switch-host]") ||
      document.querySelector(".hero__topbar-actions") ||
      document.querySelector(".ai-workspace__actions") ||
      document.querySelector(".toolbar");
    if (!host) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "lang-switch";
    wrapper.innerHTML = `
      <button class="lang-switch__btn" type="button" data-lang="sk">SK</button>
      <button class="lang-switch__btn" type="button" data-lang="en">EN</button>
    `;
    host.prepend(wrapper);
    wrapper.querySelectorAll("[data-lang]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextLang = button.dataset.lang === "en" ? "en" : "sk";
        window.localStorage.setItem(storageKey, nextLang);
        applyTranslations(nextLang);
      });
    });
  }

  function applyTranslations(nextLang) {
    document.documentElement.lang = nextLang;
    config.forEach((item) => {
      const nodes = document.querySelectorAll(item.selector);
      if (!nodes.length) {
        return;
      }
      nodes.forEach((node) => {
        if (item.attr) {
          node.setAttribute(item.attr, item.values[nextLang]);
        } else if (item.html) {
          node.innerHTML = item.html[nextLang];
        } else {
          node.textContent = item.text[nextLang];
        }
      });
    });

    document.querySelectorAll(".lang-switch__btn").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.lang === nextLang);
    });

    window.dispatchEvent(new CustomEvent("unifyo-language-change", {
      detail: { lang: nextLang },
    }));
  }

  buildSwitch();
  applyTranslations(lang);
}());
