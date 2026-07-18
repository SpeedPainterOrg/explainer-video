import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CODEX_MARKETPLACE,
  CODEX_PLUGIN,
  MCP_NAME,
  MCP_URL,
  configureCodex,
  configureMcp,
  ensureClaude,
  installSkill,
} from '../bin/install.mjs';

function result(status, stdout = '', stderr = '') {
  return { status, stdout, stderr };
}

test('installs the bundled skill atomically and replaces an older copy', () => {
  const root = mkdtempSync(join(tmpdir(), 'explainer-installer-'));
  const homeDir = join(root, 'home');
  const sourceDir = join(root, 'source');
  const targetDir = join(homeDir, '.claude', 'skills', 'create-explainer-video');
  try {
    mkdirSync(join(sourceDir, 'references'), { recursive: true });
    writeFileSync(join(sourceDir, 'SKILL.md'), 'version: new\n');
    writeFileSync(join(sourceDir, 'references', 'advanced-review.md'), 'review\n');
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(join(targetDir, 'SKILL.md'), 'version: old\n');
    writeFileSync(join(targetDir, 'stale.md'), 'stale\n');

    assert.equal(installSkill({ homeDir, sourceDir }), targetDir);
    assert.equal(readFileSync(join(targetDir, 'SKILL.md'), 'utf8'), 'version: new\n');
    assert.equal(
      readFileSync(join(targetDir, 'references', 'advanced-review.md'), 'utf8'),
      'review\n',
    );
    assert.equal(existsSync(join(targetDir, 'stale.md')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('adds the hosted MCP server at user scope when missing', () => {
  const calls = [];
  const runner = (args) => {
    calls.push(args);
    if (args[1] === 'get') return result(1, '', 'Server not found');
    return result(0, 'Added');
  };

  assert.deepEqual(configureMcp(runner), { added: true });
  assert.deepEqual(calls, [
    ['mcp', 'get', MCP_NAME],
    ['mcp', 'add', '--transport', 'http', '--scope', 'user', MCP_NAME, MCP_URL],
  ]);
});

test('keeps an existing matching MCP connection', () => {
  const calls = [];
  const runner = (args) => {
    calls.push(args);
    return result(0, `${MCP_NAME}: ${MCP_URL}`);
  };

  assert.deepEqual(configureMcp(runner), { added: false });
  assert.deepEqual(calls, [['mcp', 'get', MCP_NAME]]);
});

test('does not overwrite an existing MCP server with a different URL', () => {
  const runner = () => result(0, `${MCP_NAME}: https://example.com/mcp`);
  assert.throws(() => configureMcp(runner), /different URL/);
});

test('fails clearly when Claude Code is unavailable', () => {
  const runner = () => ({ status: null, stdout: '', stderr: '', error: new Error('ENOENT') });
  assert.throws(() => ensureClaude(runner), /Claude Code is required/);
});

test('installs the Codex marketplace and plugin when both are missing', () => {
  const calls = [];
  const runner = (args) => {
    calls.push(args);
    const command = args.join(' ');
    if (command === 'plugin marketplace list --json') {
      return result(0, JSON.stringify({ marketplaces: [] }));
    }
    if (command === 'plugin list --json') {
      return result(0, JSON.stringify({ installed: [] }));
    }
    return result(0, 'Done');
  };

  assert.deepEqual(configureCodex(runner), {
    marketplaceAdded: true,
    pluginAdded: true,
  });
  assert.deepEqual(calls, [
    ['plugin', 'marketplace', 'list', '--json'],
    ['plugin', 'marketplace', 'add', 'SpeedPainterOrg/explainer-video', '--ref', 'main'],
    ['plugin', 'list', '--json'],
    ['plugin', 'add', CODEX_PLUGIN],
  ]);
});

test('updates an existing Codex marketplace without reinstalling the plugin', () => {
  const calls = [];
  const runner = (args) => {
    calls.push(args);
    const command = args.join(' ');
    if (command === 'plugin marketplace list --json') {
      return result(0, JSON.stringify({
        marketplaces: [{
          name: CODEX_MARKETPLACE,
          marketplaceSource: {
            sourceType: 'git',
            source: 'https://github.com/SpeedPainterOrg/explainer-video.git',
          },
        }],
      }));
    }
    if (command === 'plugin list --json') {
      return result(0, JSON.stringify({
        installed: [{ pluginId: CODEX_PLUGIN, enabled: true }],
      }));
    }
    return result(0, 'Done');
  };

  assert.deepEqual(configureCodex(runner), {
    marketplaceAdded: false,
    pluginAdded: false,
  });
  assert.deepEqual(calls, [
    ['plugin', 'marketplace', 'list', '--json'],
    ['plugin', 'marketplace', 'upgrade', CODEX_MARKETPLACE],
    ['plugin', 'list', '--json'],
  ]);
});

test('does not overwrite a Codex marketplace with a different source', () => {
  const runner = () => result(0, JSON.stringify({
    marketplaces: [{
      name: CODEX_MARKETPLACE,
      marketplaceSource: { sourceType: 'git', source: 'https://example.com/other.git' },
    }],
  }));
  assert.throws(() => configureCodex(runner), /different source/);
});

test('runs the installer when npm invokes it through a bin symlink', {
  skip: process.platform === 'win32',
}, () => {
  const root = mkdtempSync(join(tmpdir(), 'explainer-bin-'));
  const homeDir = join(root, 'home');
  const fakeBin = join(root, 'fake-bin');
  const linkedBin = join(root, 'explainer-video-agent-skill');
  const callsFile = join(root, 'claude-calls.log');
  const installer = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'install.mjs');
  try {
    mkdirSync(fakeBin, { recursive: true });
    const fakeClaude = join(fakeBin, 'claude');
    writeFileSync(fakeClaude, `#!/bin/sh
printf '%s\\n' "$*" >> "$CLAUDE_CALLS"
if [ "$1" = "--version" ]; then echo "2.1.0"; exit 0; fi
if [ "$1" = "mcp" ] && [ "$2" = "get" ]; then exit 1; fi
if [ "$1" = "mcp" ] && [ "$2" = "add" ]; then exit 0; fi
exit 1
`);
    chmodSync(fakeClaude, 0o755);
    const fakeCodex = join(fakeBin, 'codex');
    writeFileSync(fakeCodex, '#!/bin/sh\nexit 1\n');
    chmodSync(fakeCodex, 0o755);
    symlinkSync(installer, linkedBin);

    const execution = spawnSync(linkedBin, [], {
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: homeDir,
        PATH: `${fakeBin}:${process.env.PATH || ''}`,
        CLAUDE_CALLS: callsFile,
      },
    });

    assert.equal(execution.status, 0, execution.stderr);
    assert.match(execution.stdout, /Explainer Video is ready\./);
    assert.match(execution.stdout, /Claude Code: installed/);
    assert.equal(
      existsSync(join(homeDir, '.claude', 'skills', 'create-explainer-video', 'SKILL.md')),
      true,
    );
    assert.match(readFileSync(callsFile, 'utf8'), /mcp add --transport http --scope user/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('configures Codex through the npm bin without requiring Claude Code', {
  skip: process.platform === 'win32',
}, () => {
  const root = mkdtempSync(join(tmpdir(), 'explainer-codex-bin-'));
  const homeDir = join(root, 'home');
  const fakeBin = join(root, 'fake-bin');
  const linkedBin = join(root, 'explainer-video-agent-skill');
  const callsFile = join(root, 'codex-calls.log');
  const installer = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'install.mjs');
  try {
    mkdirSync(fakeBin, { recursive: true });
    const fakeClaude = join(fakeBin, 'claude');
    writeFileSync(fakeClaude, '#!/bin/sh\nexit 1\n');
    chmodSync(fakeClaude, 0o755);
    const fakeCodex = join(fakeBin, 'codex');
    writeFileSync(fakeCodex, `#!/bin/sh
printf '%s\\n' "$*" >> "$CODEX_CALLS"
case "$*" in
  "--version") echo "codex 1.0.0"; exit 0 ;;
  "plugin marketplace list --json") echo '{"marketplaces":[]}'; exit 0 ;;
  "plugin marketplace add SpeedPainterOrg/explainer-video --ref main") exit 0 ;;
  "plugin list --json") echo '{"installed":[]}'; exit 0 ;;
  "plugin add explainer-video@speedpainter") exit 0 ;;
esac
exit 1
`);
    chmodSync(fakeCodex, 0o755);
    symlinkSync(installer, linkedBin);

    const execution = spawnSync(linkedBin, [], {
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: homeDir,
        PATH: `${fakeBin}:${process.env.PATH || ''}`,
        CODEX_CALLS: callsFile,
      },
    });

    assert.equal(execution.status, 0, execution.stderr);
    assert.match(execution.stdout, /Codex: installed/);
    assert.equal(existsSync(join(homeDir, '.claude')), false);
    const calls = readFileSync(callsFile, 'utf8');
    assert.match(calls, /plugin marketplace add SpeedPainterOrg\/explainer-video --ref main/);
    assert.match(calls, /plugin add explainer-video@speedpainter/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
