export type DocumentKind = 'pdf' | 'docx';

export interface MetadataField {
  id: string;
  label: string;
  value: string;
  group: 'identity' | 'document' | 'technical';
  personal: boolean;
}

export interface DocumentWarning {
  id: string;
  title: string;
  detail: string;
  severity: 'info' | 'warning';
  blocksCleaning?: boolean;
}

export interface DocumentAnalysis {
  kind: DocumentKind;
  fields: MetadataField[];
  warnings: DocumentWarning[];
  limitations: string[];
}

export interface CleaningResult {
  blob: Blob;
  before: DocumentAnalysis;
  after: DocumentAnalysis;
  removedIds: string[];
  retainedIds: string[];
  failedIds: string[];
  verified: boolean;
}
