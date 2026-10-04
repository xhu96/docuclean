import type { CleaningResult, DocumentAnalysis } from '../lib/documents';
import type { DocumentProcessor } from '../lib/session';
import type { DocumentWorkerRequest, DocumentWorkerResponse } from './protocol';

type WorkerResult = DocumentAnalysis | CleaningResult;

/** Termination interrupts synchronous parser work as well as pending async operations. */
export class DocumentWorkerClient implements DocumentProcessor {
  private worker: Worker | null = null;
  private nextId = 0;
  private pending = new Map<number, { resolve: (result: WorkerResult) => void; reject: (error: Error) => void }>();

  private getWorker(): Worker {
    if (!this.worker) {
      const worker = new Worker(new URL('./document.worker.ts', import.meta.url), { type: 'module' });
      worker.addEventListener('message', (event: MessageEvent<DocumentWorkerResponse>) => {
        const response = event.data;
        const pending = this.pending.get(response.id);
        if (!pending) return;
        this.pending.delete(response.id);
        if (response.ok) pending.resolve(response.result);
        else pending.reject(new Error(response.error));
      });
      worker.addEventListener('error', () => {
        if (this.worker === worker) this.stop(new Error('The document processor stopped unexpectedly. Please retry this file.'));
      });
      worker.addEventListener('messageerror', () => {
        if (this.worker === worker) this.stop(new Error('The document processor could not read the result. Please retry this file.'));
      });
      this.worker = worker;
    }
    return this.worker;
  }

  private request(request: DocumentWorkerRequest): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      try {
        const worker = this.getWorker();
        this.pending.set(request.id, { resolve, reject });
        worker.postMessage(request);
      } catch (error) {
        this.pending.delete(request.id);
        reject(error);
      }
    });
  }

  analyze = async (file: File): Promise<DocumentAnalysis> => this.request({ id: ++this.nextId, action: 'analyze', file }) as Promise<DocumentAnalysis>;
  clean = async (file: File, selectedIds: string[]): Promise<CleaningResult> => this.request({ id: ++this.nextId, action: 'clean', file, selectedIds }) as Promise<CleaningResult>;

  private stop(error: Error) {
    this.worker?.terminate();
    this.worker = null;
    this.pending.forEach(pending => pending.reject(error));
    this.pending.clear();
  }
  cancel = () => this.stop(new Error('Processing cancelled.'));
}
