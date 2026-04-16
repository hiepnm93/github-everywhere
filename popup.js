// Popup logic: manage theme + opt-in site list.

const $ = (id) => document.getElementById(id);

function normalizeHost(s) {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
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

function renderList(state, currentHost) {
  const list = state.enabledHosts || [];
  $("count").textContent = String(list.length);

  const root = $("site-list");
  root.innerHTML = "";
  if (!list.length) {
    const e = document.createElement("div");
    e.className = "empty";
    e.textContent = "Chưa có site nào — thêm ở dưới";
    root.appendChild(e);
    return;
  }

  for (const h of [...list].sort()) {
    const row = document.createElement("div");
    row.className = "site-item";
    const name = document.createElement("span");
    name.textContent = h;
    const btn = document.createElement("button");
    btn.textContent = "×";
    btn.title = "Xóa";
    btn.addEventListener("click", async () => {
      const s = await getState();
      const next = (s.enabledHosts || []).filter((x) => x !== h);
      await setState({ enabledHosts: next });
      await refresh(currentHost);
    });
    row.appendChild(name);
    row.appendChild(btn);
    root.appendChild(row);
  }
}

function updateCurrent(state, currentHost) {
  $("current-host").textContent = currentHost || "—";
  const btn = $("toggle-current");
  if (!currentHost) {
    btn.disabled = true;
    btn.textContent = "Không có site";
    btn.classList.remove("btn-primary");
    return;
  }
  btn.disabled = false;
  const enabled = (state.enabledHosts || []).includes(currentHost);
  if (enabled) {
    btn.textContent = "Tắt cho site này";
    btn.classList.remove("btn-primary");
  } else {
    btn.textContent = "Bật cho site này";
    btn.classList.add("btn-primary");
  }
}

async function refresh(currentHost) {
  const state = await getState();
  $("theme").value = state.theme || "auto";
  renderList(state, currentHost);
  updateCurrent(state, currentHost);
}

async function init() {
  const tab = await getActiveTab();
  const currentHost = tab?.url ? normalizeHost(new URL(tab.url).hostname) : "";
  await refresh(currentHost);

  $("theme").addEventListener("change", async (e) => {
    await setState({ theme: e.target.value });
  });

  $("toggle-current").addEventListener("click", async () => {
    if (!currentHost) return;
    const s = await getState();
    const list = new Set(s.enabledHosts || []);
    if (list.has(currentHost)) list.delete(currentHost);
    else list.add(currentHost);
    await setState({ enabledHosts: [...list] });
    await refresh(currentHost);
  });

  $("add-btn").addEventListener("click", async () => {
    const v = normalizeHost($("add-host").value);
    if (!v) return;
    const s = await getState();
    const list = new Set(s.enabledHosts || []);
    list.add(v);
    await setState({ enabledHosts: [...list] });
    $("add-host").value = "";
    await refresh(currentHost);
  });

  $("add-host").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("add-btn").click();
  });

  $("reload").addEventListener("click", async () => {
    if (tab?.id) chrome.tabs.reload(tab.id);
    window.close();
  });
}

init();
