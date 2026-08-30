const http = require('http');
const { spawn } = require('child_process');

const mode = process.argv[2] || 'dev';
const targetPort = 3000;

const req = http.get(`http://localhost:${targetPort}`, (res) => {
  console.log(`\n==================================================`);
  console.log(`ℹ️ PORT ${targetPort} IS ALREADY IN USE`);
  console.log(`The frontend application is already running on port ${targetPort}.`);
  console.log(`Active application URL: http://localhost:${targetPort}`);
  console.log(`==================================================\n`);
  process.exit(0);
});

req.on('error', () => {
  // Port 3000 is free, start Next.js explicitly on port 3000
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const args = ['next', mode === 'start' ? 'start' : 'dev', '-p', '3000'];
  
  const child = spawn(npxCmd, args, {
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
});

req.setTimeout(1000, () => {
  req.destroy();
  console.log(`\n==================================================`);
  console.log(`ℹ️ PORT ${targetPort} IS ALREADY IN USE`);
  console.log(`The frontend application is already running on port ${targetPort}.`);
  console.log(`Active application URL: http://localhost:${targetPort}`);
  console.log(`==================================================\n`);
  process.exit(0);
});
