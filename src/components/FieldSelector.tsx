import { useState } from 'react';
import { Settings, ChevronDown, ChevronUp, Check, Minus } from 'lucide-react';

export interface FieldConfig {
  pdf: Record<string, boolean>;
  docx: Record<string, boolean>;
}

export const DEFAULT_PDF_FIELDS = {
  title: true,
  author: true,
  subject: true,
  keywords: true,
  creator: true,
  producer: true,
  creationDate: true,
  modificationDate: true,
};

export const DEFAULT_DOCX_FIELDS = {
  'dc:title': true,
  'dc:subject': true,
  'dc:creator': true,
  'cp:keywords': true,
  'dc:description': true,
  'cp:lastModifiedBy': true,
  'cp:revision': true,
  'cp:lastPrinted': true,
  'dcterms:created': true,
  'dcterms:modified': true,
  'cp:category': true,
  'cp:contentStatus': true,
  'Application': true,
  'AppVersion': true,
  'Company': true,
  'Manager': true,
  'Template': true,
  'TotalTime': true,
  'DocSecurity': true,
  'custom.xml': true,
};

const FIELD_LABELS: Record<string, string> = {
  // PDF
  title: 'Title',
  author: 'Author',
  subject: 'Subject',
  keywords: 'Keywords',
  creator: 'Creator',
  producer: 'Producer',
  creationDate: 'Creation Date',
  modificationDate: 'Modification Date',
  // DOCX
  'dc:title': 'Title',
  'dc:subject': 'Subject',
  'dc:creator': 'Creator',
  'cp:keywords': 'Keywords',
  'dc:description': 'Description',
  'cp:lastModifiedBy': 'Last Modified By',
  'cp:revision': 'Revision',
  'cp:lastPrinted': 'Last Printed',
  'dcterms:created': 'Created Date',
  'dcterms:modified': 'Modified Date',
  'cp:category': 'Category',
  'cp:contentStatus': 'Content Status',
  'Application': 'Application',
  'AppVersion': 'App Version',
  'Company': 'Company',
  'Manager': 'Manager',
  'Template': 'Template',
  'TotalTime': 'Total Time',
  'DocSecurity': 'Doc Security',
  'custom.xml': 'Custom Properties',
};

interface FieldSelectorProps {
  config: FieldConfig;
  onChange: (config: FieldConfig) => void;
}

function FieldGroup({ 
  title, 
  fields, 
  onToggle, 
  onSelectAll, 
  onDeselectAll 
}: { 
  title: string;
  fields: Record<string, boolean>;
  onToggle: (field: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  const allSelected = Object.values(fields).every(v => v);
  const noneSelected = Object.values(fields).every(v => !v);
  const someSelected = !allSelected && !noneSelected;

  return (
    <div className="field-group">
      <div className="field-group__header">
        <span className="field-group__title">{title}</span>
        <div className="field-group__actions">
          <button 
            onClick={onSelectAll} 
            className={`field-group__btn ${allSelected ? 'field-group__btn--active' : ''}`}
            title="Select All"
          >
            <Check size={12} />
            All
          </button>
          <button 
            onClick={onDeselectAll} 
            className={`field-group__btn ${noneSelected ? 'field-group__btn--active' : ''}`}
            title="Deselect All"
          >
            <Minus size={12} />
            None
          </button>
        </div>
      </div>
      <div className="field-group__grid">
        {Object.entries(fields).map(([field, enabled]) => (
          <label key={field} className="field-checkbox">
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => onToggle(field)}
            />
            <span className="field-checkbox__box">
              {enabled && <Check size={10} />}
            </span>
            <span className="field-checkbox__label">
              {FIELD_LABELS[field] || field}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function FieldSelector({ config, onChange }: FieldSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePdfToggle = (field: string) => {
    onChange({
      ...config,
      pdf: { ...config.pdf, [field]: !config.pdf[field] },
    });
  };

  const handleDocxToggle = (field: string) => {
    onChange({
      ...config,
      docx: { ...config.docx, [field]: !config.docx[field] },
    });
  };

  const handlePdfSelectAll = () => {
    const newPdf = { ...config.pdf };
    Object.keys(newPdf).forEach(k => newPdf[k] = true);
    onChange({ ...config, pdf: newPdf });
  };

  const handlePdfDeselectAll = () => {
    const newPdf = { ...config.pdf };
    Object.keys(newPdf).forEach(k => newPdf[k] = false);
    onChange({ ...config, pdf: newPdf });
  };

  const handleDocxSelectAll = () => {
    const newDocx = { ...config.docx };
    Object.keys(newDocx).forEach(k => newDocx[k] = true);
    onChange({ ...config, docx: newDocx });
  };

  const handleDocxDeselectAll = () => {
    const newDocx = { ...config.docx };
    Object.keys(newDocx).forEach(k => newDocx[k] = false);
    onChange({ ...config, docx: newDocx });
  };

  const totalEnabled = 
    Object.values(config.pdf).filter(v => v).length +
    Object.values(config.docx).filter(v => v).length;
  const totalFields = Object.keys(config.pdf).length + Object.keys(config.docx).length;

  return (
    <div className="field-selector">
      <button 
        className="field-selector__toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Settings size={16} />
        <span>Fields to Remove</span>
        <span className="field-selector__count">{totalEnabled}/{totalFields}</span>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div className="field-selector__content">
          <FieldGroup
            title="PDF Fields"
            fields={config.pdf}
            onToggle={handlePdfToggle}
            onSelectAll={handlePdfSelectAll}
            onDeselectAll={handlePdfDeselectAll}
          />
          <FieldGroup
            title="DOCX Fields"
            fields={config.docx}
            onToggle={handleDocxToggle}
            onSelectAll={handleDocxSelectAll}
            onDeselectAll={handleDocxDeselectAll}
          />
        </div>
      )}
    </div>
  );
}
