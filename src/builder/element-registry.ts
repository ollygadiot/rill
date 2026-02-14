export class ElementRegistry {
	private ids = new Set<string>();

	register(id: string): void {
		if (this.ids.has(id)) {
			throw new Error(`Duplicate element ID: "${id}"`);
		}
		this.ids.add(id);
	}

	has(id: string): boolean {
		return this.ids.has(id);
	}

	all(): ReadonlySet<string> {
		return this.ids;
	}
}
