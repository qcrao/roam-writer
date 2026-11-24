// 写作模式定义：每个模式 = 一组排版变量 + 三个功能开关的默认值。
// 排版变量最终写到 <html> 的 CSS 自定义属性上，styles.ts 里只引用变量，不按模式重复写样式。

export interface Typography {
  font: string;
  size: string; // 正文字号
  lineHeight: string;
  width: string; // 正文列最大宽度
  paragraphGap: string; // block 之间的额外间距
  bg?: string; // 不设则沿用 Roam / 主题背景
  fg?: string;
  caret?: string;
  heading?: string; // 标题字体（不设则同正文）
}

export interface ModeDef {
  id: ModeId;
  label: string;
  description: string;
  typography: Typography | null; // null = 不改字体（Clean 模式）
  immersive: boolean; // 隐藏侧栏 / 顶栏淡出 / 隐藏引用
  focus: boolean; // 淡化非编辑中的 block
  typewriter: boolean; // 光标行保持在屏幕中部
  hideBullets: boolean; // bullet 与缩进线默认隐藏，悬停显示
}

export type ModeId = "clean" | "ia" | "typora" | "paper" | "night";

const CJK_SANS = `"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei"`;
const CJK_SERIF = `"Songti SC", "STSong", "Noto Serif CJK SC", "Source Han Serif SC", serif`;

export const MODES: ModeDef[] = [
  {
    id: "clean",
    label: "Clean",
    description: "Roam as-is, minus the right-side dead zone; centered column",
    typography: null,
    immersive: false,
    focus: false,
    typewriter: false,
    hideBullets: false,
  },
  {
    id: "ia",
    label: "iA Writer",
    description: "Monospace, ~66 chars per line, paragraph focus, typewriter scrolling",
    typography: {
      font: `"iA Writer Duo S", "iA Writer Duo", "IBM Plex Mono", "SF Mono", Menlo, ${CJK_SANS}, monospace`,
      size: "17px",
      lineHeight: "1.75",
      width: "calc(var(--rw-size) * 40)",
      paragraphGap: "0.5em",
      bg: "#f9f9f8",
      fg: "#1a1a1a",
      caret: "#19a3e8",
    },
    immersive: true,
    focus: true,
    typewriter: true,
    hideBullets: true,
  },
  {
    id: "typora",
    label: "Typora",
    description: "Clean sans-serif with GitHub-style headings, distraction-free",
    typography: {
      font: `"Open Sans", "Clear Sans", "Helvetica Neue", Helvetica, Arial, ${CJK_SANS}, sans-serif`,
      size: "16px",
      lineHeight: "1.7",
      width: "860px",
      paragraphGap: "0.6em",
      fg: "#333",
      caret: "#333",
    },
    immersive: true,
    focus: false,
    typewriter: false,
    hideBullets: true,
  },
  {
    id: "paper",
    label: "Paper",
    description: "Serif type on warm paper, larger text for long-form writing",
    typography: {
      font: `"Iowan Old Style", "Source Serif Pro", Georgia, ${CJK_SERIF}`,
      size: "19px",
      lineHeight: "1.85",
      width: "calc(var(--rw-size) * 36)",
      paragraphGap: "0.7em",
      bg: "#f7f3ea",
      fg: "#2b2620",
      caret: "#b5562b",
    },
    immersive: true,
    focus: true,
    typewriter: false,
    hideBullets: true,
  },
  {
    id: "night",
    label: "Night",
    description: "Dark iA-style theme for writing at night",
    typography: {
      font: `"iA Writer Duo S", "iA Writer Duo", "IBM Plex Mono", "SF Mono", Menlo, ${CJK_SANS}, monospace`,
      size: "17px",
      lineHeight: "1.75",
      width: "calc(var(--rw-size) * 40)",
      paragraphGap: "0.5em",
      bg: "#1c1d1f",
      fg: "#d6d6d3",
      caret: "#19a3e8",
    },
    immersive: true,
    focus: true,
    typewriter: true,
    hideBullets: true,
  },
];

export function getMode(id: string): ModeDef {
  return MODES.find((m) => m.id === id || m.label === id) || MODES[0];
}
