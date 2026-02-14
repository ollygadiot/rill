import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import { createEditor } from "./editor";
import { execute } from "./executor";
import { initRenderer, renderDiagram } from "./renderer";
import { debounce } from "./debounce";
import { EXAMPLES, EXAMPLE_KEYS } from "./examples";

const editorPanel = document.getElementById("editor-panel")!;
const diagramPanel = document.getElementById("diagram-panel")!;
const errorPanel = document.getElementById("error-panel")!;
const statusEl = document.getElementById("status")!;
const exampleSelect = document.getElementById("example-select") as HTMLSelectElement;

function setStatus(text: string, kind: "ok" | "error" | "running") {
  statusEl.textContent = text;
  statusEl.className = `status ${kind}`;
}

function showError(message: string) {
  errorPanel.textContent = message;
  errorPanel.classList.remove("hidden");
  setStatus("Error", "error");
}

function hideError() {
  errorPanel.classList.add("hidden");
}

async function update(code: string) {
  setStatus("Updating...", "running");

  const { xml, error } = execute(code);

  if (error) {
    showError(error);
    return;
  }

  try {
    await renderDiagram(xml!);
    hideError();
    setStatus("Ready", "ok");
  } catch (err) {
    showError(
      `Render error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// Populate example selector
for (const key of EXAMPLE_KEYS) {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = EXAMPLES[key].label;
  exampleSelect.appendChild(option);
}

// Panel resizer
const divider = document.getElementById("divider")!;
divider.addEventListener("mousedown", (e) => {
  e.preventDefault();
  const panels = document.getElementById("panels")!;

  const onMouseMove = (e: MouseEvent) => {
    const rect = panels.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.min(Math.max(pct, 20), 80);
    editorPanel.style.flex = `0 0 ${clamped}%`;
    diagramPanel.style.flex = `1`;
  };

  const onMouseUp = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
});

// Initialize
initRenderer(diagramPanel);

const debouncedUpdate = debounce(
  (code: string) => { update(code); },
  500,
);

const editor = createEditor(editorPanel, (code) => {
  debouncedUpdate(code);
});

// Switch example when select changes
exampleSelect.addEventListener("change", () => {
  const code = EXAMPLES[exampleSelect.value].code;
  editor.setValue(code);
  update(code);
});

// Run once on load with the default example
update(editor.getValue());
