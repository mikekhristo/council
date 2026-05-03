#!/usr/bin/env node
// Make the .next/standalone/ output self-contained.
//
// Next's `output: 'standalone'` deliberately does NOT copy .next/static/
// or public/ into the standalone directory — the docs say to copy them
// manually as part of the deploy step. Without this, the standalone
// server runs but every request for /_next/static/... or /favicon.ico
// returns 404 (CSS doesn't apply, fonts don't load).
//
// We do that copy here so the same standalone bundle works for:
//   * the npx CLI (bin/council.cjs)
//   * a `node .next/standalone/server.js` invocation
//   * the Electron build (electron-builder also copies via extraResources;
//     this script runs first and electron-builder picks up the result)

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');

if (!fs.existsSync(standalone)) {
  console.error('post-build: .next/standalone/ not found — did you run `next build`?');
  process.exit(1);
}

function copyTree(from, to) {
  if (!fs.existsSync(from)) return;
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
  console.log(`post-build: copied ${path.relative(root, from)} → ${path.relative(root, to)}`);
}

copyTree(
  path.join(root, '.next', 'static'),
  path.join(standalone, '.next', 'static'),
);
copyTree(
  path.join(root, 'public'),
  path.join(standalone, 'public'),
);

console.log('post-build: standalone bundle is self-contained.');
