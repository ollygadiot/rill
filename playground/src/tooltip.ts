import type BpmnViewer from "bpmn-js/lib/Viewer";

type Viewer = InstanceType<typeof BpmnViewer>;

interface BusinessObject {
  $type: string;
  id: string;
  name?: string;
  default?: { id: string };
  attachedToRef?: { id: string; name?: string };
  scriptFormat?: string;
  calledElement?: string;
  sourceRef?: { id: string; name?: string };
  targetRef?: { id: string; name?: string };
  conditionExpression?: { body: string };
  $attrs?: Record<string, string>;
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
  incoming?: Array<{ businessObject: BusinessObject }>;
  outgoing?: Array<{ businessObject: BusinessObject }>;
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

  // Inputs (incoming flows)
  if (element.incoming && element.incoming.length > 0) {
    html += `<div class="rill-tooltip-section">`;
    html += `<div class="rill-tooltip-label">Inputs</div>`;
    for (const conn of element.incoming) {
      const flow = conn.businessObject;
      const src = flow.sourceRef;
      const srcName = src?.name ?? src?.id ?? "?";
      const cond = flow.conditionExpression?.body;
      html += `<div class="rill-tooltip-flow">\u2190 ${esc(srcName)}`;
      if (cond) html += ` <span class="rill-tooltip-cond">${esc(cond)}</span>`;
      html += `</div>`;
    }
    html += `</div>`;
  }

  // Outputs (outgoing flows)
  if (element.outgoing && element.outgoing.length > 0) {
    html += `<div class="rill-tooltip-section">`;
    html += `<div class="rill-tooltip-label">Outputs</div>`;
    for (const conn of element.outgoing) {
      const flow = conn.businessObject;
      const tgt = flow.targetRef;
      const tgtName = tgt?.name ?? tgt?.id ?? "?";
      const cond = flow.conditionExpression?.body;
      html += `<div class="rill-tooltip-flow">\u2192 ${esc(tgtName)}`;
      if (cond) html += ` <span class="rill-tooltip-cond">${esc(cond)}</span>`;
      html += `</div>`;
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
