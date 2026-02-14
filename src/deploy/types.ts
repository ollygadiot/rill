export interface DeployOptions {
	url: string;
	auth?: {
		username: string;
		password: string;
	};
	tenantId?: string;
}

export interface DeployResult {
	id: string;
	name: string;
	deploymentTime: string;
	tenantId?: string;
}
