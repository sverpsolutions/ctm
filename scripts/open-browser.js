const http = require('http');
const { exec } = require('child_process');

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_HEALTH_URL = 'http://127.0.0.1:5000/api/health';
const MAX_ATTEMPTS = 60; // 30 seconds total (60 * 500ms)
let attempts = 0;

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function openBrowser(url) {
  const startCmd = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
    ? `open "${url}"`
    : `xdg-open "${url}"`;

  exec(startCmd, (err) => {
    if (err) {
      if (process.platform === 'win32') {
        exec(`explorer "${url}"`);
      }
    }
  });
}

async function pollAndOpen() {
  console.log('[Launcher] Waiting for services to be ready...');

  const interval = setInterval(async () => {
    attempts++;

    const [frontendReady, backendReady] = await Promise.all([
      checkUrl(FRONTEND_URL),
      checkUrl(BACKEND_HEALTH_URL),
    ]);

    if (frontendReady && backendReady) {
      clearInterval(interval);
      console.log('\n=============================================================');
      console.log('  APPLICATION IS READY!');
      console.log(`  Opening portal in your browser: ${FRONTEND_URL}`);
      console.log('=============================================================\n');
      openBrowser(FRONTEND_URL);
      setTimeout(() => process.exit(0), 1000);
      return;
    }

    if (attempts >= MAX_ATTEMPTS) {
      clearInterval(interval);
      console.log('\n[Launcher] Startup timeout reached.');
      console.log(`[Launcher] Please open your browser manually at: ${FRONTEND_URL}\n`);
      process.exit(1);
    }
  }, 500);
}

pollAndOpen();
