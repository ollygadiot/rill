const VAR_BRAND = Symbol("rill-var");

export type VarType = StringConstructor | BooleanConstructor | NumberConstructor | DateConstructor;

export type FlowableVarType = "string" | "boolean" | "double" | "date";

export interface Var {
	readonly [VAR_BRAND]: true;
	readonly name: string;
	readonly varType: VarType;
}

export function createVar(name: string, varType: VarType): Var {
	return {
		[VAR_BRAND]: true,
		name,
		varType,
	};
}

export function isVar(value: unknown): value is Var {
	return (
		typeof value === "object" &&
		value !== null &&
		VAR_BRAND in value &&
		(value as Record<symbol, unknown>)[VAR_BRAND] === true
	);
}

export function resolveVarType(varType: VarType): FlowableVarType {
	switch (varType) {
		case String:
			return "string";
		case Boolean:
			return "boolean";
		case Number:
			return "double";
		case Date:
			return "date";
		default:
			throw new Error(`Unknown var type: ${varType}`);
	}
}
