import * as Dialog from '@radix-ui/react-dialog';
import { FileCheck2, HardDrive, ShieldCheck, X } from 'lucide-react';

export function PrivacyDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild><button className="privacy-trigger"><span>Privacy</span></button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <div className="dialog-icon"><ShieldCheck size={28} /></div>
          <Dialog.Title>Your files are yours.</Dialog.Title>
          <Dialog.Description>DocuClean processes documents in this browser. No account, uploads, or analytics.</Dialog.Description>
          <div className="privacy-detail"><HardDrive size={20} /><div><h3>Only in this session</h3><p>Documents and their metadata stay in memory. Clear the session or close the tab to release them. Downloads are saved only when you choose.</p></div></div>
          <div className="privacy-detail"><FileCheck2 size={20} /><div><h3>A verified copy</h3><p>After cleaning, we read the output again to check the selected supported properties are absent. Your original file is never overwritten.</p></div></div>
          <div className="privacy-detail"><ShieldCheck size={20} /><div><h3>Know the limits</h3><p>Verification is not a guarantee of anonymity. Page text, comments, revisions, attachments and embedded media can still identify you. Detection is best effort; inspect the content before sharing.</p></div></div>
          <p className="report-disclosure">Exported reports include the original metadata values. Treat them with the same care as your document.</p>
          <Dialog.Close asChild><button className="button button-primary dialog-done">Got it</button></Dialog.Close>
          <Dialog.Close asChild><button className="icon-button dialog-close" aria-label="Close privacy information"><X size={20} /></button></Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
