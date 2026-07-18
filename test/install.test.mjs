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
  MCP_NAME,
  MCP_URL,
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
    assert.match(execution.stdout, /Explainer Video is ready for Claude Code/);
    assert.equal(
      existsSync(join(homeDir, '.claude', 'skills', 'create-explainer-video', 'SKILL.md')),
      true,
    );
    assert.match(readFileSync(callsFile, 'utf8'), /mcp add --transport http --scope user/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
