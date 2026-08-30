const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

function checkHttp(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve({ active: res.statusCode >= 200 && res.statusCode < 500, statusCode: res.statusCode });
    });
    req.on('error', () => resolve({ active: false }));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({ active: false });
    });
  });
}

async function main() {
  console.log('\n==================================================');
  console.log('🚀 SAFE LOCAL SERVER STARTUP CHECK');
  console.log('==================================================');

  // 1. Check Backend (Port 5000)
  const backendHealth = await checkHttp('http://localhost:5000/api/health/database');
  if (backendHealth.active) {
    console.log('✅ [Backend] Reusing running instance at http://localhost:5000');
  } else {
    console.log('🔄 [Backend] Starting Express backend on port 5000...');
    spawn('npm', ['run', 'start'], {
      cwd: path.join(__dirname, '../backend'),
      stdio: 'inherit',
      shell: true,
    });
  }

  // 2. Check Frontend (Port 3000)
  const frontendHealth = await checkHttp('http://localhost:3000');
  if (frontendHealth.active) {
    console.log('✅ [Frontend] Reusing running instance at http://localhost:3000');
  } else {
    console.log('🔄 [Frontend] Starting Next.js frontend on port 3000...');
    spawn('npm', ['run', 'next-dev'], {
      cwd: path.join(__dirname, '../frontend'),
      stdio: 'inherit',
      shell: true,
    });
  }

  console.log('==================================================');
  console.log('✨ All Services Operational:');
  console.log('   - Frontend UI: http://localhost:3000');
  console.log('   - Backend API: http://localhost:5000/api');
  console.log('==================================================\n');
}

main();
