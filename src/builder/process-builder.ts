import { isExpression } from "../helpers.js";
import type {
	AnyElement,
	BoundaryEvent,
	CallActivity,
	EndEvent,
	ErrorDefinition,
	ExclusiveGateway,
	FieldDefinition,
	FormProperty,
	IntermediateCatchEvent,
	ParallelGateway,
	ScriptTask,
	SequenceFlow,
	ServiceTask,
	StartEvent,
	SubProcess,
	TimerDefinition,
	UserTask,
	VarDeclaration,
	VariableMapping,
} from "../types/elements.js";
import type {
	CallActivityOptions,
	ElementRef,
	EndOptions,
	ErrorBoundaryOptions,
	FlowOptions,
	GatewayOptions,
	ParallelOptions,
	ScriptOptions,
	ServiceOptions,
	StartOptions,
	SubProcessOptions,
	TimerBoundaryOptions,
	TimerCatchOptions,
	UserOptions,
} from "../types/options.js";
import { type Var, type VarType, createVar, isVar, resolveVarType } from "../var.js";
import { ElementRegistry } from "./element-registry.js";

export class ProcessBuilder {
	private registry: ElementRegistry;
	private elements: AnyElement[] = [];
	private flows: SequenceFlow[] = [];
	private errors: ErrorDefinition[] = [];
	private processVars: VarDeclaration[] = [];
	private flowCounter = 0;

	constructor(registry?: ElementRegistry) {
		this.registry = registry ?? new ElementRegistry();
	}

	var(name: string, varType: VarType): Var {
		this.processVars.push({ name, varType: resolveVarType(varType), direction: "in" });
		return createVar(name, varType);
	}

	start(id: string, options?: StartOptions): ElementRef {
		const el: StartEvent = {
			id,
			type: "startEvent",
			name: options?.name ?? humanize(id),
		};
		this.registry.register(id);
		this.elements.push(el);
		return { id };
	}

	end(id: string, options?: EndOptions): ElementRef {
		const el: EndEvent = {
			id,
			type: "endEvent",
			name: options?.name ?? humanize(id),
		};
		this.registry.register(id);
		this.elements.push(el);
		return { id };
	}

	service<O extends Record<string, VarType>>(
		id: string,
		options: ServiceOptions & { out: O },
	): ElementRef & { [K in keyof O]: Var };
	service(id: string, options: ServiceOptions): ElementRef;
	service(id: string, options: ServiceOptions): ElementRef {
		const fields = buildFields(options.fields);
		const vars = buildVarDeclarations(options.in, options.out);
		const el: ServiceTask = {
			id,
			type: "serviceTask",
			name: options.name ?? humanize(id),
			delegateExpression: options.delegate,
			className: options.class,
			fields,
			async: options.async,
			vars: vars.length > 0 ? vars : undefined,
		};
		this.registry.register(id);
		this.elements.push(el);
		return enrichRef({ id }, options.out);
	}

	script<O extends Record<string, VarType>>(
		id: string,
		options: ScriptOptions & { out: O },
	): ElementRef & { [K in keyof O]: Var };
	script(id: string, options: ScriptOptions): ElementRef;
	script(id: string, options: ScriptOptions): ElementRef {
		const vars = buildVarDeclarations(options.in, options.out);
		const el: ScriptTask = {
			id,
			type: "scriptTask",
			name: options.name ?? humanize(id),
			scriptFormat: options.format ?? "groovy",
			script: options.script,
			autoStoreVariables: options.autoStoreVariables,
			vars: vars.length > 0 ? vars : undefined,
		};
		this.registry.register(id);
		this.elements.push(el);
		return enrichRef({ id }, options.out);
	}

	user<O extends Record<string, VarType>>(
		id: string,
		options: UserOptions & { out: O },
	): ElementRef & { [K in keyof O]: Var };
	user(id: string, options: UserOptions): ElementRef;
	user(id: string, options: UserOptions): ElementRef {
		const formProperties = buildFormProperties(options.form);
		const vars = buildVarDeclarations(options.in, options.out);
		const el: UserTask = {
			id,
			type: "userTask",
			name: options.name ?? humanize(id),
			assignee: options.assignee,
			candidateGroups: options.candidateGroups,
			formKey: options.formKey,
			formProperties,
			vars: vars.length > 0 ? vars : undefined,
		};
		this.registry.register(id);
		this.elements.push(el);
		return enrichRef({ id }, options.out);
	}

	gateway(id: string, options?: GatewayOptions): ElementRef {
		const el: ExclusiveGateway = {
			id,
			type: "exclusiveGateway",
			name: options?.name ?? humanize(id),
			defaultFlow: options?.default,
		};
		this.registry.register(id);
		this.elements.push(el);
		return { id };
	}

