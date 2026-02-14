export { expr, isExpression } from "./helpers.js";
export type { Expression } from "./helpers.js";
export type {
	CallActivityOptions,
	ElementRef,
	ProcessOptions,
	ServiceOptions,
	UserOptions,
	GatewayOptions,
	ScriptOptions,
	TimerBoundaryOptions,
	TimerCatchOptions,
	ErrorBoundaryOptions,
} from "./types/options.js";
export type { AnyElement, SequenceFlow, ErrorDefinition } from "./types/elements.js";
export type { ProcessDefinition } from "./model/process-definition.js";
export { ProcessBuilder, validate } from "./builder/process-builder.js";
export { toBpmn } from "./xml/serializer.js";
export { deploy } from "./deploy/client.js";
export type { DeployOptions, DeployResult } from "./deploy/types.js";

import { ProcessBuilder, validate } from "./builder/process-builder.js";
import type { ProcessDefinition } from "./model/process-definition.js";
import type { ProcessOptions } from "./types/options.js";

export function process(
	id: string,
	builderFn: (p: ProcessBuilder) => void,
	options?: ProcessOptions,
): ProcessDefinition {
	const builder = new ProcessBuilder();
	builderFn(builder);

	const elements = builder.getElements();
	const flows = builder.getFlows();
	const errors = validate(elements, flows);

	if (errors.length > 0) {
		const messages = errors.map((e) => `  - ${e.message}`).join("\n");
		throw new Error(`Process "${id}" validation failed:\n${messages}`);
	}

	return {
		id,
		name: options?.name ?? id,
		isExecutable: options?.isExecutable ?? true,
		elements,
		flows,
		errors: builder.getErrors(),
	};
}
