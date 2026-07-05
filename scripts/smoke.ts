// Smoke test: builds a PDF and a DOCX full of metadata, runs the cleaners,
// and asserts the metadata is actually gone from the output bytes.
// Run with: npm run smoke
import assert from 'node:assert';
import JSZip from 'jszip';
import { PDFDocument, PDFName } from 'pdf-lib';
import { cleanPdf } from '../src/utils/cleaners/pdf';
import { cleanDocx } from '../src/utils/cleaners/docx';

async function testPdf() {
  const doc = await PDFDocument.create(); // stamps Producer/Creator = pdf-lib
  doc.addPage();
  doc.setTitle('Secret Title');
  doc.setAuthor('Jane Secret');
  doc.setSubject('Confidential');
  doc.setKeywords(['secret', 'internal']);

  const xmp = doc.context.stream('<x:xmpmeta>SECRET-XMP-PAYLOAD</x:xmpmeta>');
  doc.catalog.set(PDFName.of('Metadata'), doc.context.register(xmp));

  const dirtyBytes = await doc.save();
  assert(Buffer.from(dirtyBytes).includes('SECRET-XMP-PAYLOAD'), 'fixture should contain XMP');

  const result = await cleanPdf(new File([dirtyBytes as BlobPart], 'fixture.pdf'));
  const cleanedBytes = Buffer.from(await result.cleanedBlob.arrayBuffer());

  assert(!cleanedBytes.includes('SECRET-XMP-PAYLOAD'), 'XMP payload must not survive in raw bytes');

  const cleaned = await PDFDocument.load(cleanedBytes, { updateMetadata: false });
  assert.equal(cleaned.getTitle(), undefined, 'Title must be gone');
  assert.equal(cleaned.getAuthor(), undefined, 'Author must be gone');
  assert.equal(cleaned.getSubject(), undefined, 'Subject must be gone');
  assert.equal(cleaned.getKeywords(), undefined, 'Keywords must be gone');
  assert.equal(cleaned.getProducer(), undefined, 'Producer must be gone (no pdf-lib re-stamp)');
  assert.equal(cleaned.getCreator(), undefined, 'Creator must be gone');
  assert.equal(cleaned.getModificationDate(), undefined, 'ModDate must be gone');
  assert(!cleaned.catalog.has(PDFName.of('Metadata')), 'catalog Metadata entry must be gone');

  assert.equal(result.removedMetadata.title, 'Secret Title');
  console.log('PDF smoke test passed');
}

async function testDocx() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml',
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Default Extension="jpeg" ContentType="image/jpeg"/>` +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>` +
    `<Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/>` +
    `</Types>`);
  zip.file('_rels/.rels',
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>` +
    `<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/>` +
    `<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail" Target="docProps/thumbnail.jpeg"/>` +
    `</Relationships>`);
  zip.file('docProps/core.xml',
    `<?xml version="1.0"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<dc:title>Secret Doc</dc:title><dc:creator>Jane Secret</dc:creator>` +
    `<cp:lastModifiedBy>Jane Secret</cp:lastModifiedBy>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">2024-01-01T00:00:00Z</dcterms:created>` +
    `</cp:coreProperties>`);
  zip.file('docProps/app.xml',
    `<?xml version="1.0"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">` +
    `<Application>Microsoft Word</Application><Company>Acme Secret Corp</Company>` +
    `</Properties>`);
  zip.file('docProps/custom.xml', `<?xml version="1.0"?><Properties><property name="ClientCode">TOPSECRET</property></Properties>`);
  zip.file('docProps/thumbnail.jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
  zip.file('word/document.xml', `<?xml version="1.0"?><document/>`);

  const dirtyBytes = await zip.generateAsync({ type: 'nodebuffer' });
  const result = await cleanDocx(new File([dirtyBytes as BlobPart], 'fixture.docx'));
  const cleaned = await JSZip.loadAsync(await result.cleanedBlob.arrayBuffer());

  assert(!cleaned.file('docProps/custom.xml'), 'custom.xml must be removed');
  assert.equal(cleaned.file(/^docProps\/thumbnail\./).length, 0, 'thumbnail must be removed');

  const rels = await cleaned.file('_rels/.rels')!.async('string');
  assert(!rels.includes('custom.xml'), '.rels must not have a dangling custom.xml relationship');
  assert(!rels.includes('thumbnail'), '.rels must not have a dangling thumbnail relationship');

  const types = await cleaned.file('[Content_Types].xml')!.async('string');
  assert(!types.includes('custom.xml'), '[Content_Types].xml must not reference custom.xml');

  const core = await cleaned.file('docProps/core.xml')!.async('string');
  assert(!core.includes('Jane Secret') && !core.includes('Secret Doc'), 'core properties must be gone');

  const app = await cleaned.file('docProps/app.xml')!.async('string');
  assert(!app.includes('Acme Secret Corp'), 'extended properties must be gone');

  assert.equal(result.removedMetadata['dc:creator'], 'Jane Secret');
  console.log('DOCX smoke test passed');
}

await testPdf();
await testDocx();
console.log('All smoke tests passed');
