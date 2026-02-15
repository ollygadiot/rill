import type BpmnViewer from "bpmn-js/lib/Viewer";

type Viewer = InstanceType<typeof BpmnViewer>;

interface ExtensionValue {
  $type: string;
  $body?: string;
  $children?: ExtensionValue[];
  name?: string;
  source?: string;
  sourceExpression?: string;
  target?: string;
  id?: string;
  type?: string;
  required?: string;
  direction?: string;
  [key: string]: unknown;
}

interface BusinessObject {
  $type: string;
  id: string;
  name?: string;
  default?: { id: string };
  attachedToRef?: { id: string; name?: string };
  scriptFormat?: string;
  calledElement?: string;
  $attrs?: Record<string, string>;
  extensionElements?: { values: ExtensionValue[] };
  eventDefinitions?: Array<{
    $type: string;
    timeDuration?: { body: string };
    timeCycle?: { body: string };
    timeDate?: { body: string };
    errorRef?: { errorCode: string; name?: string };
  }>;
}

interface BpmnElement {
  id: string;
  type: string;
  businessObject: BusinessObject;
  waypoints?: unknown;
}

interface HoverEvent {
  element: BpmnElement;
  gfx: SVGElement;
}

const TYPE_LABELS: Record<string, string> = {
  "bpmn:StartEvent": "Start Event",
  "bpmn:EndEvent": "End Event",
  "bpmn:ServiceTask": "Service Task",
  "bpmn:UserTask": "User Task",
  "bpmn:ScriptTask": "Script Task",
  "bpmn:ExclusiveGateway": "Exclusive Gateway",
  "bpmn:ParallelGateway": "Parallel Gateway",
  "bpmn:BoundaryEvent": "Boundary Event",
  "bpmn:IntermediateCatchEvent": "Intermediate Catch Event",
  "bpmn:SubProcess": "Sub Process",
  "bpmn:CallActivity": "Call Activity",
};

function esc(text: string): string {
  const el = document.createElement("span");
  el.textContent = text;
  return el.innerHTML;
}

