// 设置面板。值由 Roam 自动持久化；任何设置变更都派发事件，入口重新应用样式。

import { MODES } from "./modes";

export const SETTINGS_CHANGED_EVENT = "roamWriter:settingsChanged";

// Roam 的 extensionAPI.settings.set() 是异步落盘的，紧接着 get() 仍可能拿到旧值
//（曾导致"点了 Paper 却应用了上一次的模式"）。所以维护一份内存副本作为唯一真相：
// 写入先改内存、再异步持久化；面板 onChange 直接用回调参数更新内存。
const cache: Record<string, any> = {};

function onChangeFor(id: string) {
  return (v: any) => {
    // switch 的回调参数是事件对象，select 是选中值
    cache[id] = v && typeof v === "object" && "target" in v ? Boolean(v.target?.checked) : v;
    window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT));
  };
}

export function setSetting(extensionAPI: any, id: string, value: any): void {
  cache[id] = value;
  try {
    Promise.resolve(extensionAPI.settings.set(id, value)).catch(() => {});
  } catch (e) {
    // 持久化失败不影响当前会话
  }
}

export const TRI = ["Mode default", "On", "Off"] as const;
export const FONT_SIZES = ["Mode default", "14px", "15px", "16px", "17px", "18px", "19px", "20px", "22px"];
export const WIDTHS: Record<string, string> = {
  "Mode default": "",
  "Narrow (32× font size)": "calc(var(--rw-size, 15px) * 32)",
  "Medium (38× font size)": "calc(var(--rw-size, 15px) * 38)",
  "Wide (46× font size)": "calc(var(--rw-size, 15px) * 46)",
  "Extra wide (56× font size)": "calc(var(--rw-size, 15px) * 56)",
  "Full (100%)": "100%",
};

const DEFAULTS: Record<string, string | boolean> = {
  mode: MODES[1].label,
  focus: "Mode default",
  typewriter: "Mode default",
  "hide-bullets": "Mode default",
  immersive: "Mode default",
  "font-size": "Mode default",
  width: "Mode default",
  "auto-enable": false,
};

export function createSettingsPanel(extensionAPI: any): void {
  const modeHelp = MODES.map((m) => `${m.label}: ${m.description}`).join(" · ");
  extensionAPI.settings.panel.create({
    tabTitle: "Writer",
    settings: [
      {
        id: "mode",
        name: "Writing mode",
        description: modeHelp,
        action: { type: "select", items: MODES.map((m) => m.label), onChange: onChangeFor("mode") },
      },
      {
        id: "focus",
        name: "Focus (dim other blocks)",
        description: "While editing, dim everything except the current block (paragraph-level)",
        action: { type: "select", items: [...TRI], onChange: onChangeFor("focus") },
      },
      {
        id: "typewriter",
        name: "Typewriter scrolling",
        description: "Keep the line you are typing on near the middle of the screen",
        action: { type: "select", items: [...TRI], onChange: onChangeFor("typewriter") },
      },
      {
        id: "hide-bullets",
        name: "Hide bullets",
        description: "Hide bullets and indent guides until hovered (collapse, drag and zoom still work)",
        action: { type: "select", items: [...TRI], onChange: onChangeFor("hide-bullets") },
      },
      {
        id: "immersive",
        name: "Immersive",
        description: "Hide both sidebars and linked references; the top bar fades out until hovered",
        action: { type: "select", items: [...TRI], onChange: onChangeFor("immersive") },
      },
      {
        id: "font-size",
        name: "Font size",
        description: "Override the mode's font size (no effect in Clean mode)",
        action: { type: "select", items: FONT_SIZES, onChange: onChangeFor("font-size") },
      },
      {
        id: "width",
        name: "Line width",
        description: "Maximum width of the text column",
        action: { type: "select", items: Object.keys(WIDTHS), onChange: onChangeFor("width") },
      },
      {
        id: "auto-enable",
        name: "Enable on startup",
        description: "Always turn writing mode on when Roam starts (otherwise the last on/off state is restored)",
        action: { type: "switch", onChange: onChangeFor("auto-enable") },
      },
    ],
  });
}

/**
 * 未保存过的设置写入默认值。Roam 的 select 在没有存值时显示第一项，
 * 而默认模式不是第一项（iA Writer ≠ Clean），不写入的话面板显示与实际生效不一致。
 */
export function initDefaults(extensionAPI: any): void {
  for (const [id, value] of Object.entries(DEFAULTS)) {
    const v = extensionAPI.settings.get(id);
    if (v === undefined || v === null || v === "") setSetting(extensionAPI, id, value);
  }
}

export function getSetting(extensionAPI: any, id: string): any {
  const v = id in cache ? cache[id] : extensionAPI.settings.get(id);
  return v === undefined || v === null || v === "" ? DEFAULTS[id] : v;
}

/** "Mode default" → 用模式值；"On"/"Off" → 覆盖 */
export function resolveTri(extensionAPI: any, id: string, modeValue: boolean): boolean {
  const v = getSetting(extensionAPI, id);
  if (v === "On") return true;
  if (v === "Off") return false;
  return modeValue;
}
