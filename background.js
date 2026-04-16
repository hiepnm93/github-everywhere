// GitHub Everywhere — background service worker
// Manages per-hostname enable state (opt-in) and theme preference.

const DEFAULTS = {
  theme: "auto",              // "light" | "dark" | "auto"
  enabledHosts: ["voz.vn"]    // sites where the transform is active
};

chrome.runtime.onInstalled.addListener(async () => {
  const cur = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  const patched = { ...DEFAULTS, ...cur };
  if (!Array.isArray(patched.enabledHosts)) patched.enabledHosts = DEFAULTS.enabledHosts;
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
