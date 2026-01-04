import JSZip from 'jszip';

export interface CleanResult {
  originalName: string;
  cleanedBlob: Blob;
  removedMetadata: Record<string, string | undefined>;
}

export interface DocxFieldConfig {
  [key: string]: boolean | undefined;
}

// Core tags (Dublin Core)
const CORE_TAGS = [
  'dc:title', 'dc:subject', 'dc:creator', 'cp:keywords', 'dc:description',
  'cp:lastModifiedBy', 'cp:revision', 'cp:lastPrinted',
  'dcterms:created', 'dcterms:modified', 'cp:category', 'cp:contentStatus',
];

// App tags
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

/**
 * Removes metadata from a DOCX file.
 * Only removes fields that are enabled in the config.
 */
export async function cleanDocx(file: File, enabledFields?: DocxFieldConfig): Promise<CleanResult> {
  // Default: all enabled
  const config = enabledFields ?? Object.fromEntries(
    [...CORE_TAGS, ...APP_TAGS, 'custom.xml'].map(t => [t, true])
  );

  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const removedMetadata: Record<string, string | undefined> = {};

  // Process core.xml
  const coreXmlFile = zip.file('docProps/core.xml');
  if (coreXmlFile) {
    let coreXml = await coreXmlFile.async('string');
    
    for (const tag of CORE_TAGS) {
      if (config[tag]) {
        const result = removeXmlTag(coreXml, tag);
        coreXml = result.xml;
        if (result.value) removedMetadata[tag] = result.value;
      }
    }
    
    zip.file('docProps/core.xml', coreXml);
  }

  // Process app.xml
  const appXmlFile = zip.file('docProps/app.xml');
  if (appXmlFile) {
    let appXml = await appXmlFile.async('string');
    
    for (const tag of APP_TAGS) {
      if (config[tag]) {
        const result = removeXmlTag(appXml, tag);
        appXml = result.xml;
        if (result.value) removedMetadata[tag] = result.value;
      }
    }
    
    zip.file('docProps/app.xml', appXml);
  }

  // Remove custom.xml if enabled
  if (config['custom.xml'] && zip.file('docProps/custom.xml')) {
    removedMetadata['custom.xml'] = '[Removed]';
    zip.remove('docProps/custom.xml');
  }

  const cleanedBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  return { originalName: file.name, cleanedBlob, removedMetadata };
}
