import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const forbiddenSourceNames = /\b(?:minimax|evolink|tuzi|pollinations|z-image(?:-turbo)?|gpt(?:-[\w.]+)?)\b/i;
const publicSkillFiles = [
	'plugins/explainer-video/skills/create-explainer-video/SKILL.md',
	'plugins/explainer-video/skills/create-explainer-video/references/advanced-review.md',
];

test('public skill copy does not expose generation suppliers or models', async () => {
	for (const path of publicSkillFiles) {
		const content = await readFile(path, 'utf8');
		assert.doesNotMatch(content, forbiddenSourceNames, path);
	}
});
