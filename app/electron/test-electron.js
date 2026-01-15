// Test file to debug Electron require
console.log('Testing electron require...');
console.log('process.versions:', process.versions);
console.log('process.type:', process.type);

try {
  const electron = require('electron');
  console.log('electron module type:', typeof electron);
  console.log('electron module keys:', Object.keys(electron));
  console.log('electron.app:', electron.app);
} catch (e) {
  console.error('Error requiring electron:', e);
}
