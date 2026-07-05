import { useState, useCallback, useEffect } from 'react';
import { Shield, Github, Wifi, WifiOff } from 'lucide-react';
import { DropZone, FileList, FieldSelector, type ProcessedFile, type FieldConfig } from './components';
import { cleanPdf, cleanDocx, DEFAULT_PDF_FIELDS, DEFAULT_DOCX_FIELDS } from './utils/cleaners';

function App() {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [fieldConfig, setFieldConfig] = useState<FieldConfig>({
    pdf: { ...DEFAULT_PDF_FIELDS },
    docx: { ...DEFAULT_DOCX_FIELDS },
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleFilesSelected = useCallback(async (selectedFiles: File[]) => {
    setIsProcessing(true);

    const processedFiles: ProcessedFile[] = [];

    for (const file of selectedFiles) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isDocx =
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.toLowerCase().endsWith('.docx');
      if (!isPdf && !isDocx) continue;

      const type = isPdf ? 'pdf' : 'docx';
      const base = { id: crypto.randomUUID(), originalName: file.name, type, processedAt: new Date() } as const;

      try {
        const result = isPdf
          ? await cleanPdf(file, fieldConfig.pdf)
          : await cleanDocx(file, fieldConfig.docx);
        processedFiles.push({ ...base, cleanedBlob: result.cleanedBlob, removedMetadata: result.removedMetadata });
      } catch (error) {
        const message = error instanceof Error && /encrypt/i.test(error.message)
          ? 'This PDF is password-protected — remove the protection first.'
          : 'Could not process this file. It may be corrupt or in an unsupported format.';
        processedFiles.push({ ...base, removedMetadata: {}, error: message });
      }
    }

    setFiles((prev) => [...processedFiles, ...prev]);
    setIsProcessing(false);
  }, [fieldConfig]);

  return (
    <div className="app">
      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="header__logo">
            <Shield size={28} />
          </div>
          <h1>DocuClean</h1>
          <p className="header__subtitle">
            Remove metadata from PDF & DOCX files
          </p>
          <p className="header__badge">
            100% client-side • No uploads • No tracking
          </p>
        </header>

        {/* Main */}
        <main>
          <FieldSelector config={fieldConfig} onChange={setFieldConfig} />
          <DropZone onFilesSelected={handleFilesSelected} isProcessing={isProcessing} />
          <FileList files={files} />
        </main>

        {/* Footer */}
        <footer className="footer">
          <div className={`footer__status ${isOnline ? '' : 'footer__status--offline'}`}>
            {isOnline ? (
              <>
                <Wifi size={14} />
                <span>Online — files never leave your device</span>
              </>
            ) : (
              <>
                <WifiOff size={14} />
                <span>Offline — fully functional</span>
              </>
            )}
          </div>
          <a href="https://github.com/xhu96/docuclean" target="_blank" rel="noopener noreferrer" className="footer__link">
            <Github size={14} />
            Source
          </a>
        </footer>
      </div>
    </div>
  );
}

export default App;
