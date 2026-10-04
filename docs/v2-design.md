# DocuClean — product design

## Direction and structure

The user chose precision and discretion, with Linear and Raycast as references. The active visual proposal is `design/workbench-concept.png`. The user accepted the implementation on 5 October 2026 and requested publication to GitHub.

Three stable regions reflect three tasks: choose a document; inspect its properties; prepare a cleaned copy. Completed output is a separate review state, not an editable selection table.

## Visual system

- True white working surface, cool gray rail #f6f7f9, ink #20232a, secondary text #697180, border #e7e9ed, cobalt action #345de3. Green means verified; amber means an actual finding.
- Locally bundled Geist Variable; Geist Mono for small numerical details. 28/34 document headings, 18/26 section headings, 14/22 values, 13/20 controls, 12/18 utility copy. No remote font requests.
- At 1536px: 304px file rail, 36px inspector gutters, 334px removal panel, 36px gap. Wide desktop uses 32px titles, 21px section headings and 15px values; smaller laptops use the compact scale. Main table consumes remaining space. Tablet collapses the removal panel above the table; phone presents the file queue as a compact disclosure.
- Spacing: 4, 8, 12, 16, 24, 32, 40, 56. Controls 36–42px; 6px corners, 8px selected-file/radio-group corners. Quiet shadows only for selected files and primary actions.
- Lucide outline icons, 1.6–1.8 stroke, 16–20px controls and 40px document glyph. No decorative imagery or gradients.
- 140ms color/focus transitions; 180ms state entry; reduced-motion support. No fake progress.

## Components and primary copy

Shell: DocuClean, Documents / Inspector, Local session. Rail: Documents, Add documents, PDF, DOCX · up to 50 MB, Clean both files, Files stay on this device, Privacy, GitHub. Names, counts and statuses are actual session data.

Inspector: actual file name, PDF document / Word document, file size, Export report. Metadata, Find a property…, Property / Original value, Identity / Document details. Search never changes selection; long values remain expandable.

Removal panel: Cleaned copy; Choose what to leave behind.; All metadata / Remove every detected property; Identity only / Names and organizations; Custom selection / Choose individual properties; To remove / To keep; Create clean copy; Original file stays untouched; Checked before download. Verification only promises absence of selected supported properties.

Empty: Start with a document; Inspect the details attached to your files. Choose what to remove before sharing.; drop target; Choose documents; PDF or Word (.docx), up to 50 MB each; Use example documents. Short privacy explanation replaces the three-step feature grid.

Completed: Review changes and Cleaned file tabs; read-only values and Removed / Kept outcomes; actual remaining properties; Download clean copy; Change selection. Warnings persist beside download.

Component ownership: App shell, DocumentQueue, EmptyInspector, Inspector, MetadataTable, CleaningPanel, FileGlyph and Hint. Radix handles dialog, tooltip and result tabs. Native radio groups, checkboxes and search inputs retain standard keyboard behavior. All UI is native HTML/CSS.

## Intentional differences from the concept

The concept accidentally shows unchecked rows with All metadata; implementation displays the actual selected state. Real parsed data replaces illustrative values and ordering. Export report has a download arrow, because it exports JSON. Actual findings remain beside the primary action. Empty, narrow, busy, error, no-match and completed states extend this system.

## Engineering boundary

Document parsing, cancellation, limits, presets and verified-only downloads remain unchanged. Inspector UI state is keyed by document ID. No fabricated content preview. Sessions are memory-only.
