import type { CleaningResult, DocumentAnalysis, DocumentKind } from './documents';

export type DocumentPreset = 'all' | 'personal' | 'custom';
export type DocumentStatus = 'queued' | 'analyzing' | 'ready' | 'cleaning' | 'done' | 'error' | 'cancelled';
export interface SessionDocument {
  id: string;
  file: File;
  kind: DocumentKind;
  status: DocumentStatus;
  analysis?: DocumentAnalysis;
  result?: CleaningResult;
  selectedIds: string[];
  preset: DocumentPreset;
  error?: string;
}
export interface SessionSnapshot {
  documents: SessionDocument[];
  activeId: string | null;
  busy: boolean;
  progress: { completed: number; total: number; phase: 'analyzing' | 'cleaning' } | null;
  notices: string[];
}
export interface DocumentProcessor {
  analyze(file: File): Promise<DocumentAnalysis>;
  clean(file: File, selectedIds: string[]): Promise<CleaningResult>;
  cancel(): void;
}
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_SESSION_BYTES = 200 * 1024 * 1024;
export const MAX_FILES = 50;

export function documentKind(file: File): DocumentKind | undefined {
  const extension = file.name.split('.').at(-1)?.toLowerCase();
  return extension === 'pdf' || extension === 'docx' ? extension : undefined;
}

export function validateFiles(files: File[], existing: File[]): { accepted: File[]; notices: string[] } {
  const accepted: File[] = [];
  const notices: string[] = [];
  let bytes = existing.reduce((sum, file) => sum + file.size, 0);
  for (const file of files) {
    let reason: string | undefined;
    if (!documentKind(file)) reason = 'Only PDF and DOCX files are supported.';
    else if (!file.size) reason = 'This file is empty.';
    else if (file.size > MAX_FILE_BYTES) reason = 'Exceeds the 50 MB file limit.';
    else if (existing.length + accepted.length >= MAX_FILES) reason = 'The session is limited to 50 files.';
    else if (bytes + file.size > MAX_SESSION_BYTES) reason = 'Exceeds the 200 MB session limit.';
    if (reason) notices.push(`${file.name}: ${reason}`);
    else { accepted.push(file); bytes += file.size; }
  }
  return { accepted, notices };
}

export function presetFields(analysis: DocumentAnalysis, preset: Exclude<DocumentPreset, 'custom'>): string[] {
  return analysis.fields.filter(field => preset === 'all' || field.personal).map(field => field.id);
}

type Phase = 'analyzing' | 'cleaning';
interface Task { id: string; phase: Phase; retired: boolean; finish: () => void }
const isProcessing = (doc: SessionDocument) => ['queued', 'analyzing', 'cleaning'].includes(doc.status);

/** An in-memory queue. Retired tasks may finish, but can never write into the current session. */
export class DocumentSession {
  private snapshot: SessionSnapshot = { documents: [], activeId: null, busy: false, progress: null, notices: [] };
  private listeners = new Set<() => void>();
  private tasks: Task[] = [];
  private running: Task | null = null;
  private pumping = false;
  private completed: Record<Phase, number> = { analyzing: 0, cleaning: 0 };
  private failedPhase = new Map<string, Phase>();
  private processor: DocumentProcessor;

