import { expr, process, toBpmn } from "../src/index.js";

const orderApproval = process("order-approval", (p) => {
	const start = p.start("orderReceived");

	const validate = p.service("validateOrder", {
		delegate: "${orderValidator}",
		fields: {
			minAmount: "50",
			maxAmount: expr("config.maxOrderAmount"),
		},
	});

	const checkAmount = p.gateway("checkAmount", { default: "manualPath" });

	const autoApprove = p.service("autoApprove", {
		class: "com.example.AutoApproveService",
	});

	const review = p.user("manualReview", {
		candidateGroups: ["managers"],
		formKey: "approval-form",
		form: {
			approved: { type: "boolean", required: true },
			comments: { type: "string" },
		},
	});

	const reminder = p.timer("reminderTimer", {
		attachedTo: review,
		interrupting: false,
		cycle: "R2/PT6H",
	});

	const sendReminder = p.service("sendReminder", { delegate: "${emailService}" });
	const end = p.end("done");

	p.flow(start, validate);
	p.flow(validate, checkAmount);
	p.flow(checkAmount, autoApprove, "${amount < 5000}");
	p.flow(checkAmount, review, { id: "manualPath" });
	p.flow(autoApprove, end);
	p.flow(review, end);
	p.flow(reminder, sendReminder);
	p.flow(sendReminder, end);
});

console.log(toBpmn(orderApproval));
