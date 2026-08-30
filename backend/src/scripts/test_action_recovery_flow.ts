import http from 'http';

function postJson(path: string, body: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({ status: res.statusCode || 500, data: parsed });
        });
      }
    );
    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

async function runActionAndRecoverySuite() {
  console.log('==================================================');
  console.log('🧪 ACTION PLANNER & RECOVERY OUTCOME TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let total = 0;

  function assertTest(id: number, name: string, condition: boolean, details: string) {
    total++;
    const idStr = String(id).padStart(2, '0');
    if (condition) {
      passed++;
      console.log(`✅ TEST ${idStr} [${name}]: PASSED — ${details}`);
    } else {
      console.error(`❌ TEST ${idStr} [${name}]: FAILED — ${details}`);
    }
  }

  let generatedPlan: any = null;

  // 1. Generate Action Plan for INV-SYNTH-10002
  try {
    const planRes = await postJson('/api/agents/actions/plan', {
      query: 'Check status and plan recovery for INV-SYNTH-10002',
      invoiceId: 'dff7fd4d-b27a-4afb-8f1b-ca8a7fcdc6b0',
    });
    generatedPlan = planRes.data;
    const isValidPlan =
      planRes.status === 200 &&
      Boolean(generatedPlan?.actionId) &&
      Boolean(generatedPlan?.idempotencyKey) &&
      Boolean(generatedPlan?.actionType) &&
      Boolean(generatedPlan?.policyDecision);
    assertTest(
      1,
      'Action Plan Generation',
      isValidPlan,
      `HTTP ${planRes.status} | Action: ${generatedPlan?.actionType} | Key: ${generatedPlan?.idempotencyKey}`
    );
  } catch (err: any) {
    assertTest(1, 'Action Plan Generation', false, err?.message);
  }

  // 2. Action Plan Eligibility & Safety Attributes
  try {
    const d = generatedPlan || {};
    const hasEligibilityFields =
      typeof d.requiresApproval === 'boolean' &&
      Boolean(d.approvalStatus) &&
      Boolean(d.priority) &&
      Boolean(d.channel);
    assertTest(
      2,
      'Action Plan Eligibility Contract',
      hasEligibilityFields,
      `Approval Required: ${d.requiresApproval} (${d.approvalStatus}) | Priority: ${d.priority}`
    );
  } catch (err: any) {
    assertTest(2, 'Action Plan Eligibility Contract', false, err?.message);
  }

  // 3. Execute Action Plan via n8n Runner with Operator Approval
  let executionResData: any = null;
  try {
    if (generatedPlan) {
      const execRes = await postJson('/api/agents/actions/execute', {
        actionPlan: generatedPlan,
        humanApproval: true,
        approvalNotes: 'Approved by finance supervisor for operational dispatch',
      });
      executionResData = execRes.data;
      assertTest(
        3,
        'Action Execution via n8n Engine',
        execRes.status === 200 && executionResData?.success === true && executionResData?.status === 'COMPLETED',
        `HTTP ${execRes.status} | Execution Status: ${executionResData?.status} | Provider: ${executionResData?.providerResult?.provider}`
      );
    } else {
      assertTest(3, 'Action Execution via n8n Engine', false, 'Action plan was not generated');
    }
  } catch (err: any) {
    assertTest(3, 'Action Execution via n8n Engine', false, err?.message);
  }

  // 4. Idempotency Suppression Verification
  try {
    if (generatedPlan) {
      const duplicateRes = await postJson('/api/agents/actions/execute', {
        actionPlan: generatedPlan,
        humanApproval: true,
      });
      const d = duplicateRes.data || {};
      assertTest(
        4,
        'Idempotency Suppression',
        duplicateRes.status === 200 && d.status === 'BLOCKED_IDEMPOTENCY',
        `HTTP ${duplicateRes.status} | Status: ${d.status} | Key: ${d.idempotencyKey}`
      );
    } else {
      assertTest(4, 'Idempotency Suppression', false, 'Action plan was not generated');
    }
  } catch (err: any) {
    assertTest(4, 'Idempotency Suppression', false, err?.message);
  }

  // 5. Unapproved Execution Blocking Verification
  try {
    const unapprovedPlan = {
      actionId: 'test-action-unapproved',
      requestId: 'test-req-unapproved',
      idempotencyKey: 'TEST-UNAPPROVED-KEY-999',
      actionType: 'SEND_PAYMENT_REMINDER',
      entityType: 'INVOICE',
      invoiceId: 'dff7fd4d-b27a-4afb-8f1b-ca8a7fcdc6b0',
      reason: 'Testing unapproved blocking',
      priority: 'HIGH',
      channel: 'EMAIL',
      policyDecision: 'HUMAN_REVIEW',
      policyReason: 'Human review required',
      requiresApproval: true,
      approvalStatus: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
    };
    const blockRes = await postJson('/api/agents/actions/execute', {
      actionPlan: unapprovedPlan,
      humanApproval: false,
    });
    const d = blockRes.data || {};
    assertTest(
      5,
      'Unapproved Action Suppression',
      d.success === false && d.status === 'BLOCKED_HUMAN_REJECTED',
      `HTTP ${blockRes.status} | Status: ${d.status}`
    );
  } catch (err: any) {
    assertTest(5, 'Unapproved Action Suppression', false, err?.message);
  }

  // 6. Paid Invoice Real-Time Ledger Re-Check Verification
  try {
    const paidInvoicePlan = {
      actionId: 'test-action-paid',
      requestId: 'test-req-paid',
      idempotencyKey: 'TEST-PAID-KEY-888',
      actionType: 'SEND_PAYMENT_REMINDER',
      entityType: 'INVOICE',
      invoiceId: '00000000-0000-0000-0000-000000000000',
      reason: 'Testing paid invoice re-check',
      priority: 'HIGH',
      channel: 'EMAIL',
      policyDecision: 'APPROVED',
      policyReason: 'Approved',
      requiresApproval: false,
      approvalStatus: 'NOT_REQUIRED',
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
    };
    const paidRes = await postJson('/api/agents/actions/execute', {
      actionPlan: paidInvoicePlan,
      humanApproval: true,
    });
    const d = paidRes.data || {};
    assertTest(
      6,
      'Real-Time Ledger Re-check (Paid Invoice Block)',
      d.success === false && d.status === 'BLOCKED_PAID_INVOICE',
      `HTTP ${paidRes.status} | Status: ${d.status}`
    );
  } catch (err: any) {
    assertTest(6, 'Real-Time Ledger Re-check (Paid Invoice Block)', false, err?.message);
  }

  // 7. Closed-Loop Recovery Outcome Tracking via Supabase Payment Allocations
  try {
    const outcomeRes = await postJson('/api/agents/actions/outcome', {
      invoiceId: 'dff7fd4d-b27a-4afb-8f1b-ca8a7fcdc6b0',
      actionId: generatedPlan?.actionId || 'action-synth-1002',
      observationWindowHours: 72,
    });
    const d = outcomeRes.data || {};
    const isValidOutcome =
      outcomeRes.status === 200 &&
      d.success === true &&
      typeof d.outstandingBefore === 'number' &&
      typeof d.outstandingAfter === 'number' &&
      typeof d.recoveredAmount === 'number' &&
      typeof d.recoveryRatePercentage === 'number' &&
      Boolean(d.outcomeStatus);
    assertTest(
      7,
      'Independent Recovery Outcome Tracking',
      isValidOutcome,
      `HTTP ${outcomeRes.status} | Recovered: ₹${d.recoveredAmount} (${d.recoveryRatePercentage}%) | Status: ${d.outcomeStatus}`
    );
  } catch (err: any) {
    assertTest(7, 'Independent Recovery Outcome Tracking', false, err?.message);
  }

  console.log('\n==================================================');
  console.log(`📊 ACTION & RECOVERY TEST SUITE: ${passed} / ${total} PASSED (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('==================================================\n');

  if (passed < total) {
    process.exit(1);
  }
}

runActionAndRecoverySuite();
