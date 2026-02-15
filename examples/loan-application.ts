import { expr, process, toBpmn } from "../src/index.js";

const loanApplication = process("loan-application", (p) => {
	const applicantId = p.var("applicantId", String);
	const amount = p.var("amount", Number);

	const start = p.start("applicationReceived");

	// Enrich with credit score from external service
	const creditCheck = p.call("creditCheck", {
		calledElement: "credit-score-check",
		in: {
			applicantId: "applicantId",
			ssn: expr("application.ssn"),
		},
		out: {
			creditScore: "creditScore",
			riskCategory: "riskCategory",
		},
	});

	// Three-way split on risk category
	const riskGateway = p.gateway("assessRisk", { default: "standardPath" });

	// Low risk: auto-approve up to a limit
	const autoApprove = p.script("autoApprove", {
		script: [
			'def maxAuto = creditScore > 750 ? 50000 : 25000',
			'execution.setVariable("approved", amount <= maxAuto)',
			'execution.setVariable("interestRate", creditScore > 750 ? 3.5 : 5.2)',
		].join("\n"),
		in: [amount],
		out: { approved: Boolean, interestRate: Number },
	});

	// Standard risk: manual underwriting
	const underwrite = p.user("manualUnderwriting", {
		name: "Manual Underwriting",
		candidateGroups: ["underwriters"],
		formKey: "underwriting-form",
		out: { approved: Boolean, interestRate: Number, conditions: String },
		form: {
			approved: { type: "boolean", required: true },
			interestRate: { type: "double", required: true },
			conditions: { type: "string" },
		},
	});

	const { approved } = underwrite;

	const escalationTimer = p.timer("escalationTimer", {
		attachedTo: underwrite,
		interrupting: false,
		duration: "P3D",
	});

	const escalate = p.service("escalateReview", {
		delegate: "${notificationService}",
		fields: { template: "underwriting-escalation" },
	});

	// High risk: reject
	const reject = p.service("rejectApplication", {
		delegate: "${notificationService}",
		fields: {
			template: "loan-rejected",
			reason: expr("'Risk category: ' + riskCategory"),
		},
	});

	// After auto-approve or underwriting, check the decision
	const decisionGateway = p.gateway("checkDecision", { default: "rejectedPath" });

	// Approved path: generate offer and send docs
	const generateOffer = p.service("generateOffer", {
		class: "com.example.loan.OfferGenerator",
	});

	const sendDocs = p.call("sendDocuments", {
		calledElement: "document-generation",
		in: {
			applicantId: "applicantId",
			loanAmount: "amount",
			rate: "interestRate",
			templateName: expr("approved ? 'offer-letter' : 'rejection-letter'"),
		},
		out: {
			documentRef: "documentRef",
		},
	});

	const end = p.end("done");
	const rejectedEnd = p.end("rejected");

	// Main flow
	p.pipe(start, creditCheck, riskGateway);

	// Risk-based branching (JUEL conditions)
	p.flow(riskGateway, autoApprove, "${riskCategory == 'LOW' && amount <= 50000}");
	p.flow(riskGateway, reject, "${riskCategory == 'HIGH' || creditScore < 500}");
	p.flow(riskGateway, underwrite, { id: "standardPath" });

	// Escalation on slow underwriting
	p.pipe(escalationTimer, escalate);

	// Both approval paths merge at decision check
	p.flow(autoApprove, decisionGateway);
	p.flow(underwrite, decisionGateway);

	// Decision outcome
	p.flow(decisionGateway, generateOffer, approved);
	p.flow(decisionGateway, reject, { id: "rejectedPath" });

	// Approved: generate offer, send docs, done
	p.pipe(generateOffer, sendDocs, end);

	// Rejected paths
	p.flow(reject, rejectedEnd);
});

console.log(toBpmn(loanApplication));
