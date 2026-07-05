import { useState } from 'react';
import { Settings, ChevronDown, ChevronUp, Check, Minus } from 'lucide-react';

export interface FieldConfig {
  pdf: Record<string, boolean>;
  docx: Record<string, boolean>;
}

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
  xmp: 'XMP Metadata',
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
  'thumbnail': 'Thumbnail',
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

  const toggle = (kind: keyof FieldConfig, field: string) =>
    onChange({ ...config, [kind]: { ...config[kind], [field]: !config[kind][field] } });

  const setAll = (kind: keyof FieldConfig, value: boolean) =>
    onChange({
      ...config,
      [kind]: Object.fromEntries(Object.keys(config[kind]).map((k) => [k, value])),
    });

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
            onToggle={(field) => toggle('pdf', field)}
            onSelectAll={() => setAll('pdf', true)}
            onDeselectAll={() => setAll('pdf', false)}
          />
          <FieldGroup
            title="DOCX Fields"
            fields={config.docx}
            onToggle={(field) => toggle('docx', field)}
            onSelectAll={() => setAll('docx', true)}
            onDeselectAll={() => setAll('docx', false)}
          />
        </div>
      )}
    </div>
  );
}