function buildTooltipHtml(element: BpmnElement): string {
  const bo = element.businessObject;
  const typeName = TYPE_LABELS[element.type] ?? element.type.replace("bpmn:", "");
  const name = bo.name ?? bo.id;
  const attrs = bo.$attrs ?? {};

  let html = `<div class="rill-tooltip">`;
  html += `<div class="rill-tooltip-header">${esc(typeName)}</div>`;
  html += `<div class="rill-tooltip-name">${esc(name)}</div>`;

  // Type-specific properties
  const props: string[] = [];

  const delegate = attrs["flowable:delegateExpression"];
  const cls = attrs["flowable:class"];
  const assignee = attrs["flowable:assignee"];
  const candidateGroups = attrs["flowable:candidateGroups"];
  const formKey = attrs["flowable:formKey"];

  if (delegate) props.push(`delegate: ${delegate}`);
  if (cls) props.push(`class: ${cls}`);
  if (assignee) props.push(`assignee: ${assignee}`);
  if (candidateGroups) props.push(`candidates: ${candidateGroups}`);
  if (formKey) props.push(`form: ${formKey}`);
  if (bo.scriptFormat) props.push(`script: ${bo.scriptFormat}`);
  if (bo.calledElement) props.push(`calls: ${bo.calledElement}`);

  if (bo.default) {
    props.push(`default: ${bo.default.id}`);
  }

  if (bo.attachedToRef) {
    props.push(`on: ${bo.attachedToRef.name ?? bo.attachedToRef.id}`);
  }

  // Event definitions (timer, error)
  if (bo.eventDefinitions) {
    for (const ed of bo.eventDefinitions) {
      if (ed.$type === "bpmn:TimerEventDefinition") {
        const val = ed.timeDuration?.body ?? ed.timeCycle?.body ?? ed.timeDate?.body;
        if (val) props.push(`timer: ${val}`);
      }
      if (ed.$type === "bpmn:ErrorEventDefinition") {
        const code = ed.errorRef?.errorCode ?? ed.errorRef?.name;
        if (code) props.push(`error: ${code}`);
      }
    }
  }

  if (props.length > 0) {
    html += `<div class="rill-tooltip-props">`;
    for (const p of props) {
      html += `<div class="rill-tooltip-prop">${esc(p)}</div>`;
    }
    html += `</div>`;
  }

  // Extension elements: fields, variable mappings, form properties
  const extValues = bo.extensionElements?.values ?? [];

  // Service task fields
  const fields = extValues.filter((v) => v.$type === "flowable:field");
  if (fields.length > 0) {
    html += `<div class="rill-tooltip-section">`;
    html += `<div class="rill-tooltip-label">Fields</div>`;
    for (const f of fields) {
      const child = f.$children?.[0];
      const val = child?.$body ?? "";
      const kind = child?.$type === "flowable:expression" ? "expr" : "str";
      html += `<div class="rill-tooltip-flow">${esc(f.name ?? "?")} <span class="rill-tooltip-cond">${esc(val)}</span> <span class="rill-tooltip-kind">${kind}</span></div>`;
    }
    html += `</div>`;
  }

  // Call activity input mappings
  const inMappings = extValues.filter((v) => v.$type === "flowable:in");
  if (inMappings.length > 0) {
    html += `<div class="rill-tooltip-section">`;
    html += `<div class="rill-tooltip-label">In</div>`;
    for (const m of inMappings) {
      const src = m.sourceExpression ?? m.source ?? "?";
      html += `<div class="rill-tooltip-flow">${esc(m.target ?? "?")} \u2190 <span class="rill-tooltip-cond">${esc(src)}</span></div>`;
    }
    html += `</div>`;
  }

  // Call activity output mappings
  const outMappings = extValues.filter((v) => v.$type === "flowable:out");
  if (outMappings.length > 0) {
    html += `<div class="rill-tooltip-section">`;
    html += `<div class="rill-tooltip-label">Out</div>`;
    for (const m of outMappings) {
      html += `<div class="rill-tooltip-flow">${esc(m.target ?? "?")} \u2190 <span class="rill-tooltip-cond">${esc(m.source ?? "?")}</span></div>`;
    }
    html += `</div>`;
  }

  // Rill variable declarations
  const rillVars = extValues.filter((v) => v.$type === "rill:var");
  const inVars = rillVars.filter((v) => v.direction === "in");
  const outVars = rillVars.filter((v) => v.direction === "out");

  if (inVars.length > 0) {
    html += `<div class="rill-tooltip-section">`;
    html += `<div class="rill-tooltip-label">Inputs</div>`;
    for (const v of inVars) {
      html += `<div class="rill-tooltip-flow">${esc(v.name ?? "?")} <span class="rill-tooltip-kind">${esc(v.type ?? "")}</span></div>`;
    }
    html += `</div>`;
  }

  if (outVars.length > 0) {
    html += `<div class="rill-tooltip-section">`;
    html += `<div class="rill-tooltip-label">Outputs</div>`;
    for (const v of outVars) {
      html += `<div class="rill-tooltip-flow">${esc(v.name ?? "?")} <span class="rill-tooltip-kind">${esc(v.type ?? "")}</span></div>`;
    }
    html += `</div>`;
  }

  // User task form properties
  const formProps = extValues.filter((v) => v.$type === "flowable:formProperty");
  if (formProps.length > 0) {
    html += `<div class="rill-tooltip-section">`;
    html += `<div class="rill-tooltip-label">Form</div>`;
    for (const f of formProps) {
      const req = f.required === "true" ? "*" : "";
      html += `<div class="rill-tooltip-flow">${esc(f.name ?? f.id ?? "?")} <span class="rill-tooltip-kind">${esc(f.type ?? "")}</span>${req ? ` <span class="rill-tooltip-required">${req}</span>` : ""}</div>`;
    }
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

export function initTooltips(viewer: Viewer): void {
  const eventBus = viewer.get("eventBus") as {
    on(event: string, callback: (e: HoverEvent) => void): void;
  };
  const overlays = viewer.get("overlays") as {
    add(element: string, type: string, attrs: { position: Record<string, number>; html: string; show?: Record<string, number> }): string;
    remove(filter: { element: string; type: string }): void;
  };

  eventBus.on("element.hover", (e: HoverEvent) => {
    const { element, gfx } = e;

    // Skip the root process and connections (flows)
    if (element.type === "bpmn:Process" || element.waypoints) return;

    gfx.classList.add("rill-highlight");

    const html = buildTooltipHtml(element);

    overlays.add(element.id, "tooltip", {
      position: { bottom: 10, left: 0 },
      html,
      show: { minZoom: 0.3, maxZoom: 10 },
    });
  });

  eventBus.on("element.out", (e: HoverEvent) => {
    const { element, gfx } = e;

    if (element.type === "bpmn:Process" || element.waypoints) return;

    gfx.classList.remove("rill-highlight");

    overlays.remove({ element: element.id, type: "tooltip" });
  });
}
