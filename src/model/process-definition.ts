import type { AnyElement, ErrorDefinition, SequenceFlow } from "../types/elements.js";

export interface ProcessDefinition {
	readonly id: string;
	readonly name?: string;
	readonly isExecutable: boolean;
	readonly elements: readonly AnyElement[];
	readonly flows: readonly SequenceFlow[];
	readonly errors: readonly ErrorDefinition[];
}
