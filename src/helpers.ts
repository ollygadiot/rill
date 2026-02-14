const EXPRESSION_BRAND = Symbol("rill-expression");

export interface Expression {
	readonly [EXPRESSION_BRAND]: true;
	readonly value: string;
}

export function expr(value: string): Expression {
	return {
		[EXPRESSION_BRAND]: true,
		value,
	};
}

export function isExpression(value: unknown): value is Expression {
	return (
		typeof value === "object" &&
		value !== null &&
		EXPRESSION_BRAND in value &&
		(value as Record<symbol, unknown>)[EXPRESSION_BRAND] === true
	);
}
