import { useEffect, useState, useSyncExternalStore } from 'react';
import { DocumentSession } from '../lib/session';
import { DocumentWorkerClient } from '../workers/client';

export function useDocumentSession() {
  const [session] = useState(() => new DocumentSession(new DocumentWorkerClient()));
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useEffect(() => () => session.cancel(), [session]);
  return {
    ...snapshot,
    setActiveId: session.setActiveId, addFiles: session.addFiles, removeDocument: session.removeDocument,
    clearSession: session.clearSession, setPreset: session.setPreset, toggleField: session.toggleField,
    selectAll: session.selectAll, cleanOne: session.cleanOne, cleanAll: session.cleanAll, cancel: session.cancel,
    retry: session.retry, dismissNotices: session.dismissNotices,
  };
}
