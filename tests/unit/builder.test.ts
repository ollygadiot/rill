import { describe, expect, it } from "vitest";
import { ProcessBuilder, validate } from "../../src/builder/process-builder.js";
import { expr } from "../../src/helpers.js";
import { process } from "../../src/index.js";

describe("ProcessBuilder", () => {
	it("creates a start event", () => {
		const b = new ProcessBuilder();
		const ref = b.start("begin");
		expect(ref.id).toBe("begin");
		const els = b.getElements();
		expect(els).toHaveLength(1);
		expect(els[0].type).toBe("startEvent");
		expect(els[0].id).toBe("begin");
	});

	it("creates an end event", () => {
		const b = new ProcessBuilder();
		const ref = b.end("done");
		expect(ref.id).toBe("done");
		expect(b.getElements()[0].type).toBe("endEvent");
	});

	it("creates a service task with delegate expression", () => {
		const b = new ProcessBuilder();
		b.service("validate", { delegate: "${validator}" });
		const el = b.getElements()[0];
		expect(el.type).toBe("serviceTask");
		if (el.type === "serviceTask") {
			expect(el.delegateExpression).toBe("${validator}");
		}
	});

	it("creates a service task with class", () => {
		const b = new ProcessBuilder();
		b.service("approve", { class: "com.example.ApproveService" });
		const el = b.getElements()[0];
		if (el.type === "serviceTask") {
			expect(el.className).toBe("com.example.ApproveService");
		}
	});

	it("creates a service task with fields", () => {
		const b = new ProcessBuilder();
		b.service("svc", {
			delegate: "${svc}",
			fields: { key: "value", dynamic: expr("config.val") },
		});
		const el = b.getElements()[0];
		if (el.type === "serviceTask") {
			expect(el.fields).toHaveLength(2);
			expect(el.fields[0]).toEqual({ name: "key", value: "value" });
			expect(el.fields[1].name).toBe("dynamic");
		}
	});

	it("creates a script task", () => {
		const b = new ProcessBuilder();
		b.script("calc", { script: "x = 1 + 2", format: "groovy" });
		const el = b.getElements()[0];
		expect(el.type).toBe("scriptTask");
		if (el.type === "scriptTask") {
			expect(el.scriptFormat).toBe("groovy");
			expect(el.script).toBe("x = 1 + 2");
		}
	});

	it("defaults script format to groovy", () => {
		const b = new ProcessBuilder();
		b.script("calc", { script: "x = 1" });
		const el = b.getElements()[0];
		if (el.type === "scriptTask") {
			expect(el.scriptFormat).toBe("groovy");
		}
	});

	it("creates a user task with candidates and form", () => {
		const b = new ProcessBuilder();
		b.user("review", {
			candidateGroups: ["managers"],
			formKey: "review-form",
			form: {
				approved: { type: "boolean", required: true },
				comments: { type: "string" },
			},
		});
		const el = b.getElements()[0];
		expect(el.type).toBe("userTask");
		if (el.type === "userTask") {
			expect(el.candidateGroups).toEqual(["managers"]);
			expect(el.formKey).toBe("review-form");
			expect(el.formProperties).toHaveLength(2);
			expect(el.formProperties[0]).toEqual({
				id: "approved",
				name: "approved",
				type: "boolean",
				required: true,
			});
			expect(el.formProperties[1].required).toBe(false);
		}
	});

	it("creates an exclusive gateway with default", () => {
		const b = new ProcessBuilder();
		b.gateway("check", { default: "defaultPath" });
		const el = b.getElements()[0];
		expect(el.type).toBe("exclusiveGateway");
		if (el.type === "exclusiveGateway") {
			expect(el.defaultFlow).toBe("defaultPath");
		}
	});

	it("creates a parallel gateway", () => {
		const b = new ProcessBuilder();
		b.parallel("fork");
		expect(b.getElements()[0].type).toBe("parallelGateway");
	});

	it("creates a timer boundary event", () => {
		const b = new ProcessBuilder();
		const task = b.start("s");
		b.timer("reminder", {
			attachedTo: task,
			interrupting: false,
			cycle: "R2/PT6H",
		});
		const el = b.getElements()[1];
		expect(el.type).toBe("boundaryEvent");
		if (el.type === "boundaryEvent") {
			expect(el.attachedToRef).toBe("s");
			expect(el.cancelActivity).toBe(false);
			expect(el.timer).toEqual({ type: "cycle", value: "R2/PT6H" });
		}
	});

	it("defaults timer boundary to interrupting", () => {
		const b = new ProcessBuilder();
		const task = b.start("s");
		b.timer("t", { attachedTo: task, duration: "PT1H" });
		const el = b.getElements()[1];
		if (el.type === "boundaryEvent") {
			expect(el.cancelActivity).toBe(true);
		}
	});

	it("creates a timer intermediate catch event", () => {
		const b = new ProcessBuilder();
		b.timerCatch("wait", { duration: "PT30M" });
		const el = b.getElements()[0];
		expect(el.type).toBe("intermediateCatchEvent");
		if (el.type === "intermediateCatchEvent") {
			expect(el.timer).toEqual({ type: "duration", value: "PT30M" });
		}
	});

	it("creates an error boundary event", () => {
		const b = new ProcessBuilder();
		const task = b.start("s");
		b.errorBoundary("onError", { attachedTo: task, errorRef: "ERR_001" });
		const el = b.getElements()[1];
		if (el.type === "boundaryEvent") {
			expect(el.errorRef).toBe("ERR_001");
			expect(el.cancelActivity).toBe(true);
		}
	});

	it("creates a subprocess with nested elements", () => {
		const b = new ProcessBuilder();
		b.subprocess("sub1", (sub) => {
			const s = sub.start("subStart");
			const e = sub.end("subEnd");
			sub.flow(s, e);
		});
		const el = b.getElements()[0];
		expect(el.type).toBe("subProcess");
		if (el.type === "subProcess") {
			expect(el.elements).toHaveLength(2);
			expect(el.flows).toHaveLength(1);
		}
	});

	it("rejects duplicate IDs across subprocess boundary", () => {
		const b = new ProcessBuilder();
		b.start("shared");
		expect(() => {
			b.subprocess("sub", (sub) => {
				sub.start("shared");
			});
		}).toThrow('Duplicate element ID: "shared"');
	});

	it("registers process-level errors", () => {
		const b = new ProcessBuilder();
		b.error("err1", "ERR_TIMEOUT");
		expect(b.getErrors()).toEqual([{ id: "err1", errorCode: "ERR_TIMEOUT" }]);
	});
});

