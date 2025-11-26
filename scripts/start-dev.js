#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const rootDir = path.join(__dirname, '..');
const isWindows = os.platform() === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log('🚀 Starting Broadcaster Application...\n');

// Start API
console.log('📡 Starting API server on port 3001...');
const api = spawn(npmCmd, ['run', 'dev', '-w', 'api'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

// Start UI after 1 second
setTimeout(() => {
  console.log('🎨 Starting UI dev server (Vite)...\n');
  
  const ui = spawn(npmCmd, ['run', 'dev', '-w', 'ui'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true
  });

  // Start Electron after 15 seconds (gives UI time to boot)
  setTimeout(() => {
    console.log('\n🖥️  Starting Electron window...\n');
    
    const electron = spawn(npmCmd, ['start'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true
    });
    
    electron.on('close', (code) => {
      console.log('\n👋 Electron closed');
      process.exit(code || 0);
    });

    electron.on('error', (err) => {
      console.error('❌ Electron error:', err);
      process.exit(1);
    });
  }, 15000);

  ui.on('error', (err) => {
    console.error('❌ UI error:', err);
  });
}, 1000);

api.on('error', (err) => {
  console.error('❌ API error:', err);
});

// Handle termination
process.on('SIGTERM', () => {
  api.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  api.kill();
  process.exit(0);
});
