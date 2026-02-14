import BpmnViewer from "bpmn-js/lib/Viewer";
import dagre from "dagre";

let viewer: InstanceType<typeof BpmnViewer> | null = null;

export function initRenderer(container: HTMLElement): void {
  viewer = new BpmnViewer({ container });
}

export async function renderDiagram(xml: string): Promise<void> {
  if (!viewer) throw new Error("Renderer not initialized");

  const layoutedXml = layoutWithDagre(xml);
  await viewer.importXML(layoutedXml);

  const canvas = viewer.get("canvas") as {
    zoom(action: string): void;
    viewbox(): { x: number; y: number; width: number; height: number; inner: { x: number; y: number; width: number; height: number } };
    viewbox(box: { x: number; y: number; width: number; height: number }): void;
  };
  canvas.zoom("fit-viewport");

  // Center the diagram vertically within the viewport
  const vb = canvas.viewbox();
  const contentH = vb.inner.height;
  const viewH = vb.height;
  if (contentH < viewH) {
    const offsetY = vb.inner.y - (viewH - contentH) / 2;
    canvas.viewbox({ ...vb, y: offsetY });
  }
}

// --- Element sizes ---

const EVENT_SIZE = { w: 36, h: 36 };
const TASK_SIZE = { w: 100, h: 80 };
const GATEWAY_SIZE = { w: 50, h: 50 };

type ElementType =
  | "startEvent"
  | "endEvent"
  | "serviceTask"
  | "userTask"
  | "scriptTask"
  | "exclusiveGateway"
  | "parallelGateway"
  | "boundaryEvent"
  | "intermediateCatchEvent"
  | "subProcess"
  | "callActivity";

const ELEMENT_TAGS: ElementType[] = [
  "startEvent",
  "endEvent",
  "serviceTask",
  "userTask",
  "scriptTask",
  "exclusiveGateway",
  "parallelGateway",
  "boundaryEvent",
  "intermediateCatchEvent",
  "subProcess",
  "callActivity",
];

function sizeFor(type: ElementType): { w: number; h: number } {
  switch (type) {
    case "startEvent":
    case "endEvent":
    case "intermediateCatchEvent":
      return EVENT_SIZE;
    case "exclusiveGateway":
    case "parallelGateway":
      return GATEWAY_SIZE;
    case "boundaryEvent":
      return EVENT_SIZE;
    default:
      return TASK_SIZE;
  }
}

// --- XML namespaces ---

const BPMN = "http://www.omg.org/spec/BPMN/20100524/MODEL";
const DI = "http://www.omg.org/spec/BPMN/20100524/DI";
const DC = "http://www.omg.org/spec/DD/20100524/DC";
const OMGDI = "http://www.omg.org/spec/DD/20100524/DI";

interface BpmnElement {
  id: string;
  type: ElementType;
  attachedToRef?: string;
}

interface BpmnFlow {
  id: string;
  sourceRef: string;
  targetRef: string;
}

/**
 * Parse raw BPMN XML, compute a left-to-right dagre layout,
 * and inject BPMNDiagram with shapes and edges.
 */
