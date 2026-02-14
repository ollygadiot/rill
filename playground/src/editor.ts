import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import { DSL_TYPE_DECLARATIONS } from "./dsl-types";
import { EXAMPLES, DEFAULT_KEY } from "./examples";

// Configure Monaco workers
self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === "typescript" || label === "javascript") {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

export function createEditor(
  container: HTMLElement,
  onChange: (code: string) => void,
): monaco.editor.IStandaloneCodeEditor {
  // Add DSL type declarations for autocomplete
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2022,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution:
      monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    strict: true,
  });

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    DSL_TYPE_DECLARATIONS,
    "file:///node_modules/rill/index.d.ts",
  );

  const editor = monaco.editor.create(container, {
    value: EXAMPLES[DEFAULT_KEY].code,
    language: "typescript",
    theme: "vs-dark",
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: "on",
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    padding: { top: 12 },
  });

  editor.onDidChangeModelContent(() => {
    onChange(editor.getValue());
  });

  return editor;
}