describe("flow wiring", () => {
	it("creates a simple flow", () => {
		const b = new ProcessBuilder();
		const a = b.start("a");
		const bRef = b.end("b");
		b.flow(a, bRef);
		const flows = b.getFlows();
		expect(flows).toHaveLength(1);
		expect(flows[0].sourceRef).toBe("a");
		expect(flows[0].targetRef).toBe("b");
		expect(flows[0].condition).toBeUndefined();
	});

	it("creates a flow with string condition", () => {
		const b = new ProcessBuilder();
		const a = b.start("a");
		const bRef = b.end("b");
		b.flow(a, bRef, "${amount > 100}");
		expect(b.getFlows()[0].condition).toBe("${amount > 100}");
	});

	it("creates a flow with options object", () => {
		const b = new ProcessBuilder();
		const a = b.start("a");
		const bRef = b.end("b");
		b.flow(a, bRef, { id: "customId", condition: "${x}" });
		const flow = b.getFlows()[0];
		expect(flow.id).toBe("customId");
		expect(flow.condition).toBe("${x}");
	});

	it("auto-generates unique flow IDs", () => {
		const b = new ProcessBuilder();
		const a = b.start("a");
		const bRef = b.end("b");
		b.flow(a, bRef);
		b.flow(a, bRef);
		const flows = b.getFlows();
		expect(flows[0].id).not.toBe(flows[1].id);
	});
});

