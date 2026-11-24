// Writer — Roam 里的沉浸写作模式。
//
// 做法：注入一份静态 CSS（styles.ts），所有规则挂在 <html> 的 class 下；
// 切换模式 = 改 <html> 上的 class 和 CSS 变量，不碰页面数据，关闭即完全复原。
// 打字机滚动需要 JS（typewriter.ts），只在开启时挂监听。

import { CSS, STYLE_ELEMENT_ID } from "./styles";
import { MODES, getMode } from "./modes";
import {
  createSettingsPanel,
  initDefaults,
  getSetting,
  setSetting,
  resolveTri,
  SETTINGS_CHANGED_EVENT,
  WIDTHS,
} from "./settings";
import { enableTypewriter, disableTypewriter } from "./typewriter";

const ACTIVE_KEY = "rw-active";
const ROOT_CLASSES = ["rw-on", "rw-typo", "rw-bg", "rw-immersive", "rw-focus", "rw-typewriter", "rw-hide-bullets"];
const CSS_VARS = ["--rw-font", "--rw-size", "--rw-lh", "--rw-width", "--rw-gap", "--rw-bg", "--rw-fg", "--rw-caret", "--rw-heading"];
const BUTTON_ID = "roam-writer-toggle";
const MENU_ID = "roam-writer-menu";

let api: any = null;
let active = false;
// 上一次 apply 时沉浸是否开启：只在"关→开"那一刻关侧栏，
// 否则写作中用户自己打开的侧栏会在下次改设置 / 切模式时又被关掉
let wasImmersive = false;
const commandLabels: string[] = [];

// ---------- 侧栏：进入沉浸模式前真正关掉（而不是 CSS 藏起来），退出时恢复 ----------

// 记录"是我们关掉的、退出时欠用户一次恢复"的侧栏；持久化，刷新 Roam 后仍能恢复
const OWED_RIGHT_KEY = "rw-owed-right";
const OWED_LEFT_KEY = "rw-owed-left";
let owedRight = false;
let owedLeft = false;

function saveOwed(extApi: any): void {
  setSetting(extApi, OWED_RIGHT_KEY, owedRight);
  setSetting(extApi, OWED_LEFT_KEY, owedLeft);
}
// 开关侧栏是异步的；所有操作串行排队，每步等 Roam 真正完成，避免快速切换模式时读到过期状态
let sidebarQueue: Promise<void> = Promise.resolve();

const roamUI = () => (window as any).roamAlphaAPI?.ui;
// 优先看 .rm-article-wrapper 的 class（即时，不受展开动画影响）；
// All Pages / Graph Overview 视图没有这个 wrapper（2026-11 实测），退回看几何位置：
// 右栏 #right-sidebar 宽度 > 0；左栏 .roam-sidebar-container 关闭时 left = -232。
function isOpen(side: "right" | "left"): boolean {
  const wrapper = document.querySelector(".rm-article-wrapper");
  if (wrapper) return wrapper.classList.contains(`rm-spacing--${side}-sidebar-open`);
  if (side === "right") {
    const el = document.getElementById("right-sidebar");
    return !!el && el.getBoundingClientRect().width > 0;
  }
  const el = document.querySelector(".roam-sidebar-container");
  return !!el && el.getBoundingClientRect().left >= 0;
}

async function waitFor(cond: () => boolean, timeoutMs = 3000): Promise<void> {
  const t0 = Date.now();
  while (!cond() && Date.now() - t0 < timeoutMs) await new Promise((r) => setTimeout(r, 30));
}

async function setSidebar(side: "right" | "left", open: boolean): Promise<void> {
  const api = roamUI()?.[`${side}Sidebar`];
  if (!api) return;
  try {
    await (open ? api.open() : api.close());
  } catch (e) {
    console.warn("[Writer] sidebar toggle failed", e);
    return;
  }
  await waitFor(() => isOpen(side) === open);
}

/** wantClosed=true：关掉当前开着的侧栏并记账；false：把记过账的侧栏恢复。两侧并行操作。 */
function syncSidebars(wantClosed: boolean): Promise<void> {
  const extApi = api; // 入队时捕获：onunload 会立刻把 api 置空，而队列稍后才执行
  sidebarQueue = sidebarQueue.then(async () => {
    const jobs: Promise<void>[] = [];
    if (wantClosed) {
      if (isOpen("right")) {
        owedRight = true;
        jobs.push(setSidebar("right", false));
      }
      if (isOpen("left")) {
        owedLeft = true;
        jobs.push(setSidebar("left", false));
      }
    } else {
      if (owedRight) jobs.push(setSidebar("right", true));
      if (owedLeft) jobs.push(setSidebar("left", true));
      owedRight = owedLeft = false;
    }
    if (extApi) saveOwed(extApi);
    await Promise.all(jobs);
  });
  return sidebarQueue;
}

