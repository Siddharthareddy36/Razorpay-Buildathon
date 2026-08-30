const http = require('http');

function postQuery(query, context) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query, context });
    const req = http.request('http://localhost:5000/api/agent/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTestFlow() {
  console.log('=== MULTI-TURN CONVERSATIONAL COPILOT TEST SUITE ===\n');

  // Turn 1
  console.log('[Turn 1] Query: "Why is INV-SYNTH-10002 important?"');
  const res1 = await postQuery('Why is INV-SYNTH-10002 important?');
  console.log('  Intent:', res1.intent);
  console.log('  SourceLabel:', res1.sourceLabel);
  console.log('  Context:', JSON.stringify(res1.context));
  console.log('  Answer Snippet:', res1.answer?.slice(0, 150));
  console.log('----------------------------------------------------');

  // Turn 2
  console.log('[Turn 2] Query: "What about its customer?"');
  const res2 = await postQuery('What about its customer?', res1.context);
  console.log('  Intent:', res2.intent);
  console.log('  SourceLabel:', res2.sourceLabel);
  console.log('  Context:', JSON.stringify(res2.context));
  console.log('  Answer Snippet:', res2.answer?.slice(0, 150));
  console.log('----------------------------------------------------');

  // Turn 3
  console.log('[Turn 3] Query: "Has this customer broken promises?"');
  const res3 = await postQuery('Has this customer broken promises?', res2.context);
  console.log('  Intent:', res3.intent);
  console.log('  SourceLabel:', res3.sourceLabel);
  console.log('  Context:', JSON.stringify(res3.context));
  console.log('  Answer Snippet:', res3.answer?.slice(0, 150));
  console.log('----------------------------------------------------');

  // Turn 4
  console.log('[Turn 4] Query: "Any payment issues?"');
  const res4 = await postQuery('Any payment issues?', res3.context);
  console.log('  Intent:', res4.intent);
  console.log('  SourceLabel:', res4.sourceLabel);
  console.log('  Context:', JSON.stringify(res4.context));
  console.log('  Answer Snippet:', res4.answer?.slice(0, 150));
  console.log('----------------------------------------------------');

  // Turn 5
  console.log('[Turn 5] Query: "Start a new case"');
  const res5 = await postQuery('Start a new case', res4.context);
  console.log('  Intent:', res5.intent);
  console.log('  Context after reset:', JSON.stringify(res5.context));
  console.log('  Answer:', res5.answer);
  console.log('----------------------------------------------------');

  // Turn 6 (Ambiguity check post-reset)
  console.log('[Turn 6] Query: "What about its customer?" (post reset)');
  const res6 = await postQuery('What about its customer?', res5.context);
  console.log('  Intent:', res6.intent);
  console.log('  Answer:', res6.answer);
  console.log('----------------------------------------------------');

  console.log('\n=== MULTI-TURN TEST SUITE COMPLETED SUCCESSFULLY ===');
}

runTestFlow().catch(console.error);
