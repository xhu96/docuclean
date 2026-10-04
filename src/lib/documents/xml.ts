import { DOMParser, XMLSerializer, type Document, type Element } from '@xmldom/xmldom';
import JSZip from 'jszip';

const MAX_EXPANDED_BYTES = 150 * 1024 * 1024;
const MAX_XML_BYTES = 8 * 1024 * 1024;
const MAX_XML_TOTAL = 32 * 1024 * 1024;

/** Read the ZIP directory before any inflation, including entries we do not edit. */
function checkZipBudget(bytes: ArrayBuffer) {
  const view = new DataView(bytes);
  let end = bytes.byteLength - 22;
  const lower = Math.max(0, end - 65535);
  for (; end >= lower; end--) {
    if (view.getUint32(end, true) === 0x06054b50 && end + 22 + view.getUint16(end + 20, true) === bytes.byteLength) break;
  }
  if (end < lower) throw new Error('This file is not a readable DOCX package.');
  const entries = view.getUint16(end + 10, true);
  if (view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0 || entries === 65535) {
    throw new Error('Split archives and ZIP64 documents are not supported.');
  }
  if (entries > 4000) throw new Error('This document contains too many package entries to inspect safely.');
  let offset = view.getUint32(end + 16, true);
  let expanded = 0;
  for (let i = 0; i < entries; i++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw new Error('The DOCX package directory is invalid.');
    if (view.getUint16(offset + 8, true) & 1) throw new Error('Encrypted DOCX packages are not supported.');
    expanded += view.getUint32(offset + 24, true);
    if (expanded > MAX_EXPANDED_BYTES) throw new Error('The expanded document exceeds the 150 MB inspection limit.');
    const nameLength = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(new Uint8Array(bytes, offset + 46, nameLength));
    if (/\.xml$/i.test(name) && view.getUint32(offset + 24, true) > MAX_XML_BYTES) {
      throw new Error('An XML part exceeds the 8 MB inspection limit.');
    }
    offset += 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
    if (offset > end) throw new Error('The DOCX package directory is invalid.');
  }
}

export async function openDocx(file: File) {
  const bytes = await file.arrayBuffer();
  checkZipBudget(bytes);
  const zip = await JSZip.loadAsync(bytes);
  if (!zip.file('[Content_Types].xml') || !zip.file('word/document.xml')) {
    throw new Error('This ZIP does not contain a supported Word document.');
  }
  let xmlBytes = 0;
  const documents = new Map<string, Document>();
  const readXml = async (path: string): Promise<Document | undefined> => {
    if (documents.has(path)) return documents.get(path);
    const entry = zip.file(path);
    if (!entry) return undefined;
    const buffer = await entry.async('uint8array');
    xmlBytes += buffer.byteLength;
    if (buffer.byteLength > MAX_XML_BYTES || xmlBytes > MAX_XML_TOTAL) throw new Error('The document exceeds the XML inspection limit.');
    // DTDs are unnecessary in OOXML. Reject them instead of expanding entities.
    const xml = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Documents containing XML entity declarations cannot be inspected safely.');
    const document = new DOMParser({ onError: () => { throw new Error(`Invalid XML in ${path}.`); } }).parseFromString(xml, 'application/xml');
    if (!document.documentElement) throw new Error(`Empty XML in ${path}.`);
    documents.set(path, document);
    return document;
  };
  return { zip, readXml };
}

export function allElements(document: Document): Element[] {
  return Array.from(document.getElementsByTagName('*'));
}

export function saveXml(zip: JSZip, path: string, document: Document) {
  zip.file(path, new XMLSerializer().serializeToString(document));
}

/** Remove relationships and content type declarations by attributes, regardless of XML prefixes. */
export async function removePackagePart(
  zip: JSZip,
  path: string,
  readXml: (path: string) => Promise<Document | undefined>,
) {
  zip.remove(path);
  for (const manifest of ['_rels/.rels', '[Content_Types].xml']) {
    const xml = await readXml(manifest);
    if (!xml) continue;
    for (const element of allElements(xml)) {
      const attribute = element.localName === 'Relationship' ? 'Target' : element.localName === 'Override' ? 'PartName' : null;
      if (!attribute) continue;
      const value = element.getAttribute(attribute)?.replace(/^\/?(?:\.\/)?/, '');
      if (value === path) element.parentNode?.removeChild(element);
    }
    saveXml(zip, manifest, xml);
  }
}