// ---------- 应用 / 清除 ----------

function clearRoot(): void {
  const html = document.documentElement;
  html.classList.remove(...ROOT_CLASSES);
  html.removeAttribute("data-rw-mode");
  for (const v of CSS_VARS) html.style.removeProperty(v);
  disableTypewriter();
}

function apply(): void {
  clearRoot();
  updateButton();
  if (!active) {
    if (wasImmersive) syncSidebars(false);
    wasImmersive = false;
    return;
  }

  const html = document.documentElement;
  const mode = getMode(String(getSetting(api, "mode")));
  const t = mode.typography;
  const set = (k: string, v?: string) => v && html.style.setProperty(k, v);

  html.classList.add("rw-on");
  html.setAttribute("data-rw-mode", mode.id);

  if (t) {
    html.classList.add("rw-typo");
    const size = String(getSetting(api, "font-size"));
    set("--rw-font", t.font);
    set("--rw-size", size === "Mode default" ? t.size : size);
    set("--rw-lh", t.lineHeight);
    set("--rw-width", t.width);
    set("--rw-gap", t.paragraphGap);
    set("--rw-fg", t.fg);
    set("--rw-caret", t.caret);
    set("--rw-heading", t.heading);
    if (t.bg) {
      html.classList.add("rw-bg");
      set("--rw-bg", t.bg);
    }
  }
  const width = WIDTHS[String(getSetting(api, "width"))];
  if (width) set("--rw-width", width);

  const immersive = resolveTri(api, "immersive", mode.immersive);
  if (immersive) {
    if (!wasImmersive) syncSidebars(true);
    html.classList.add("rw-immersive");
  } else if (wasImmersive) {
    syncSidebars(false);
  }
  wasImmersive = immersive;
  if (resolveTri(api, "hide-bullets", mode.hideBullets)) html.classList.add("rw-hide-bullets");
  if (resolveTri(api, "focus", mode.focus)) html.classList.add("rw-focus");
  if (resolveTri(api, "typewriter", mode.typewriter)) {
    html.classList.add("rw-typewriter");
    enableTypewriter();
  }
}

function setActive(on: boolean, announce = true): void {
  active = on;
  setSetting(api, ACTIVE_KEY, on);
  apply();
  if (announce) toast(on ? `Writer: ${getMode(String(getSetting(api, "mode"))).label}` : "Writer: off");
}

function useMode(label: string): void {
  setSetting(api, "mode", label);
  setActive(true);
}

function nextMode(): void {
  const cur = getMode(String(getSetting(api, "mode")));
  const idx = MODES.findIndex((m) => m.id === cur.id);
  useMode(MODES[(idx + 1) % MODES.length].label);
}

// ---------- UI：提示与顶栏按钮 ----------

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function toast(text: string): void {
  let el = document.getElementById("roam-writer-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "roam-writer-toast";
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el?.classList.remove("show"), 1400);
}

function updateButton(): void {
  const topbar = document.querySelector(".rm-topbar");
  if (!topbar) return;
  let btn = document.getElementById(BUTTON_ID);
  if (!btn) {
    btn = document.createElement("span");
    btn.id = BUTTON_ID;
    btn.className = "bp3-button bp3-minimal bp3-small bp3-icon-edit";
    btn.title = "Writer: choose a writing mode";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu(btn as HTMLElement);
    });
    topbar.appendChild(btn);
  }
  btn.classList.toggle("bp3-intent-primary", active);
}

// 顶栏可能晚于扩展加载才渲染，也可能被 Roam 重渲染冲掉按钮：监听 DOM，缺了就补
let topbarObserver: MutationObserver | null = null;
let topbarCheckQueued = false;

function watchTopbar(): void {
  topbarObserver = new MutationObserver(() => {
    if (topbarCheckQueued) return;
    topbarCheckQueued = true;
    requestAnimationFrame(() => {
      topbarCheckQueued = false;
      if (!document.getElementById(BUTTON_ID) && document.querySelector(".rm-topbar")) updateButton();
    });
  });
  topbarObserver.observe(document.body, { childList: true, subtree: true });
}

// ---------- 模式菜单：复用 Roam 自带的 Blueprint 菜单样式 ----------

function closeMenu(): void {
  document.getElementById(MENU_ID)?.remove();
  document.removeEventListener("mousedown", onOutsideMouseDown, true);
  document.removeEventListener("keydown", onMenuKeyDown, true);
}

