import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Archive, ArrowUpRight, Check, ChevronDown, Files, LoaderCircle, LockKeyhole, Plus, Trash2, X } from 'lucide-react';
import type { SessionDocument } from '../../lib/session';
import { documentStatus, formatSize } from './presentation';
import { FileGlyph, Hint } from './primitives';
import { PrivacyDialog } from './PrivacyDialog';

interface Props {
  documents: SessionDocument[];
  activeId: string | null;
  busy: boolean;
  zipLoading: boolean;
  progress: { completed: number; total: number; phase: 'analyzing' | 'cleaning' } | null;
  onSelect: (id: string) => void;
  onAdd: (files: File[]) => void;
  onReject: (message: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCancel: () => void;
  onCleanAll: () => void;
  onDownloadZip: () => void;
}

export function DocumentQueue(props: Props) {
  const { documents, activeId, busy, progress } = props;
  const [expanded, setExpanded] = useState(false);
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    disabled: busy, noClick: true, noKeyboard: true,
    onDrop: (accepted, rejected) => {
      if (rejected.length) props.onReject(`Not added: ${rejected.map(({ file }) => file.name).join(', ')}. Choose PDF or DOCX files.`);
      if (accepted.length) props.onAdd(accepted);
    },
  });
  const downloadable = documents.filter((doc) => doc.status === 'done' && doc.result?.verified && !doc.result.failedIds.length);
  const cleanable = documents.filter((doc) => doc.status === 'ready' && doc.selectedIds.length && !doc.analysis?.warnings.some((warning) => warning.blocksCleaning));
  return <aside {...getRootProps({ className: `queue-panel${isDragActive ? ' dragging' : ''}${expanded ? ' expanded' : ''}`, role: 'complementary', 'aria-label': 'Document session', 'aria-disabled': undefined })}>
    <div className="brand-row"><span className="brand"><Files size={23} strokeWidth={1.7} aria-hidden="true" /><span>DocuClean</span></span><button className="queue-toggle" aria-expanded={expanded} aria-controls="queue-content" onClick={() => setExpanded(!expanded)}>Documents <span className="count">{documents.length}</span><ChevronDown size={16} /></button></div>
    <div className="queue-content" id="queue-content">
      <div className="queue-heading"><h2>Documents <span className="count">{documents.length}</span></h2><Hint text="Add PDF or Word documents"><button className="icon-button" type="button" onClick={open} disabled={busy} aria-label="Add files"><Plus size={18} /></button></Hint></div>
      <div className="queue-upload"><input {...getInputProps({ 'aria-label': 'Choose PDF or DOCX files' })} /><button className="button button-secondary full-width" type="button" onClick={open} disabled={busy}><Plus size={16} />{isDragActive ? 'Drop files here' : 'Add documents'}</button><p>PDF, DOCX <span>·</span> up to 50 MB</p></div>
      {!documents.length && <div className="queue-empty-note"><Files size={22} strokeWidth={1.4} /><p>Your documents will appear here.</p><span>Only for this session.</span></div>}
      <div className="document-list" aria-label="Documents">
        {documents.map((doc) => {
          const working = doc.status === 'analyzing' || doc.status === 'cleaning';
          const done = doc.status === 'done' && doc.result?.verified;
          return <div key={doc.id} className={`document-row${doc.id === activeId ? ' selected' : ''}`}>
            <button className="document-select" onClick={() => { props.onSelect(doc.id); setExpanded(false); }} aria-current={doc.id === activeId ? 'true' : undefined}>
              <FileGlyph kind={doc.kind} /><span className="document-info"><strong title={doc.file.name}>{doc.file.name}</strong><span>{formatSize(doc.file.size)}<span className="middot">·</span>{doc.analysis ? `${done ? doc.result!.after.fields.length : doc.analysis.fields.length} properties${done ? ' left' : ''}` : documentStatus(doc)}</span>{doc.analysis && doc.status !== 'ready' && <span className={`queue-status ${doc.status}`}>{working ? <LoaderCircle size={11} className="spin" /> : done ? <Check size={11} /> : null}{documentStatus(doc)}</span>}</span>
            </button>
            <Hint text={`Remove ${doc.file.name}`}><button className="icon-button remove-document" aria-label={`Remove ${doc.file.name}`} onClick={() => props.onRemove(doc.id)}><X size={14} /></button></Hint>
          </div>;
        })}
      </div>
      {progress && <div className="batch-progress" role="status"><div><span>{progress.phase === 'analyzing' ? 'Inspecting' : 'Cleaning'} {Math.min(progress.completed + 1, progress.total)} of {progress.total}</span><button className="text-button" onClick={props.onCancel}>Cancel</button></div><progress value={progress.completed} max={progress.total} aria-label={`${progress.phase} progress`} /></div>}
      {(cleanable.length > 1 || downloadable.length > 1) && <div className="batch-actions">{cleanable.length > 1 && <button className="button button-secondary full-width" disabled={busy} onClick={props.onCleanAll}>Clean {cleanable.length === 2 ? 'both files' : `${cleanable.length} files`}</button>}{downloadable.length > 1 && <button className="button button-secondary full-width" disabled={props.zipLoading || busy} onClick={props.onDownloadZip}>{props.zipLoading ? <LoaderCircle size={15} className="spin" /> : <Archive size={15} />}Download ZIP ({downloadable.length})</button>}</div>}
      <div className="queue-bottom">
        {documents.length > 0 && <button className="text-button clear-session" onClick={props.onClear}><Trash2 size={14} />Clear session</button>}
        <p className="local-note"><LockKeyhole size={14} strokeWidth={1.6} />Files stay on this device</p>
        <nav className="sidebar-links" aria-label="About DocuClean"><PrivacyDialog /><span>·</span><a href="https://github.com/xhu96/docuclean" target="_blank" rel="noreferrer">GitHub<ArrowUpRight size={12} /></a></nav>
      </div>
    </div>
  </aside>;
}
