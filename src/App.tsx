import { useState, useCallback, useEffect } from 'react';
import { Shield, Github, Wifi, WifiOff } from 'lucide-react';
import { DropZone, FileList, FieldSelector, type ProcessedFile, type FieldConfig, DEFAULT_PDF_FIELDS, DEFAULT_DOCX_FIELDS } from './components';
import { cleanPdf, cleanDocx } from './utils/cleaners';

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

    try {
      const processedFiles: ProcessedFile[] = [];

      for (const file of selectedFiles) {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isDocx =
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.name.toLowerCase().endsWith('.docx');

        if (isPdf) {
          const result = await cleanPdf(file, fieldConfig.pdf);
          processedFiles.push({
            id: crypto.randomUUID(),
            originalName: result.originalName,
            type: 'pdf',
            cleanedBlob: result.cleanedBlob,
            removedMetadata: result.removedMetadata,
            processedAt: new Date(),
          });
        } else if (isDocx) {
          const result = await cleanDocx(file, fieldConfig.docx);
          processedFiles.push({
            id: crypto.randomUUID(),
            originalName: result.originalName,
            type: 'docx',
            cleanedBlob: result.cleanedBlob,
            removedMetadata: result.removedMetadata,
            processedAt: new Date(),
          });
        }
      }

      setFiles((prev) => [...processedFiles, ...prev]);
    } catch (error) {
      console.error('Error processing files:', error);
    } finally {
      setIsProcessing(false);
    }
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
            100% client-side • No uploads • Works offline
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
          <div className="footer__status">
            {isOnline ? (
              <>
                <Wifi size={14} />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff size={14} />
                <span>Offline</span>
              </>
            )}
          </div>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer__link">
            <Github size={14} />
            Source
          </a>
        </footer>
      </div>
    </div>
  );
}

export default App;
