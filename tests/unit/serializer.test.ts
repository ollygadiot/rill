import { describe, expect, it } from "vitest";
import { ProcessBuilder } from "../../src/builder/process-builder.js";
import { expr } from "../../src/helpers.js";
import type { ProcessDefinition } from "../../src/model/process-definition.js";
import { toBpmn } from "../../src/xml/serializer.js";

function buildDef(fn: (b: ProcessBuilder) => void): ProcessDefinition {
	const b = new ProcessBuilder();
	fn(b);
	return {
		id: "test-process",
		name: "test-process",
		isExecutable: true,
		elements: b.getElements(),
		flows: b.getFlows(),
		errors: b.getErrors(),
		vars: b.getVars(),
	};
}

describe("toBpmn", () => {
	it("includes XML declaration", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
			}),
		);
		expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
	});

	it("includes definitions with correct namespaces", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
			}),
		);
		expect(xml).toContain('xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"');
		expect(xml).toContain('xmlns:flowable="http://flowable.org/bpmn"');
		expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
	});

	it("serializes process with id and isExecutable", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
			}),
		);
		expect(xml).toContain('process id="test-process"');
		expect(xml).toContain('isExecutable="true"');
	});

	it("serializes start and end events as self-closing", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("myStart");
				b.end("myEnd");
			}),
		);
		expect(xml).toContain('<startEvent id="myStart" name="My Start"/>');
		expect(xml).toContain('<endEvent id="myEnd" name="My End"/>');
	});

	it("serializes service task with delegate expression", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				b.service("svc", { delegate: "${myBean}" });
			}),
		);
		expect(xml).toContain('flowable:delegateExpression="${myBean}"');
	});

	it("serializes service task with class", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				b.service("svc", { class: "com.example.Svc" });
			}),
		);
		expect(xml).toContain('flowable:class="com.example.Svc"');
	});

	it("serializes service task with async", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				b.service("svc", { delegate: "${x}", async: true });
			}),
		);
		expect(xml).toContain('flowable:async="true"');
	});

	it("serializes field injection with string value", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				b.service("svc", { delegate: "${x}", fields: { key: "val" } });
			}),
		);
		expect(xml).toContain('<flowable:field name="key">');
		expect(xml).toContain("<flowable:string>val</flowable:string>");
	});

	it("serializes field injection with expression value", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				b.service("svc", { delegate: "${x}", fields: { key: expr("config.val") } });
			}),
		);
		expect(xml).toContain('<flowable:field name="key">');
		expect(xml).toContain("<flowable:expression>config.val</flowable:expression>");
	});

	it("serializes script task with CDATA", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				b.script("calc", { script: "x = 1 + 2", format: "groovy" });
			}),
		);
		expect(xml).toContain('scriptFormat="groovy"');
		expect(xml).toContain("<![CDATA[x = 1 + 2]]>");
	});

	it("serializes user task with candidate groups and form key", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				b.user("review", {
					candidateGroups: ["mgrs", "leads"],
					formKey: "form1",
				});
			}),
		);
		expect(xml).toContain('flowable:candidateGroups="mgrs,leads"');
		expect(xml).toContain('flowable:formKey="form1"');
	});

	it("serializes form properties", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				b.user("review", {
					form: { approved: { type: "boolean", required: true } },
				});
			}),
		);
		expect(xml).toContain("flowable:formProperty");
		expect(xml).toContain('id="approved"');
		expect(xml).toContain('type="boolean"');
		expect(xml).toContain('required="true"');
	});

	it("serializes exclusive gateway with default", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				b.gateway("gw", { default: "defaultFlow" });
			}),
		);
		expect(xml).toContain('exclusiveGateway id="gw" name="Gw" default="defaultFlow"');
	});

	it("serializes parallel gateway", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				b.parallel("fork");
			}),
		);
		expect(xml).toContain('parallelGateway id="fork"');
	});

	it("serializes timer boundary event with cycle", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				const task = b.user("task", {});
				b.timer("t", { attachedTo: task, interrupting: false, cycle: "R2/PT6H" });
			}),
		);
		expect(xml).toContain('attachedToRef="task"');
		expect(xml).toContain('cancelActivity="false"');
		expect(xml).toContain("<timeCycle>R2/PT6H</timeCycle>");
	});

	it("serializes timer boundary event with duration", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				const task = b.user("task", {});
				b.timer("t", { attachedTo: task, duration: "PT1H" });
			}),
		);
		expect(xml).toContain("<timeDuration>PT1H</timeDuration>");
	});

	it("serializes intermediate catch event with timer", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				b.timerCatch("wait", { duration: "PT30M" });
			}),
		);
		expect(xml).toContain("intermediateCatchEvent");
		expect(xml).toContain("<timeDuration>PT30M</timeDuration>");
	});

	it("serializes error boundary event", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				const task = b.service("svc", { delegate: "${x}" });
				b.errorBoundary("onErr", { attachedTo: task, errorRef: "ERR_1" });
			}),
		);
		expect(xml).toContain('errorEventDefinition errorRef="ERR_1"');
	});

	it("serializes error definitions at definitions level", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				b.error("err1", "ERR_CODE");
			}),
		);
		expect(xml).toContain('<error id="err1" errorCode="ERR_CODE"/>');
		// Should appear before process
		const errorIdx = xml.indexOf("error id=");
		const processIdx = xml.indexOf("process id=");
		expect(errorIdx).toBeLessThan(processIdx);
	});

	it("serializes sequence flows without condition as self-closing", () => {
		const xml = toBpmn(
			buildDef((b) => {
				const s = b.start("s");
				const e = b.end("e");
				b.flow(s, e);
			}),
		);
		expect(xml).toMatch(/<sequenceFlow[^>]*sourceRef="s"[^>]*targetRef="e"[^>]*\/>/);
	});

	it("serializes sequence flows with condition using CDATA", () => {
		const xml = toBpmn(
			buildDef((b) => {
				const s = b.start("s");
				const e = b.end("e");
				b.flow(s, e, "${x > 10}");
			}),
		);
		expect(xml).toContain("conditionExpression");
		expect(xml).toContain('xsi:type="tFormalExpression"');
		expect(xml).toContain("<![CDATA[${x > 10}]]>");
	});

	it("serializes subprocess with nested elements and flows", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				b.subprocess("sub", (sub) => {
					const ss = sub.start("ss");
					const se = sub.end("se");
					sub.flow(ss, se);
				});
			}),
		);
		expect(xml).toContain('<subProcess id="sub" name="Sub">');
		expect(xml).toContain('<startEvent id="ss" name="Ss"/>');
		expect(xml).toContain("</subProcess>");
	});

	it("includes rill namespace in definitions", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
			}),
		);
		expect(xml).toContain('xmlns:rill="https://rill-bpmn.dev"');
	});

	it("serializes process-level vars as rill:var extension elements", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.var("orderId", String);
				b.var("amount", Number);
				b.start("s");
				b.end("e");
			}),
		);
		expect(xml).toContain('<rill:var name="orderId" type="string" direction="in"/>');
		expect(xml).toContain('<rill:var name="amount" type="double" direction="in"/>');
		// Process-level vars should appear inside process > extensionElements
		const processIdx = xml.indexOf("<process");
		const varIdx = xml.indexOf("rill:var");
		expect(varIdx).toBeGreaterThan(processIdx);
	});

	it("does not serialize process extensionElements when no vars", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
			}),
		);
		// No extensionElements directly inside process
		const processContent = xml.slice(xml.indexOf("<process"), xml.indexOf("</process>"));
		// The only extensionElements should be inside nested elements, not process-level
		expect(processContent).not.toMatch(/<process[^>]*>[\s]*<extensionElements>/);
	});

	it("serializes element-level vars on service task", () => {
		const xml = toBpmn(
			buildDef((b) => {
				const orderId = b.var("orderId", String);
				b.start("s");
				b.end("e");
				b.service("validate", {
					delegate: "${validator}",
					in: [orderId],
					out: { isValid: Boolean },
				});
			}),
		);
		expect(xml).toContain('<rill:var name="orderId" type="string" direction="in"/>');
		expect(xml).toContain('<rill:var name="isValid" type="boolean" direction="out"/>');
	});

	it("serializes element-level vars on user task", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				b.user("review", {
					out: { approved: Boolean },
				});
			}),
		);
		expect(xml).toContain('<rill:var name="approved" type="boolean" direction="out"/>');
	});

	it("serializes element-level vars on script task", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				b.script("calc", {
					script: "x = 1",
					out: { discount: Number },
				});
			}),
		);
		expect(xml).toContain('<rill:var name="discount" type="double" direction="out"/>');
	});

	it("serializes both fields and vars on service task", () => {
		const xml = toBpmn(
			buildDef((b) => {
				b.start("s");
				b.end("e");
				b.service("svc", {
					delegate: "${x}",
					fields: { key: "val" },
					out: { result: String },
				});
			}),
		);
		expect(xml).toContain('<flowable:field name="key">');
		expect(xml).toContain('<rill:var name="result" type="string" direction="out"/>');
	});
});
