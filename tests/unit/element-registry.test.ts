import { describe, expect, it } from "vitest";
import { ElementRegistry } from "../../src/builder/element-registry.js";

describe("ElementRegistry", () => {
	it("registers an ID", () => {
		const reg = new ElementRegistry();
		reg.register("task1");
		expect(reg.has("task1")).toBe(true);
	});

	it("reports unregistered IDs as missing", () => {
		const reg = new ElementRegistry();
		expect(reg.has("nonexistent")).toBe(false);
	});

	it("throws on duplicate ID", () => {
		const reg = new ElementRegistry();
		reg.register("task1");
		expect(() => reg.register("task1")).toThrow('Duplicate element ID: "task1"');
	});

	it("allows different IDs", () => {
		const reg = new ElementRegistry();
		reg.register("a");
		reg.register("b");
		expect(reg.has("a")).toBe(true);
		expect(reg.has("b")).toBe(true);
	});

	it("returns all registered IDs", () => {
		const reg = new ElementRegistry();
		reg.register("x");
		reg.register("y");
		const all = reg.all();
		expect(all.size).toBe(2);
		expect(all.has("x")).toBe(true);
		expect(all.has("y")).toBe(true);
	});
});
