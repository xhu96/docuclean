import type { Document, Element } from '@xmldom/xmldom';
import type { DocumentAnalysis, DocumentWarning, MetadataField } from './types';
import { allElements, openDocx, removePackagePart, saveXml } from './xml';

const NS = {
  dc: 'http://purl.org/dc/elements/1.1/',
  terms: 'http://purl.org/dc/terms/',
  core: 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
  app: 'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties',
  custom: 'http://schemas.openxmlformats.org/officeDocument/2006/custom-properties',
  word: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  strictWord: 'http://purl.oclc.org/ooxml/wordprocessingml/main',
};

type PropertyDefinition = [id: string, namespace: string, name: string, label: string, group: MetadataField['group'], personal: boolean];
const CORE: PropertyDefinition[] = [
  ['dc:title', NS.dc, 'title', 'Title', 'document', false],
  ['dc:subject', NS.dc, 'subject', 'Subject', 'document', false],
  ['dc:creator', NS.dc, 'creator', 'Author', 'identity', true],
  ['cp:keywords', NS.core, 'keywords', 'Keywords', 'document', false],
  ['dc:description', NS.dc, 'description', 'Description', 'document', false],
  ['cp:lastModifiedBy', NS.core, 'lastModifiedBy', 'Last edited by', 'identity', true],
  ['cp:revision', NS.core, 'revision', 'Revision number', 'technical', false],
  ['cp:lastPrinted', NS.core, 'lastPrinted', 'Last printed', 'technical', false],
  ['dcterms:created', NS.terms, 'created', 'Created', 'technical', false],
  ['dcterms:modified', NS.terms, 'modified', 'Modified', 'technical', false],
  ['cp:category', NS.core, 'category', 'Category', 'document', false],
  ['cp:contentStatus', NS.core, 'contentStatus', 'Content status', 'document', false],
];
const APP: PropertyDefinition[] = [
  ['Application', NS.app, 'Application', 'Application', 'technical', false],
  ['AppVersion', NS.app, 'AppVersion', 'Application version', 'technical', false],
  ['Company', NS.app, 'Company', 'Company', 'identity', true],
  ['Manager', NS.app, 'Manager', 'Manager', 'identity', true],
  ['Template', NS.app, 'Template', 'Template', 'technical', false],
  ['TotalTime', NS.app, 'TotalTime', 'Editing time (minutes)', 'technical', false],
  ['DocSecurity', NS.app, 'DocSecurity', 'Document security setting', 'technical', false],
];

interface PropertyLocation { path: string; document: Document; elements: Element[] }

