export class XmlWriter {
	private parts: string[] = [];
	private depth = 0;
	private indentStr = "  ";

	declaration(): this {
		this.parts.push('<?xml version="1.0" encoding="UTF-8"?>\n');
		return this;
	}

	open(tag: string, attrs?: Record<string, string | undefined>): this {
		this.parts.push(this.indent());
		this.parts.push(`<${tag}`);
		this.writeAttrs(attrs);
		this.parts.push(">\n");
		this.depth++;
		return this;
	}

	close(tag: string): this {
		this.depth--;
		this.parts.push(this.indent());
		this.parts.push(`</${tag}>\n`);
		return this;
	}

	selfClose(tag: string, attrs?: Record<string, string | undefined>): this {
		this.parts.push(this.indent());
		this.parts.push(`<${tag}`);
		this.writeAttrs(attrs);
		this.parts.push("/>\n");
		return this;
	}

	text(tag: string, content: string, attrs?: Record<string, string | undefined>): this {
		this.parts.push(this.indent());
		this.parts.push(`<${tag}`);
		this.writeAttrs(attrs);
		this.parts.push(`>${escapeXml(content)}</${tag}>\n`);
		return this;
	}

	cdata(tag: string, content: string, attrs?: Record<string, string | undefined>): this {
		this.parts.push(this.indent());
		this.parts.push(`<${tag}`);
		this.writeAttrs(attrs);
		this.parts.push(`><![CDATA[${content}]]></${tag}>\n`);
		return this;
	}

	raw(content: string): this {
		this.parts.push(content);
		return this;
	}

	toString(): string {
		return this.parts.join("");
	}

	private indent(): string {
		return this.indentStr.repeat(this.depth);
	}

	private writeAttrs(attrs?: Record<string, string | undefined>): void {
		if (!attrs) return;
		for (const [key, value] of Object.entries(attrs)) {
			if (value === undefined) continue;
			this.parts.push(` ${key}="${escapeXml(value)}"`);
		}
	}
}

export function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
