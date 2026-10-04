import { analyzeDocument, cleanDocument } from '../lib/documents';
import type { DocumentWorkerRequest, DocumentWorkerResponse } from './protocol';

self.addEventListener('message', async (event: MessageEvent<DocumentWorkerRequest>) => {
  const request = event.data;
  let response: DocumentWorkerResponse;
  try {
    const result = request.action === 'analyze'
      ? await analyzeDocument(request.file)
      : await cleanDocument(request.file, request.selectedIds);
    response = { id: request.id, ok: true, result };
  } catch (error) {
    response = { id: request.id, ok: false, error: error instanceof Error ? error.message : 'Unable to process this document.' };
  }
  self.postMessage(response);
});