  constructor(processor: DocumentProcessor) { this.processor = processor; }
  getSnapshot = (): SessionSnapshot => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };

  private publish(next: Partial<SessionSnapshot> = {}) {
    const live = [...(this.running && !this.running.retired ? [this.running] : []), ...this.tasks];
    const phase = live[0]?.phase;
    const progress = phase ? {
      phase, completed: this.completed[phase],
      total: this.completed[phase] + live.filter(task => task.phase === phase).length,
    } : null;
    if (!phase) this.completed = { analyzing: 0, cleaning: 0 };
    this.snapshot = { ...this.snapshot, ...next, busy: !!phase, progress };
    this.listeners.forEach(listener => listener());
  }

  private update(id: string, patch: Partial<SessionDocument>) {
    this.snapshot = { ...this.snapshot, documents: this.snapshot.documents.map(doc => doc.id === id ? { ...doc, ...patch } : doc) };
  }

  setActiveId = (id: string | null) => {
    if (id === null || this.snapshot.documents.some(doc => doc.id === id)) this.publish({ activeId: id });
  };
  dismissNotices = () => this.publish({ notices: [] });

  addFiles = async (files: File[]): Promise<void> => {
    const { accepted, notices } = validateFiles(files, this.snapshot.documents.map(doc => doc.file));
    const added: SessionDocument[] = accepted.map(file => ({
      id: crypto.randomUUID(), file, kind: documentKind(file)!, status: 'queued', selectedIds: [], preset: 'all',
    }));
    this.snapshot = {
      ...this.snapshot, documents: [...this.snapshot.documents, ...added],
      notices: [...this.snapshot.notices, ...notices], activeId: this.snapshot.activeId ?? added[0]?.id ?? null,
    };
    const promises = added.map(doc => this.enqueue(doc.id, 'analyzing'));
    this.publish();
    void this.pump();
    await Promise.all(promises);
  };

  private enqueue(id: string, phase: Phase): Promise<void> {
    this.failedPhase.set(id, phase);
    return new Promise(resolve => this.tasks.push({ id, phase, retired: false, finish: resolve }));
  }

  private async pump() {
    if (this.pumping) return;
    this.pumping = true;
    try {
      while (this.tasks.length) {
        const task = this.tasks.shift()!;
        this.running = task;
        const doc = this.snapshot.documents.find(item => item.id === task.id);
        if (!doc) { task.finish(); this.running = null; continue; }
        this.update(doc.id, { status: task.phase, error: undefined });
        this.publish();
        try {
          if (task.phase === 'analyzing') {
            const analysis = await this.processor.analyze(doc.file);
            if (!task.retired) this.update(doc.id, {
              analysis, status: 'ready', selectedIds: presetFields(analysis, 'all'), preset: 'all', result: undefined,
            });
          } else {
            const result = await this.processor.clean(doc.file, doc.selectedIds);
            if (!task.retired) {
              if (!result.verified || result.failedIds.length) {
                throw new Error('Verification failed: some selected metadata remains. No download was created. Try again or adjust your selection.');
              }
              this.update(doc.id, { result, status: 'done', error: undefined });
            }
          }
          if (!task.retired) this.failedPhase.delete(doc.id);
        } catch (error) {
          if (!task.retired) this.update(doc.id, {
            status: 'error', result: undefined,
            error: error instanceof Error ? error.message : 'This document could not be processed. Try a different file.',
          });
        } finally {
          if (!task.retired) this.completed[task.phase] += 1;
          task.finish();
          this.running = null;
          this.publish();
        }
      }
    } finally { this.pumping = false; }
  }

  private retire(id?: string) {
    const matches = (task: Task) => id === undefined || task.id === id;
    if (this.running && matches(this.running)) {
      this.running.retired = true;
      this.running.finish();
    }
    if (id === undefined || this.running?.id === id) this.processor.cancel();
    this.tasks = this.tasks.filter(task => {
      if (!matches(task)) return true;
      task.retired = true; task.finish(); return false;
    });
  }

  removeDocument = (id: string) => {
    this.retire(id);
    this.failedPhase.delete(id);
    const index = this.snapshot.documents.findIndex(doc => doc.id === id);
    const documents = this.snapshot.documents.filter(doc => doc.id !== id);
    this.publish({ documents, activeId: this.snapshot.activeId === id ? documents[Math.min(index, documents.length - 1)]?.id ?? null : this.snapshot.activeId });
  };

  cancel = () => {
    this.retire();
    this.publish({ documents: this.snapshot.documents.map(doc => isProcessing(doc) ? { ...doc, status: 'cancelled', error: undefined, result: undefined } : doc) });
  };

  clearSession = () => {
    this.retire();
    this.failedPhase.clear();
    this.publish({ documents: [], activeId: null, notices: [] });
  };

  private changeSelection(id: string, selectedIds: string[], preset: DocumentPreset) {
    const doc = this.snapshot.documents.find(item => item.id === id);
    if (!doc?.analysis || isProcessing(doc)) return;
    const detected = new Set(doc.analysis.fields.map(field => field.id));
    this.update(id, { selectedIds: [...new Set(selectedIds)].filter(field => detected.has(field)), preset, result: undefined, status: 'ready', error: undefined });
    this.failedPhase.delete(id);
    this.publish();
  }

  setPreset = (id: string, preset: DocumentPreset) => {
    const doc = this.snapshot.documents.find(item => item.id === id);
    if (doc?.analysis) this.changeSelection(id, preset === 'custom' ? doc.selectedIds : presetFields(doc.analysis, preset), preset);
  };
  toggleField = (id: string, fieldId: string) => {
    const doc = this.snapshot.documents.find(item => item.id === id);
    if (doc) this.changeSelection(id, doc.selectedIds.includes(fieldId) ? doc.selectedIds.filter(field => field !== fieldId) : [...doc.selectedIds, fieldId], 'custom');
  };
  selectAll = (id: string, selected: boolean) => {
    const doc = this.snapshot.documents.find(item => item.id === id);
    if (doc?.analysis) this.changeSelection(id, selected ? presetFields(doc.analysis, 'all') : [], selected ? 'all' : 'custom');
  };

  cleanOne = async (id: string): Promise<void> => {
    const doc = this.snapshot.documents.find(item => item.id === id);
    if (!doc?.analysis || isProcessing(doc) || doc.selectedIds.length === 0) return;
    const blocker = doc.analysis.warnings.find(warning => warning.blocksCleaning);
    if (blocker) { this.update(id, { status: 'error', error: blocker.detail, result: undefined }); this.publish(); return; }
    this.update(id, { status: 'queued', error: undefined, result: undefined });
    const pending = this.enqueue(id, 'cleaning');
    this.publish();
    void this.pump();
    await pending;
  };

  cleanAll = async (): Promise<void> => {
    await Promise.all(this.snapshot.documents.filter(doc => doc.status === 'ready' && doc.selectedIds.length > 0 && !doc.analysis?.warnings.some(warning => warning.blocksCleaning)).map(doc => this.cleanOne(doc.id)));
  };

  retry = async (id: string): Promise<void> => {
    const doc = this.snapshot.documents.find(item => item.id === id);
    if (!doc || !['error', 'cancelled'].includes(doc.status)) return;
    if (doc.analysis && this.failedPhase.get(id) !== 'analyzing') { await this.cleanOne(id); return; }
    this.update(id, { status: 'queued', error: undefined, result: undefined });
    const pending = this.enqueue(id, 'analyzing');
    this.publish();
    void this.pump();
    await pending;
  };
}