	parallel(id: string, options?: ParallelOptions): ElementRef {
		const el: ParallelGateway = {
			id,
			type: "parallelGateway",
			name: options?.name ?? humanize(id),
		};
		this.registry.register(id);
		this.elements.push(el);
		return { id };
	}

	timer(id: string, options: TimerBoundaryOptions): ElementRef {
		const timerDef = extractTimerDefinition(options);
		const el: BoundaryEvent = {
			id,
			type: "boundaryEvent",
			attachedToRef: options.attachedTo.id,
			cancelActivity: options.interrupting ?? true,
			timer: timerDef,
		};
		this.registry.register(id);
		this.elements.push(el);
		return { id };
	}

	timerCatch(id: string, options: TimerCatchOptions): ElementRef {
		const timerDef = extractTimerDefinition(options);
		const el: IntermediateCatchEvent = {
			id,
			type: "intermediateCatchEvent",
			name: options.name ?? humanize(id),
			timer: timerDef,
		};
		this.registry.register(id);
		this.elements.push(el);
		return { id };
	}

	errorBoundary(id: string, options: ErrorBoundaryOptions): ElementRef {
		const el: BoundaryEvent = {
			id,
			type: "boundaryEvent",
			attachedToRef: options.attachedTo.id,
			cancelActivity: true,
			errorRef: options.errorRef,
		};
		this.registry.register(id);
		this.elements.push(el);
		return { id };
	}

	subprocess(
		id: string,
		builderFn: (sub: ProcessBuilder) => void,
		options?: SubProcessOptions,
	): ElementRef {
		const subBuilder = new ProcessBuilder(this.registry);
		this.registry.register(id);
		builderFn(subBuilder);
		const el: SubProcess = {
			id,
			type: "subProcess",
			name: options?.name ?? humanize(id),
			elements: subBuilder.getElements(),
			flows: subBuilder.getFlows(),
		};
		this.elements.push(el);
		return { id };
	}

	call(id: string, options: CallActivityOptions): ElementRef {
		const el: CallActivity = {
			id,
			type: "callActivity",
			name: options.name ?? humanize(id),
			calledElement: options.calledElement,
			inheritVariables: options.inheritVariables,
			in: buildVariableMappings(options.in),
			out: buildOutputMappings(options.out),
		};
		this.registry.register(id);
		this.elements.push(el);
		return { id };
	}

	error(id: string, errorCode: string): void {
		this.errors.push({ id, errorCode });
	}

	pipe(...refs: ElementRef[]): void {
		for (let i = 0; i < refs.length - 1; i++) {
			this.flow(refs[i], refs[i + 1]);
		}
	}

	flow(source: ElementRef, target: ElementRef, condition?: string | Var | FlowOptions): void {
		let flowId: string;
		let flowName: string | undefined;
		let flowCondition: string | undefined;

		if (isVar(condition)) {
			flowId = this.nextFlowId(source.id, target.id);
			flowCondition = `\${${condition.name}}`;
			flowName = `\${${condition.name}}`;
		} else if (typeof condition === "string") {
			flowId = this.nextFlowId(source.id, target.id);
			flowCondition = condition;
			flowName = condition;
		} else if (typeof condition === "object") {
			flowId = condition.id ?? this.nextFlowId(source.id, target.id);
			flowCondition = condition.condition;
			flowName = condition.name ?? condition.condition;
		} else {
			flowId = this.nextFlowId(source.id, target.id);
		}

		this.flows.push({
			id: flowId,
			name: flowName,
			sourceRef: source.id,
			targetRef: target.id,
			condition: flowCondition,
		});
	}

	getElements(): readonly AnyElement[] {
		return this.elements;
	}

	getFlows(): readonly SequenceFlow[] {
		return this.flows;
	}

	getErrors(): readonly ErrorDefinition[] {
		return this.errors;
	}

	getVars(): readonly VarDeclaration[] {
		return this.processVars;
	}

	getRegistry(): ElementRegistry {
		return this.registry;
	}

	private nextFlowId(sourceId: string, targetId: string): string {
		this.flowCounter++;
		return `flow_${sourceId}_to_${targetId}_${this.flowCounter}`;
	}
}

function buildFields(
	fields?: Record<string, string | { value: string }>,
): readonly FieldDefinition[] {
	if (!fields) return [];
	return Object.entries(fields).map(([name, value]) => {
		if (isExpression(value)) {
			return { name, value };
		}
		return { name, value: typeof value === "string" ? value : value.value };
	});
}

