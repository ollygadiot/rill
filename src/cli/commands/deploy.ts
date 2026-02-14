import { resolve } from "node:path";
import { deploy as deployToFlowable } from "../../deploy/client.js";
import type { ProcessDefinition } from "../../model/process-definition.js";
import { toBpmn } from "../../xml/serializer.js";

export interface DeployCommandOptions {
	file: string;
	url: string;
	username?: string;
	password?: string;
	tenantId?: string;
}

export async function deployCommand(options: DeployCommandOptions): Promise<void> {
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
		const result = await deployToFlowable(def, xml, {
			url: options.url,
			auth:
				options.username && options.password
					? { username: options.username, password: options.password }
					: undefined,
			tenantId: options.tenantId,
		});
		console.log(`Deployed "${def.id}" → deployment ID: ${result.id}`);
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
