import { writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import type { ProcessDefinition } from "../../model/process-definition.js";
import { toBpmn } from "../../xml/serializer.js";

export interface CompileOptions {
	file: string;
	stdout: boolean;
	outDir?: string;
}

export async function compile(options: CompileOptions): Promise<void> {
	const filePath = resolve(options.file);

	let mod: Record<string, unknown>;
	try {
		mod = await import(filePath);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to import "${filePath}": ${message}`);
	}

	const definitions = findDefinitions(mod);

	if (definitions.length === 0) {
		throw new Error(
			`No ProcessDefinition exports found in "${options.file}". Export at least one value created with process().`,
		);
	}

	for (const def of definitions) {
		const xml = toBpmn(def);

		if (options.stdout) {
			process.stdout.write(xml);
		} else {
			const outDir = options.outDir ? resolve(options.outDir) : resolve(".");
			const outFile = resolve(outDir, `${def.id}.bpmn20.xml`);
			writeFileSync(outFile, xml, "utf-8");
			console.log(`Wrote ${outFile}`);
		}
	}
}

function isProcessDefinition(value: unknown): value is ProcessDefinition {
	return (
		typeof value === "object" &&
		value !== null &&
		"id" in value &&
		"elements" in value &&
		"flows" in value &&
		"isExecutable" in value
	);
}

function findDefinitions(mod: Record<string, unknown>): ProcessDefinition[] {
	const found: ProcessDefinition[] = [];
	for (const value of Object.values(mod)) {
		if (isProcessDefinition(value)) {
			found.push(value);
		}
	}
	return found;
}

export function outputFileName(inputFile: string): string {
	const base = basename(inputFile).replace(/\.(ts|js|mts|mjs)$/, "");
	return `${base}.bpmn20.xml`;
}
