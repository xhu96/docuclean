export { cleanPdf, type CleanResult as PdfCleanResult } from './pdf';
export { cleanDocx, type CleanResult as DocxCleanResult } from './docx';

export type CleanResult = {
  originalName: string;
  cleanedBlob: Blob;
  removedMetadata: Record<string, string | undefined>;
};
