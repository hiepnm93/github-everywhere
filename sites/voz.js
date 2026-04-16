// voz.vn DOM helpers:
//  - Replace site logo with a GitHub-style mark
//  - Tag <html> with page-type class so CSS can pivot layouts
//  - Annotate forum listings with trending-like metadata attributes

const GH_MARK_SVG = `
<svg viewBox="0 0 16 16" width="32" height="32" aria-hidden="true" class="ghx-octicon">
  <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
</svg>`;

function detectPageType() {
  // voz uses xenforo. Inspect URL + body classes.
  const body = document.body;
  if (!body) return "unknown";
  const cls = body.className || "";
  // Forum list / home
  if (cls.includes("p-body--forum-index") || location.pathname === "/") return "home";
  if (cls.includes("thread-view") || cls.includes("p-body--threads") || /\/threads\//.test(location.pathname)) return "thread";
  if (cls.includes("p-body--forum-list") || /\/forums\//.test(location.pathname)) return "home";
  return "other";
}

function replaceLogo() {
  const selectors = [
    ".p-header-logo img",
    ".p-header-logo--image img",
    ".p-header-logo",
    ".logo img"
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const container = el.closest(".p-header-logo") || el.parentElement;
    if (!container) continue;
    container.innerHTML = GH_MARK_SVG + `<span class="ghx-brand-text">voz</span>`;
    container.classList.add("ghx-brand");
    container.setAttribute("href", "/");
    break;
  }
}

function tagThreads() {
  // Add metadata attributes to thread items so CSS can render trending-card layout.
  const items = document.querySelectorAll(".structItem--thread");
  items.forEach((it, idx) => {
    it.setAttribute("data-gh-rank", String(idx + 1));
  });
}

export function init() {
  const type = detectPageType();
  document.documentElement.setAttribute("data-gh-page", type);
  replaceLogo();
  tagThreads();

  // Re-run on SPA navigation (voz doesn't really do SPA but be safe)
  const obs = new MutationObserver(() => {
    if (!document.querySelector(".ghx-brand")) replaceLogo();
    tagThreads();
  });
  obs.observe(document.body, { childList: true, subtree: true });
}
