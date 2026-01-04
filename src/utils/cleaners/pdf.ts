import { PDFDocument } from 'pdf-lib';

export interface CleanResult {
  originalName: string;
  cleanedBlob: Blob;
  removedMetadata: Record<string, string | undefined>;
}

export interface PdfFieldConfig {
  title?: boolean;
  author?: boolean;
  subject?: boolean;
  keywords?: boolean;
  creator?: boolean;
  producer?: boolean;
  creationDate?: boolean;
  modificationDate?: boolean;
}

/**
 * Removes metadata from a PDF file using pdf-lib.
 * Only removes fields that are enabled in the config.
 */
export async function cleanPdf(file: File, enabledFields?: PdfFieldConfig): Promise<CleanResult> {
  const config = enabledFields ?? {
    title: true, author: true, subject: true, keywords: true,
    creator: true, producer: true, creationDate: true, modificationDate: true,
  };

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  const removedMetadata: Record<string, string | undefined> = {};

  if (config.title) {
    removedMetadata.title = pdfDoc.getTitle();
    pdfDoc.setTitle('');
  }
  if (config.author) {
    removedMetadata.author = pdfDoc.getAuthor();
    pdfDoc.setAuthor('');
  }
  if (config.subject) {
    removedMetadata.subject = pdfDoc.getSubject();
    pdfDoc.setSubject('');
  }
  if (config.keywords) {
    removedMetadata.keywords = pdfDoc.getKeywords();
    pdfDoc.setKeywords([]);
  }
  if (config.creator) {
    removedMetadata.creator = pdfDoc.getCreator();
    pdfDoc.setCreator('');
  }
  if (config.producer) {
    removedMetadata.producer = pdfDoc.getProducer();
    pdfDoc.setProducer('');
  }
  if (config.creationDate) {
    removedMetadata.creationDate = pdfDoc.getCreationDate()?.toISOString();
    pdfDoc.setCreationDate(new Date(0));
  }
  if (config.modificationDate) {
    removedMetadata.modificationDate = pdfDoc.getModificationDate()?.toISOString();
    pdfDoc.setModificationDate(new Date(0));
  }

  const cleanedBytes = await pdfDoc.save();
  const cleanedBlob = new Blob([cleanedBytes as BlobPart], { type: 'application/pdf' });

  return {
    originalName: file.name,
    cleanedBlob,
    removedMetadata,
  };
}
