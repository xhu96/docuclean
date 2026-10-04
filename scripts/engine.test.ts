import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { analyzeDocument, cleanDocument } from '../src/lib/documents/index';

const wordNs = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const body = `<w:document xmlns:w="${wordNs}"><w:body><w:p><w:r><w:t>Keep this document text.</w:t></w:r><w:ins w:author="Reviewer"><w:r><w:t>Revision</w:t></w:r></w:ins><w:r><w:rPr><w:vanish/></w:rPr><w:t>Hidden text</w:t></w:r></w:p></w:body></w:document>`;

async function docxFixture(signed = false) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<t:Types xmlns:t="http://schemas.openxmlformats.org/package/2006/content-types"><t:Override ContentType='application/xml' PartName='/docProps/custom.xml'/><t:Override ContentType='image/jpeg' PartName='/docProps/thumbnail.jpeg'/></t:Types>`);
  zip.file('_rels/.rels', `<r:Relationships xmlns:r="http://schemas.openxmlformats.org/package/2006/relationships"><r:Relationship Id='r1' Target='docProps/custom.xml' Type='custom'/><r:Relationship Id='r2' Target='/docProps/thumbnail.jpeg' Type='thumbnail'/></r:Relationships>`);
  zip.file('docProps/core.xml', `<meta:coreProperties xmlns:meta="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:words="http://purl.org/dc/elements/1.1/"><words:creator>Jane &amp; Co</words:creator><words:title>Keep the title</words:title><meta:lastModifiedBy>Reviewer</meta:lastModifiedBy></meta:coreProperties>`);
  zip.file('docProps/app.xml', `<a:Properties xmlns:a="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><a:Company>Example Co</a:Company><a:Application>Word</a:Application></a:Properties>`);
  zip.file('docProps/custom.xml', `<c:Properties xmlns:c="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:v="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><c:property pid="2" name="Client"><v:lpwstr>Secret client</v:lpwstr></c:property><c:property pid="3" name="Project"><v:lpwstr>Project Alpha</v:lpwstr></c:property></c:Properties>`);
  zip.file('docProps/thumbnail.jpeg', new Uint8Array([0xff, 0xd8, 0xff]));
  zip.file('word/document.xml', body);
  zip.file('word/comments.xml', `<w:comments xmlns:w="${wordNs}"><w:comment w:author="Reviewer"/></w:comments>`);
  zip.file('word/embeddings/object.bin', new Uint8Array([1, 2, 3]));
  if (signed) zip.file('_xmlsignatures/sig1.xml', '<Signature/>');
  return new File([await zip.generateAsync({ type: 'uint8array' }) as BlobPart], 'sample.docx');
}

async function testDocxInspectionAndSelectiveCleaning() {
  const file = await docxFixture();
  const before = await analyzeDocument(file);
  assert.equal(before.kind, 'docx');
  assert.equal(before.fields.find(field => field.id === 'dc:creator')?.value, 'Jane & Co');
  const client = before.fields.find(field => field.label.includes('Client'))!;
  const project = before.fields.find(field => field.label.includes('Project'))!;
  assert.ok(client && project, 'custom properties are individually inspectable');
  for (const id of ['docx-comments', 'docx-revisions', 'docx-hidden-text', 'docx-embeddings']) {
    assert.ok(before.warnings.some(warning => warning.id === id), `${id} is reported`);
  }
  const result = await cleanDocument(file, ['dc:creator', client.id]);
  assert.equal(result.verified, true);
  assert.deepEqual(new Set(result.removedIds), new Set(['dc:creator', client.id]));
  assert.deepEqual(result.failedIds, []);
  assert.equal(result.after.fields.find(field => field.id === 'dc:title')?.value, 'Keep the title');
  assert.equal(result.after.fields.find(field => field.id === project.id)?.value, 'Project Alpha');
  const zip = await JSZip.loadAsync(await result.blob.arrayBuffer());
  assert.equal(await zip.file('word/document.xml')!.async('string'), body, 'document content is preserved byte-for-byte');
  assert.ok(zip.file('word/comments.xml'), 'comments are reported, not silently removed');

  const all = await cleanDocument(file, before.fields.map(field => field.id));
  const cleaned = await JSZip.loadAsync(await all.blob.arrayBuffer());
  assert.equal(all.after.fields.length, 0);
  assert.equal(cleaned.file('docProps/custom.xml'), null);
  assert.equal(cleaned.file('docProps/thumbnail.jpeg'), null);
  assert.ok(!(await cleaned.file('_rels/.rels')!.async('string')).includes('docProps/custom.xml'));
  assert.ok(!(await cleaned.file('[Content_Types].xml')!.async('string')).includes('thumbnail.jpeg'));
}

