import { process, toBpmn } from "../src/index.js";

const vacationRequest = process("vacation-request", (p) => {
	const start = p.start("requestSubmitted");

	const approve = p.user("managerApproval", {
		candidateGroups: ["management"],
		formKey: "vacation-approval-form",
		form: {
			approved: { type: "boolean", required: true },
			reason: { type: "string" },
		},
	});

	const decision = p.gateway("approvalDecision");

	const notify = p.service("notifyEmployee", {
		delegate: "${notificationService}",
		fields: { template: "vacation-approved" },
	});

	const reject = p.service("notifyRejection", {
		delegate: "${notificationService}",
		fields: { template: "vacation-rejected" },
	});

	const updateCalendar = p.service("updateCalendar", {
		class: "com.example.CalendarService",
	});

	const end = p.end("done");

	p.flow(start, approve);
	p.flow(approve, decision);
	p.flow(decision, notify, "${approved}");
	p.flow(decision, reject, "${!approved}");
	p.flow(notify, updateCalendar);
	p.flow(updateCalendar, end);
	p.flow(reject, end);
});

console.log(toBpmn(vacationRequest));
