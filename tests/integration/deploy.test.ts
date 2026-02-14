import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deploy } from "../../src/deploy/client.js";
import type { ProcessDefinition } from "../../src/model/process-definition.js";

const mockDefinition: ProcessDefinition = {
	id: "test-process",
	name: "Test Process",
	isExecutable: true,
	elements: [],
	flows: [],
	errors: [],
};

const mockXml = '<?xml version="1.0"?><definitions/>';

describe("deploy client", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("sends POST to /repository/deployments", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					id: "dep-123",
					name: "test-process",
					deploymentTime: "2024-01-01T00:00:00Z",
				}),
		});
		globalThis.fetch = mockFetch;

		await deploy(mockDefinition, mockXml, {
			url: "http://localhost:8080/flowable-rest",
		});

		expect(mockFetch).toHaveBeenCalledOnce();
		const [url, options] = mockFetch.mock.calls[0];
		expect(url).toBe("http://localhost:8080/flowable-rest/repository/deployments");
		expect(options.method).toBe("POST");
	});

	it("includes multipart content type", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ id: "dep-123", name: "test", deploymentTime: "now" }),
		});
		globalThis.fetch = mockFetch;

		await deploy(mockDefinition, mockXml, { url: "http://localhost:8080" });

		const [, options] = mockFetch.mock.calls[0];
		expect(options.headers["Content-Type"]).toMatch(/^multipart\/form-data; boundary=/);
	});

	it("includes basic auth header when credentials provided", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ id: "dep-123", name: "test", deploymentTime: "now" }),
		});
		globalThis.fetch = mockFetch;

		await deploy(mockDefinition, mockXml, {
			url: "http://localhost:8080",
			auth: { username: "admin", password: "test" },
		});

		const [, options] = mockFetch.mock.calls[0];
		const expected = btoa("admin:test");
		expect(options.headers.Authorization).toBe(`Basic ${expected}`);
	});

	it("does not include auth header when no credentials", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ id: "dep-123", name: "test", deploymentTime: "now" }),
		});
		globalThis.fetch = mockFetch;

		await deploy(mockDefinition, mockXml, { url: "http://localhost:8080" });

		const [, options] = mockFetch.mock.calls[0];
		expect(options.headers.Authorization).toBeUndefined();
	});

	it("includes deployment name and file in body", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ id: "dep-123", name: "test", deploymentTime: "now" }),
		});
		globalThis.fetch = mockFetch;

		await deploy(mockDefinition, mockXml, { url: "http://localhost:8080" });

		const [, options] = mockFetch.mock.calls[0];
		const body: string = options.body;
		expect(body).toContain('name="deploymentName"');
		expect(body).toContain("test-process");
		expect(body).toContain('filename="test-process.bpmn20.xml"');
		expect(body).toContain(mockXml);
	});

	it("includes tenant ID when provided", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ id: "dep-123", name: "test", deploymentTime: "now" }),
		});
		globalThis.fetch = mockFetch;

		await deploy(mockDefinition, mockXml, {
			url: "http://localhost:8080",
			tenantId: "tenant-1",
		});

		const [, options] = mockFetch.mock.calls[0];
		const body: string = options.body;
		expect(body).toContain('name="tenantId"');
		expect(body).toContain("tenant-1");
	});

	it("returns deploy result on success", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					id: "dep-456",
					name: "test-process",
					deploymentTime: "2024-01-01T12:00:00Z",
				}),
		});
		globalThis.fetch = mockFetch;

		const result = await deploy(mockDefinition, mockXml, {
			url: "http://localhost:8080",
		});

		expect(result.id).toBe("dep-456");
		expect(result.name).toBe("test-process");
	});

	it("throws on non-OK response", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			text: () => Promise.resolve("Internal Server Error"),
		});
		globalThis.fetch = mockFetch;

		await expect(deploy(mockDefinition, mockXml, { url: "http://localhost:8080" })).rejects.toThrow(
			"Deploy failed (500): Internal Server Error",
		);
	});

	it("strips trailing slashes from URL", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ id: "dep-123", name: "test", deploymentTime: "now" }),
		});
		globalThis.fetch = mockFetch;

		await deploy(mockDefinition, mockXml, {
			url: "http://localhost:8080///",
		});

		const [url] = mockFetch.mock.calls[0];
		expect(url).toBe("http://localhost:8080/repository/deployments");
	});
});
