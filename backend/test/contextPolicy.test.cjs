const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSource, validateAnswer, validateTransition } = require('../domain/contextPolicy');

test('normalizes complete versioned source evidence', () => {
  const result = validateSource({ source_ref: 'src-1', object_version: 'v2', checksum: 'sha256:x', permission_version: 'p3', captured_at: '2026-07-18T12:00:00Z' });
  assert.equal(result.captured_at, '2026-07-18T12:00:00.000Z');
});

test('rejects incomplete source provenance', () => {
  assert.throws(() => validateSource({ source_ref: 'src-1' }), /object_version is required/);
});

test('answers only from authorized versioned citations', () => {
  const result = validateAnswer({ authorized_source_refs: ['src-1'], citations: [{ source_ref: 'src-1', version: 'v2', locator: 'page:4' }], conflicts: [], freshness_cutoff: '2026-07-01', answer: 'Grounded answer' });
  assert.deepEqual(result, { abstain: false, answer: 'Grounded answer' });
});

test('abstains on conflicting evidence', () => {
  const result = validateAnswer({ authorized_source_refs: ['src-1'], citations: [], conflicts: ['src-1:src-2'], freshness_cutoff: '2026-07-01', answer: 'unsafe' });
  assert.equal(result.reason, 'conflicting_sources');
  assert.equal(result.answer, null);
});

test('requires independent permission and index review before activation', () => {
  assert.throws(() => validateTransition('review', 'active', { role: 'privacy_reviewer', actorId: 'u1', createdBy: 'u1', permissionVersion: 'p1', indexReceipt: 'idx-1' }), /independent/);
  assert.equal(validateTransition('review', 'active', { role: 'privacy_reviewer', actorId: 'u2', createdBy: 'u1', permissionVersion: 'p1', indexReceipt: 'idx-1' }), true);
});

test('requires provider deletion receipts before final deletion', () => {
  assert.throws(() => validateTransition('tombstoned', 'deleted', { role: 'records_admin' }), /deletion receipts/);
});
