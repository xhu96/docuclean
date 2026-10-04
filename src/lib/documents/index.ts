import { analyzeDocx, removeDocxMetadata } from './docx';
import { analyzePdf, removePdfMetadata } from './pdf';
import type { CleaningResult, DocumentAnalysis, DocumentKind } from './types';

export type { CleaningResult, DocumentAnalysis, DocumentKind, DocumentWarning, MetadataField } from './types';

function documentKind(file: File): DocumentKind {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'pdf' && extension !== 'docx') throw new Error('Only PDF and DOCX documents are supported.');
  return extension;
}

export async function analyzeDocument(file: File): Promise<DocumentAnalysis> {
  return documentKind(file) === 'pdf' ? analyzePdf(file) : analyzeDocx(file);
}

export async function cleanDocument(file: File, selectedIds: string[]): Promise<CleaningResult> {
  const before = await analyzeDocument(file);
  const selected = new Set(selectedIds);
  const targets = before.fields.filter(field => selected.has(field.id));
  if (targets.length === 0) return {
    blob: file, before, after: before, removedIds: [], retainedIds: before.fields.map(field => field.id),
    failedIds: [], verified: false,
  };
  if (before.warnings.some(warning => warning.blocksCleaning)) throw new Error('Signed documents cannot be cleaned without invalidating their signature.');
  const blob = before.kind === 'pdf' ? await removePdfMetadata(file, selected) : await removeDocxMetadata(file, selected);
  // Reopen bytes through the same read-only path. A successful write alone is
  // insufficient evidence that a requested field is absent from the output.
  const after = await analyzeDocument(new File([blob], file.name, { type: blob.type }));
  const remaining = new Map(after.fields.map(field => [field.id, field.value]));
  const removedIds = targets.filter(field => !remaining.has(field.id)).map(field => field.id);
  const failedIds = targets.filter(field => remaining.has(field.id)).map(field => field.id);
  const retained = before.fields.filter(field => !selected.has(field.id));
  const retainedIntact = retained.every(field => remaining.get(field.id) === field.value);
  return {
    blob, before, after, removedIds, failedIds,
    retainedIds: after.fields.map(field => field.id),
    verified: removedIds.length > 0 && failedIds.length === 0 && retainedIntact,
  };
}
