import assert from 'node:assert/strict';
import { DocumentSession, MAX_FILE_BYTES, MAX_SESSION_BYTES, presetFields, validateFiles } from '../src/lib/session';
import { buildExportEntries, createMetadataReport } from '../src/lib/exports';
import type { DocumentAnalysis, CleaningResult } from '../src/lib/documents';

const analysis: DocumentAnalysis = {
  kind: 'pdf',
  fields: [
    { id: 'author', label: 'Author', value: 'Synthetic Person', group: 'identity', personal: true },
    { id: 'title', label: 'Title', value: 'Example', group: 'document', personal: false },
  ],
  warnings: [], limitations: ['Document contents are retained.'],
};
const file = (name: string, size = 10) => {
  const value = new File(['example'], name);
  Object.defineProperty(value, 'size', { value: size });
  return value;
};
const result: CleaningResult = {
  blob: new Blob(['verified output']), before: analysis,
  after: { ...analysis, fields: [] }, removedIds: ['author', 'title'], retainedIds: [], failedIds: [], verified: true,
};
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

assert.deepEqual(presetFields(analysis, 'personal'), ['author']);
assert.deepEqual(presetFields(analysis, 'all'), ['author', 'title']);
const rejected = validateFiles([file('notes.txt'), file('large.pdf', MAX_FILE_BYTES + 1)], []);
assert.equal(rejected.accepted.length, 0);
assert(rejected.notices.some(item => item.includes('notes.txt')));
assert(rejected.notices.some(item => item.includes('large.pdf')));
assert.equal(validateFiles([file('one.pdf')], Array.from({ length: 50 }, (_, n) => file(`${n}.pdf`))).accepted.length, 0);
assert.equal(validateFiles([file('one.pdf', 1)], [file('existing.pdf', MAX_SESSION_BYTES)]).accepted.length, 0);
assert.equal(validateFiles([file('UPPER.PDF')], []).accepted.length, 1);

let release: ((value: DocumentAnalysis) => void) | undefined;
let cancellationCount = 0;
let defer = false;
const session = new DocumentSession({
  analyze: async () => defer ? new Promise(resolve => { release = resolve; }) : analysis,
  clean: async () => result,
  cancel: () => { cancellationCount += 1; },
});
await session.addFiles([file('report.pdf'), file('report.pdf'), file('report-cleaned.pdf')]);
assert(session.getSnapshot().documents.every(doc => doc.status === 'ready'));
await session.cleanAll();
const done = session.getSnapshot().documents;
const entries = buildExportEntries(done);
assert.equal(new Set(entries.map(entry => entry.name.toLowerCase())).size, 3, 'ZIP names may not overwrite each other');
assert.deepEqual(entries.map(entry => entry.name), ['report-cleaned.pdf', 'report-cleaned-2.pdf', 'report-cleaned-cleaned.pdf']);
assert.equal(buildExportEntries([{ ...done[0], result: { ...result, verified: false } }]).length, 0);
assert.equal(buildExportEntries([{ ...done[0], status: 'error' }]).length, 0);
const report = createMetadataReport(done[0]);
assert.equal(report.containsMetadataValues, true);
assert.equal(report.before.fields[0].value, 'Synthetic Person');
assert.equal(report.verification.verified, true);
session.setPreset(done[0].id, 'personal');
assert.equal(session.getSnapshot().documents[0].result, undefined, 'selection invalidates previous output');
assert.equal(session.getSnapshot().documents[0].status, 'ready');

// A late worker response must never restore a removed file or undo cancellation.
defer = true;
const addPending = session.addFiles([file('remove-me.pdf')]);
await tick();
const removedId = session.getSnapshot().documents.at(-1)!.id;
session.removeDocument(removedId);
release!(analysis);
await addPending;
assert(!session.getSnapshot().documents.some(doc => doc.id === removedId));
const cancelPending = session.addFiles([file('cancel-me.pdf'), file('also-cancel.pdf')]);
await tick();
session.cancel();
release!(analysis);
await cancelPending;
assert(session.getSnapshot().documents.slice(-2).every(doc => doc.status === 'cancelled'));
assert(cancellationCount >= 2);
assert.equal(session.getSnapshot().busy, false);
assert.equal(session.getSnapshot().documents.filter(doc => doc.result?.verified).length, 2, 'cancel retains previous successful output');

let failVerification = true;
const failingSession = new DocumentSession({
  analyze: async () => analysis,
  clean: async () => failVerification ? { ...result, failedIds: ['author'], verified: false } : result,
  cancel: () => {},
});
await failingSession.addFiles([file('verify.pdf')]);
const failId = failingSession.getSnapshot().documents[0].id;
await failingSession.cleanOne(failId);
assert.equal(failingSession.getSnapshot().documents[0].status, 'error');
assert.equal(failingSession.getSnapshot().documents[0].result, undefined);
failVerification = false;
await failingSession.retry(failId);
assert.equal(failingSession.getSnapshot().documents[0].status, 'done');

let cleanCalls = 0;
const eligibilitySession = new DocumentSession({
  analyze: async (document) => document.name === 'signed.pdf' ? { ...analysis, warnings: [{ id: 'signature', title: 'Signed', detail: 'Use an unsigned copy.', severity: 'warning', blocksCleaning: true }] } : analysis,
  clean: async () => { cleanCalls++; return result; },
  cancel: () => {},
});
await eligibilitySession.addFiles([file('nothing-selected.pdf'), file('signed.pdf'), file('eligible.pdf')]);
const emptyId = eligibilitySession.getSnapshot().documents[0].id;
eligibilitySession.selectAll(emptyId, false);
await eligibilitySession.cleanAll();
assert.equal(cleanCalls, 1, 'batch only processes documents with a selection and no blocker');
assert.equal(eligibilitySession.getSnapshot().documents[0].status, 'ready');
assert.equal(eligibilitySession.getSnapshot().documents[1].status, 'ready', 'blocked documents keep their inspection state');
await eligibilitySession.cleanOne(emptyId);
assert.equal(cleanCalls, 1, 'empty selections must not trigger a write');
console.log('Session, limits, cancellation, verified exports and report tests passed');
