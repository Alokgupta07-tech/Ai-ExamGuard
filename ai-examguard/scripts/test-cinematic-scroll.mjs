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
  const cdpPort = 9225;
  const userDataDir = path.join(os.tmpdir(), `chrome-test-cinematic-${Date.now()}`);

  const chromeProc = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-webgpu',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  try {
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

    // Wait 3s for page load
    await new Promise((r) => setTimeout(r, 3000));

    // Verify #cinematic-story exists
    const checkRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const story = document.getElementById('cinematic-story');
          const canvas = story ? story.querySelector('canvas') : null;
          return {
            hasStory: !!story,
            hasCanvas: !!canvas,
            canvasWidth: canvas ? canvas.width : 0,
            canvasHeight: canvas ? canvas.height : 0
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Cinematic DOM status:', JSON.stringify(checkRes.result.value));

    // Test each viewport and scroll positions for Scene 1, Scene 2, Scene 3
    const scenes = [
      { name: 'scene-1-detection', progress: 0.15 },
      { name: 'scene-2-intelligence', progress: 0.50 },
      { name: 'scene-3-integrity', progress: 0.85 },
    ];

    for (const vp of VIEWPORTS) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.name.includes('mobile'),
      });

      // Scroll to #cinematic-story
      await send('Runtime.evaluate', {
        expression: `
          (() => {
            const el = document.getElementById('cinematic-story');
            if (el) el.scrollIntoView({ behavior: 'instant' });
          })()
        `,
      });
      await new Promise((r) => setTimeout(r, 600));

      for (const scene of scenes) {
        // Set scroll position inside the 300vh container
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const el = document.getElementById('cinematic-story');
              if (el) {
                const rect = el.getBoundingClientRect();
                const total = el.offsetHeight - window.innerHeight;
                const targetY = window.scrollY + rect.top + (total * ${scene.progress});
                window.scrollTo({ top: targetY, behavior: 'instant' });
              }
            })()
          `,
        });

        // Wait for WebGL render frame
        await new Promise((r) => setTimeout(r, 800));

        const snap = await send('Page.captureScreenshot', {
          format: 'png',
          quality: 90,
          captureBeyondViewport: false,
        });

        const fileName = `cinematic-${vp.name}-${scene.name}.png`;
        const filePath = path.join(OUT_DIR, fileName);
        fs.writeFileSync(filePath, Buffer.from(snap.data, 'base64'));
        console.log(`Saved screenshot: ${fileName}`);
      }
    }

    console.log('All screenshots captured successfully!');
    if (consoleErrors.length > 0) {
      console.warn('Console errors encountered:', consoleErrors);
    } else {
      console.log('Zero console errors encountered.');
    }

    ws.close();
  } finally {
    try {
      chromeProc.kill();
    } catch {}
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

