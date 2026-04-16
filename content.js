// GitHub Everywhere — content script
// Opt-in model: only acts on hosts in state.enabledHosts.
// Loads base CSS + site-specific CSS/JS and applies body classes for page types.

(async () => {
  const host = location.hostname.replace(/^www\./, "");
  const state = await chrome.runtime.sendMessage({ type: "GH_GET_STATE" });
  if (!state) return;

  const enabled = matchHost(host, state.enabledHosts || []);
  if (!enabled) return;

  // Theme
  const prefersDark =
    state.theme === "dark" ||
    (state.theme === "auto" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const rootAttr = prefersDark ? "dark" : "light";

  const setRootAttr = () => {
    if (document.documentElement) {
      document.documentElement.setAttribute("data-gh-everywhere", rootAttr);
      document.documentElement.setAttribute("data-gh-site", enabled);
    }
  };
  setRootAttr();
  document.addEventListener("DOMContentLoaded", setRootAttr, { once: true });

  // Inject base CSS
  injectStyle("styles/base.css");

  // Site-specific CSS & JS
  const siteCss = `sites/${enabled}.css`;
  const siteJs = `sites/${enabled}.js`;
  injectStyle(siteCss);

  // Load site JS as module via dynamic import
  try {
    const mod = await import(chrome.runtime.getURL(siteJs));
    if (mod && typeof mod.init === "function") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => mod.init(), { once: true });
      } else {
        mod.init();
      }
    }
  } catch (_) {
    // site JS missing is OK — CSS-only transform
  }

  function matchHost(h, list) {
    for (const k of list) {
      if (h === k || h.endsWith("." + k)) return k;
    }
    return null;
  }

  function injectStyle(relPath) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL(relPath);
    link.dataset.ghEverywhere = "1";
    (document.head || document.documentElement).appendChild(link);
  }
})();
