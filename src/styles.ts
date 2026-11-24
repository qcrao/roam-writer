// 所有样式挂在 <html> 的 class 下，关闭时移除 class 即可完全恢复原样。
//
// 右侧死区的成因（2026-11 在 Roam 帮助图谱实测）：
//   每个 block 行是 flex：[.controls 40px][.rm-block__input][.rm-block-separator min-width:116px][div min-width:24px]
//   文字右边缘因此比文章列右边缘少 140px；同时 .rm-article-wrapper.rm-spacing--small 用
//   padding: calc(50% - 400px) 把文章列限死在 800px。
// 修复：压掉 separator 与尾部占位，让输入区 flex 撑满；文章列宽度改由我们的 max-width 决定。
//
// 根 class：
//   rw-on          启用（基础布局修复）
//   rw-typo        有排版变量（非 Clean 模式）
//   rw-bg          模式自带背景色
//   rw-immersive   隐藏侧栏 / 顶栏淡出 / 隐藏引用
//   rw-focus       淡化非编辑中的 block
//   rw-typewriter  打字机滚动（顶部留白，让开头几行也能居中）
//   rw-hide-bullets bullet 与缩进线悬停才显示

const R = "html.rw-on";

export const STYLE_ELEMENT_ID = "roam-writer-style";

