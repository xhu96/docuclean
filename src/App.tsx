import { useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { ChevronRight, X } from 'lucide-react';
import { useDocumentSession } from './hooks/useDocumentSession';
import { downloadDocument, downloadReport, downloadZip } from './lib/exports';
import { DocumentQueue } from './components/workbench/DocumentQueue';
import { Inspector } from './components/workbench/Inspector';
import { EmptyInspector } from './components/workbench/EmptyInspector';

function App() {
  const session = useDocumentSession();
  const [sampleLoading, setSampleLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const active = session.documents.find((document) => document.id === session.activeId);
  const busy = session.busy || sampleLoading;

  async function loadSamples() {
    setSampleLoading(true);
    try {
      const { createSampleDocuments } = await import('./lib/sample');
      await session.addFiles(await createSampleDocuments());
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Sample files could not be created. Please try your own document.');
    } finally { setSampleLoading(false); }
  }

  async function saveArchive() {
    setZipLoading(true);
    try { await downloadZip(session.documents); }
    catch (error) { setFeedback(error instanceof Error ? error.message : 'The archive could not be created. Try downloading files individually.'); }
    finally { setZipLoading(false); }
  }

  const notices = [...session.notices, ...(feedback ? [feedback] : [])];
  return (
    <Tooltip.Provider delayDuration={450}>
      <a className="skip-link" href="#workspace">Skip to document inspector</a>
      <div className="app-shell">
        <DocumentQueue documents={session.documents} activeId={session.activeId} busy={busy} zipLoading={zipLoading} progress={session.progress}
          onSelect={session.setActiveId} onAdd={(files) => { void session.addFiles(files); }} onReject={setFeedback}
          onRemove={session.removeDocument} onClear={session.clearSession} onCancel={session.cancel}
          onCleanAll={() => { void session.cleanAll(); }} onDownloadZip={() => { void saveArchive(); }} />
        <main className="main-shell" id="workspace" tabIndex={-1}>
          <header className="workspace-bar">
            <div className="breadcrumb"><span>Documents</span><ChevronRight size={13} /><strong>{active ? 'Inspector' : 'New session'}</strong></div>
            <span className="session-indicator"><span />Local session</span>
          </header>
          {notices.length > 0 && <div className="notice-banner" role="alert"><div>{notices.map((notice, index) => <p key={index}>{notice}</p>)}</div><button className="icon-button" aria-label="Dismiss notifications" onClick={() => { session.dismissNotices(); setFeedback(''); }}><X size={17} /></button></div>}
          {active ? <Inspector key={active.id} document={active} busy={busy}
            onPreset={session.setPreset} onToggle={session.toggleField} onSelectAll={session.selectAll}
            onClean={(id) => { void session.cleanOne(id); }} onRetry={(id) => { void session.retry(id); }}
            onDownload={downloadDocument} onReport={downloadReport} /> :
            <EmptyInspector busy={busy} sampleLoading={sampleLoading} onAdd={(files) => { void session.addFiles(files); }} onReject={setFeedback} onSample={() => { void loadSamples(); }} />}
        </main>
      </div>
    </Tooltip.Provider>
  );
}
export default App;
