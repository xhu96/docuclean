import JSZip from 'jszip';
import type { SessionDocument } from './session';

const cleanedName = (name: string) => {
  // eslint-disable-next-line no-control-regex -- Filenames must not contain control characters.
  const safe = name.replace(/[\\/\u0000-\u001f\u007f]/g, '_').replace(/^\.+/, '') || 'document';
  const dot = safe.lastIndexOf('.');
  return dot > 0 ? `${safe.slice(0, dot)}-cleaned${safe.slice(dot).toLowerCase()}` : `${safe}-cleaned`;
};

export function isDownloadable(doc: SessionDocument): boolean {
  return doc.status === 'done' && !!doc.result?.verified && doc.result.failedIds.length === 0;
}

/** Make every entry unique even on case-insensitive destination file systems. */
export function buildExportEntries(docs: SessionDocument[]): { name: string; blob: Blob }[] {
  const used = new Set<string>();
  return docs.filter(isDownloadable).map(doc => {
    const base = cleanedName(doc.file.name);
    const dot = base.lastIndexOf('.');
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const extension = dot > 0 ? base.slice(dot) : '';
    let name = base;
    let suffix = 2;
    while (used.has(name.normalize('NFC').toLowerCase())) name = `${stem}-${suffix++}${extension}`;
    used.add(name.normalize('NFC').toLowerCase());
    return { name, blob: doc.result!.blob };
  });
}

async function saveBlob(blob: Blob, name: string) {
  // Keep DOM download code out of pure helpers and the document processing worker.
  const { default: FileSaver } = await import('file-saver');
  FileSaver.saveAs(blob, name);
}

export function downloadDocument(doc: SessionDocument): void {
  const entry = buildExportEntries([doc])[0];
  if (entry) void saveBlob(entry.blob, entry.name);
}

export async function downloadZip(docs: SessionDocument[]): Promise<void> {
  const entries = buildExportEntries(docs);
  if (!entries.length) return;
  const zip = new JSZip();
  // ArrayBuffers work consistently in browsers and in the test runtime.
  for (const entry of entries) zip.file(entry.name, await entry.blob.arrayBuffer());
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  await saveBlob(blob, `docuclean-${new Date().toISOString().slice(0, 10)}.zip`);
}

export function createMetadataReport(doc: SessionDocument) {
  const before = doc.result?.before ?? doc.analysis;
  if (!before) throw new Error('Analyze the document before exporting its report.');
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    containsMetadataValues: true,
    privacyNotice: 'This report contains original metadata values, which may include personal or confidential information. Review it before sharing.',
    originalFile: { name: doc.file.name, format: doc.kind, sizeBytes: doc.file.size },
    status: doc.status,
    selectedFieldIds: [...doc.selectedIds],
    before,
    after: doc.result?.after ?? null,
    verification: {
      performed: !!doc.result,
      verified: isDownloadable(doc),
      removedFieldIds: doc.result?.removedIds ?? [],
      retainedFieldIds: doc.result?.retainedIds ?? before.fields.map(field => field.id),
      failedFieldIds: doc.result?.failedIds ?? [],
      scope: 'Verification checks supported metadata fields. It does not certify that document contents are anonymous or free of hidden information.',
    },
    error: doc.error ?? null,
  };
}

export function downloadReport(doc: SessionDocument): void {
  const report = createMetadataReport(doc);
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  // eslint-disable-next-line no-control-regex -- Report filenames need the same control-character sanitization.
  const base = doc.file.name.replace(/\.[^.]+$/, '').replace(/[\\/\u0000-\u001f\u007f]/g, '_');
  void saveBlob(blob, `${base}-metadata-report.json`);
}
