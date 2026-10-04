import { useDropzone } from 'react-dropzone';
import { ArrowRight, HardDrive, LoaderCircle, Upload } from 'lucide-react';
import { FileGlyph } from './primitives';

interface Props {
  busy: boolean;
  sampleLoading: boolean;
  onAdd: (files: File[]) => void;
  onReject: (message: string) => void;
  onSample: () => void;
}

export function EmptyInspector(props: Props) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    disabled: props.busy, noClick: true, noKeyboard: true,
    onDrop: (accepted, rejected) => {
      if (rejected.length) props.onReject(`Not added: ${rejected.map(({ file }) => file.name).join(', ')}. Choose PDF or DOCX files.`);
      if (accepted.length) props.onAdd(accepted);
    },
  });
  return <section className="empty-inspector" aria-labelledby="empty-title">
    <div className="empty-content">
      <div className="empty-file-pair" aria-hidden="true"><FileGlyph kind="docx" large /><FileGlyph kind="pdf" large /></div>
      <h1 id="empty-title">Start with a document</h1>
      <p className="empty-lede">Inspect the details attached to your files.<br />Choose what to remove before sharing.</p>
      <div {...getRootProps({ className: `empty-drop${isDragActive ? ' dragging' : ''}` })}>
        <input {...getInputProps({ 'aria-label': 'Choose documents to inspect' })} />
        <Upload size={22} strokeWidth={1.6} aria-hidden="true" />
        <h2>{isDragActive ? 'Drop to inspect' : 'Drop your documents here'}</h2>
        <p>PDF or Word (.docx), up to 50 MB each</p>
        <button className="button button-primary" disabled={props.busy} onClick={open}>Choose documents<ArrowRight size={16} /></button>
      </div>
      <button className="text-button sample-button" disabled={props.busy} onClick={props.onSample}>{props.sampleLoading ? <LoaderCircle size={15} className="spin" /> : null}Use example documents<ArrowRight size={15} /></button>
      <div className="empty-privacy"><HardDrive size={17} strokeWidth={1.7} /><p><strong>On your device. Under your control.</strong><span>Files are processed in this browser. No uploads or account.<br />You get a separate copy; your original stays as it is.</span></p></div>
    </div>
  </section>;
}
