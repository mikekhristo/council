// Council — Electron main process
//
// Boots the Next.js standalone server in a child process. API keys are
// stored in ~/.config/council/config.json (chmod 600), the SAME file
// the npx CLI and the in-browser /settings page write to — all three
// surfaces share state.

const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const net = require('node:net');

const isDev = !app.isPackaged;

// ─── Shared key store (mirrors src/lib/providers/key-store.ts) ──────
function configDir() {
  if (process.env.COUNCIL_CONFIG_DIR) return process.env.COUNCIL_CONFIG_DIR;
  const xdg = process.env.XDG_CONFIG_HOME;
  return xdg
    ? path.join(xdg, 'council')
    : path.join(os.homedir(), '.config', 'council');
}
function configPath() {
  return path.join(configDir(), 'config.json');
}
function readKeys() {
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath(), 'utf8'));
    if (parsed && typeof parsed === 'object' && parsed.keys) return { ...parsed.keys };
  } catch {}
  return {};
}
function writeKeys(next) {
  const dir = configDir();
  fs.mkdirSync(dir, { recursive: true });
  const target = configPath();
  const tmp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ keys: next }, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, target);
  try { fs.chmodSync(target, 0o600); } catch {}
}
function maskKey(v) {
  if (!v) return '';
  if (v.length <= 12) return '…';
  return `${v.slice(0, 6)}…${v.slice(-4)}`;
}

let mainWindow = null;
let settingsWindow = null;
let serverProc = null;
let serverPort = 0;
let serverReady = false;

const PROVIDER_ENV_VARS = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
  xai: 'XAI_API_KEY',
};

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function buildEnv() {
  // The bundled server reads keys directly from the shared config file
  // on every request via key-store.ts, so we no longer need to inject
  // them into env at spawn time. Just set process basics + data paths.
  const env = { ...process.env };
  env.PORT = String(serverPort);
  env.HOSTNAME = '127.0.0.1';
  env.NODE_ENV = 'production';
  // Make process.execPath (the Electron binary) behave as plain Node in
  // the spawned child. Without this, spawning Electron tries to start
  // another Electron app instead of running our server.js as Node.
  env.ELECTRON_RUN_AS_NODE = '1';
  env.COUNCIL_DB_PATH = path.join(app.getPath('userData'), 'council.db');
  env.COUNCIL_UPLOADS_DIR = path.join(app.getPath('userData'), 'uploads');
  // Force the server to read/write the same key file the Electron menu
  // and the npx CLI use, regardless of platform XDG defaults.
  env.COUNCIL_CONFIG_DIR = configDir();
  return env;
}

async function startServer() {
  serverPort = await getFreePort();
  const env = buildEnv();

  // In dev: assume `next dev` is already running; just point at its port.
  // In prod (packaged): spawn the bundled standalone server.
  if (isDev) {
    serverPort = Number(process.env.COUNCIL_DEV_PORT ?? 3333);
    serverReady = true;
    return;
  }

  const serverEntry = path.join(
    process.resourcesPath,
    'app',
    '.next',
    'standalone',
    'server.js',
  );

  serverProc = spawn(process.execPath, [serverEntry], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    // The standalone server uses __dirname for module resolution, so
    // launching it from its own directory is the safest convention.
    cwd: path.dirname(serverEntry),
  });

  // Keep the tail of stderr around so a post-startup crash can show
  // something useful instead of just an exit code.
  const STDERR_TAIL_BYTES = 4096;
  let stderrTail = '';

  serverProc.stdout.on('data', (chunk) => {
    const out = chunk.toString();
    if (!serverReady && /Ready|started server on|Local:/i.test(out)) {
      serverReady = true;
    }
    if (process.env.COUNCIL_LOG === '1') process.stdout.write(out);
  });
  serverProc.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderrTail = (stderrTail + text).slice(-STDERR_TAIL_BYTES);
    if (process.env.COUNCIL_LOG === '1') process.stderr.write(chunk);
  });
  serverProc.on('exit', (code) => {
    serverReady = false;
    if (code !== 0 && !app.isQuitting) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const safe = (s) => String(s).replace(/[<>&"]/g, (c) => (
          { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]
        ));
        const tail = stderrTail
          ? `\n\nLast stderr:\n${safe(stderrTail)}`
          : '';
        const msg =
          `Council server exited unexpectedly (code ${code}). ` +
          `Open the app menu → Reload to retry.${tail}`;
        mainWindow.webContents.executeJavaScript(
          `document.body.innerHTML = '<pre style="padding:32px;font-family:monospace;color:#c00;white-space:pre-wrap">' + ${JSON.stringify(msg)} + '</pre>';`,
        );
      }
    }
  });

  await waitForServer(serverPort);
}