function buildFormProperties(
	form?: Record<string, { type: string; required?: boolean }>,
): readonly FormProperty[] {
	if (!form) return [];
	return Object.entries(form).map(([id, def]) => ({
		id,
		name: id,
		type: def.type,
		required: def.required ?? false,
	}));
}

function humanize(id: string): string {
	return id
		.replace(/([a-z\d])([A-Z])/g, "$1 $2")
		.replace(/[_-]/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildVariableMappings(
	mappings?: Record<string, string | { value: string }>,
): readonly VariableMapping[] {
	if (!mappings) return [];
	return Object.entries(mappings).map(([target, value]) => {
		if (isExpression(value)) {
			return { sourceExpression: value.value, target };
		}
		return { source: typeof value === "string" ? value : value.value, target };
	});
}

function buildOutputMappings(mappings?: Record<string, string>): readonly VariableMapping[] {
	if (!mappings) return [];
	return Object.entries(mappings).map(([target, source]) => ({
		source,
		target,
	}));
}

function buildVarDeclarations(
	inputs?: Var[],
	outputs?: Record<string, VarType>,
): readonly VarDeclaration[] {
	const declarations: VarDeclaration[] = [];
	if (inputs) {
		for (const v of inputs) {
			declarations.push({ name: v.name, varType: resolveVarType(v.varType), direction: "in" });
		}
	}
	if (outputs) {
		for (const [name, varType] of Object.entries(outputs)) {
			declarations.push({ name, varType: resolveVarType(varType), direction: "out" });
		}
	}
	return declarations;
}

function enrichRef(ref: ElementRef, out?: Record<string, VarType>): ElementRef {
	if (!out) return ref;
	const varHandles: Record<string, Var> = {};
	for (const [name, varType] of Object.entries(out)) {
		varHandles[name] = createVar(name, varType);
	}
	return Object.assign(ref, varHandles);
}

function extractTimerDefinition(options: {
	duration?: string;
	date?: string;
	cycle?: string;
}): TimerDefinition | undefined {
	if (options.duration) return { type: "duration", value: options.duration };
	if (options.date) return { type: "date", value: options.date };
	if (options.cycle) return { type: "cycle", value: options.cycle };
	return undefined;
}

export interface ValidationError {
	message: string;
}

export function validate(
	elements: readonly AnyElement[],
	flows: readonly SequenceFlow[],
	processVars: readonly VarDeclaration[] = [],
): ValidationError[] {
	const errors: ValidationError[] = [];
	const elementIds = new Set(elements.map((e) => e.id));

	// Must have at least one start event
	const startEvents = elements.filter((e) => e.type === "startEvent");
	if (startEvents.length === 0) {
		errors.push({ message: "Process must have at least one start event" });
	}

	// Must have at least one end event
	const endEvents = elements.filter((e) => e.type === "endEvent");
	if (endEvents.length === 0) {
		errors.push({ message: "Process must have at least one end event" });
	}

	// Flows must reference existing elements
	for (const flow of flows) {
		if (!elementIds.has(flow.sourceRef)) {
			errors.push({ message: `Flow "${flow.id}" references unknown source "${flow.sourceRef}"` });
		}
		if (!elementIds.has(flow.targetRef)) {
			errors.push({ message: `Flow "${flow.id}" references unknown target "${flow.targetRef}"` });
		}
	}

	// Exclusive gateways with default must reference a valid flow ID
	for (const el of elements) {
		if (el.type === "exclusiveGateway" && el.defaultFlow) {
			const outgoing = flows.filter((f) => f.sourceRef === el.id);
			const defaultFlowExists = outgoing.some((f) => f.id === el.defaultFlow);
			if (!defaultFlowExists) {
				errors.push({
					message: `Gateway "${el.id}" default flow "${el.defaultFlow}" not found among outgoing flows`,
				});
			}
		}

		// Boundary events must reference existing elements
		if (el.type === "boundaryEvent") {
			if (!elementIds.has(el.attachedToRef)) {
				errors.push({
					message: `Boundary event "${el.id}" attached to unknown element "${el.attachedToRef}"`,
				});
			}
		}
	}

	// Variable availability: every in-var must be supplied by p.var() or some task's out
	const available = new Set<string>();
	for (const v of processVars) {
		available.add(v.name);
	}
	for (const el of elements) {
		if ("vars" in el && el.vars) {
			for (const v of el.vars) {
				if (v.direction === "out") {
					available.add(v.name);
				}
			}
		}
	}
	for (const el of elements) {
		if ("vars" in el && el.vars) {
			for (const v of el.vars) {
				if (v.direction === "in" && !available.has(v.name)) {
					errors.push({
						message: `Task "${el.id}" requires variable "${v.name}" but nothing in the process provides it`,
					});
				}
			}
		}
	}

	return errors;
}
