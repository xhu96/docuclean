import type { SessionDocument } from '../../lib/session';
import type { MetadataField } from '../../lib/documents';

const dateFields = new Set(['creationDate', 'modificationDate', 'dcterms:created', 'dcterms:modified', 'cp:lastPrinted']);
export function displayMetadataValue(field: MetadataField): string {
  if (!dateFields.has(field.id)) return field.value;
  let raw = field.value;
  const pdf = /^D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(Z|[+-]\d{2}'?\d{2}'?)$/.exec(raw);
  if (pdf) raw = `${pdf[1]}-${pdf[2]}-${pdf[3]}T${pdf[4]}:${pdf[5]}:${pdf[6]}${pdf[7].replace(/'/g, '')}`;
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(raw)) return field.value;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return field.value;
  return `${new Intl.DateTimeFormat('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'UTC' }).format(date)} UTC`;
}

export function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
export function documentStatus(document: SessionDocument): string {
  if (document.status === 'done' && document.result?.verified) return document.result.removedIds.length ? 'Removal verified' : 'No changes made';
  if (document.status === 'ready') {
    if (document.analysis?.warnings.some((warning) => warning.blocksCleaning)) return 'Inspection only';
    return document.analysis?.fields.length ? 'Ready to clean' : 'No supported metadata found';
  }
  const labels = { queued: 'In queue', analyzing: 'Inspecting…', cleaning: 'Cleaning and verifying…', done: 'Review needed', error: 'Could not process', cancelled: 'Cancelled' };
  return labels[document.status];
}
