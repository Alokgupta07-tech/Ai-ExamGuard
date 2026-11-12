import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'http://localhost:3005/';
const OUT_DIR = 'C:\\Users\\agupt\\.gemini\\antigravity\\brain\\491c6a32-798a-4e18-a65a-f20acc8cae86';

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'laptop-1280x800', width: 1280, height: 800 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

async function main() {
  const cdpPort = 9224;
  const userDataDir = path.join(os.tmpdir(), `chrome-test-${Date.now()}`);

  const chromeProc = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  try {
    // Wait for CDP page target to become available
    let wsUrl = '';
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
        if (res.ok) {
          const list = await res.json();
          const pageTarget = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
          if (pageTarget) {
            wsUrl = pageTarget.webSocketDebuggerUrl;
            break;
          }
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }

    if (!wsUrl) throw new Error('Could not connect to Chrome CDP WebSocket');

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = reject;
    });

    let nextId = 1;
    const pending = new Map();
    const consoleErrors = [];

    ws.onmessage = (evt) => {
      const msg = JSON.parse(String(evt.data));
      if (msg.id) {
        const p = pending.get(msg.id);
        if (p) {
          pending.delete(msg.id);
          if (msg.error) p.reject(new Error(msg.error.message));
          else p.resolve(msg.result);
        }
      }
      if (msg.method === 'Console.messageAdded') {
        const m = msg.params?.message;
        if (m?.level === 'error') consoleErrors.push(m.text);
      }
    };

    const send = (method, params = {}) => {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Console.enable');

    console.log(`Navigating to ${TARGET_URL}...`);
    await send('Page.navigate', { url: TARGET_URL });

    // Wait 3 seconds for initial render and animations
    await new Promise((r) => setTimeout(r, 3000));

    // Verify 3D carousel element exists
    const evalRes = await send('Runtime.evaluate', {
      expression: 'Boolean(document.querySelector("#features-3d"))',
      returnByValue: true,
    });
    console.log('Carousel section (#features-3d) present:', evalRes.result?.value);

    // Verify 6 feature cards rendered
    const cardCountRes = await send('Runtime.evaluate', {
      expression: 'document.querySelectorAll("#features-3d [role=tab]").length',
      returnByValue: true,
    });
    console.log('Feature tabs count:', cardCountRes.result?.value);

    // Scroll to carousel section
    await send('Runtime.evaluate', {
      expression: 'document.querySelector("#features-3d")?.scrollIntoView({ behavior: "instant", block: "center" })',
    });
    await new Promise((r) => setTimeout(r, 800));

    // Capture screenshots for each required viewport
    for (const vp of VIEWPORTS) {
      console.log(`Setting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768,
      });

      // Scroll carousel into view
      await send('Runtime.evaluate', {
        expression: 'document.querySelector("#features-3d")?.scrollIntoView({ behavior: "instant", block: "center" })',
      });
      await new Promise((r) => setTimeout(r, 1200));

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(OUT_DIR, `carousel-${vp.name}.png`);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      console.log(`Saved screenshot: ${outPath} (${(shot.data.length / 1024).toFixed(1)} KB)`);
    }

    // Now test interaction: Click "Flip Specs" on active card
    console.log('Testing card flip interaction...');
    await send('Runtime.evaluate', {
      expression: 'document.querySelector("#features-3d button[aria-label=\\"Flip to technical specs\\"]")?.click()',
    });
    await new Promise((r) => setTimeout(r, 900));

    const flippedShot = await send('Page.captureScreenshot', { format: 'png' });
    const flippedPath = path.join(OUT_DIR, 'carousel-card-flipped.png');
    fs.writeFileSync(flippedPath, Buffer.from(flippedShot.data, 'base64'));
    console.log(`Saved flipped card screenshot: ${flippedPath}`);

    // Test next button interaction
    console.log('Testing next button navigation...');
    await send('Runtime.evaluate', {
      expression: 'document.querySelector("#features-3d button[aria-label=\\"Next feature module\\"]")?.click()',
    });
    await new Promise((r) => setTimeout(r, 900));

    const nextShot = await send('Page.captureScreenshot', { format: 'png' });
    const nextPath = path.join(OUT_DIR, 'carousel-card-next.png');
    fs.writeFileSync(nextPath, Buffer.from(nextShot.data, 'base64'));
    console.log(`Saved next card screenshot: ${nextPath}`);

    console.log('Console errors recorded:', consoleErrors.length, consoleErrors);

    ws.close();
  } finally {
    chromeProc.kill();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
