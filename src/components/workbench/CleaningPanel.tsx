import { AlertTriangle, ArrowRight, Check, Download, LoaderCircle, LockKeyhole, RotateCcw } from 'lucide-react';
import type { DocumentPreset, SessionDocument } from '../../lib/session';

interface Props {
  document: SessionDocument;
  busy: boolean;
  onPreset: (id: string, preset: DocumentPreset) => void;
  onClean: (id: string) => void;
  onDownload: (document: SessionDocument) => void;
  onEdit: () => void;
}

const presets: { value: DocumentPreset; title: string; detail: string }[] = [
  { value: 'all', title: 'All metadata', detail: 'Remove every detected property' },
  { value: 'personal', title: 'Identity only', detail: 'Names and organizations' },
  { value: 'custom', title: 'Custom selection', detail: 'Choose individual properties' },
];

export function CleaningPanel({ document: doc, busy, onPreset, onClean, onDownload, onEdit }: Props) {
  const analysis = doc.analysis!;
  const result = doc.result;
  const done = doc.status === 'done' && result?.verified;
  const warnings = (done ? result.after : analysis).warnings;
  const blocked = analysis.warnings.some(warning => warning.blocksCleaning);
  const removing = done ? result.removedIds.length : doc.selectedIds.length;
  const keeping = done ? result.after.fields.length : analysis.fields.length - doc.selectedIds.length;
  return <aside className={`cleaning-panel${done ? ' is-verified' : ''}`} aria-labelledby="cleaning-title">
    <div className="cleaning-intro"><h2 id="cleaning-title">{done ? <><span className="verified-icon"><Check size={14} strokeWidth={2.2} /></span>Copy is ready</> : 'Cleaned copy'}</h2><p>{done ? 'Your selection has been verified.' : 'Choose what to leave behind.'}</p></div>
    {!done && <fieldset className="preset-options" disabled={busy || blocked}><legend className="sr-only">Removal preset</legend>{presets.map(preset => <label className={`preset-option${doc.preset === preset.value ? ' active' : ''}`} key={preset.value}><input type="radio" name={`preset-${doc.id}`} value={preset.value} checked={doc.preset === preset.value} onChange={() => onPreset(doc.id, preset.value)} /><span><strong>{preset.title}</strong><span>{preset.detail}</span></span></label>)}</fieldset>}
    {doc.preset === 'personal' && !done && <p className="preset-note">Dates and other properties may also identify you.</p>}
    <dl className="removal-summary"><div><dt>{done ? 'Removed' : 'To remove'}</dt><dd className={done ? 'success-text' : 'accent-text'}>{removing}</dd></div><div><dt>{done ? 'Remaining' : 'To keep'}</dt><dd>{keeping}</dd></div></dl>
    {warnings.length > 0 && <div className="warning-list">{warnings.map(warning => <div className="warning-item" key={warning.id}><AlertTriangle size={15} /><div><strong>{warning.title}</strong><p>{warning.detail}</p></div></div>)}</div>}
    <div className="copy-action">
      {!done && <p className="action-note">{blocked ? 'Use an unsigned copy to enable cleaning.' : !removing ? 'Select at least one property to remove.' : 'Only the selected metadata is removed.'}</p>}
      {done ? <button className="button button-primary full-width" onClick={() => onDownload(doc)}><Download size={16} />Download clean copy</button> : <button className="button button-primary full-width" disabled={busy || blocked || !removing || doc.status !== 'ready'} onClick={() => onClean(doc.id)}>{doc.status === 'cleaning' ? <><LoaderCircle size={16} className="spin" />Verifying removal…</> : <>Create clean copy<ArrowRight size={16} /></>}</button>}
      <p className="original-note"><LockKeyhole size={13} strokeWidth={1.6} />Original file stays untouched</p>
      {done && <button className="text-button change-selection" disabled={busy} onClick={onEdit}><RotateCcw size={14} />Change selection</button>}
    </div>
    <div className="verification-note"><h3>{done ? 'Verification passed' : 'Checked before download'}</h3><p>{done ? 'The copy was inspected again. All selected supported properties are absent.' : 'The copy is inspected again to verify your selection.'}</p></div>
  </aside>;
}