async function pdfFixture(signed = false) {
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText('Keep this PDF text.');
  pdf.setAuthor('Jane Example');
  pdf.setTitle('Public title');
  const info = pdf.context.lookup(pdf.context.trailerInfo.Info)!;
  if ('set' in info) info.set(PDFName.of('ClientCode'), PDFString.of('SECRET-CLIENT'));
  const stream = pdf.context.stream('<x:xmpmeta>SECRET-XMP</x:xmpmeta>');
  pdf.catalog.set(PDFName.of('Metadata'), pdf.context.register(stream));
  await pdf.attach(new Uint8Array([1, 2, 3]), 'attachment.txt');
  const annotation = pdf.context.obj({ Type: 'Annot', Subtype: 'Text', Contents: PDFString.of('Review note') });
  pdf.getPages()[0].node.set(PDFName.of('Annots'), pdf.context.obj([pdf.context.register(annotation)]));
  if (signed) pdf.catalog.set(PDFName.of('Perms'), pdf.context.obj({ DocMDP: pdf.context.register(pdf.context.obj({ Type: 'Sig', ByteRange: [0, 1, 2, 3] })) }));
  return new File([await pdf.save() as BlobPart], 'sample.pdf');
}

async function testPdfInspectionAndCleaning() {
  const file = await pdfFixture();
  const before = await analyzeDocument(file);
  assert.equal(before.fields.find(field => field.id === 'author')?.value, 'Jane Example');
  assert.equal(before.fields.find(field => field.id === 'pdf:info:ClientCode')?.value, 'SECRET-CLIENT');
  assert.ok(before.warnings.some(warning => warning.id === 'pdf-attachments'));
  assert.ok(before.warnings.some(warning => warning.id === 'pdf-annotations'));
  const result = await cleanDocument(file, ['author', 'xmp', 'pdf:info:ClientCode']);
  assert.equal(result.verified, true);
  assert.equal(result.after.fields.find(field => field.id === 'title')?.value, 'Public title');
  assert.ok(result.after.warnings.some(warning => warning.id === 'pdf-attachments'));
  assert.ok(!Buffer.from(await result.blob.arrayBuffer()).includes('SECRET-XMP'));
  const reopened = await PDFDocument.load(await result.blob.arrayBuffer(), { updateMetadata: false });
  assert.equal(reopened.getPageCount(), 1);
  assert.equal(reopened.getAuthor(), undefined);
}

async function testNoOpAndSignatures() {
  for (const make of [docxFixture, pdfFixture]) {
    const file = await make();
    const unchanged = await cleanDocument(file, []);
    assert.deepEqual(await unchanged.blob.arrayBuffer(), await file.arrayBuffer());
    assert.equal(unchanged.verified, false, 'no-op must not imply a verified removal');
    assert.deepEqual(unchanged.removedIds, []);
    const signed = await make(true);
    const analysis = await analyzeDocument(signed);
    assert.ok(analysis.warnings.some(warning => warning.blocksCleaning));
    await assert.rejects(cleanDocument(signed, analysis.fields.map(field => field.id)), /sign/i);
  }
  await assert.rejects(analyzeDocument(new File(['plain text'], 'pretend.docx')));
  await assert.rejects(analyzeDocument(new File(['anything'], 'unsupported.txt')), /support/i);
}

await testDocxInspectionAndSelectiveCleaning();
await testPdfInspectionAndCleaning();
await testNoOpAndSignatures();
console.log('Engine fixtures passed: inspection, namespace-safe selection, residuals, verification, no-op, signatures.');
