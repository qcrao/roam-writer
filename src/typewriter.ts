// 打字机滚动：让光标所在的那一行（而不是整个 block）停在滚动容器约 45% 的高度。
// 滚动容器是 .rm-article-wrapper（主页面 / 每日笔记都是它，实测 overflow-y: scroll）。
// 光标行坐标用"镜像 div"法算：复制 textarea 的排版样式，把光标前的文本放进去，量末尾 span 的位置。

const ANCHOR = 0.45;
const NAV_KEYS = new Set([
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Enter", "Backspace", "Delete", "PageUp", "PageDown", "Home", "End",
]);

const MIRROR_PROPS = [
  "boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "lineHeight",
  "textTransform", "wordSpacing", "textIndent", "whiteSpace", "wordBreak", "overflowWrap", "tabSize",
] as const;

let mirror: HTMLDivElement | null = null;

/** 光标相对 textarea 顶部的 y 偏移（取光标所在行的中线） */
function caretOffsetY(ta: HTMLTextAreaElement): number {
  if (!mirror) {
    mirror = document.createElement("div");
    mirror.setAttribute("aria-hidden", "true");
    Object.assign(mirror.style, {
      position: "absolute", visibility: "hidden", top: "0", left: "-9999px",
      overflow: "hidden", whiteSpace: "pre-wrap", overflowWrap: "break-word",
    });
    document.body.appendChild(mirror);
  }
  const cs = getComputedStyle(ta);
  for (const p of MIRROR_PROPS) (mirror.style as any)[p] = cs[p];
  mirror.style.whiteSpace = "pre-wrap";
  const pos = ta.selectionEnd ?? ta.value.length;
  mirror.textContent = ta.value.slice(0, pos);
  const marker = document.createElement("span");
  marker.textContent = "​";
  mirror.appendChild(marker);
  const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
  return marker.offsetTop + lineHeight / 2;
}

function activeTextarea(): HTMLTextAreaElement | null {
  const el = document.activeElement;
  if (!(el instanceof HTMLTextAreaElement) || !el.classList.contains("rm-block-input")) return null;
  return el.closest(".roam-article") ? el : null;
}

let rafId = 0;

function recenter(): void {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    const ta = activeTextarea();
    if (!ta) return;
    const scroller = ta.closest(".rm-article-wrapper") as HTMLElement | null;
    if (!scroller) return;
    const caretY = ta.getBoundingClientRect().top + caretOffsetY(ta);
    const box = scroller.getBoundingClientRect();
    const target = box.top + box.height * ANCHOR;
    const delta = caretY - target;
    if (Math.abs(delta) < 2) return;
    // 小幅移动（正常打字换行）直接跳，避免拖影；大幅（点击跳转、新 block）平滑过渡
    scroller.scrollBy({ top: delta, behavior: Math.abs(delta) > 120 ? "smooth" : "auto" });
  });
}

const onInput = (e: Event) => {
  if (e.target instanceof HTMLTextAreaElement) recenter();
};
const onKeyUp = (e: KeyboardEvent) => {
  if (NAV_KEYS.has(e.key)) recenter();
};
// Enter 新建 block / 上下键跨 block 时，焦点会换到新的 textarea
const onFocusIn = (e: FocusEvent) => {
  if (e.target instanceof HTMLTextAreaElement) recenter();
};
// 鼠标点进某行时居中；拖选文本时不动，避免选区跟着页面跑
const onMouseUp = () => {
  const ta = activeTextarea();
  if (ta && ta.selectionStart === ta.selectionEnd) recenter();
};

let enabled = false;

export function enableTypewriter(): void {
  if (enabled) return;
  enabled = true;
  document.addEventListener("input", onInput, true);
  document.addEventListener("keyup", onKeyUp, true);
  document.addEventListener("focusin", onFocusIn, true);
  document.addEventListener("mouseup", onMouseUp, true);
  recenter();
}

export function disableTypewriter(): void {
  if (!enabled) return;
  enabled = false;
  document.removeEventListener("input", onInput, true);
  document.removeEventListener("keyup", onKeyUp, true);
  document.removeEventListener("focusin", onFocusIn, true);
  document.removeEventListener("mouseup", onMouseUp, true);
  cancelAnimationFrame(rafId);
  mirror?.remove();
  mirror = null;
}
