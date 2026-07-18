#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  realpathSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MCP_NAME = 'explainer-video';
export const MCP_URL = 'https://api.speedpainter.org/mcp';
export const SKILL_NAME = 'create-explainer-video';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const bundledSkillDir = resolve(
  scriptDir,
  '..',
  'plugins',
  'explainer-video',
  'skills',
  SKILL_NAME,
);

function commandOutput(result) {
  return `${result.stdout || ''}\n${result.stderr || ''}`.trim();
}

function commandError(message, result) {
  const detail = commandOutput(result).slice(0, 800);
  return new Error(detail ? `${message}\n${detail}` : message);
}

export function runClaude(args) {
  const executable = process.platform === 'win32' ? 'claude.cmd' : 'claude';
  return spawnSync(executable, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function ensureClaude(runner = runClaude) {
  const result = runner(['--version']);
  if (result.error || result.status !== 0) {
    throw commandError(
      'Claude Code is required. Install it from https://code.claude.com/docs/en/overview and run this command again.',
      result,
    );
  }
}

export function installSkill({
  homeDir = homedir(),
  sourceDir = bundledSkillDir,
} = {}) {
  if (!existsSync(join(sourceDir, 'SKILL.md'))) {
    throw new Error('The installer package does not contain the Explainer Video Skill.');
  }

  const skillsDir = join(homeDir, '.claude', 'skills');
  const targetDir = join(skillsDir, SKILL_NAME);
  const nonce = `${process.pid}-${Date.now()}`;
  const temporaryDir = join(skillsDir, `.${SKILL_NAME}.tmp-${nonce}`);
  const backupDir = join(skillsDir, `.${SKILL_NAME}.backup-${nonce}`);
  mkdirSync(skillsDir, { recursive: true });
  cpSync(sourceDir, temporaryDir, { recursive: true, force: true });

  let backedUp = false;
  try {
    if (existsSync(targetDir)) {
      renameSync(targetDir, backupDir);
      backedUp = true;
    }
    renameSync(temporaryDir, targetDir);
    if (backedUp) rmSync(backupDir, { recursive: true, force: true });
  } catch (error) {
    rmSync(temporaryDir, { recursive: true, force: true });
    if (backedUp && !existsSync(targetDir) && existsSync(backupDir)) {
      renameSync(backupDir, targetDir);
    }
    throw error;
  }

  return targetDir;
}

export function configureMcp(runner = runClaude) {
  const current = runner(['mcp', 'get', MCP_NAME]);
  if (!current.error && current.status === 0) {
    if (commandOutput(current).includes(MCP_URL)) return { added: false };
    throw new Error(
      `Claude Code already has an MCP server named "${MCP_NAME}" with a different URL. ` +
      `Remove it with "claude mcp remove --scope user ${MCP_NAME}", then run this installer again.`,
    );
  }

  const added = runner([
    'mcp',
    'add',
    '--transport',
    'http',
    '--scope',
    'user',
    MCP_NAME,
    MCP_URL,
  ]);
  if (added.error || added.status !== 0) {
    throw commandError('Could not add the Explainer Video MCP server to Claude Code.', added);
  }
  return { added: true };
}

export function main({ runner = runClaude, homeDir = homedir() } = {}) {
  ensureClaude(runner);
  const targetDir = installSkill({ homeDir });
  const mcp = configureMcp(runner);

  console.log('');
  console.log('Explainer Video is ready for Claude Code.');
  console.log(`Skill: ${targetDir}`);
  console.log(`MCP: ${mcp.added ? 'configured' : 'already configured'} (${MCP_URL})`);
  console.log('');
  console.log('Open Claude Code, run /mcp once to sign in with Google, then ask:');
  console.log('"Turn this document into a 30-second explainer video."');
}

const invokedPath = process.argv[1] ? realpathSync(resolve(process.argv[1])) : '';
const modulePath = realpathSync(fileURLToPath(import.meta.url));
if (invokedPath === modulePath) {
  try {
    main();
  } catch (error) {
    console.error(`Explainer Video setup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