async function waitForServer(port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const sock = net.createConnection({ port, host: '127.0.0.1' });
        sock.once('connect', () => {
          sock.destroy();
          resolve();
        });
        sock.once('error', reject);
      });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error(`Server did not become ready on port ${port}`);
}

// Guard against concurrent restartServer() invocations — without this,
// two rapid calls (e.g. menu Settings + settings window) both observe
// `serverProc = null` after the first kill and each spawn a fresh server.
let restartInFlight = null;
async function restartServer() {
  if (restartInFlight) return restartInFlight;
  restartInFlight = (async () => {
    try {
      if (serverProc) {
        const old = serverProc;
        serverProc = null;
        old.removeAllListeners('exit');
        old.kill();
        // Wait for the OS to actually reap the child so the SQLite WAL
        // is flushed and the port is released before we re-spawn.
        await new Promise((resolve) => {
          if (old.exitCode !== null) return resolve();
          old.once('exit', resolve);
          // 3s safety net — kill -9 if it didn't go quietly
          setTimeout(() => {
            if (old.exitCode === null) old.kill('SIGKILL');
            resolve();
          }, 3000).unref();
        });
      }
      serverReady = false;
      await startServer();
      if (mainWindow && !mainWindow.isDestroyed()) {
        await mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);
      }
    } finally {
      restartInFlight = null;
    }
  })();
  return restartInFlight;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 920,
    minHeight: 600,
    backgroundColor: '#f7f5ee',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);

  // Open external links in the user's browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 560,
    height: 600,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'Council — Settings',
    parent: mainWindow ?? undefined,
    backgroundColor: '#f7f5ee',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWindow.setMenuBarVisibility(false);
  // External links from the settings window must open in the system
  // browser, never in an Electron BrowserWindow (would inherit IPC).
  settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  settingsWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`file://`)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });
  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            {
              label: 'Settings…',
              accelerator: 'CmdOrCtrl+,',
              click: () => createSettingsWindow(),
            },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            {
              label: 'Quit Council',
              accelerator: 'CmdOrCtrl+Q',
              click: () => {
                app.isQuitting = true;
                app.quit();
              },
            },
          ],
        }]
      : []),
    {
      label: 'File',
      submenu: [
        ...(isMac
          ? []
          : [{
              label: 'Settings…',
              accelerator: 'Ctrl+,',
              click: () => createSettingsWindow(),
            }]),
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.reload(),
        },
        ...(isMac ? [] : [{ role: 'quit' }]),
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        {
          label: 'Council on GitHub',
          click: () => shell.openExternal('https://github.com/mikekhristo/council'),
        },
        {
          label: 'Report an Issue',
          click: () => shell.openExternal('https://github.com/mikekhristo/council/issues'),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// IPC handlers — exposed to preload-isolated renderer

ipcMain.handle('settings:get', () => {
  const keys = readKeys();
  return {
    presence: Object.fromEntries(
      Object.entries(PROVIDER_ENV_VARS).map(([id]) => [id, Boolean(keys[id]?.trim())]),
    ),
    masked: Object.fromEntries(
      Object.keys(PROVIDER_ENV_VARS).map((id) => [id, maskKey(keys[id])]),
    ),
  };
});

ipcMain.handle('settings:save', async (_evt, payload) => {
  const next = { ...readKeys() };
  // Allowlist provider IDs — never accept arbitrary keys from the
  // renderer (defence in depth even with contextIsolation).
  const allowed = new Set(Object.keys(PROVIDER_ENV_VARS));
  for (const [id, value] of Object.entries(payload ?? {})) {
    if (!allowed.has(id)) continue;
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed === '') {
      delete next[id];
    } else {
      next[id] = trimmed;
    }
  }
  writeKeys(next);
  // The bundled server now reads keys per-request, so a hot restart
  // is no longer strictly necessary — but we still do it so any
  // in-flight provider clients pick up the new values.
  try {
    await restartServer();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err.message ?? err) };
  }
});

ipcMain.handle('settings:open-data-dir', () => {
  shell.openPath(app.getPath('userData'));
});

// App lifecycle

// Multiple instances would share the same SQLite DB and settings store —
// last-write-wins clobbering and intermittent WAL contention. Refuse a
// second launch and focus the existing window instead.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  buildMenu();
  try {
    await startServer();
  } catch (err) {
    // Show the error in a window rather than silently dying
    const fail = new BrowserWindow({ width: 720, height: 480 });
    fail.loadURL(
      'data:text/html,' +
        encodeURIComponent(
          `<pre style="padding:32px;font-family:system-ui;color:#c00;white-space:pre-wrap">Council failed to start its server.\n\n${String(err.stack ?? err)}</pre>`,
        ),
    );
    return;
  }
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.isQuitting = true;
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (serverProc) {
    serverProc.removeAllListeners('exit');
    serverProc.kill();
    serverProc = null;
  }
});
