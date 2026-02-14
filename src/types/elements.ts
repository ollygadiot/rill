import type { Expression } from "../helpers.js";

export type ElementType =
	| "startEvent"
	| "endEvent"
	| "serviceTask"
	| "userTask"
	| "exclusiveGateway"
	| "parallelGateway"
	| "boundaryEvent"
	| "intermediateCatchEvent"
	| "subProcess"
	| "scriptTask"
	| "callActivity";

export type TimerType = "duration" | "date" | "cycle";

export interface FieldDefinition {
	name: string;
	value: string | Expression;
}

export interface FormProperty {
	id: string;
	name: string;
	type: string;
	required: boolean;
}

export interface TimerDefinition {
	type: TimerType;
	value: string;
}

export interface BpmnElement {
	readonly id: string;
	readonly type: ElementType;
}

export interface StartEvent extends BpmnElement {
	readonly type: "startEvent";
	readonly name?: string;
}

export interface EndEvent extends BpmnElement {
	readonly type: "endEvent";
	readonly name?: string;
}

export interface ServiceTask extends BpmnElement {
	readonly type: "serviceTask";
	readonly name?: string;
	readonly delegateExpression?: string;
	readonly className?: string;
	readonly fields: readonly FieldDefinition[];
	readonly async?: boolean;
}

export interface ScriptTask extends BpmnElement {
	readonly type: "scriptTask";
	readonly name?: string;
	readonly scriptFormat: string;
	readonly script: string;
	readonly autoStoreVariables?: boolean;
}

export interface UserTask extends BpmnElement {
	readonly type: "userTask";
	readonly name?: string;
	readonly assignee?: string;
	readonly candidateGroups?: readonly string[];
	readonly formKey?: string;
	readonly formProperties: readonly FormProperty[];
}

export interface ExclusiveGateway extends BpmnElement {
	readonly type: "exclusiveGateway";
	readonly name?: string;
	readonly defaultFlow?: string;
}

export interface ParallelGateway extends BpmnElement {
	readonly type: "parallelGateway";
	readonly name?: string;
}

export interface BoundaryEvent extends BpmnElement {
	readonly type: "boundaryEvent";
	readonly attachedToRef: string;
	readonly cancelActivity: boolean;
	readonly timer?: TimerDefinition;
	readonly errorRef?: string;
}

export interface IntermediateCatchEvent extends BpmnElement {
	readonly type: "intermediateCatchEvent";
	readonly name?: string;
	readonly timer?: TimerDefinition;
}

export interface SubProcess extends BpmnElement {
	readonly type: "subProcess";
	readonly name?: string;
	readonly elements: readonly AnyElement[];
	readonly flows: readonly SequenceFlow[];
}

export interface VariableMapping {
	readonly source?: string;
	readonly sourceExpression?: string;
	readonly target: string;
}

export interface CallActivity extends BpmnElement {
	readonly type: "callActivity";
	readonly name?: string;
	readonly calledElement: string;
	readonly inheritVariables?: boolean;
	readonly in: readonly VariableMapping[];
	readonly out: readonly VariableMapping[];
}

export interface SequenceFlow {
	readonly id: string;
	readonly name?: string;
	readonly sourceRef: string;
	readonly targetRef: string;
	readonly condition?: string;
}

export interface ErrorDefinition {
	readonly id: string;
	readonly errorCode: string;
}

export type AnyElement =
	| StartEvent
	| EndEvent
	| ServiceTask
	| ScriptTask
	| UserTask
	| ExclusiveGateway
	| ParallelGateway
	| BoundaryEvent
	| IntermediateCatchEvent
	| SubProcess
	| CallActivity;
