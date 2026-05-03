#!/usr/bin/env node
/**
 * council — npx entry point
 *
 * Boots the bundled Next.js standalone server, opens the browser, and
 * keeps running until you Ctrl+C. Uses ~/.config/council/config.json
 * for persisted API keys (BYOK).
 *
 *   npx @mikekhristo/council          # boot + open browser
 *   npx @mikekhristo/council --port 4000
 *   npx @mikekhristo/council --no-open
 *   npx @mikekhristo/council config   # interactive key setup
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const readline = require('node:readline');
const { spawn } = require('node:child_process');

const PROVIDER_ENV_VARS = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
  xai: 'XAI_API_KEY',
};

const PROVIDER_LINKS = {
  anthropic: 'https://console.anthropic.com/settings/keys',
  openai: 'https://platform.openai.com/api-keys',
  google: 'https://aistudio.google.com/apikey',
  xai: 'https://console.x.ai',
};

const args = process.argv.slice(2);
const wants = (flag) => args.includes(flag);
const argVal = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

const HELP = `council — multi-LLM deliberation workspace

Usage:
  npx @mikekhristo/council               Start the workspace
  npx @mikekhristo/council config        Interactively set API keys
  npx @mikekhristo/council where         Print the data + config paths

Options:
  --port <n>      Override the listen port (default: 3333; falls back to a free port)
  --no-open       Don't auto-open the browser
  --help, -h      Show this help
  --version, -v   Show the version
`;

function configDir() {
  const xdg = process.env.XDG_CONFIG_HOME;
  return xdg
    ? path.join(xdg, 'council')
    : path.join(os.homedir(), '.config', 'council');
}

function dataDir() {
  const xdg = process.env.XDG_DATA_HOME;
  return xdg
    ? path.join(xdg, 'council')
    : path.join(os.homedir(), '.local', 'share', 'council');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function configPath() {
  return path.join(configDir(), 'config.json');
}

function loadKeys() {
  try {
    const txt = fs.readFileSync(configPath(), 'utf8');
    const parsed = JSON.parse(txt);
    return parsed.keys ?? {};
  } catch {
    return {};
  }
}

function saveKeys(keys) {
  ensureDir(configDir());
  const target = configPath();
  fs.writeFileSync(
    target,
    JSON.stringify({ keys }, null, 2),
    { mode: 0o600 },
  );
  // Tighten perms even if file already existed
  try {
    fs.chmodSync(target, 0o600);
  } catch {}
}

function getFreePort(preferred) {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', () => resolve(0));
    srv.listen(preferred ?? 0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function pickPort() {
  const explicit = Number(argVal('--port'));
  if (Number.isFinite(explicit) && explicit > 0) {
    const free = await getFreePort(explicit);
    if (free === explicit) return explicit;
    console.error(`council: port ${explicit} is in use; falling back to a free port.`);
  }
  const def = await getFreePort(3333);
  return def || (await getFreePort());
}

async function prompt(question, { hidden = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  if (hidden && process.stdin.isTTY) {
    process.stdout.write(question);
    return new Promise((resolve) => {
      const stdin = process.openStdin();
      let value = '';
      const onData = (char) => {
        const c = char.toString();
        if (c === '\n' || c === '\r' || c === '') {
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(value);
        } else if (c === '') {
          process.exit(130);
        } else if (c === '\b' || c === '') {
          value = value.slice(0, -1);
        } else {
          value += c;
        }
      };
      stdin.on('data', onData);
    });
  }
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a); }));
}

async function runConfig() {
  console.log('\nCouncil — bring-your-own-key configuration');
  console.log(`Stored in: ${configPath()}\n`);
  const existing = loadKeys();
  const next = { ...existing };
  for (const [id, envVar] of Object.entries(PROVIDER_ENV_VARS)) {
    const has = Boolean((existing[id] ?? '').trim());
    const masked = has ? `${existing[id].slice(0, 6)}…${existing[id].slice(-4)}` : '<unset>';
    console.log(`  ${id.padEnd(10)}  ${envVar}`);
    console.log(`             current: ${masked}`);
    console.log(`             get one: ${PROVIDER_LINKS[id]}`);
    const v = await prompt(`             new value (blank = keep): `, { hidden: true });
    if (v && v.trim()) next[id] = v.trim();
    console.log('');
  }
  saveKeys(next);
  const set = Object.values(next).filter((s) => s && s.trim()).length;
  console.log(`Saved ${set} key(s) to ${configPath()}.`);
  if (set < 2) {
    console.log('Council needs at least 2 providers configured to start a deliberation.');
  }
}

function showWhere() {
  console.log(`config: ${configPath()}`);
  console.log(`data:   ${path.join(dataDir(), 'council.db')}`);
}

function findStandalone() {
  // Installed via npm: <pkg>/.next/standalone/server.js
  const candidates = [
    path.join(__dirname, '..', '.next', 'standalone', 'server.js'),
    path.join(process.cwd(), '.next', 'standalone', 'server.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

async function tryOpen(url) {
  if (wants('--no-open')) return;
  try {
    const open = (await import('open')).default;
    await open(url);
  } catch {
    // Fall back to platform-native commands
    const cmd =
      process.platform === 'darwin' ? 'open' :
      process.platform === 'win32' ? 'cmd' :
      'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', '""', url] : [url];
    spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
  }
}

async function startServer() {
  const entry = findStandalone();
  if (!entry) {
    console.error('council: bundled server not found.');
    console.error('   Expected: .next/standalone/server.js');
    console.error('   If running from source, do `npm run build` first.');
    process.exit(1);
  }

  const port = await pickPort();
  const keys = loadKeys();
  const env = { ...process.env, NODE_ENV: 'production', PORT: String(port), HOSTNAME: '127.0.0.1' };
  for (const [id, envVar] of Object.entries(PROVIDER_ENV_VARS)) {
    const v = keys[id];
    if (v && v.trim()) env[envVar] = v.trim();
  }
  ensureDir(dataDir());
  env.COUNCIL_DB_PATH = env.COUNCIL_DB_PATH ?? path.join(dataDir(), 'council.db');
  env.COUNCIL_UPLOADS_DIR = env.COUNCIL_UPLOADS_DIR ?? path.join(dataDir(), 'uploads');

  const configuredCount = Object.values(keys).filter((s) => s && s.trim()).length;
  if (configuredCount < 2) {
    console.log('');
    console.log('  ⚠ No (or only one) API key configured.');
    console.log('     Run `npx @mikekhristo/council config` to set keys.');
    console.log('     The app will still start but won\'t be able to deliberate yet.');
    console.log('');
  }

  const proc = spawn(process.execPath, [entry], { env, stdio: 'inherit', cwd: path.dirname(entry) });

  const url = `http://127.0.0.1:${port}`;
  console.log(`\n  Council ▸  ${url}`);
  console.log(`  Config  ▸  ${configPath()}`);
  console.log(`  Data    ▸  ${path.join(dataDir(), 'council.db')}\n`);

  // Open the browser once the server is reachable
  let opened = false;
  const tryOpenLoop = async () => {
    for (let i = 0; i < 50; i++) {
      try {
        await new Promise((resolve, reject) => {
          const sock = net.createConnection({ port, host: '127.0.0.1' });
          sock.once('connect', () => { sock.destroy(); resolve(); });
          sock.once('error', reject);
        });
        if (!opened) { opened = true; await tryOpen(url); }
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  };
  tryOpenLoop();

  const shutdown = (sig) => {
    proc.kill(sig);
    setTimeout(() => process.exit(0), 200).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  proc.on('exit', (code) => process.exit(code ?? 0));
}

async function main() {
  if (wants('--help') || wants('-h')) { console.log(HELP); return; }
  if (wants('--version') || wants('-v')) {
    const pkg = require('../package.json');
    console.log(pkg.version);
    return;
  }
  const cmd = args[0];
  if (cmd === 'config') return runConfig();
  if (cmd === 'where') return showWhere();
  await startServer();
}

main().catch((err) => {
  console.error('council:', err.message ?? err);
  process.exit(1);
});
