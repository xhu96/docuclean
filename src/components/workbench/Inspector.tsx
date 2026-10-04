import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { AlertTriangle, ArrowDownToLine, ChevronDown, LoaderCircle, RotateCcw, Search, X } from 'lucide-react';
import type { DocumentPreset, SessionDocument } from '../../lib/session';
import { documentStatus, formatSize } from './presentation';
import { FileGlyph, Hint } from './primitives';
import { MetadataTable } from './MetadataTable';
import { CleaningPanel } from './CleaningPanel';

interface Props {
  document: SessionDocument;
  busy: boolean;
  onPreset: (id: string, preset: DocumentPreset) => void;
  onToggle: (id: string, fieldId: string) => void;
  onSelectAll: (id: string, selected: boolean) => void;
  onClean: (id: string) => void;
  onRetry: (id: string) => void;
  onDownload: (document: SessionDocument) => void;
  onReport: (document: SessionDocument) => void;
}

export function Inspector(props: Props) {
  const { document: doc, busy } = props;
  const [query, setQuery] = useState('');
  const [resultView, setResultView] = useState('review');
  const analysis = doc.analysis;
  const result = doc.result;
  const working = ['queued', 'analyzing', 'cleaning'].includes(doc.status);
  const done = doc.status === 'done' && !!result?.verified;
  const blocked = analysis?.warnings.some(warning => warning.blocksCleaning) ?? false;
  const originalFields = analysis?.fields ?? [];
  const tableProps = { selectedIds: doc.selectedIds, removedIds: result?.removedIds, query, disabled: busy || blocked, onToggle: (fieldId: string) => props.onToggle(doc.id, fieldId), onSelectAll: (selected: boolean) => props.onSelectAll(doc.id, selected), onClearSearch: () => setQuery('') };
  const search = <div className="property-search"><Search size={16} strokeWidth={1.7} aria-hidden="true" /><input type="search" aria-label="Find a property" placeholder="Find a property…" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setQuery(''); }} />{query && <button className="icon-button" aria-label="Clear property search" onClick={() => setQuery('')}><X size={14} /></button>}</div>;

  return <section className="inspector" aria-labelledby="inspector-title" aria-busy={working}>
    <header className="inspector-heading"><div className="document-heading"><FileGlyph kind={doc.kind} large /><div className="inspector-title"><h1 id="inspector-title">{doc.file.name}</h1><p>{doc.kind === 'docx' ? 'Word document' : 'PDF document'}<span className="middot">·</span><span className="file-size">{formatSize(doc.file.size)}</span></p></div></div>{analysis && <Hint text="Download JSON with original metadata values. Keep this report private."><button className="button button-secondary report-button" onClick={() => props.onReport(doc)}>Export report<ArrowDownToLine size={15} /></button></Hint>}</header>
    {!analysis && working && <div className="inspector-state" role="status"><LoaderCircle size={25} className="spin" /><h2>Inspecting document</h2><p>Reading properties on your device.</p></div>}
    {(doc.status === 'error' || doc.status === 'cancelled') && <div className="error-state" role="alert"><AlertTriangle size={20} /><div><h2>{doc.status === 'cancelled' ? 'Processing cancelled' : 'Could not process this document'}</h2><p>{doc.error || 'Your original has not changed. You can try again when ready.'}</p><button className="button button-secondary" disabled={busy} onClick={() => props.onRetry(doc.id)}><RotateCcw size={15} />Try again</button></div></div>}
    {analysis && <div className="inspector-layout">
      <div className="metadata-panel">
        {done && result ? <Tabs.Root value={resultView} onValueChange={setResultView} className="result-tabs"><Tabs.List className="result-tab-list" aria-label="Compare document metadata"><Tabs.Trigger value="review">Review changes<span className="count">{result.removedIds.length}</span></Tabs.Trigger><Tabs.Trigger value="cleaned">Cleaned file<span className="count">{result.after.fields.length}</span></Tabs.Trigger></Tabs.List>{search}<Tabs.Content value="review"><MetadataTable {...tableProps} fields={originalFields} mode="review" /></Tabs.Content><Tabs.Content value="cleaned"><MetadataTable {...tableProps} fields={result.after.fields} mode="cleaned" /></Tabs.Content></Tabs.Root> : <><div className="metadata-heading"><h2>Metadata <span className="count">{originalFields.length}</span></h2><span>{doc.selectedIds.length} selected</span></div>{search}<MetadataTable {...tableProps} fields={originalFields} mode="selection" /></>}
        <details className="inspection-limits"><summary><ChevronDown size={14} />About metadata removal</summary><div><ul>{analysis.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul><p>Metadata removal does not redact visible text or guarantee anonymity.</p></div></details>
      </div>
      <CleaningPanel document={doc} busy={busy} onPreset={props.onPreset} onClean={props.onClean} onDownload={props.onDownload} onEdit={() => { setQuery(''); setResultView('review'); props.onPreset(doc.id, doc.preset); }} />
    </div>}
    <span className="sr-only" role="status">{documentStatus(doc)}</span>
  </section>;
}
