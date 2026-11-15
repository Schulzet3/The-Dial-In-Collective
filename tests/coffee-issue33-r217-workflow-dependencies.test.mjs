import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflowCases = [
  {
    id: 'R215',
    file: '../.github/workflows/issue33-r215-original325-327.yml',
    numbers: '325,326,327',
    sourceTest: 'tests/coffee-issue33-r215-original325-327.test.mjs',
    afterproof: 'scripts/audit/issue33-r215-original325-327-check.mjs',
    journal: 'docs/workstreams/ops-issue33-r215-325-327-20261115.md',
    critical: [
      'src/server/coffee-html-structure.mjs',
      'src/server/coffee-url-guard.mjs',
      'src/server/coffee-selected-offer-h2.mjs',
      'site/cloud/coffee-url-autofill.js'
    ]
  },
  {
    id: 'R216',
    file: '../.github/workflows/issue33-r216-original328-330.yml',
    numbers: '328,329,330',
    sourceTest: 'tests/coffee-issue33-r216-original328-330.test.mjs',
    afterproof: 'scripts/audit/issue33-r216-original328-330-check.mjs',
    journal: 'docs/workstreams/ops-issue33-r216-328-330-20261115.md',
    critical: [
      'src/server/coffee-html-structure.mjs',
      'src/server/coffee-url-guard.mjs',
      'src/server/coffee-selected-offer-h2.mjs',
      'site/cloud/coffee-url-autofill.js'
    ]
  }
];

for (const cfg of workflowCases) {
  const workflow = readFileSync(new URL(cfg.file, import.meta.url), 'utf8');
  const prStart = workflow.indexOf('  pull_request:\n');
  const pushStart = workflow.indexOf('  push:\n', prStart);
  const permissionsStart = workflow.indexOf('\npermissions:', pushStart);
  test(cfg.id + ': two separate branch-scoped event path filters remain present', () => {
    assert.ok(prStart >= 0 && pushStart > prStart && permissionsStart > pushStart);
    assert.match(workflow, /branches: \[development\/backend-foundation\]/);
  });
  for (const [kind, section] of [
    ['pull_request', workflow.slice(prStart, pushStart)],
    ['push', workflow.slice(pushStart, permissionsStart)]
  ]) {
    test(cfg.id + ': ' + kind + ' observes directly used source and the filter test', () => {
      for (const path of [
        cfg.file.slice(3), cfg.sourceTest, cfg.afterproof, cfg.journal,
        'scripts/audit/issue33-original603-focused-source-review.mjs',
        'scripts/audit/issue33-selected-product-heading.mjs',
        'src/server/coffee-page-metadata.mjs',
        'src/server/coffee-direct-product-prose.mjs',
        'src/server/coffee-product-scope.mjs',
        'tests/coffee-issue33-r217-workflow-dependencies.test.mjs',
        ...cfg.critical
      ]) {
        assert.ok(section.split('\n').some(line => line.trim() === '- ' + path),
          cfg.id + ' ' + kind + ' omitted ' + path);
      }
    });
  }
  test(cfg.id + ': chosen cases and strict checks still execute', () => {
    assert.ok(workflow.includes("DIC_ISSUE33_FOCUSED_PUBLIC_NUMBERS: '" + cfg.numbers + "'"));
    for (const command of [
      'node --test ' + cfg.sourceTest,
      'node --test tests/coffee-issue33-r217-workflow-dependencies.test.mjs',
      'node scripts/audit/issue33-original603-focused-source-review.mjs',
      'node ' + cfg.afterproof
    ]) assert.ok(workflow.includes(command), cfg.id + ' lost ' + command);
  });
}
