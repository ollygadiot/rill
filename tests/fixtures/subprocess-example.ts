import { process } from "../../src/index.js";

export const subprocessExample = process("subprocess-example", (p) => {
	const start = p.start("start");

	const sub = p.subprocess("approvalSub", (sub) => {
		const subStart = sub.start("subStart");
		const review = sub.user("review", { assignee: "${initiator}" });
		const subEnd = sub.end("subEnd");
		sub.flow(subStart, review);
		sub.flow(review, subEnd);
	});

	const errBoundary = p.errorBoundary("onSubError", {
		attachedTo: sub,
		errorRef: "ERR_REJECTED",
	});

	const handleError = p.service("handleRejection", {
		delegate: "${rejectionHandler}",
	});

	const end = p.end("end");

	p.error("ERR_REJECTED", "REJECTED");

	p.flow(start, sub);
	p.flow(sub, end);
	p.flow(errBoundary, handleError);
	p.flow(handleError, end);
});