function layoutWithDagre(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, "application/xml");

  // 1. Extract elements and flows from the <process>
  const elements: BpmnElement[] = [];
  const flows: BpmnFlow[] = [];
  const boundaryEvents: BpmnElement[] = [];

  const processEl = doc.getElementsByTagNameNS(BPMN, "process")[0];
  if (!processEl) return xml;
  const processId = processEl.getAttribute("id") ?? "process";

  for (const tag of ELEMENT_TAGS) {
    const nodes = processEl.getElementsByTagNameNS(BPMN, tag);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const id = node.getAttribute("id");
      if (!id) continue;
      const el: BpmnElement = { id, type: tag };
      if (tag === "boundaryEvent") {
        el.attachedToRef = node.getAttribute("attachedToRef") ?? undefined;
        boundaryEvents.push(el);
      }
      elements.push(el);
    }
  }

  const flowNodes = processEl.getElementsByTagNameNS(BPMN, "sequenceFlow");
  for (let i = 0; i < flowNodes.length; i++) {
    const node = flowNodes[i];
    const id = node.getAttribute("id");
    const src = node.getAttribute("sourceRef");
    const tgt = node.getAttribute("targetRef");
    if (id && src && tgt) flows.push({ id, sourceRef: src, targetRef: tgt });
  }

  // 2. Build dagre graph (LR = left-to-right)
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 80, marginx: 30, marginy: 30 });
  g.setDefaultEdgeLabel(() => ({}));

  const boundaryIds = new Set(boundaryEvents.map((b) => b.id));

  for (const el of elements) {
    // Skip boundary events from dagre — we position them manually
    if (boundaryIds.has(el.id)) continue;
    const size = sizeFor(el.type);
    g.setNode(el.id, { width: size.w, height: size.h });
  }

  for (const flow of flows) {
    // Skip edges from/to boundary events in dagre
    if (boundaryIds.has(flow.sourceRef) || boundaryIds.has(flow.targetRef)) continue;
    g.setEdge(flow.sourceRef, flow.targetRef, { id: flow.id });
  }

  dagre.layout(g);

  // 3. Collect positioned nodes
  const positions = new Map<string, { x: number; y: number; w: number; h: number }>();
  for (const nodeId of g.nodes()) {
    const node = g.node(nodeId);
    if (!node) continue;
    // dagre gives center coords; convert to top-left for BPMN bounds
    positions.set(nodeId, {
      x: node.x - node.width / 2,
      y: node.y - node.height / 2,
      w: node.width,
      h: node.height,
    });
  }

  // Position boundary events on the bottom edge of their attached task
  for (const bev of boundaryEvents) {
    if (!bev.attachedToRef) continue;
    const parent = positions.get(bev.attachedToRef);
    if (!parent) continue;
    const size = sizeFor("boundaryEvent");
    positions.set(bev.id, {
      x: parent.x + parent.w / 2 - size.w / 2,
      y: parent.y + parent.h - size.h / 2,
      w: size.w,
      h: size.h,
    });
  }

  // 4. Remove any existing BPMNDiagram
  const existingDiagrams = doc.getElementsByTagNameNS(DI, "BPMNDiagram");
  while (existingDiagrams.length > 0) {
    existingDiagrams[0].parentNode?.removeChild(existingDiagrams[0]);
  }

  // 5. Build new BPMNDiagram
  const definitions = doc.documentElement;

  // Ensure namespace prefixes are declared
  definitions.setAttribute("xmlns:bpmndi", DI);
  definitions.setAttribute("xmlns:omgdc", DC);
  definitions.setAttribute("xmlns:omgdi", OMGDI);

  const diagram = doc.createElementNS(DI, "bpmndi:BPMNDiagram");
  diagram.setAttribute("id", `BPMNDiagram_${processId}`);

  const plane = doc.createElementNS(DI, "bpmndi:BPMNPlane");
  plane.setAttribute("id", `BPMNPlane_${processId}`);
  plane.setAttribute("bpmnElement", processId);
  diagram.appendChild(plane);

  // Add shapes
  for (const el of elements) {
    const pos = positions.get(el.id);
    if (!pos) continue;

    const shape = doc.createElementNS(DI, "bpmndi:BPMNShape");
    shape.setAttribute("id", `${el.id}_di`);
    shape.setAttribute("bpmnElement", el.id);
    if (el.type === "exclusiveGateway") {
      shape.setAttribute("isMarkerVisible", "true");
    }

    const bounds = doc.createElementNS(DC, "omgdc:Bounds");
    bounds.setAttribute("x", String(Math.round(pos.x)));
    bounds.setAttribute("y", String(Math.round(pos.y)));
    bounds.setAttribute("width", String(pos.w));
    bounds.setAttribute("height", String(pos.h));
    shape.appendChild(bounds);
    plane.appendChild(shape);
  }

  // Add edges — use dagre's edge points for non-boundary flows,
  // simple routing for boundary event flows
  for (const flow of flows) {
    const edge = doc.createElementNS(DI, "bpmndi:BPMNEdge");
    edge.setAttribute("id", `${flow.id}_di`);
    edge.setAttribute("bpmnElement", flow.id);

    const waypoints = computeEdgeWaypoints(flow, positions, boundaryIds, g);
    for (const [wx, wy] of waypoints) {
      const wp = doc.createElementNS(OMGDI, "omgdi:waypoint");
      wp.setAttribute("x", String(Math.round(wx)));
      wp.setAttribute("y", String(Math.round(wy)));
      edge.appendChild(wp);
    }

    plane.appendChild(edge);
  }

  definitions.appendChild(diagram);
  return new XMLSerializer().serializeToString(doc);
}

function computeEdgeWaypoints(
  flow: BpmnFlow,
  positions: Map<string, { x: number; y: number; w: number; h: number }>,
  boundaryIds: Set<string>,
  g: dagre.graphlib.Graph,
): [number, number][] {
  const src = positions.get(flow.sourceRef);
  const tgt = positions.get(flow.targetRef);
  if (!src || !tgt) return [];

  // For non-boundary flows, use dagre's computed edge points
  if (!boundaryIds.has(flow.sourceRef) && !boundaryIds.has(flow.targetRef)) {
    const dagreEdge = g.edge(flow.sourceRef, flow.targetRef);
    if (dagreEdge?.points) {
      return dagreEdge.points.map((p: { x: number; y: number }) => [p.x, p.y] as [number, number]);
    }
  }

  // For boundary event edges: connect from bottom of boundary to left of target
  const srcCx = src.x + src.w / 2;
  const srcBottom = src.y + src.h;
  const tgtLeft = tgt.x;
  const tgtCy = tgt.y + tgt.h / 2;

  // Route: down from boundary, then right to target
  return [
    [srcCx, srcBottom],
    [srcCx, tgtCy],
    [tgtLeft, tgtCy],
  ];
}
