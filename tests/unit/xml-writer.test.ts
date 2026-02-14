import { describe, expect, it } from "vitest";
import { XmlWriter, escapeXml } from "../../src/xml/xml-writer.js";

describe("escapeXml", () => {
	it("escapes ampersands", () => {
		expect(escapeXml("a & b")).toBe("a &amp; b");
	});

	it("escapes angle brackets", () => {
		expect(escapeXml("<div>")).toBe("&lt;div&gt;");
	});

	it("escapes quotes", () => {
		expect(escapeXml('"hello"')).toBe("&quot;hello&quot;");
	});

	it("escapes apostrophes", () => {
		expect(escapeXml("it's")).toBe("it&apos;s");
	});

	it("escapes all special characters together", () => {
		expect(escapeXml('<a href="x&y">it\'s</a>')).toBe(
			"&lt;a href=&quot;x&amp;y&quot;&gt;it&apos;s&lt;/a&gt;",
		);
	});

	it("leaves safe strings unchanged", () => {
		expect(escapeXml("hello world 123")).toBe("hello world 123");
	});
});

describe("XmlWriter", () => {
	it("writes XML declaration", () => {
		const w = new XmlWriter();
		expect(w.declaration().toString()).toBe('<?xml version="1.0" encoding="UTF-8"?>\n');
	});

	it("writes an open/close tag pair with indentation", () => {
		const w = new XmlWriter();
		const xml = w.open("root").close("root").toString();
		expect(xml).toBe("<root>\n</root>\n");
	});

	it("indents nested elements", () => {
		const w = new XmlWriter();
		const xml = w.open("root").open("child").close("child").close("root").toString();
		expect(xml).toBe("<root>\n  <child>\n  </child>\n</root>\n");
	});

	it("writes deeply nested indentation", () => {
		const w = new XmlWriter();
		const xml = w
			.open("a")
			.open("b")
			.open("c")
			.selfClose("d")
			.close("c")
			.close("b")
			.close("a")
			.toString();

		expect(xml).toBe("<a>\n  <b>\n    <c>\n      <d/>\n    </c>\n  </b>\n</a>\n");
	});

	it("writes attributes on open tags", () => {
		const w = new XmlWriter();
		const xml = w.open("process", { id: "p1", name: "My Process" }).close("process").toString();
		expect(xml).toBe('<process id="p1" name="My Process">\n</process>\n');
	});

	it("omits undefined attributes", () => {
		const w = new XmlWriter();
		const xml = w
			.open("task", { id: "t1", name: undefined, type: "service" })
			.close("task")
			.toString();
		expect(xml).toBe('<task id="t1" type="service">\n</task>\n');
	});

	it("escapes attribute values", () => {
		const w = new XmlWriter();
		const xml = w.selfClose("item", { value: 'a "quoted" & <special>' }).toString();
		expect(xml).toBe('<item value="a &quot;quoted&quot; &amp; &lt;special&gt;"/>\n');
	});

	it("writes self-closing tags", () => {
		const w = new XmlWriter();
		const xml = w.open("root").selfClose("empty", { id: "e1" }).close("root").toString();
		expect(xml).toBe('<root>\n  <empty id="e1"/>\n</root>\n');
	});

	it("writes text content", () => {
		const w = new XmlWriter();
		const xml = w.open("root").text("name", "Hello & World").close("root").toString();
		expect(xml).toBe("<root>\n  <name>Hello &amp; World</name>\n</root>\n");
	});

	it("writes text with attributes", () => {
		const w = new XmlWriter();
		const xml = w.open("root").text("field", "value", { name: "foo" }).close("root").toString();
		expect(xml).toBe('<root>\n  <field name="foo">value</field>\n</root>\n');
	});

	it("writes CDATA sections", () => {
		const w = new XmlWriter();
		const xml = w.open("root").cdata("condition", "${amount < 5000}").close("root").toString();
		expect(xml).toBe("<root>\n  <condition><![CDATA[${amount < 5000}]]></condition>\n</root>\n");
	});

	it("writes CDATA with attributes", () => {
		const w = new XmlWriter();
		const xml = w
			.open("root")
			.cdata("script", "x > 1", { language: "groovy" })
			.close("root")
			.toString();
		expect(xml).toBe('<root>\n  <script language="groovy"><![CDATA[x > 1]]></script>\n</root>\n');
	});

	it("writes raw content", () => {
		const w = new XmlWriter();
		const xml = w.raw("<!-- comment -->\n").open("root").close("root").toString();
		expect(xml).toBe("<!-- comment -->\n<root>\n</root>\n");
	});

	it("self-closing tag without attributes", () => {
		const w = new XmlWriter();
		const xml = w.selfClose("br").toString();
		expect(xml).toBe("<br/>\n");
	});

	it("combines declaration with document", () => {
		const w = new XmlWriter();
		const xml = w
			.declaration()
			.open("definitions", { xmlns: "http://example.com" })
			.selfClose("process", { id: "p1" })
			.close("definitions")
			.toString();

		expect(xml).toBe(
			'<?xml version="1.0" encoding="UTF-8"?>\n' +
				'<definitions xmlns="http://example.com">\n' +
				'  <process id="p1"/>\n' +
				"</definitions>\n",
		);
	});
});
