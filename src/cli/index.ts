#!/usr/bin/env node

import { parseArgs } from "node:util";
import { compile } from "./commands/compile.js";
import { deployCommand } from "./commands/deploy.js";

const USAGE = `rill - TypeScript DSL that compiles to Flowable BPMN 2.0 XML

Usage:
  rill compile <file.ts> [options]
  rill deploy <file.ts> --url <flowable-url> [options]

Commands:
  compile    Compile a TypeScript process definition to .bpmn20.xml
  deploy     Compile and deploy to a Flowable instance

Compile options:
  --stdout         Write XML to stdout instead of file
  --out-dir <dir>  Output directory (default: current directory)

Deploy options:
  --url <url>            Flowable REST API base URL (required)
  --username <user>      Basic auth username
  --password <pass>      Basic auth password
  --tenant-id <id>       Tenant ID for multi-tenant deployments
`;

async function main(): Promise<void> {
	const args = process.argv.slice(2);

	if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
		console.log(USAGE);
		process.exit(0);
	}

	const command = args[0];
	const rest = args.slice(1);

	switch (command) {
		case "compile":
			await handleCompile(rest);
			break;
		case "deploy":
			await handleDeploy(rest);
			break;
		default:
			console.error(`Unknown command: ${command}\n`);
			console.log(USAGE);
			process.exit(1);
	}
}

async function handleCompile(args: string[]): Promise<void> {
	const { values, positionals } = parseArgs({
		args,
		options: {
			stdout: { type: "boolean", default: false },
			"out-dir": { type: "string" },
			help: { type: "boolean", short: "h" },
		},
		allowPositionals: true,
	});

	if (values.help) {
		console.log(USAGE);
		process.exit(0);
	}

	if (positionals.length === 0) {
		console.error("Error: No input file specified.\n");
		console.log(USAGE);
		process.exit(1);
	}

	await compile({
		file: positionals[0],
		stdout: values.stdout ?? false,
		outDir: values["out-dir"],
	});
}

async function handleDeploy(args: string[]): Promise<void> {
	const { values, positionals } = parseArgs({
		args,
		options: {
			url: { type: "string" },
			username: { type: "string" },
			password: { type: "string" },
			"tenant-id": { type: "string" },
			help: { type: "boolean", short: "h" },
		},
		allowPositionals: true,
	});

	if (values.help) {
		console.log(USAGE);
		process.exit(0);
	}

	if (positionals.length === 0) {
		console.error("Error: No input file specified.\n");
		console.log(USAGE);
		process.exit(1);
	}

	if (!values.url) {
		console.error("Error: --url is required for deploy.\n");
		console.log(USAGE);
		process.exit(1);
	}

	await deployCommand({
		file: positionals[0],
		url: values.url,
		username: values.username,
		password: values.password,
		tenantId: values["tenant-id"],
	});
}

main().catch((err) => {
	console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
	process.exit(1);
});
