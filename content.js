// GitHub Everywhere — content script
// Opt-in model: only acts on hosts in state.enabledHosts.
// Removes all site styles and applies GitHub design.

(async () => {
  console.log("[GitHub Everywhere] Content script loaded");

  const host = location.hostname.replace(/^www\./, "");
  console.log("[GitHub Everywhere] Host:", host);

  const state = await chrome.runtime.sendMessage({ type: "GH_GET_STATE" });
  if (!state) {
    console.error("[GitHub Everywhere] Failed to get state");
    return;
  }
  console.log("[GitHub Everywhere] State:", state);

  const enabled = matchHost(host, state.enabledHosts || []);
  if (!enabled) {
    console.log("[GitHub Everywhere] Not enabled for this host");
    return;
  }
  console.log("[GitHub Everywhere] Enabled for:", enabled);

  // Update page title
  if (host === "voz.vn" || host.endsWith(".voz.vn")) {
    const originalTitle = document.title;
    const updateTitle = () => {
      const prefix = "GitHub/VOZ";
      // Don't duplicate prefix
      if (!document.title.startsWith(prefix)) {
        document.title = `${prefix} - ${originalTitle}`;
      }
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", updateTitle, { once: true });
    } else {
      updateTitle();
    }
  }

  // Update favicon
  if (host === "voz.vn" || host.endsWith(".voz.vn")) {
    const updateFavicon = () => {
      // Remove existing favicons
      const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
      existingFavicons.forEach(f => f.remove());

      // Add GitHub favicon
      const githubIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' aria-hidden='true'%3E%3Cpath fill='white' d='M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.84-.08-.08-.72-2.42-2.75C2.7 13.33.7 13 .7 8c0-4.42 3.58-8 8-8Z'/%3E%3C/svg%3E";
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = githubIcon;
      document.head.appendChild(link);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", updateFavicon, { once: true });
    } else {
      updateFavicon();
    }
  }

  // Remove all existing stylesheets from VOZ
  console.log("[GitHub Everywhere] Removing existing stylesheets...");
  const removeAllStylesheets = () => {
    // Remove all link[rel="stylesheet"]
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    links.forEach(link => {
      if (!link.dataset.ghEverywhere) {
        console.log("[GitHub Everywhere] Removing stylesheet:", link.href);
        link.remove();
      }
    });

    // Remove all style tags that aren't ours
    const styles = document.querySelectorAll('style:not([data-gh-everywhere])');
    styles.forEach(style => {
      console.log("[GitHub Everywhere] Removing inline style");
      style.remove();
    });
  };

  // Remove immediately
  if (document.head) {
    removeAllStylesheets();
  }

  // Also remove on DOMContentLoaded to catch any late-loading styles
  document.addEventListener("DOMContentLoaded", removeAllStylesheets);

  // Theme
  const prefersDark =
    state.theme === "dark" ||
    (state.theme === "auto" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const rootAttr = prefersDark ? "dark" : "light";
  console.log("[GitHub Everywhere] Theme:", rootAttr);

  const setRootAttr = () => {
    if (document.documentElement) {
      document.documentElement.setAttribute("data-gh-everywhere", rootAttr);
      document.documentElement.setAttribute("data-gh-site", enabled);
      document.documentElement.setAttribute("data-gh-page", "unknown");
      console.log("[GitHub Everywhere] Root attributes set:", {
        "data-gh-everywhere": rootAttr,
        "data-gh-site": enabled,
        "data-gh-page": "unknown"
      });
    }
  };
  setRootAttr();
  document.addEventListener("DOMContentLoaded", setRootAttr, { once: true });

  // Inject base CSS
  console.log("[GitHub Everywhere] Injecting base CSS");
  injectStyle("styles/base.css");

  // Site-specific CSS & JS
  const siteCss = `sites/${enabled}.css`;
  const siteJs = `sites/${enabled}.js`;
  console.log("[GitHub Everywhere] Injecting site CSS:", siteCss);
  injectStyle(siteCss);

  // Load site JS as module via dynamic import
  try {
    console.log("[GitHub Everywhere] Loading site JS:", siteJs);
    const mod = await import(chrome.runtime.getURL(siteJs));
    if (mod && typeof mod.init === "function") {
      console.log("[GitHub Everywhere] Initializing site JS");
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => mod.init(), { once: true });
      } else {
        mod.init();
      }
    }
  } catch (err) {
    console.log("[GitHub Everywhere] Site JS not loaded (CSS-only transform):", err.message);
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
    console.log("[GitHub Everywhere] Style injected:", chrome.runtime.getURL(relPath));
  }
})();