async function inspect(file: File) {
  const opened = await openDocx(file);
  const { zip, readXml } = opened;
  const fields: MetadataField[] = [];
  const locations = new Map<string, PropertyLocation>();
  const warnings: DocumentWarning[] = [];
  for (const [path, definitions] of [['docProps/core.xml', CORE], ['docProps/app.xml', APP]] as const) {
    const document = await readXml(path);
    if (!document) continue;
    for (const [id, namespace, name, label, group, personal] of definitions) {
      const elements = allElements(document).filter(element => element.localName === name && element.namespaceURI === namespace);
      if (!elements.length) continue;
      fields.push({ id, label, group, personal, value: elements.map(element => element.textContent ?? '').join('; ') });
      locations.set(id, { path, document, elements });
    }
  }

  const custom = await readXml('docProps/custom.xml');
  if (custom) {
    const properties = allElements(custom).filter(element => element.localName === 'property' && (!element.namespaceURI || element.namespaceURI === NS.custom));
    for (const property of properties) {
      const name = property.getAttribute('name') || 'Unnamed property';
      const id = `docx:custom:${encodeURIComponent(`${property.getAttribute('pid') || ''}:${name}`)}`;
      const existing = locations.get(id);
      if (existing) {
        existing.elements.push(property);
        fields.find(field => field.id === id)!.value += `; ${property.textContent ?? ''}`;
      } else {
        fields.push({ id, label: `Custom: ${name}`, group: 'document', personal: false, value: property.textContent ?? '' });
        locations.set(id, { path: 'docProps/custom.xml', document: custom, elements: [property] });
      }
    }
  }

  const paths = Object.keys(zip.files).filter(path => !zip.files[path].dir);
  const thumbnails = paths.filter(path => /^docProps\/thumbnail\./i.test(path));
  if (thumbnails.length) fields.push({ id: 'thumbnail', label: 'Document preview', value: `${thumbnails.length} embedded preview${thumbnails.length === 1 ? '' : 's'}`, group: 'document', personal: false });

  if (paths.some(path => /^_xmlsignatures\//i.test(path))) warnings.push({
    id: 'docx-signatures', title: 'Digital signature detected', severity: 'warning', blocksCleaning: true,
    detail: 'Editing this package would invalidate its signature. Cleaning is disabled; use an unsigned copy.',
  });

  let revisions = false;
  let hidden = false;
  let comments = paths.some(path => /^word\/comments[^/]*\.xml$/i.test(path));
  for (const path of paths.filter(path => /^word\/.*\.xml$/i.test(path))) {
    const document = await readXml(path);
    if (!document) continue;
    for (const element of allElements(document)) {
      if (element.namespaceURI !== NS.word && element.namespaceURI !== NS.strictWord) continue;
      const name = element.localName ?? '';
      if (/^(ins|del|moveFrom|moveTo)$/.test(name) || /PrChange$/.test(name) || name === 'sectPrChange') revisions = true;
      if (name === 'comment' || name === 'commentRangeStart' || name === 'commentReference') comments = true;
      if (name === 'vanish' || name === 'webHidden') {
        const value = element.getAttributeNS(element.namespaceURI, 'val');
        if (!value || !['0', 'false', 'off'].includes(value.toLowerCase())) hidden = true;
      }
    }
  }
  if (comments) warnings.push({ id: 'docx-comments', title: 'Comments detected', severity: 'warning', detail: 'Comments and their author names remain in the document. Review and remove them in Word if needed.' });
  if (revisions) warnings.push({ id: 'docx-revisions', title: 'Tracked changes detected', severity: 'warning', detail: 'Revision text, editor names, and revision dates remain. Accept or reject tracked changes in Word before sharing.' });
  if (hidden) warnings.push({ id: 'docx-hidden-text', title: 'Hidden text formatting detected', severity: 'warning', detail: 'Text marked as hidden remains in the document. Inspect hidden text and styles in Word.' });
  if (paths.some(path => /^word\/embeddings\//i.test(path))) warnings.push({ id: 'docx-embeddings', title: 'Embedded files detected', severity: 'warning', detail: 'Embedded files can contain their own metadata and content. They are preserved and are not inspected.' });
  if (paths.some(path => /^word\/media\//i.test(path))) warnings.push({ id: 'docx-media', title: 'Images or media detected', severity: 'info', detail: 'Images and media are preserved. Metadata inside them, such as EXIF, is not inspected or removed.' });

  const analysis: DocumentAnalysis = {
    kind: 'docx', fields, warnings,
    limitations: [
      'Inspection covers supported document properties, custom properties, previews, and common residual-content indicators.',
      'Document text, comments, revisions, embedded files, image metadata, and document statistics are not removed. Hidden content detection is not exhaustive.',
      'Custom property values and document titles can also identify people; the identity preset does not classify their contents.',
    ],
  };
  return { ...opened, analysis, locations, thumbnails, custom };
}

export async function analyzeDocx(file: File): Promise<DocumentAnalysis> {
  return (await inspect(file)).analysis;
}

export async function removeDocxMetadata(file: File, ids: Set<string>): Promise<Blob> {
  const { zip, readXml, analysis, locations, thumbnails, custom } = await inspect(file);
  if (analysis.warnings.some(warning => warning.blocksCleaning)) throw new Error('Signed documents cannot be cleaned without invalidating their signature.');
  const changed = new Map<string, Document>();
  for (const id of ids) {
    const location = locations.get(id);
    if (!location) continue;
    for (const element of location.elements) element.parentNode?.removeChild(element);
    changed.set(location.path, location.document);
  }
  for (const [path, document] of changed) saveXml(zip, path, document);
  if (custom && changed.has('docProps/custom.xml') && !allElements(custom).some(element => element.localName === 'property')) {
    await removePackagePart(zip, 'docProps/custom.xml', readXml);
  }
  if (ids.has('thumbnail')) for (const path of thumbnails) await removePackagePart(zip, path, readXml);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
