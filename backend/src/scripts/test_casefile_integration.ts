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

async function runCaseFileIntegrationSuite() {
  console.log('==================================================');
  console.log('🧪 FINANCIAL CASE FILE INTEGRATION TEST SUITE');
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

  // 1. Direct P2P Integration Check
  try {
    const p2pRes = await postJson('/api/agents/promises/run', {
      promiseId: 'c3fb7561-b0da-405a-a075-855df96c55b8',
      invoiceId: 'dff7fd4d-b27a-4afb-8f1b-ca8a7fcdc6b0',
    });
    assertTest(
      1,
      'P2P Specialist Integration',
      p2pRes.status === 200 && p2pRes.data?.success === true && p2pRes.data?.invoiceNumber === 'INV-SYNTH-10002',
      `HTTP ${p2pRes.status} | Promise Assessment: ${p2pRes.data?.promiseAssessment} | Policy: ${p2pRes.data?.policyDecision}`
    );
  } catch (err: any) {
    assertTest(1, 'P2P Specialist Integration', false, err?.message);
  }

  // 2. P2P Execution Facts & Fields Verification
  try {
    const p2pRes = await postJson('/api/agents/promises/run', {
      invoiceId: 'dff7fd4d-b27a-4afb-8f1b-ca8a7fcdc6b0',
    });
    const d = p2pRes.data || {};
    const hasRequiredFields =
      Boolean(d.promiseId) &&
      Boolean(d.invoiceId) &&
      Boolean(d.customerName) &&
      typeof d.promisedAmount === 'number' &&
      Boolean(d.commitmentReliability) &&
      Boolean(d.policyDecision);
    assertTest(
      2,
      'P2P Response Data Contract',
      p2pRes.status === 200 && hasRequiredFields,
      `Fields validated. Customer: ${d.customerName}, Amount: ₹${d.promisedAmount}`
    );
  } catch (err: any) {
    assertTest(2, 'P2P Response Data Contract', false, err?.message);
  }

  // 3. P2P Invalid Lookup Handling
  try {
    const p2pRes = await postJson('/api/agents/promises/run', {
      promiseId: '00000000-0000-0000-0000-000000000999',
    });
    assertTest(
      3,
      'P2P Non-Existent Record Handling',
      p2pRes.status === 404,
      `HTTP ${p2pRes.status} returned as expected for invalid lookup`
    );
  } catch (err: any) {
    assertTest(3, 'P2P Non-Existent Record Handling', false, err?.message);
  }

  // 4. Multi-Agent Supervisor Case File Integration
  try {
    const supRes = await postJson('/api/agents/supervisor/run', {
      query: 'Why is INV-SYNTH-10002 still outstanding?',
      invoiceNumber: 'INV-SYNTH-10002',
    });
    assertTest(
      4,
      'Multi-Agent Supervisor Case File Integration',
      supRes.status === 200 && supRes.data?.success === true,
      `HTTP ${supRes.status} | Intent: ${supRes.data?.intent} | Selected: ${supRes.data?.selectedAgents?.join(', ')}`
    );
  } catch (err: any) {
    assertTest(4, 'Multi-Agent Supervisor Case File Integration', false, err?.message);
  }

  // 5. Supervisor Executive Facts Contract
  try {
    const supRes = await postJson('/api/agents/supervisor/run', {
      query: 'Why is INV-SYNTH-10002 still outstanding?',
      invoiceNumber: 'INV-SYNTH-10002',
    });
    const d = supRes.data || {};
    const hasFacts =
      Boolean(d.executiveSummary) &&
      Boolean(d.financialFacts?.customerName) &&
      d.financialFacts?.customerName !== 'Customer Account' &&
      Array.isArray(d.crossAgentFindings) &&
      Boolean(d.recommendedAction);
    assertTest(
      5,
      'Supervisor Response Data Contract',
      supRes.status === 200 && hasFacts,
      `Facts verified. Customer: ${d.financialFacts?.customerName}, Findings: ${d.crossAgentFindings?.length}`
    );
  } catch (err: any) {
    assertTest(5, 'Supervisor Response Data Contract', false, err?.message);
  }

  // 6. Supervisor Empty Query Validation
  try {
    const supRes = await postJson('/api/agents/supervisor/run', {
      query: '',
    });
    assertTest(
      6,
      'Supervisor Empty Query Validation',
      supRes.status === 400,
      `HTTP ${supRes.status} returned as expected for empty query`
    );
  } catch (err: any) {
    assertTest(6, 'Supervisor Empty Query Validation', false, err?.message);
  }

  // 7. Reconciliation Specialist Integration
  try {
    const recRes = await postJson('/api/agents/reconciliation/run', {
      invoiceNumber: 'INV-SYNTH-10002',
    });
    assertTest(
      7,
      'Reconciliation Specialist Integration',
      recRes.status === 200 || recRes.status === 404,
      `HTTP ${recRes.status} returned cleanly from Reconciliation route`
    );
  } catch (err: any) {
    assertTest(7, 'Reconciliation Specialist Integration', false, err?.message);
  }

  console.log('\n==================================================');
  console.log(`📊 INTEGRATION TEST SUITE: ${passed} / ${total} PASSED (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('==================================================\n');

  if (passed < total) {
    process.exit(1);
  }
}

runCaseFileIntegrationSuite();
