/** Named examples shown in the playground */
export const EXAMPLES: Record<string, { label: string; code: string }> = {
  "order-approval": {
    label: "Order Approval",
    code: `import { expr, process, toBpmn } from "rill";

const orderApproval = process("order-approval", (p) => {
  const start = p.start("orderReceived");

  const validate = p.service("validateOrder", {
    delegate: "\${orderValidator}",
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

  // Call activity — invokes a separate process with variable mappings
  const fulfillment = p.call("fulfillOrder", {
    calledElement: "order-fulfillment",
    in: {
      orderId: "orderId",                     // pass orderId variable
      customerEmail: expr("order.email"),      // pass expression result
    },
    out: {
      trackingNumber: "trackingNumber",        // receive trackingNumber back
      shippingCost: "shippingCost",
    },
  });

  const sendReminder = p.service("sendReminder", { delegate: "\${emailService}" });
  const end = p.end("done");

  // Linear chains use pipe()
  p.pipe(start, validate, checkAmount);

  // Conditional splits use flow()
  p.flow(checkAmount, autoApprove, "\${amount < 5000}");
  p.flow(checkAmount, review, { id: "manualPath" });

  // Merge branches back, then call fulfillment
  p.pipe(autoApprove, fulfillment, end);
  p.pipe(review, fulfillment);
  p.pipe(reminder, sendReminder, end);
});

toBpmn(orderApproval);
`,
  },

  "loan-application": {
    label: "Loan Application",
    code: `import { expr, process, toBpmn } from "rill";

const loanApplication = process("loan-application", (p) => {
  const start = p.start("applicationReceived");

  // Run credit check and document verification in parallel
  const fork = p.parallel("parallelChecks");

  const creditCheck = p.service("creditCheck", {
    class: "com.example.CreditCheckService",
  });

  const verifyDocs = p.service("verifyDocuments", {
    delegate: "\${documentVerifier}",
  });

  const join = p.parallel("mergeResults");

  // Decision gateway based on credit score
  const decision = p.gateway("loanDecision", { default: "manualReviewPath" });

  const autoApprove = p.service("autoApprove", {
    delegate: "\${loanApprovalService}",
    fields: {
      template: "auto-approved",
      notifyChannel: expr("applicant.preferredChannel"),
    },
  });

  const autoReject = p.service("autoReject", {
    delegate: "\${loanApprovalService}",
    fields: { template: "auto-rejected" },
  });

  const manualReview = p.user("manualReview", {
    candidateGroups: ["loan-officers"],
    formKey: "loan-review-form",
    form: {
      approved: { type: "boolean", required: true },
      interestRate: { type: "string" },
      notes: { type: "string" },
    },
  });

  const reviewTimeout = p.timer("reviewTimeout", {
    attachedTo: manualReview,
    interrupting: true,
    duration: "P3D",
  });

  const escalate = p.user("escalate", {
    assignee: "senior-manager",
    formKey: "escalation-form",
    form: {
      approved: { type: "boolean", required: true },
    },
  });

  const end = p.end("done");

  // Parallel split and join
  p.pipe(start, fork);
  p.pipe(fork, creditCheck, join);
  p.pipe(fork, verifyDocs, join);

  // Decision after merge
  p.pipe(join, decision);

  // Conditional branches
  p.flow(decision, autoApprove, "\${creditScore >= 750}");
  p.flow(decision, autoReject, "\${creditScore < 400}");
  p.flow(decision, manualReview, { id: "manualReviewPath" });

  // All branches end
  p.pipe(autoApprove, end);
  p.pipe(autoReject, end);
  p.pipe(manualReview, end);
  p.pipe(reviewTimeout, escalate, end);
});

toBpmn(loanApplication);
`,
  },

  "hiring-pipeline": {
    label: "Hiring Pipeline",
    code: `import { expr, process, toBpmn } from "rill";

const hiringPipeline = process("hiring-pipeline", (p) => {
  const start = p.start("applicationReceived");

  const screenResume = p.service("screenResume", {
    class: "com.example.ResumeScreeningService",
  });

  const passesScreening = p.gateway("passesScreening", { default: "rejectedPath" });

  // Subprocess: encapsulates the multi-stage interview process
  const interviews = p.subprocess("interviewRounds", (sub) => {
    const subStart = sub.start("beginInterviews");

    const techInterview = sub.user("technicalInterview", {
      candidateGroups: ["engineers"],
      formKey: "tech-interview-form",
      form: {
        score: { type: "string", required: true },
        recommendation: { type: "string", required: true },
        notes: { type: "string" },
      },
    });

    const cultureInterview = sub.user("cultureInterview", {
      candidateGroups: ["hr"],
      formKey: "culture-interview-form",
      form: {
        score: { type: "string", required: true },
        recommendation: { type: "string", required: true },
      },
    });

    const managerInterview = sub.user("managerInterview", {
      candidateGroups: ["hiring-managers"],
      formKey: "manager-interview-form",
      form: {
        hire: { type: "boolean", required: true },
        salary: { type: "string" },
      },
    });

    const subEnd = sub.end("interviewsComplete");

    sub.pipe(subStart, techInterview, cultureInterview, managerInterview, subEnd);
  });

  // Error boundary: candidate withdraws during interviews
  const withdrawal = p.errorBoundary("candidateWithdrew", {
    attachedTo: interviews,
    errorRef: "CANDIDATE_WITHDREW",
  });

  const logWithdrawal = p.service("logWithdrawal", {
    delegate: "\${auditLogger}",
  });

  // After interviews: hire or reject
  const hiringDecision = p.gateway("hiringDecision", { default: "rejectedPath2" });

  const sendOffer = p.service("sendOffer", {
    delegate: "\${offerService}",
    fields: {
      template: "offer-letter",
      salary: expr("managerInterview.salary"),
    },
  });

  const sendRejection = p.service("sendRejection", {
    delegate: "\${notificationService}",
    fields: { template: "rejection" },
  });

  const screeningRejection = p.service("screeningRejection", {
    delegate: "\${notificationService}",
    fields: { template: "screening-rejection" },
  });

  const end = p.end("done");

  // Main flow
  p.pipe(start, screenResume, passesScreening);

  // Screening gate
  p.flow(passesScreening, interviews, "\${screeningScore >= 70}");
  p.flow(passesScreening, screeningRejection, { id: "rejectedPath" });

  // After interviews
  p.pipe(interviews, hiringDecision);
  p.flow(hiringDecision, sendOffer, "\${managerInterview.hire == true}");
  p.flow(hiringDecision, sendRejection, { id: "rejectedPath2" });

  // All paths end
  p.pipe(sendOffer, end);
  p.pipe(sendRejection, end);
  p.pipe(screeningRejection, end);

  // Withdrawal boundary path
  p.pipe(withdrawal, logWithdrawal, end);
});

toBpmn(hiringPipeline);
`,
  },
};

/** Keys of EXAMPLES in insertion order */
export const EXAMPLE_KEYS = Object.keys(EXAMPLES);

/** The default example key */
export const DEFAULT_KEY = EXAMPLE_KEYS[0];
