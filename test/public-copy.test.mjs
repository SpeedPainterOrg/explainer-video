import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const forbiddenSourceNames = /\b(?:minimax|evolink|tuzi|pollinations|z-image(?:-turbo)?|gpt(?:-[\w.]+)?)\b/i;
const publicSkillFiles = [
	'plugins/explainer-video/skills/create-explainer-video/SKILL.md',
	'plugins/explainer-video/skills/create-explainer-video/references/advanced-review.md',
];
const readmeFiles = [
	'README.md',
	'docs/README.zh-CN.md',
	'docs/README.ja.md',
	'docs/README.es.md',
];
const playableDemoUrl =
	'https://cdn.jsdelivr.net/gh/SpeedPainterOrg/explainer-video@v0.5.1/assets/explainer-video-demo.mp4';

test('public skill copy does not expose generation suppliers or models', async () => {
	for (const path of publicSkillFiles) {
		const content = await readFile(path, 'utf8');
		assert.doesNotMatch(content, forbiddenSourceNames, path);
		assert.doesNotMatch(content, /`music`|"music"\s*:/i, path);
	}
});

test('package and plugin versions stay aligned', async () => {
	const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
	const pluginJson = JSON.parse(
		await readFile('plugins/explainer-video/.codex-plugin/plugin.json', 'utf8'),
	);
	assert.equal(pluginJson.version, packageJson.version);
});

test('README copy does not advertise unavailable background music', async () => {
	const unavailableMusicTerms = /\b(?:music|música)\b|音乐|音楽/i;
	for (const path of readmeFiles) {
		const content = await readFile(path, 'utf8');
		assert.doesNotMatch(content, unavailableMusicTerms, path);
	}
});

test('README demo links use the browser-playable video endpoint', async () => {
	for (const path of readmeFiles) {
		const content = await readFile(path, 'utf8');
		assert.match(content, new RegExp(playableDemoUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), path);
		assert.doesNotMatch(content, /\]\((?:\.\.\/)?assets\/explainer-video-demo\.mp4\)/, path);
	}
});
