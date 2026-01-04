import { Download, FileText, FileType, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { saveAs } from 'file-saver';
import { useState } from 'react';

export interface ProcessedFile {
  id: string;
  originalName: string;
  type: 'pdf' | 'docx';
  cleanedBlob: Blob;
  removedMetadata: Record<string, string | undefined>;
  processedAt: Date;
}

interface FileListProps {
  files: ProcessedFile[];
}

function MetadataPreview({ metadata }: { metadata: Record<string, string | undefined> }) {
  const entries = Object.entries(metadata).filter(([, value]) => value && value.trim() !== '');
  
  if (entries.length === 0) {
    return <p className="metadata-empty">No metadata found</p>;
  }

  return (
    <div className="metadata-grid">
      {entries.slice(0, 6).map(([key, value]) => (
        <div key={key} className="metadata-item">
          <span className="metadata-key">{key.replace(/^(dc:|cp:|dcterms:)/, '')}</span>
          <span className="metadata-value">{value}</span>
        </div>
      ))}
      {entries.length > 6 && (
        <div className="metadata-item">
          <span className="metadata-more">+{entries.length - 6} more</span>
        </div>
      )}
    </div>
  );
}

function FileCard({ file }: { file: ProcessedFile }) {
  const [showMetadata, setShowMetadata] = useState(false);
  
  const handleDownload = () => {
    const cleanName = file.originalName.replace(/\.(pdf|docx)$/i, '_clean.$1');
    saveAs(file.cleanedBlob, cleanName);
  };

  const metadataCount = Object.values(file.removedMetadata).filter(
    (v) => v && v.trim() !== ''
  ).length;

  return (
    <div className="file-card">
      <div className="file-card__main">
        <div className={`file-card__icon file-card__icon--${file.type}`}>
          {file.type === 'pdf' ? <FileType size={24} /> : <FileText size={24} />}
        </div>

        <div className="file-card__info">
          <h4>{file.originalName}</h4>
          <div className="file-card__status">
            <span className="file-card__check">
              <Check size={12} />
              Cleaned
            </span>
            {metadataCount > 0 && (
              <button
                onClick={() => setShowMetadata(!showMetadata)}
                className="file-card__toggle"
              >
                {metadataCount} fields
                {showMetadata ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
        </div>

        <button onClick={handleDownload} className="btn btn--primary">
          <Download size={16} />
          Download
        </button>
      </div>

      {showMetadata && (
        <div className="file-card__metadata">
          <MetadataPreview metadata={file.removedMetadata} />
        </div>
      )}
    </div>
  );
}

export function FileList({ files }: FileListProps) {
  if (files.length === 0) return null;

  const handleDownloadAll = () => {
    files.forEach((file) => {
      const cleanName = file.originalName.replace(/\.(pdf|docx)$/i, '_clean.$1');
      saveAs(file.cleanedBlob, cleanName);
    });
  };

  return (
    <div className="file-list">
      <div className="file-list__header">
        <h2>Processed ({files.length})</h2>
        {files.length > 1 && (
          <button onClick={handleDownloadAll} className="btn btn--secondary">
            <Download size={14} />
            Download All
          </button>
        )}
      </div>

      <div className="file-list__items">
        {files.map((file) => (
          <FileCard key={file.id} file={file} />
        ))}
      </div>
    </div>
  );
}
