import { isExpression } from "../helpers.js";
import type { ProcessDefinition } from "../model/process-definition.js";
import type {
	AnyElement,
	BoundaryEvent,
	CallActivity,
	ExclusiveGateway,
	FieldDefinition,
	IntermediateCatchEvent,
	ScriptTask,
	SequenceFlow,
	ServiceTask,
	SubProcess,
	TimerDefinition,
	UserTask,
	VariableMapping,
} from "../types/elements.js";
import { NS } from "./namespaces.js";
import { XmlWriter } from "./xml-writer.js";

export function toBpmn(definition: ProcessDefinition): string {
	const w = new XmlWriter();

	w.declaration();
	w.open("definitions", {
		xmlns: NS.bpmn,
		"xmlns:xsi": NS.xsi,
		"xmlns:xsd": NS.xsd,
		"xmlns:flowable": NS.flowable,
		"xmlns:bpmndi": NS.bpmndi,
		"xmlns:omgdc": NS.omgdc,
		"xmlns:omgdi": NS.omgdi,
		targetNamespace: "http://flowable.org/test",
	});

	// Error definitions at definitions level
	for (const err of definition.errors) {
		w.selfClose("error", { id: err.id, errorCode: err.errorCode });
	}

	w.open("process", {
		id: definition.id,
		name: definition.name,
		isExecutable: String(definition.isExecutable),
	});

	writeElements(w, definition.elements);
	writeFlows(w, definition.flows);

	w.close("process");
	w.close("definitions");

	return w.toString();
}

function writeElements(w: XmlWriter, elements: readonly AnyElement[]): void {
	for (const el of elements) {
		switch (el.type) {
			case "startEvent":
				w.selfClose("startEvent", { id: el.id, name: el.name });
				break;

			case "endEvent":
				w.selfClose("endEvent", { id: el.id, name: el.name });
				break;

			case "serviceTask":
				writeServiceTask(w, el);
				break;

			case "scriptTask":
				writeScriptTask(w, el);
				break;

			case "userTask":
				writeUserTask(w, el);
				break;

			case "exclusiveGateway":
				writeExclusiveGateway(w, el);
				break;

			case "parallelGateway":
				w.selfClose("parallelGateway", { id: el.id, name: el.name });
				break;

			case "boundaryEvent":
				writeBoundaryEvent(w, el);
				break;

			case "intermediateCatchEvent":
				writeIntermediateCatchEvent(w, el);
				break;

			case "subProcess":
				writeSubProcess(w, el);
				break;

			case "callActivity":
				writeCallActivity(w, el);
				break;
		}
	}
}

function writeServiceTask(w: XmlWriter, el: ServiceTask): void {
	const attrs: Record<string, string | undefined> = {
		id: el.id,
		name: el.name,
	};
	if (el.delegateExpression) {
		attrs["flowable:delegateExpression"] = el.delegateExpression;
	}
	if (el.className) {
		attrs["flowable:class"] = el.className;
	}
	if (el.async) {
		attrs["flowable:async"] = "true";
	}

	if (el.fields.length === 0) {
		w.selfClose("serviceTask", attrs);
	} else {
		w.open("serviceTask", attrs);
		w.open("extensionElements");
		for (const field of el.fields) {
			writeField(w, field);
		}
		w.close("extensionElements");
		w.close("serviceTask");
	}
}

function writeField(w: XmlWriter, field: FieldDefinition): void {
	if (isExpression(field.value)) {
		w.open("flowable:field", { name: field.name });
		w.text("flowable:expression", field.value.value);
		w.close("flowable:field");
	} else {
		w.open("flowable:field", { name: field.name });
		w.text("flowable:string", field.value);
		w.close("flowable:field");
	}
}

function writeScriptTask(w: XmlWriter, el: ScriptTask): void {
	const attrs: Record<string, string | undefined> = {
		id: el.id,
		name: el.name,
		scriptFormat: el.scriptFormat,
	};
	if (el.autoStoreVariables) {
		attrs["flowable:autoStoreVariables"] = "true";
	}
	w.open("scriptTask", attrs);
	w.cdata("script", el.script);
	w.close("scriptTask");
}

