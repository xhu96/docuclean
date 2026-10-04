import type { CleaningResult, DocumentAnalysis } from '../lib/documents';

export type DocumentWorkerRequest =
  | { id: number; action: 'analyze'; file: File }
  | { id: number; action: 'clean'; file: File; selectedIds: string[] };
export type DocumentWorkerResponse =
  | { id: number; ok: true; result: DocumentAnalysis | CleaningResult }
  | { id: number; ok: false; error: string };
