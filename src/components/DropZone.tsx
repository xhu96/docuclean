import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, FileType, Loader2 } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx'];

export function DropZone({ onFilesSelected, isProcessing }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const filterValidFiles = useCallback((files: FileList | null): File[] => {
    if (!files) return [];
    return Array.from(files).filter(
      (file) =>
        ACCEPTED_TYPES.includes(file.type) ||
        ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
    );
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const validFiles = filterValidFiles(e.dataTransfer.files);
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [onFilesSelected, filterValidFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const validFiles = filterValidFiles(e.target.files);
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
      e.target.value = '';
    },
    [onFilesSelected, filterValidFiles]
  );

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    if (!isProcessing) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        dropzone
        ${isDragging ? 'dropzone--active' : ''}
        ${isProcessing ? 'dropzone--processing' : ''}
      `}
    >
      <div className="dropzone__content">
        {isProcessing ? (
          <div className="dropzone__icon dropzone__icon--processing">
            <Loader2 size={40} />
          </div>
        ) : isDragging ? (
          <div className="dropzone__icon dropzone__icon--dragging">
            <Upload size={40} />
          </div>
        ) : (
          <div className="dropzone__icons">
            <div className="dropzone__icon dropzone__icon--pdf">
              <FileType size={32} />
            </div>
            <div className="dropzone__icon dropzone__icon--docx">
              <FileText size={32} />
            </div>
          </div>
        )}

        <div className="dropzone__text">
          <h3>
            {isProcessing
              ? 'Processing...'
              : isDragging
              ? 'Drop files here'
              : 'Drop PDF or DOCX files here'}
          </h3>
          <p>
            {isProcessing
              ? 'Removing metadata'
              : 'or click to browse'}
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
