import type { Expression } from "../helpers.js";
import type { Var, VarType } from "../var.js";

export interface ElementRef {
	readonly id: string;
}

export interface StartOptions {
	name?: string;
}

export interface EndOptions {
	name?: string;
}

export interface ServiceOptions {
	name?: string;
	delegate?: string;
	class?: string;
	fields?: Record<string, string | Expression>;
	async?: boolean;
	in?: Var[];
	out?: Record<string, VarType>;
}

export interface ScriptOptions {
	name?: string;
	format?: string;
	script: string;
	autoStoreVariables?: boolean;
	in?: Var[];
	out?: Record<string, VarType>;
}

export interface UserOptions {
	name?: string;
	assignee?: string;
	candidateGroups?: string[];
	formKey?: string;
	form?: Record<string, { type: string; required?: boolean }>;
	in?: Var[];
	out?: Record<string, VarType>;
}

export interface GatewayOptions {
	name?: string;
	default?: string;
}

export interface ParallelOptions {
	name?: string;
}

export interface TimerBoundaryOptions {
	attachedTo: ElementRef;
	interrupting?: boolean;
	duration?: string;
	date?: string;
	cycle?: string;
}

export interface TimerCatchOptions {
	name?: string;
	duration?: string;
	date?: string;
	cycle?: string;
}

export interface ErrorBoundaryOptions {
	attachedTo: ElementRef;
	errorRef: string;
}

export interface SubProcessOptions {
	name?: string;
}

export interface CallActivityOptions {
	name?: string;
	calledElement: string;
	inheritVariables?: boolean;
	in?: Record<string, string | Expression>;
	out?: Record<string, string>;
}

export interface FlowOptions {
	id?: string;
	name?: string;
	condition?: string;
}

export interface ProcessOptions {
	name?: string;
	isExecutable?: boolean;
}