export const CSS = `
/* ---------- 基础：去掉右侧死区，正文列居中 ---------- */
${R} .rm-article-wrapper {
  padding-left: 24px !important;
  padding-right: 24px !important;
}
${R} .roam-article {
  max-width: var(--rw-width, 760px);
  margin-left: auto !important;
  margin-right: auto !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}
${R} .roam-article .rm-block-separator {
  min-width: 0 !important;
  flex: 0 0 0 !important;
}
${R} .roam-article .rm-block-main > div:last-child:not([class]) {
  min-width: 0 !important;
}
${R} .roam-article .rm-block-main > .rm-block__input,
${R} .roam-article .rm-block-main > .rm-autocomplete__wrapper {
  flex: 1 1 auto !important;
}

/* ---------- 排版 ---------- */
html.rw-on.rw-typo .roam-article .rm-block-text,
html.rw-on.rw-typo .roam-article textarea.rm-block-input {
  font-family: var(--rw-font) !important;
  font-size: var(--rw-size) !important;
  line-height: var(--rw-lh) !important;
  color: var(--rw-fg, inherit);
  caret-color: var(--rw-caret, auto);
}
html.rw-on.rw-typo .roam-article textarea.rm-block-input {
  background: transparent !important;
}
html.rw-on.rw-typo .roam-article .rm-block-main {
  padding-bottom: var(--rw-gap);
}
html.rw-on.rw-typo .roam-article .rm-title-display,
html.rw-on.rw-typo .roam-article .rm-title-display textarea {
  font-family: var(--rw-heading, var(--rw-font)) !important;
  color: var(--rw-fg, inherit);
  font-weight: 600;
}
html.rw-on.rw-typo .roam-article .rm-heading-level-1 > .rm-block-main .rm-block-text,
html.rw-on.rw-typo .roam-article .rm-heading-level-1 > .rm-block-main textarea.rm-block-input {
  font-size: calc(var(--rw-size) * 1.6) !important; font-weight: 600;
}
html.rw-on.rw-typo .roam-article .rm-heading-level-2 > .rm-block-main .rm-block-text,
html.rw-on.rw-typo .roam-article .rm-heading-level-2 > .rm-block-main textarea.rm-block-input {
  font-size: calc(var(--rw-size) * 1.35) !important; font-weight: 600;
}
html.rw-on.rw-typo .roam-article .rm-heading-level-3 > .rm-block-main .rm-block-text,
html.rw-on.rw-typo .roam-article .rm-heading-level-3 > .rm-block-main textarea.rm-block-input {
  font-size: calc(var(--rw-size) * 1.15) !important; font-weight: 600;
}
/* Typora（GitHub 主题）：一、二级标题带下划线 */
/* 线画在文字区（而非整行），否则会向左多出 bullet 那 40px */
html.rw-on[data-rw-mode="typora"] .roam-article .rm-heading-level-1 > .rm-block-main > .rm-block__input,
html.rw-on[data-rw-mode="typora"] .roam-article .rm-heading-level-1 > .rm-block-main > .rm-autocomplete__wrapper,
html.rw-on[data-rw-mode="typora"] .roam-article .rm-heading-level-2 > .rm-block-main > .rm-block__input,
html.rw-on[data-rw-mode="typora"] .roam-article .rm-heading-level-2 > .rm-block-main > .rm-autocomplete__wrapper {
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
  margin-bottom: 0.4em;
}

/* ---------- 背景 ---------- */
html.rw-on.rw-bg .roam-body,
html.rw-on.rw-bg .roam-main,
html.rw-on.rw-bg .roam-body-main,
html.rw-on.rw-bg .rm-article-wrapper,
html.rw-on.rw-bg .rm-topbar {
  background: var(--rw-bg) !important;
}
html.rw-on[data-rw-mode="night"] .roam-article .rm-title-display,
html.rw-on[data-rw-mode="night"] .rm-topbar .bp3-icon {
  color: var(--rw-fg) !important;
}
html.rw-on[data-rw-mode="night"] .roam-article .rm-bullet__inner {
  background-color: #777 !important;
}

/* ---------- 沉浸：顶栏淡出、隐藏引用 ----------
   侧栏不再用 CSS 藏：进入时通过 roamAlphaAPI 真正关掉（见 index.ts），
   写作中用户主动 Shift+点击打开的侧栏照常显示。 */
html.rw-on.rw-immersive .rm-topbar {
  opacity: 0;
  transition: opacity 200ms ease;
}
html.rw-on.rw-immersive .rm-topbar:hover,
html.rw-on.rw-immersive .rm-topbar:focus-within {
  opacity: 1;
}
html.rw-on.rw-immersive .roam-article .rm-reference-main {
  display: none !important;
}

/* ---------- bullet 与缩进线：悬停才显示 ---------- */
html.rw-on.rw-hide-bullets .roam-article .rm-block-main > .controls {
  opacity: 0;
  transition: opacity 150ms ease;
}
html.rw-on.rw-hide-bullets .roam-article .rm-block-main:hover > .controls {
  opacity: 1;
}
html.rw-on.rw-hide-bullets .roam-article .rm-multibar {
  opacity: 0;
}
html.rw-on.rw-hide-bullets .roam-article .rm-block-children:hover > .rm-multibar {
  opacity: 0.6;
}

/* ---------- 聚焦：只在有 block 处于编辑态时淡化其余内容 ---------- */
html.rw-on.rw-focus .roam-article .rm-block-main,
html.rw-on.rw-focus .roam-article .rm-title-display {
  transition: opacity 200ms ease;
}
/* 只淡化"不包含编辑框"的行：opacity 会叠乘，若淡化了 embed 的宿主行，
   里面正在编辑的块再设 opacity:1 也救不回来 */
html.rw-on.rw-focus .roam-article:has(textarea.rm-block-input) .rm-block-main:not(:has(textarea.rm-block-input)),
html.rw-on.rw-focus .roam-article:has(textarea.rm-block-input) .rm-title-display:not(:has(textarea)) {
  opacity: 0.25;
}

/* ---------- 打字机：顶部留白，让开头几行也能停在屏幕中部 ---------- */
html.rw-on.rw-typewriter .roam-article {
  padding-top: 40vh !important;
  padding-bottom: 55vh !important;
}

/* ---------- 顶栏模式菜单 ---------- */
#roam-writer-menu {
  position: fixed; z-index: 100001; min-width: 160px; margin: 0;
}
#roam-writer-menu .rw-icon-blank { display: inline-block; width: 16px; height: 16px; }

/* ---------- 切换提示 ---------- */
#roam-writer-toast {
  position: fixed; left: 50%; bottom: 32px; transform: translateX(-50%);
  background: rgba(30, 30, 30, 0.88); color: #fff;
  padding: 6px 14px; border-radius: 6px; font-size: 13px;
  z-index: 100000; pointer-events: none;
  opacity: 0; transition: opacity 200ms ease;
}
#roam-writer-toast.show { opacity: 1; }
`;
