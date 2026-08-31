import { exec } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { join, resolve } from 'node:path';
import { executeRun } from '@stateproof-dev/app';
import type { ScenarioFile } from '@stateproof-dev/core';
import pc from 'picocolors';

const DEMO_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stateproof Zero-Setup Demo</title>
  <style>
    :root {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #0f172a;
      color: #f8fafc;
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      box-sizing: border-box;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 32px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 16px;
      color: #38bdf8;
    }
    .state-box {
      padding: 16px;
      border-radius: 8px;
      background: #090d16;
      border: 1px dashed #475569;
    }
    .btn-retry {
      margin-top: 16px;
      padding: 8px 16px;
      background: #38bdf8;
      color: #0f172a;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <main class="card">
    <h1>Account Settings (Demo App)</h1>
    <div id="content" class="state-box">
      <div data-state="loading" aria-busy="true">
        <p>Loading account details…</p>
      </div>
    </div>
  </main>
  <script>
    async function init() {
      const container = document.getElementById('content');
      try {
        const res = await fetch('/api/account');
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        const data = await res.json();
        if (!data || !data.account) {
          container.innerHTML = '<div data-state="empty"><p>No account found for this session.</p></div>';
        } else {
          container.innerHTML = '<div data-state="ready"><p>Welcome, ' + data.account.name + '</p></div>';
        }
      } catch (err) {
        if (err.message && err.message.startsWith('HTTP')) {
          container.innerHTML = '<div data-state="error"><p>Could not load account (Server Error).</p><button data-testid="retry" class="btn-retry" onclick="init()">Retry</button></div>';
        } else {
          container.innerHTML = '<div data-state="offline"><p>You appear to be offline.</p><button data-testid="retry" class="btn-retry" onclick="init()">Retry</button></div>';
        }
      }
    }
    init();
  </script>
</body>
</html>`;

function startDemoServer(): Promise<{ server: Server; url: string }> {
  return new Promise((resolvePromise, reject) => {
    const server = createServer((req, res) => {
      if (req.url === '/api/account') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ account: { name: 'Ada Lovelace' } }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(DEMO_HTML);
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        resolvePromise({ server, url: `http://127.0.0.1:${addr.port}` });
      } else {
        reject(new Error('Failed to obtain server address'));
      }
    });
  });
}

function openBrowser(url: string): void {
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const cmd = isWindows ? `start "" "${url}"` : isMac ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {
    // Ignore errors opening browser
  });
}

export interface DemoOptions {
  openReport?: boolean | undefined;
}

export async function runDemo(options: DemoOptions = {}): Promise<number> {
  process.stdout.write(pc.cyan('⚡ Starting Stateproof zero-setup demo validation...\n'));

  const { server, url } = await startDemoServer();

  try {
    const demoDir = join(process.cwd(), 'artifacts', 'stateproof', 'stateproof-demo');
    if (!existsSync(demoDir)) {
      mkdirSync(demoDir, { recursive: true });
    }
    const demoScenarioPath = join(demoDir, 'stateproof.scenarios.json');

    const demoScenarioFile: ScenarioFile = {
      name: 'stateproof-demo',
      baseUrl: url,
      route: '/',
      viewports: [
        { name: 'desktop', width: 1440, height: 1024, deviceScaleFactor: 1, isMobile: false },
        { name: 'mobile', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
      ],
      scenarios: [
        {
          id: 'demo-loading',
          label: 'Loading Skeleton State',
          request: { method: 'GET', urlPattern: '**/api/account' },
          response: { mode: 'delay', milliseconds: 400 },
          expect: { visible: "[data-state='loading']" },
        },
        {
          id: 'demo-empty',
          label: 'Empty Account State',
          request: { method: 'GET', urlPattern: '**/api/account' },
          response: { mode: 'inline', body: { account: null } },
          expect: { visible: "[data-state='empty']" },
        },
        {
          id: 'demo-error',
          label: 'Server Error & Recovery Action',
          request: { method: 'GET', urlPattern: '**/api/account' },
          response: { mode: 'error', status: 500 },
          expect: { visible: ["[data-state='error']", "[data-testid='retry']"] },
        },
        {
          id: 'demo-offline',
          label: 'Network Offline State',
          request: { method: 'GET', urlPattern: '**/api/account' },
          response: { mode: 'offline' },
          expect: { visible: ["[data-state='offline']", "[data-testid='retry']"] },
        },
      ],
    };

    writeFileSync(demoScenarioPath, `${JSON.stringify(demoScenarioFile, null, 2)}\n`, 'utf-8');

    const appResult = await executeRun({
      file: demoScenarioPath,
      url,
      skipNetworkCheck: true,
      allowRemote: false,
    });

    // Output markdown card
    process.stdout.write(`\n${appResult.cardMd}\n\n`);

    const reportPath = resolve(join(appResult.artifactDir, 'report', 'index.html'));
    process.stdout.write(pc.green(`✔ Offline HTML Report generated: ${reportPath}\n`));

    if (options.openReport !== false && process.stdout.isTTY) {
      openBrowser(`file://${reportPath}`);
    }

    return appResult.exitCode === 0 ? 0 : 1;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(pc.red(`\nDemo run failed: ${msg}\n`));
    return 1;
  } finally {
    server.close();
  }
}
