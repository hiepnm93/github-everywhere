// GitHub Everywhere — content script
// Loads base styling + site-specific overrides, honors per-host toggle.

(async () => {
  const host = location.hostname.replace(/^www\./, "");
  const state = await chrome.runtime.sendMessage({ type: "GH_GET_STATE" });

  if (!state?.globalEnabled) return;
  if (state.disabledHosts?.includes(host)) return;

  // Decide theme
  const prefersDark =
    state.theme === "dark" ||
    (state.theme === "auto" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Inject root theme attribute ASAP so CSS variables resolve correctly
  const rootAttr = prefersDark ? "dark" : "light";
  const applyRootAttr = () => {
    if (document.documentElement) {
      document.documentElement.setAttribute("data-gh-everywhere", rootAttr);
    }
  };
  applyRootAttr();
  document.addEventListener("DOMContentLoaded", applyRootAttr, { once: true });

  // Inject base stylesheet
  injectStyle("styles/base.css");

  // Site-specific overrides
  const siteMap = {
    "voz.vn": "sites/voz.css"
  };
  const specific = findSiteMatch(host, siteMap);
  if (specific) injectStyle(specific);

  function injectStyle(relPath) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL(relPath);
    link.dataset.ghEverywhere = "1";
    (document.head || document.documentElement).appendChild(link);
  }

  function findSiteMatch(h, map) {
    if (map[h]) return map[h];
    // allow subdomain match, e.g. forum.voz.vn -> voz.vn
    for (const k of Object.keys(map)) {
      if (h.endsWith("." + k)) return map[k];
    }
    return null;
  }
})();
