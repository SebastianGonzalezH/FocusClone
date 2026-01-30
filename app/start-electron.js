// Helper script to start Electron with ELECTRON_RUN_AS_NODE unset
delete process.env.ELECTRON_RUN_AS_NODE;

const { spawn } = require('child_process');
const path = require('path');

const electron = require('electron');
const electronPath = typeof electron === 'string' ? electron : electron.toString();

const child = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: undefined
  }
});

child.on('close', (code) => {
  process.exit(code);
});
