import { describe, expect, it } from "vitest";
import { createVar, isVar, resolveVarType } from "../../src/var.js";
import { expr, isExpression } from "../../src/helpers.js";

describe("createVar", () => {
	it("creates a Var with name and type", () => {
		const v = createVar("orderId", String);
		expect(v.name).toBe("orderId");
		expect(v.varType).toBe(String);
	});

	it("supports all var types", () => {
		const types = [String, Boolean, Number, Date] as const;
		for (const t of types) {
			const v = createVar("x", t);
			expect(v.varType).toBe(t);
		}
	});
});

describe("resolveVarType", () => {
	it("maps String to 'string'", () => {
		expect(resolveVarType(String)).toBe("string");
	});

	it("maps Boolean to 'boolean'", () => {
		expect(resolveVarType(Boolean)).toBe("boolean");
	});

	it("maps Number to 'double'", () => {
		expect(resolveVarType(Number)).toBe("double");
	});

	it("maps Date to 'date'", () => {
		expect(resolveVarType(Date)).toBe("date");
	});
});

describe("isVar", () => {
	it("returns true for a Var", () => {
		const v = createVar("amount", Number);
		expect(isVar(v)).toBe(true);
	});

	it("returns false for a plain object", () => {
		expect(isVar({ name: "amount", varType: Number })).toBe(false);
	});

	it("returns false for a string", () => {
		expect(isVar("amount")).toBe(false);
	});

	it("returns false for null", () => {
		expect(isVar(null)).toBe(false);
	});

	it("returns false for undefined", () => {
		expect(isVar(undefined)).toBe(false);
	});

	it("does not cross-contaminate with Expression", () => {
		const e = expr("config.val");
		expect(isVar(e)).toBe(false);
		const v = createVar("x", String);
		expect(isExpression(v)).toBe(false);
	});
});
