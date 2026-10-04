import {
  PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFObject,
  PDFRawStream, PDFRef, PDFStream, PDFString, decodePDFRawStream,
} from 'pdf-lib';
import type { DocumentAnalysis, DocumentWarning, MetadataField } from './types';

const INFO: Record<string, [id: string, label: string, group: MetadataField['group'], personal: boolean]> = {
  Title: ['title', 'Title', 'document', false],
  Author: ['author', 'Author', 'identity', true],
  Subject: ['subject', 'Subject', 'document', false],
  Keywords: ['keywords', 'Keywords', 'document', false],
  Creator: ['creator', 'Created with', 'technical', false],
  Producer: ['producer', 'PDF producer', 'technical', false],
  CreationDate: ['creationDate', 'Created', 'technical', false],
  ModDate: ['modificationDate', 'Modified', 'technical', false],
};

function textValue(value: PDFObject | undefined): string {
  if (value instanceof PDFString || value instanceof PDFHexString) return value.decodeText();
  if (value instanceof PDFName) return value.decodeText();
  if (value instanceof PDFDict || value instanceof PDFStream || value instanceof PDFArray) return '[Structured metadata value]';
  return value?.toString() ?? '[Unreadable value]';
}

function walkObject(object: PDFObject | undefined, visit: (object: PDFObject) => void, visited = new Set<PDFObject>()) {
  if (!object || visited.has(object)) return;
  visited.add(object);
  visit(object);
  if (object instanceof PDFStream) walkObject(object.dict, visit, visited);
  if (object instanceof PDFDict) for (const value of object.values()) walkObject(value, visit, visited);
  if (object instanceof PDFArray) for (const value of object.asArray()) walkObject(value, visit, visited);
}

