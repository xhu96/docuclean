import JSZip from 'jszip';
import type { CleanResult } from './pdf';

export interface DocxFieldConfig {
  [key: string]: boolean | undefined;
}

// Core properties (docProps/core.xml, Dublin Core)
const CORE_TAGS = [
  'dc:title', 'dc:subject', 'dc:creator', 'cp:keywords', 'dc:description',
  'cp:lastModifiedBy', 'cp:revision', 'cp:lastPrinted',
  'dcterms:created', 'dcterms:modified', 'cp:category', 'cp:contentStatus',
];

// Extended properties (docProps/app.xml)
const APP_TAGS = [
  'Application', 'AppVersion', 'Company', 'Manager', 'Template', 'TotalTime', 'DocSecurity',
];

function removeXmlTag(xml: string, tagName: string): { xml: string; value: string | undefined } {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>|<${tagName}[^/]*\\/>`, 'gi');
  const match = xml.match(regex);
  let value: string | undefined;

  if (match && match.length > 0) {
    const contentMatch = match[0].match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
    value = contentMatch ? contentMatch[1].trim() : '';
  }

  return { xml: xml.replace(regex, ''), value };
}

// Removes a package part along with its entries in _rels/.rels and
// [Content_Types].xml — a dangling relationship to a missing part makes
// Word report the document as corrupt.
async function removePart(zip: JSZip, path: string): Promise<void> {
  zip.remove(path);
  const escaped = path.replace(/[.[\]]/g, '\\$&');

  const rels = zip.file('_rels/.rels');
  if (rels) {
    const xml = await rels.async('string');
    zip.file('_rels/.rels', xml.replace(
      new RegExp(`<Relationship[^>]*Target="/?${escaped}"[^>]*/>`, 'gi'), ''
    ));
  }

  const types = zip.file('[Content_Types].xml');
  if (types) {
    const xml = await types.async('string');
    zip.file('[Content_Types].xml', xml.replace(
      new RegExp(`<Override[^>]*PartName="/${escaped}"[^>]*/>`, 'gi'), ''
    ));
  }
}

/**
 * Removes metadata from a DOCX file: core/extended document properties,
 * custom properties, and the document thumbnail (a rendered preview of
 * page one that survives property cleaning).
 */
export const DEFAULT_DOCX_FIELDS: Record<string, boolean> = Object.fromEntries(
  [...CORE_TAGS, ...APP_TAGS, 'custom.xml', 'thumbnail'].map(t => [t, true])
);

export async function cleanDocx(file: File, enabledFields?: DocxFieldConfig): Promise<CleanResult> {
  const config = enabledFields ?? DEFAULT_DOCX_FIELDS;

  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const removedMetadata: Record<string, string | undefined> = {};

  const cleanXmlPart = async (path: string, tags: string[]) => {
    const part = zip.file(path);
    if (!part) return;
    let xml = await part.async('string');
    for (const tag of tags) {
      if (!config[tag]) continue;
      const result = removeXmlTag(xml, tag);
      xml = result.xml;
      if (result.value) removedMetadata[tag] = result.value;
    }
    zip.file(path, xml);
  };

  await cleanXmlPart('docProps/core.xml', CORE_TAGS);
  await cleanXmlPart('docProps/app.xml', APP_TAGS);

  if (config['custom.xml'] && zip.file('docProps/custom.xml')) {
    removedMetadata['custom.xml'] = '[Removed]';
    await removePart(zip, 'docProps/custom.xml');
  }

  if (config['thumbnail']) {
    const thumbnail = zip.file(/^docProps\/thumbnail\./)[0];
    if (thumbnail) {
      removedMetadata['thumbnail'] = '[Removed]';
      await removePart(zip, thumbnail.name);
    }
  }

  const cleanedBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  return { originalName: file.name, cleanedBlob, removedMetadata };
}
