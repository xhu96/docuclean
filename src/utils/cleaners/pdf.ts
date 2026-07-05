import { PDFDocument, PDFDict, PDFName, PDFRef } from 'pdf-lib';

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
  xmp?: boolean;
}

export const DEFAULT_PDF_FIELDS: Record<string, boolean> = {
  title: true, author: true, subject: true, keywords: true,
  creator: true, producer: true, creationDate: true, modificationDate: true,
  xmp: true,
};

/**
 * Removes metadata from a PDF file.
 *
 * Deletes the selected keys from the document info dictionary (rather than
 * writing empty strings) and can drop the XMP metadata stream, which is where
 * Word, InDesign, etc. duplicate author/title information.
 */
export async function cleanPdf(file: File, enabledFields?: PdfFieldConfig): Promise<CleanResult> {
  const config: PdfFieldConfig = enabledFields ?? DEFAULT_PDF_FIELDS;

  const arrayBuffer = await file.arrayBuffer();
  // updateMetadata defaults to true, which would stamp Producer/ModDate with
  // pdf-lib's own values into the "cleaned" file. Encrypted PDFs are rejected:
  // pdf-lib cannot decrypt, so output would be silently corrupt.
  const pdfDoc = await PDFDocument.load(arrayBuffer, { updateMetadata: false });

  const removedMetadata: Record<string, string | undefined> = {};
  const info = pdfDoc.context.lookupMaybe(pdfDoc.context.trailerInfo.Info, PDFDict);

  const read = (get: () => string | undefined) => {
    try { return get(); } catch { return undefined; }
  };

  const infoFields: [keyof PdfFieldConfig, string, () => string | undefined][] = [
    ['title', 'Title', () => pdfDoc.getTitle()],
    ['author', 'Author', () => pdfDoc.getAuthor()],
    ['subject', 'Subject', () => pdfDoc.getSubject()],
    ['keywords', 'Keywords', () => pdfDoc.getKeywords()],
    ['creator', 'Creator', () => pdfDoc.getCreator()],
    ['producer', 'Producer', () => pdfDoc.getProducer()],
    ['creationDate', 'CreationDate', () => pdfDoc.getCreationDate()?.toISOString()],
    ['modificationDate', 'ModDate', () => pdfDoc.getModificationDate()?.toISOString()],
  ];

  if (info) {
    for (const [field, key, get] of infoFields) {
      const name = PDFName.of(key);
      if (!config[field] || !info.has(name)) continue;
      removedMetadata[field] = read(get);
      // if the value is an indirect object, delete it too so the bytes
      // don't survive as an orphaned object in the saved file
      const value = info.get(name);
      if (value instanceof PDFRef) pdfDoc.context.delete(value);
      info.delete(name);
    }
  }

  const metadataName = PDFName.of('Metadata');
  if (config.xmp && pdfDoc.catalog.has(metadataName)) {
    removedMetadata.xmp = '[XMP metadata stream]';
    const ref = pdfDoc.catalog.get(metadataName);
    if (ref instanceof PDFRef) pdfDoc.context.delete(ref);
    pdfDoc.catalog.delete(metadataName);
  }

  const cleanedBytes = await pdfDoc.save();
  const cleanedBlob = new Blob([cleanedBytes as BlobPart], { type: 'application/pdf' });

  return {
    originalName: file.name,
    cleanedBlob,
    removedMetadata,
  };
}
