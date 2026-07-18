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
export const CODEX_MARKETPLACE = 'speedpainter';
export const CODEX_PLUGIN = 'explainer-video@speedpainter';
export const REPOSITORY = 'SpeedPainterOrg/explainer-video';

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

export function runCodex(args) {
  const executable = process.platform === 'win32' ? 'codex.exe' : 'codex';
  return spawnSync(executable, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function clientAvailable(runner) {
  const result = runner(['--version']);
  return !result.error && result.status === 0;
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

function parsedJson(result, message) {
  if (result.error || result.status !== 0) throw commandError(message, result);
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw commandError(`${message} The CLI returned invalid JSON.`, result);
  }
}

function isExpectedMarketplaceSource(marketplace) {
  const source = marketplace?.marketplaceSource?.source;
  if (typeof source !== 'string') return false;
  const normalized = source.replace(/^git\+/, '').replace(/\.git$/, '').replace(/\/$/, '');
  return normalized === REPOSITORY || normalized === `https://github.com/${REPOSITORY}`;
}

export function configureCodex(runner = runCodex) {
  const marketplaces = parsedJson(
    runner(['plugin', 'marketplace', 'list', '--json']),
    'Could not read Codex plugin marketplaces.',
  );
  const currentMarketplace = (marketplaces.marketplaces || []).find(
    (marketplace) => marketplace.name === CODEX_MARKETPLACE,
  );

  let marketplaceAdded = false;
  if (currentMarketplace) {
    if (!isExpectedMarketplaceSource(currentMarketplace)) {
      throw new Error(
        `Codex already has a marketplace named "${CODEX_MARKETPLACE}" from a different source. ` +
        `Remove it with "codex plugin marketplace remove ${CODEX_MARKETPLACE}", then run this installer again.`,
      );
    }
    const upgraded = runner(['plugin', 'marketplace', 'upgrade', CODEX_MARKETPLACE]);
    if (upgraded.error || upgraded.status !== 0) {
      throw commandError('Could not update the Explainer Video Codex marketplace.', upgraded);
    }
  } else {
    const added = runner([
      'plugin',
      'marketplace',
      'add',
      REPOSITORY,
      '--ref',
      'main',
    ]);
    if (added.error || added.status !== 0) {
      throw commandError('Could not add the Explainer Video Codex marketplace.', added);
    }
    marketplaceAdded = true;
  }

  const plugins = parsedJson(
    runner(['plugin', 'list', '--json']),
    'Could not read installed Codex plugins.',
  );
  const installed = (plugins.installed || []).find(
    (plugin) => plugin.pluginId === CODEX_PLUGIN && plugin.enabled !== false,
  );
  if (installed) return { marketplaceAdded, pluginAdded: false };

  const addedPlugin = runner(['plugin', 'add', CODEX_PLUGIN]);
  if (addedPlugin.error || addedPlugin.status !== 0) {
    throw commandError('Could not install the Explainer Video Codex plugin.', addedPlugin);
  }
  return { marketplaceAdded, pluginAdded: true };
}

export function main({
  claudeRunner = runClaude,
  codexRunner = runCodex,
  homeDir = homedir(),
} = {}) {
  const hasClaude = clientAvailable(claudeRunner);
  const hasCodex = clientAvailable(codexRunner);
  if (!hasClaude && !hasCodex) {
    throw new Error(
      'Install Codex or Claude Code first, then run this command again. ' +
      'Codex: https://developers.openai.com/codex/ | Claude Code: https://code.claude.com/docs/en/overview',
    );
  }

  let targetDir;
  let mcp;
  let codex;
  if (hasClaude) {
    targetDir = installSkill({ homeDir });
    mcp = configureMcp(claudeRunner);
  }
  if (hasCodex) codex = configureCodex(codexRunner);

  console.log('');
  console.log('Explainer Video is ready.');
  if (codex) {
    console.log(`Codex: ${codex.pluginAdded ? 'installed' : 'already installed'}`);
  }
  if (targetDir && mcp) {
    console.log(`Claude Code: installed (${targetDir})`);
    console.log(`Claude MCP: ${mcp.added ? 'configured' : 'already configured'} (${MCP_URL})`);
  }
  console.log('');
  console.log('Open a new agent session. Sign in with Google when prompted, then ask:');
  console.log('"Create a 30-second explainer video about the history of the FIFA World Cup."');
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
