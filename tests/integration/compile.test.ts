import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { toBpmn } from "../../src/xml/serializer.js";
import { orderApproval } from "../fixtures/order-approval.js";
import { subprocessExample } from "../fixtures/subprocess-example.js";

const fixturesDir = resolve(import.meta.dirname, "../fixtures");

describe("golden file comparison", () => {
	it("order-approval matches golden XML", () => {
		const actual = toBpmn(orderApproval);
		const expected = readFileSync(resolve(fixturesDir, "order-approval.bpmn20.xml"), "utf-8");
		expect(actual).toBe(expected);
	});

	it("subprocess-example matches golden XML", () => {
		const actual = toBpmn(subprocessExample);
		const expected = readFileSync(resolve(fixturesDir, "subprocess-example.bpmn20.xml"), "utf-8");
		expect(actual).toBe(expected);
	});
});
