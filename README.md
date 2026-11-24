# Writer

Immersive writing modes for Roam Research.

## Why

Roam reserves a ~140px dead zone on the right of every block (`.rm-block-separator` has `min-width: 116px`, plus a 24px trailing slot), and caps the article at 800px via `.rm-article-wrapper` padding. Text never reaches the right edge of the column, so the page feels lopsided. Writer removes that dead zone and lets you pick a writing style.

## Modes

| Mode | Look | Focus | Typewriter | Immersive |
| --- | --- | --- | --- | --- |
| **Clean** | Roam as-is, just the dead zone removed and the column centered | – | – | – |
| **iA Writer** | Monospace (iA Writer Duo → IBM Plex Mono → SF Mono), ~66 chars per line, blue caret | ✓ | ✓ | ✓ |
| **Typora** | Sans-serif, GitHub-style headings with underlines, wide column | – | – | ✓ |
| **Paper** | Serif / Songti, warm paper background, large type | ✓ | – | ✓ |
| **Night** | Dark iA style | ✓ | ✓ | ✓ |

- **Focus**: while editing, every block except the current one is dimmed. This works per block (paragraph), not per sentence: Roam's editor is a plain textarea, so a single sentence can't be highlighted.
- **Typewriter**: the line with the caret (not the whole block) stays at ~45% of the screen height.
- **Immersive**: closes any open left/right sidebar when you enter it (and reopens them when you leave), hides linked references, and fades the top bar until hovered. A sidebar you open on purpose while writing (Shift+click) stays visible.
- **Hide bullets**: bullets and indent guides show on hover only, so collapse, drag and zoom still work.

You can override each feature, plus font size and line width, in Settings → Writer.

## Usage

- Command Palette: `Writer: Toggle writing mode`, `Writer: Next mode`, `Writer: <Mode> mode`
- Top bar ✎ button: click to open the mode menu (Off / Clean / iA Writer / Typora / Paper / Night), pick one to switch; Esc or click outside to close
- Hotkeys: none by default. Bind the commands in Settings → Hotkeys.

## Known limitations

- Relies on Roam's DOM class names, which aren't a public API and may change with Roam updates.
- Night mode only recolors background, text and title. Content-level styles (highlights, blockquotes, code blocks, custom roam/css themes) keep their own colors.
- Writer only restyles the page; it never reads or writes your graph data.

## Develop

```bash
npm install
npm run dev    # watch build → extension.js
npm run build
```

Load it in Roam via Settings → Roam Depot → Developer mode → load the `writer` folder.