const onOutsideMouseDown = (e: MouseEvent) => {
  const t = e.target as Node;
  if (document.getElementById(MENU_ID)?.contains(t) || document.getElementById(BUTTON_ID)?.contains(t)) return;
  closeMenu();
};

const onMenuKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    e.stopPropagation();
    closeMenu();
  }
};

function toggleMenu(anchor: HTMLElement): void {
  if (document.getElementById(MENU_ID)) return closeMenu();

  const current = active ? getMode(String(getSetting(api, "mode"))).id : null;
  const menu = document.createElement("ul");
  menu.id = MENU_ID;
  menu.className = "bp3-menu bp3-elevation-2";

  const addItem = (label: string, hint: string, checked: boolean, onPick: () => void) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = `bp3-menu-item${checked ? " bp3-active" : ""}`;
    a.title = hint;
    a.innerHTML = `<span class="bp3-icon ${checked ? "bp3-icon-tick" : "rw-icon-blank"}"></span><div class="bp3-text-overflow-ellipsis bp3-fill"></div>`;
    (a.querySelector(".bp3-fill") as HTMLElement).textContent = label;
    a.addEventListener("click", () => {
      closeMenu();
      onPick();
    });
    li.appendChild(a);
    menu.appendChild(li);
  };

  addItem("Off", "Turn writing mode off and restore Roam's default look", current === null, () => active && setActive(false));
  const divider = document.createElement("li");
  divider.className = "bp3-menu-divider";
  menu.appendChild(divider);
  for (const m of MODES) addItem(m.label, m.description, current === m.id, () => useMode(m.label));

  document.body.appendChild(menu);
  const r = anchor.getBoundingClientRect();
  menu.style.top = `${r.bottom + 6}px`;
  // 右对齐按钮，避免贴着窗口右边缘溢出
  menu.style.left = `${Math.max(8, Math.min(r.right - menu.offsetWidth, innerWidth - menu.offsetWidth - 8))}px`;

  document.addEventListener("mousedown", onOutsideMouseDown, true);
  document.addEventListener("keydown", onMenuKeyDown, true);
}

// ---------- 生命周期 ----------

const onSettingsChanged = () => {
  // 面板 onChange 已把新值写进内存副本（settings.ts），直接重新应用
  apply();
};

function addCommand(label: string, callback: () => void): void {
  api.ui.commandPalette.addCommand({ label, callback });
  commandLabels.push(label);
}

const onload = ({ extensionAPI }: { extensionAPI: any }) => {
  api = extensionAPI;
  initDefaults(extensionAPI);
  createSettingsPanel(extensionAPI);

  // 上一个实例没正常卸载（开发模式重载等）时，先清掉残留
  document.getElementById(STYLE_ELEMENT_ID)?.remove();
  document.getElementById(BUTTON_ID)?.remove();
  document.getElementById(MENU_ID)?.remove();

  const style = document.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  style.textContent = CSS;
  document.head.appendChild(style);

  // 不设默认快捷键（Roam 文档未明确格式，且容易与用户已有快捷键冲突）；
  // 这些命令会出现在 Settings → Hotkeys 里，用户可自行绑定。
  addCommand("Writer: Toggle writing mode", () => setActive(!active));
  addCommand("Writer: Next mode", nextMode);
  for (const m of MODES) addCommand(`Writer: ${m.label} mode`, () => useMode(m.label));

  window.addEventListener(SETTINGS_CHANGED_EVENT, onSettingsChanged);

  owedRight = getSetting(api, OWED_RIGHT_KEY) === true;
  owedLeft = getSetting(api, OWED_LEFT_KEY) === true;
  active = Boolean(getSetting(api, "auto-enable")) || getSetting(api, ACTIVE_KEY) === true;
  apply();
  watchTopbar();
};

const onunload = () => {
  window.removeEventListener(SETTINGS_CHANGED_EVENT, onSettingsChanged);
  topbarObserver?.disconnect();
  topbarObserver = null;
  clearRoot();
  if (wasImmersive) syncSidebars(false);
  wasImmersive = false;
  document.getElementById(STYLE_ELEMENT_ID)?.remove();
  closeMenu();
  document.getElementById(BUTTON_ID)?.remove();
  document.getElementById("roam-writer-toast")?.remove();
  if (toastTimer) clearTimeout(toastTimer);
  for (const label of commandLabels.splice(0)) {
    try {
      api?.ui?.commandPalette?.removeCommand({ label });
    } catch (e) {
      // 忽略：Roam 卸载时命令可能已被移除
    }
  }
  api = null;
};

export default { onload, onunload };
