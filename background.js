// GitHub Everywhere — background service worker
// Manages per-hostname enable state and theme preference.

const DEFAULTS = {
  globalEnabled: true,
  theme: "auto", // "light" | "dark" | "auto"
  disabledHosts: [] // hostnames explicitly turned off
};

chrome.runtime.onInstalled.addListener(async () => {
  const cur = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  const patched = { ...DEFAULTS, ...cur };
  await chrome.storage.sync.set(patched);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "GH_GET_STATE") {
    chrome.storage.sync.get(Object.keys(DEFAULTS)).then((s) => {
      sendResponse({ ...DEFAULTS, ...s });
    });
    return true;
  }
  if (msg?.type === "GH_SET_STATE") {
    chrome.storage.sync.set(msg.payload || {}).then(() => sendResponse({ ok: true }));
    return true;
  }
});
