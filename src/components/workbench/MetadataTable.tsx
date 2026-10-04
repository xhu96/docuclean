import { Check, SearchX } from 'lucide-react';
import type { MetadataField } from '../../lib/documents';
import { displayMetadataValue } from './presentation';

interface Props {
  fields: MetadataField[];
  selectedIds: string[];
  removedIds?: string[];
  query: string;
  mode: 'selection' | 'review' | 'cleaned';
  disabled: boolean;
  onToggle: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onClearSearch: () => void;
}

function MetadataValue({ field }: { field: MetadataField }) {
  if (field.value.length < 150) return <span className="metadata-value" title={field.value}>{field.value ? displayMetadataValue(field) : <i>Empty property</i>}</span>;
  return <details className="long-value"><summary>{field.value.slice(0, 90)}… <span>Show full value</span></summary><pre>{field.value}</pre></details>;
}

export function MetadataTable({ fields, selectedIds, removedIds = [], query, mode, disabled, onToggle, onSelectAll, onClearSearch }: Props) {
  const selected = new Set(selectedIds);
  const removed = new Set(removedIds);
  const normalized = query.trim().toLocaleLowerCase();
  const visible = fields.filter(field => `${field.label} ${field.value} ${displayMetadataValue(field)}`.toLocaleLowerCase().includes(normalized));
  const groups = [
    { label: 'Identity', fields: visible.filter(field => field.group === 'identity') },
    { label: 'Document details', fields: visible.filter(field => field.group !== 'identity') },
  ].filter(group => group.fields.length);
  const allSelected = fields.length > 0 && fields.every(field => selected.has(field.id));
  const selectionMode = mode === 'selection';
  const columns = selectionMode || mode === 'review' ? 3 : 2;

  if (!fields.length) return <div className="no-metadata"><Check size={21} /><h3>{mode === 'cleaned' ? 'No supported metadata remains' : 'No supported metadata found'}</h3><p>{mode === 'cleaned' ? 'The cleaned copy was inspected again. The properties checked by DocuClean are absent.' : 'The properties checked by DocuClean are already absent.'}</p><span>Document content and other traces may still identify you.</span></div>;
  return <>
    {query && <p className="search-count" role="status">{visible.length} of {fields.length} properties match. {selectionMode && 'Your selection is unchanged.'}</p>}
    {visible.length ? <table className={`metadata-table ${mode}`} aria-label={mode === 'cleaned' ? 'Metadata in cleaned file' : mode === 'review' ? 'Metadata removal results' : 'Document metadata'}>
      <thead><tr>{selectionMode && <th className="checkbox-cell"><label className="checkbox-target"><input type="checkbox" aria-label={`Select all ${fields.length} metadata fields`} title={query ? 'Clear the search to select all properties' : 'Select all properties'} checked={allSelected} ref={element => { if (element) element.indeterminate = selected.size > 0 && !allSelected; }} disabled={disabled || !!query} onChange={event => onSelectAll(event.target.checked)} /></label></th>}<th scope="col">Property</th><th scope="col">{mode === 'cleaned' ? 'Value in copy' : 'Original value'}</th>{mode === 'review' && <th scope="col" className="outcome-heading">Result</th>}</tr></thead>
      {groups.map(group => <tbody key={group.label}><tr className="property-group"><th colSpan={columns} scope="rowgroup">{group.label} <span>{group.fields.length}</span></th></tr>{group.fields.map(field => <tr key={field.id} className={`${selectionMode && !selected.has(field.id) ? 'retained-row' : ''}${mode === 'review' && removed.has(field.id) ? ' removed-row' : ''}`}>
        {selectionMode && <td className="checkbox-cell"><label className="checkbox-target"><input type="checkbox" aria-label={`Remove ${field.label}`} checked={selected.has(field.id)} disabled={disabled} onChange={() => onToggle(field.id)} /></label></td>}
        <th scope="row">{field.label}</th><td><MetadataValue field={field} /></td>
        {mode === 'review' && <td className={removed.has(field.id) ? 'outcome removed' : 'outcome'}>{removed.has(field.id) ? <><Check size={12} />Removed</> : 'Kept'}</td>}
      </tr>)}</tbody>)}
    </table> : <div className="no-match"><SearchX size={24} strokeWidth={1.5} /><h3>No matching properties</h3><p>Try a property name or part of its value.</p><button className="text-button" onClick={onClearSearch}>Clear search</button></div>}
  </>;
}
