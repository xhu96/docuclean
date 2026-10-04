import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

/** Real, synthetic fixtures: the same parser and cleaner handle samples and user files. */
export async function createSampleDocuments(): Promise<File[]> {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Northstar project brief');
  pdf.setAuthor('Alex Morgan (fictional)');
  pdf.setSubject('Synthetic sample document for DocuClean');
  pdf.setKeywords(['sample', 'northstar', 'internal']);
  pdf.setCreator('Northstar Design Studio');
  pdf.setProducer('Sample document generator');
  pdf.setCreationDate(new Date('2026-03-12T09:30:00Z'));
  pdf.setModificationDate(new Date('2026-03-14T14:45:00Z'));
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]);
  page.drawText('NORTHSTAR', { x: 56, y: 764, size: 12, font: bold, color: rgb(0.2, 0.4, 0.32) });
  page.drawText('A little less to share.', { x: 56, y: 704, size: 28, font: bold, color: rgb(0.12, 0.17, 0.14) });
  page.drawText('Project brief / Sample document', { x: 56, y: 668, size: 13, font: regular, color: rgb(0.4, 0.45, 0.42) });
  const lines = [
    'This is a synthetic document created to demonstrate DocuClean.',
    'Its metadata contains a fictional author, software details, and dates.',
    '',
    'Inspect those details, choose what to remove, and verify the result.',
    'The text on this page stays exactly where it is.',
    '',
    'All names and project details in this sample are fictional.',
  ];
  lines.forEach((line, index) => page.drawText(line, { x: 56, y: 605 - index * 24, size: 11, font: regular, color: rgb(0.2, 0.25, 0.22) }));
  const pdfBytes = await pdf.save({ updateFieldAppearances: false });

  const zip = new JSZip();
  zip.file('[Content_Types].xml', `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
<Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/>
</Types>`);
  zip.file('_rels/.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/>
</Relationships>`);
  zip.file('word/_rels/document.xml.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
  zip.file('word/document.xml', `${XML}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Northstar meeting notes</w:t></w:r></w:p>
<w:p><w:r><w:t>This synthetic sample includes document properties and a review comment.</w:t></w:r></w:p>
<w:p><w:commentRangeStart w:id="0"/><w:r><w:t>Review the launch checklist before sharing this document.</w:t></w:r><w:commentRangeEnd w:id="0"/><w:r><w:commentReference w:id="0"/></w:r></w:p>
<w:p><w:r><w:t>DocuClean can remove supported document properties. Review comments remain in the document and are shown as a warning.</w:t></w:r></w:p>
<w:p><w:r><w:t>All names and project details in this sample are fictional.</w:t></w:r></w:p>
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
</w:body></w:document>`);
  zip.file('word/styles.xml', `${XML}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="40"/></w:rPr></w:style></w:styles>`);
  zip.file('word/comments.xml', `${XML}<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:comment w:id="0" w:author="Jamie Lee (fictional)" w:initials="JL" w:date="2026-03-14T10:00:00Z"><w:p><w:r><w:t>Sample review comment: remember to review comments separately before sharing.</w:t></w:r></w:p></w:comment></w:comments>`);
  zip.file('docProps/core.xml', `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Northstar meeting notes</dc:title><dc:subject>Synthetic DocuClean sample</dc:subject><dc:creator>Alex Morgan (fictional)</dc:creator><cp:lastModifiedBy>Jamie Lee (fictional)</cp:lastModifiedBy><cp:keywords>sample, internal, northstar</cp:keywords><cp:revision>4</cp:revision><dcterms:created xsi:type="dcterms:W3CDTF">2026-03-12T09:30:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2026-03-14T14:45:00Z</dcterms:modified></cp:coreProperties>`);
  zip.file('docProps/app.xml', `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Northstar Sample Writer</Application><Company>Northstar Studio (fictional)</Company><Manager>Alex Morgan (fictional)</Manager><AppVersion>1.0</AppVersion></Properties>`);
  zip.file('docProps/custom.xml', `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="Project code"><vt:lpwstr>NORTHSTAR-SAMPLE-042</vt:lpwstr></property></Properties>`);
  const docxBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return [
    new File([pdfBytes as BlobPart], 'Northstar-project-brief.pdf', { type: 'application/pdf' }),
    new File([docxBytes as BlobPart], 'Northstar-meeting-notes.docx', { type: DOCX_TYPE }),
  ];
}
