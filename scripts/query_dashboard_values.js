const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'backend', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2 && !line.startsWith('#')) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      process.env[key] = val;
    }
  });
}

const { DatabaseService } = require('../backend/dist/services/database.service.js');

async function checkSummary() {
  const summary = await DatabaseService.getDashboardSummary();
  console.log('--- DASHBOARD SUMMARY VALUES FROM BACKEND SERVICE ---');
  console.log(JSON.stringify(summary, null, 2));
}

checkSummary().catch(console.error);
