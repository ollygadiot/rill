import type { ProcessDefinition } from "../model/process-definition.js";
import type { DeployOptions, DeployResult } from "./types.js";

export async function deploy(
	definition: ProcessDefinition,
	xml: string,
	options: DeployOptions,
): Promise<DeployResult> {
	const boundary = `----rill-${Date.now()}`;
	const fileName = `${definition.id}.bpmn20.xml`;

	const body = buildMultipartBody(boundary, fileName, xml, definition.id, options.tenantId);

	const headers: Record<string, string> = {
		"Content-Type": `multipart/form-data; boundary=${boundary}`,
	};

	if (options.auth) {
		const credentials = btoa(`${options.auth.username}:${options.auth.password}`);
		headers.Authorization = `Basic ${credentials}`;
	}

	const url = options.url.replace(/\/+$/, "");
	const response = await fetch(`${url}/repository/deployments`, {
		method: "POST",
		headers,
		body,
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Deploy failed (${response.status}): ${text}`);
	}

	const result = (await response.json()) as DeployResult;
	return result;
}

function buildMultipartBody(
	boundary: string,
	fileName: string,
	xml: string,
	deploymentName: string,
	tenantId?: string,
): string {
	const parts: string[] = [];

	// Deployment name field
	parts.push(`--${boundary}`);
	parts.push('Content-Disposition: form-data; name="deploymentName"');
	parts.push("");
	parts.push(deploymentName);

	// Tenant ID field (optional)
	if (tenantId) {
		parts.push(`--${boundary}`);
		parts.push('Content-Disposition: form-data; name="tenantId"');
		parts.push("");
		parts.push(tenantId);
	}

	// BPMN file
	parts.push(`--${boundary}`);
	parts.push(`Content-Disposition: form-data; name="file"; filename="${fileName}"`);
	parts.push("Content-Type: application/xml");
	parts.push("");
	parts.push(xml);

	// Closing boundary
	parts.push(`--${boundary}--`);

	return parts.join("\r\n");
}