describe("pipe", () => {
	it("chains multiple elements linearly", () => {
		const b = new ProcessBuilder();
		const a = b.start("a");
		const c = b.service("b", { delegate: "${svc}" });
		const d = b.end("c");
		b.pipe(a, c, d);
		const flows = b.getFlows();
		expect(flows).toHaveLength(2);
		expect(flows[0].sourceRef).toBe("a");
		expect(flows[0].targetRef).toBe("b");
		expect(flows[1].sourceRef).toBe("b");
		expect(flows[1].targetRef).toBe("c");
	});

	it("does nothing with fewer than 2 elements", () => {
		const b = new ProcessBuilder();
		const a = b.start("a");
		b.pipe(a);
		expect(b.getFlows()).toHaveLength(0);
		b.pipe();
		expect(b.getFlows()).toHaveLength(0);
	});

	it("works with exactly 2 elements like flow()", () => {
		const b = new ProcessBuilder();
		const a = b.start("a");
		const z = b.end("z");
		b.pipe(a, z);
		expect(b.getFlows()).toHaveLength(1);
		expect(b.getFlows()[0].sourceRef).toBe("a");
		expect(b.getFlows()[0].targetRef).toBe("z");
	});
});

describe("validate", () => {
	it("passes for a valid minimal process", () => {
		const b = new ProcessBuilder();
		const s = b.start("s");
		const e = b.end("e");
		b.flow(s, e);
		expect(validate(b.getElements(), b.getFlows())).toEqual([]);
	});

	it("fails if no start event", () => {
		const b = new ProcessBuilder();
		b.end("e");
		const errors = validate(b.getElements(), b.getFlows());
		expect(errors.some((e) => e.message.includes("start event"))).toBe(true);
	});

	it("fails if no end event", () => {
		const b = new ProcessBuilder();
		b.start("s");
		const errors = validate(b.getElements(), b.getFlows());
		expect(errors.some((e) => e.message.includes("end event"))).toBe(true);
	});

	it("fails for flows referencing unknown source", () => {
		const b = new ProcessBuilder();
		b.start("s");
		b.end("e");
		// Manually push a bad flow
		(b as unknown as { flows: { id: string; sourceRef: string; targetRef: string }[] }).flows.push({
			id: "bad",
			sourceRef: "ghost",
			targetRef: "e",
		});
		const errors = validate(b.getElements(), b.getFlows());
		expect(errors.some((e) => e.message.includes("unknown source"))).toBe(true);
	});

	it("fails for gateway default referencing non-existent flow", () => {
		const b = new ProcessBuilder();
		b.start("s");
		b.end("e");
		b.gateway("gw", { default: "nonexistent" });
		const errors = validate(b.getElements(), b.getFlows());
		expect(errors.some((e) => e.message.includes("default flow"))).toBe(true);
	});
});

describe("process() top-level function", () => {
	it("returns a frozen ProcessDefinition", () => {
		const def = process("test", (p) => {
			const s = p.start("s");
			const e = p.end("e");
			p.flow(s, e);
		});
		expect(def.id).toBe("test");
		expect(def.isExecutable).toBe(true);
		expect(def.elements).toHaveLength(2);
		expect(def.flows).toHaveLength(1);
	});

	it("throws on validation failure", () => {
		expect(() => {
			process("bad", (_p) => {
				// no elements
			});
		}).toThrow("validation failed");
	});

	it("accepts process options", () => {
		const def = process(
			"named",
			(p) => {
				const s = p.start("s");
				const e = p.end("e");
				p.flow(s, e);
			},
			{ name: "My Process", isExecutable: false },
		);
		expect(def.name).toBe("My Process");
		expect(def.isExecutable).toBe(false);
	});
});
