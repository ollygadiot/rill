# Playground

A browser-based environment for writing rill code and seeing the BPMN diagram update in real time. No backend required -- everything runs in the browser.

## Quick start

```bash
cd playground
npm install
npm run dev
```

Or from the project root:

```bash
npm run playground
```

Vite opens the playground in your default browser. The left panel is a Monaco code editor; the right panel renders the BPMN diagram.

## How it works

1. You type TypeScript in the Monaco editor (left panel).
2. After 500ms of inactivity, the code is transpiled from TypeScript to JavaScript using Sucrase (in-browser, no build step).
3. The transpiled code runs inside a sandboxed `new Function()` with a `require` shim that maps `"rill"` to the real library.
4. The `toBpmn()` call is intercepted to capture the generated XML.
5. dagre computes a left-to-right hierarchical layout and injects `BPMNDiagram` / `BPMNShape` / `BPMNEdge` elements into the XML.
6. bpmn-js renders the final diagram as SVG in the right panel.
7. Errors (syntax, runtime, or validation) appear in a red panel at the bottom.

## Features

- **Full IntelliSense** -- Monaco is configured with the complete DSL type declarations, so you get autocomplete, parameter hints, and type checking as you type.
- **Live reload** -- Changes are reflected in the diagram after a 500ms debounce. No manual "Run" button needed.
- **Resizable panels** -- Drag the divider between editor and diagram to adjust the split.
- **Status indicator** -- The toolbar shows "Ready", "Updating...", or "Error" depending on the current state.
- **Zero backend** -- The Vite config aliases `"rill"` to `../src/index.ts`, so the library source is compiled on-the-fly by Vite. No need to build or publish the library first.

## Writing code in the playground

The editor expects the same TypeScript you would write in a normal project. Import from `"rill"`, define a process, and call `toBpmn()` at the end:

```typescript
import { process, toBpmn } from "rill";

const myProcess = process("my-process", (p) => {
  const start = p.start("begin");
  const task = p.service("doWork", {
    delegate: "${myDelegate}",
  });
  const end = p.end("finish");

  p.pipe(start, task, end);
});

toBpmn(myProcess);
```

The playground captures the output of the last `toBpmn()` call and renders it. If your code does not call `toBpmn()`, the playground displays an error asking you to add it.

Only `"rill"` is available as an import. Attempting to require any other module throws an error.

## Architecture

```
playground/
  index.html       -- Shell: toolbar, panels, error bar
  styles.css       -- Layout and styling
  src/
    main.ts        -- Bootstrap; wires editor, executor, renderer, and panel resizer
    editor.ts      -- Monaco editor with TypeScript mode and DSL type declarations
    executor.ts    -- Sucrase transpilation + sandboxed execution with require shim
    renderer.ts    -- dagre layout computation + bpmn-js SVG rendering
    debounce.ts    -- Simple debounce utility
    examples.ts    -- Example processes shown on load
    dsl-types.ts   -- Full DSL type declarations fed to Monaco for IntelliSense
```

### Key modules

**executor.ts** strips TypeScript types with Sucrase, then evaluates the resulting JavaScript using `new Function("require", "exports", code)`. The `require` shim provides the real rill exports, with `toBpmn` wrapped to capture its output.

**renderer.ts** parses the raw BPMN XML (which has no layout information), builds a dagre graph with left-to-right rank direction, computes positions for all elements, and injects `BPMNDiagram` XML elements before passing the result to the bpmn-js `Viewer`. Boundary events are positioned manually on the bottom edge of their attached task rather than being part of the dagre graph.

**editor.ts** creates a Monaco editor with dark theme, TypeScript language mode, and the DSL's type declarations loaded as an extra lib. This gives the user autocomplete and inline type errors without any build tooling.

## Dependencies

| Package | Purpose |
|---------|---------|
| `monaco-editor` | Code editor with TypeScript IntelliSense |
| `bpmn-js` | BPMN 2.0 diagram rendering |
| `dagre` | Directed graph layout (left-to-right) |
| `sucrase` | Fast TypeScript-to-JavaScript transpilation |
| `vite` | Dev server with hot module replacement |

## Building for production

```bash
cd playground
npm run build
```

The output goes to `playground/dist/`. Serve it with any static file server:

```bash
npm run preview
```