function writeUserTask(w: XmlWriter, el: UserTask): void {
	const attrs: Record<string, string | undefined> = {
		id: el.id,
		name: el.name,
	};
	if (el.assignee) {
		attrs["flowable:assignee"] = el.assignee;
	}
	if (el.candidateGroups && el.candidateGroups.length > 0) {
		attrs["flowable:candidateGroups"] = el.candidateGroups.join(",");
	}
	if (el.formKey) {
		attrs["flowable:formKey"] = el.formKey;
	}

	if (el.formProperties.length === 0) {
		w.selfClose("userTask", attrs);
	} else {
		w.open("userTask", attrs);
		w.open("extensionElements");
		for (const prop of el.formProperties) {
			w.selfClose("flowable:formProperty", {
				id: prop.id,
				name: prop.name,
				type: prop.type,
				required: String(prop.required),
			});
		}
		w.close("extensionElements");
		w.close("userTask");
	}
}

function writeExclusiveGateway(w: XmlWriter, el: ExclusiveGateway): void {
	w.selfClose("exclusiveGateway", {
		id: el.id,
		name: el.name,
		default: el.defaultFlow,
	});
}

function writeBoundaryEvent(w: XmlWriter, el: BoundaryEvent): void {
	w.open("boundaryEvent", {
		id: el.id,
		attachedToRef: el.attachedToRef,
		cancelActivity: String(el.cancelActivity),
	});

	if (el.timer) {
		writeTimerEventDefinition(w, el.timer);
	}

	if (el.errorRef) {
		w.selfClose("errorEventDefinition", { errorRef: el.errorRef });
	}

	w.close("boundaryEvent");
}

function writeIntermediateCatchEvent(w: XmlWriter, el: IntermediateCatchEvent): void {
	w.open("intermediateCatchEvent", {
		id: el.id,
		name: el.name,
	});

	if (el.timer) {
		writeTimerEventDefinition(w, el.timer);
	}

	w.close("intermediateCatchEvent");
}

function writeTimerEventDefinition(w: XmlWriter, timer: TimerDefinition): void {
	w.open("timerEventDefinition");
	const tagName =
		timer.type === "duration" ? "timeDuration" : timer.type === "date" ? "timeDate" : "timeCycle";
	w.text(tagName, timer.value);
	w.close("timerEventDefinition");
}

function writeSubProcess(w: XmlWriter, el: SubProcess): void {
	w.open("subProcess", { id: el.id, name: el.name });
	writeElements(w, el.elements);
	writeFlows(w, el.flows);
	w.close("subProcess");
}

function writeCallActivity(w: XmlWriter, el: CallActivity): void {
	const attrs: Record<string, string | undefined> = {
		id: el.id,
		name: el.name,
		calledElement: el.calledElement,
	};
	if (el.inheritVariables) {
		attrs["flowable:inheritVariables"] = "true";
	}

	const hasExtensions = el.in.length > 0 || el.out.length > 0;
	if (!hasExtensions) {
		w.selfClose("callActivity", attrs);
	} else {
		w.open("callActivity", attrs);
		w.open("extensionElements");
		for (const mapping of el.in) {
			writeVariableMapping(w, "flowable:in", mapping);
		}
		for (const mapping of el.out) {
			writeVariableMapping(w, "flowable:out", mapping);
		}
		w.close("extensionElements");
		w.close("callActivity");
	}
}

function writeVariableMapping(w: XmlWriter, tag: string, mapping: VariableMapping): void {
	const attrs: Record<string, string | undefined> = {
		target: mapping.target,
	};
	if (mapping.sourceExpression) {
		attrs.sourceExpression = mapping.sourceExpression;
	} else if (mapping.source) {
		attrs.source = mapping.source;
	}
	w.selfClose(tag, attrs);
}

function writeFlows(w: XmlWriter, flows: readonly SequenceFlow[]): void {
	for (const flow of flows) {
		const attrs: Record<string, string | undefined> = {
			id: flow.id,
			name: flow.name,
			sourceRef: flow.sourceRef,
			targetRef: flow.targetRef,
		};
		if (flow.condition) {
			w.open("sequenceFlow", attrs);
			w.cdata("conditionExpression", flow.condition, {
				"xsi:type": "tFormalExpression",
			});
			w.close("sequenceFlow");
		} else {
			w.selfClose("sequenceFlow", attrs);
		}
	}
}
