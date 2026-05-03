import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // Self-contained Node bundle — required by both the Electron desktop
  // wrapper (electron/main.cjs) and the npx council CLI (bin/council.cjs).
  // Produces .next/standalone with all dependencies inlined.
  output: 'standalone',

  // Pin the file-tracing root so the standalone output lands at
  // .next/standalone/server.js even when an outer lockfile makes Next
  // infer a higher workspace root.
  outputFileTracingRoot: path.join(__dirname),

  // Force-include better-sqlite3's compiled native binding. Next traces
  // JS imports but doesn't follow the runtime require() inside
  // better-sqlite3 that loads the .node binary, so without this it
  // won't ship in the standalone bundle.
  outputFileTracingIncludes: {
    '*': [
      'node_modules/better-sqlite3/build/Release/*.node',
    ],
  },

  // Shrink the standalone bundle — exclude dev DB, build artifacts,
  // dotfiles, and source files Next pulled in as a "just in case" trace.
  outputFileTracingExcludes: {
    '*': [
      'council.db',
      'council.db-shm',
      'council.db-wal',
      'tsconfig.tsbuildinfo',
      'package-lock.json',
      'eslint.config.mjs',
      'postcss.config.mjs',
      'drizzle.config.ts',
      'electron-builder.yml',
      'release-please-config.json',
      '.release-please-manifest.json',
      'src/**/*',
      'electron/**/*',
      'bin/**/*',
      'build/**/*',
      '.github/**/*',
      'uploads/**/*',
    ],
  },

  // better-sqlite3 is a native Node module; mark it external so it's loaded
  // from node_modules at runtime instead of being bundled.
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