async function inspect(file: File) {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false, throwOnInvalidObject: true });
  } catch (error) {
    if (error instanceof Error && /encrypt/i.test(error.message)) throw new Error('Password-protected or encrypted PDFs are not supported. Save an unencrypted copy first.');
    throw new Error('This PDF could not be read. It may be damaged or use an unsupported structure.');
  }
  const fields: MetadataField[] = [];
  const warnings: DocumentWarning[] = [];
  const info = pdf.context.lookupMaybe(pdf.context.trailerInfo.Info, PDFDict);
  const locations = new Map<string, PDFName>();
  if (info) for (const [name, object] of info.entries()) {
    const key = name.decodeText();
    const [id, label, group, personal] = INFO[key] ?? [`pdf:info:${key}`, `Custom: ${key}`, 'document', false];
    const value = textValue(pdf.context.lookup(object));
    if (value.length > 1024 * 1024) throw new Error('A PDF metadata value exceeds the inspection limit.');
    fields.push({ id, label, group, personal, value });
    locations.set(id, name);
  }
  const metadata = pdf.catalog.lookup(PDFName.of('Metadata'));
  if (metadata) {
    let value = '[XMP metadata packet]';
    if (metadata instanceof PDFRawStream) {
      try {
        const bytes = decodePDFRawStream(metadata).getBytes(65537);
        value = new TextDecoder().decode(bytes.slice(0, 65536));
        if (bytes.length > 65536) value += '\n[Preview limited to 64 KB; cleaning removes the whole packet.]';
      } catch { value = '[XMP packet cannot be displayed; it can still be removed.]'; }
    }
    fields.push({ id: 'xmp', label: 'XMP metadata packet', value, group: 'document', personal: false });
  }

  let signature = false;
  let attachments = false;
  let annotations = false;
  let extraMetadata = false;
  let forms = false;
  const visited = new Set<PDFObject>();
  for (const [, object] of pdf.context.enumerateIndirectObjects()) walkObject(object, candidate => {
    if (!(candidate instanceof PDFDict)) return;
    const type = candidate.lookup(PDFName.of('Type'));
    const typeName = type instanceof PDFName ? type.decodeText() : '';
    const fieldType = candidate.lookup(PDFName.of('FT'));
    if (typeName === 'Sig' || candidate.has(PDFName.of('ByteRange')) || (fieldType === PDFName.of('Sig') && candidate.has(PDFName.of('V')))) signature = true;
    if (typeName === 'EmbeddedFile' || candidate.has(PDFName.of('EmbeddedFiles')) || candidate.has(PDFName.of('EF'))) attachments = true;
    if (typeName === 'Annot') annotations = true;
    if (candidate.has(PDFName.of('AcroForm'))) forms = true;
    const nestedMetadata = candidate.lookup(PDFName.of('Metadata'));
    if (nestedMetadata && candidate !== pdf.catalog) extraMetadata = true;
  }, visited);
  // Some annotations omit /Type; the page annotation array is authoritative.
  for (const page of pdf.getPages()) {
    const annots = page.node.lookup(PDFName.of('Annots'));
    if (annots instanceof PDFArray && annots.size() > 0) annotations = true;
  }
  if (signature) warnings.push({ id: 'pdf-signatures', title: 'Digital signature detected', severity: 'warning', blocksCleaning: true, detail: 'Rewriting this PDF would invalidate its signature. Cleaning is disabled; use an unsigned copy.' });
  if (attachments) warnings.push({ id: 'pdf-attachments', title: 'Attached files detected', severity: 'warning', detail: 'Attached files are preserved and can contain their own metadata. Open and inspect them separately before sharing.' });
  if (annotations) warnings.push({ id: 'pdf-annotations', title: 'Annotations or comments detected', severity: 'warning', detail: 'Annotations, review comments, links, and their author information are preserved. Review them in a PDF editor.' });
  if (forms) warnings.push({ id: 'pdf-forms', title: 'Interactive form detected', severity: 'info', detail: 'Form fields and entered values are preserved. They may contain personal information.' });
  if (extraMetadata) warnings.push({ id: 'pdf-extra-metadata', title: 'Additional metadata streams detected', severity: 'warning', detail: 'Metadata attached to pages or other objects is outside the supported document-level cleaning scope and remains in the PDF.' });
  const analysis: DocumentAnalysis = {
    kind: 'pdf', fields, warnings,
    limitations: [
      'Inspection covers the document information dictionary and catalog XMP packet. Selected entries are checked again after saving.',
      'Text, images, forms, attachments, annotations, document identifiers, and metadata on individual pages or objects are preserved. Detection of hidden content is not exhaustive.',
      'A successful check confirms removal from supported metadata locations; it is not a forensic sanitization or anonymity guarantee.',
    ],
  };
  return { pdf, info, locations, analysis };
}

export async function analyzePdf(file: File): Promise<DocumentAnalysis> {
  return (await inspect(file)).analysis;
}

export async function removePdfMetadata(file: File, ids: Set<string>): Promise<Blob> {
  const { pdf, info, locations, analysis } = await inspect(file);
  if (analysis.warnings.some(warning => warning.blocksCleaning)) throw new Error('Signed documents cannot be cleaned without invalidating their signature.');
  const detached: PDFRef[] = [];
  for (const id of ids) {
    const name = locations.get(id);
    if (name && info) {
      const object = info.get(name);
      if (object instanceof PDFRef) detached.push(object);
      info.delete(name);
    }
  }
  if (ids.has('xmp')) {
    const object = pdf.catalog.get(PDFName.of('Metadata'));
    if (object instanceof PDFRef) detached.push(object);
    pdf.catalog.delete(PDFName.of('Metadata'));
  }
  // Remove detached values from the serialized objects, but never damage an
  // object still shared by page content, another metadata field, or a form.
  const referenced = new Set<string>();
  const visited = new Set<PDFObject>();
  for (const [, object] of pdf.context.enumerateIndirectObjects()) walkObject(object, candidate => {
    if (candidate instanceof PDFRef) referenced.add(candidate.toString());
  }, visited);
  for (const ref of detached) if (!referenced.has(ref.toString())) pdf.context.delete(ref);
  return new Blob([await pdf.save({ updateFieldAppearances: false }) as BlobPart], { type: 'application/pdf' });
}
