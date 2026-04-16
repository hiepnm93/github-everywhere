// Popup logic for GitHub Everywhere

const $ = (id) => document.getElementById(id);

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function getState() {
  return await chrome.runtime.sendMessage({ type: "GH_GET_STATE" });
}

async function setState(patch) {
  return await chrome.runtime.sendMessage({
    type: "GH_SET_STATE",
    payload: patch
  });
}

async function init() {
  const tab = await getActiveTab();
  const host = hostFromUrl(tab?.url || "");
  $("hostname").textContent = host || "—";

  const state = await getState();
  $("global").checked = !!state.globalEnabled;
  $("theme").value = state.theme || "auto";

  const disabled = state.disabledHosts || [];
  $("host").checked = host ? !disabled.includes(host) : false;
  $("host").disabled = !host;

  $("global").addEventListener("change", async (e) => {
    await setState({ globalEnabled: e.target.checked });
  });

  $("theme").addEventListener("change", async (e) => {
    await setState({ theme: e.target.value });
  });

  $("host").addEventListener("change", async (e) => {
    if (!host) return;
    const s = await getState();
    const list = new Set(s.disabledHosts || []);
    if (e.target.checked) list.delete(host);
    else list.add(host);
    await setState({ disabledHosts: [...list] });
  });

  $("reload").addEventListener("click", async () => {
    if (tab?.id) chrome.tabs.reload(tab.id);
    window.close();
  });
}

init();
