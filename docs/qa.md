# Verification notes — 5 October 2026

## Current revision

The user chose a precise, discreet direction with Linear and Raycast as references. The user accepted the finished implementation on 5 October 2026 and requested publication to GitHub.

## Browser verification

Verified in the Codex in-app browser via CUA. Screenshots use the browser screenshot API and were saved at full page size. No Playwright Chromium fallback was needed.

- Final production preview: http://127.0.0.1:5188/docuclean/.
- Native concept viewport: 1536 × 1024; also checked 1024 × 900, 390 × 844 and 320 × 740.
- Document scroll width equals viewport width at 1024, 390 and 320px. Selection and completed states were checked at 320px.
- Real synthetic PDF/DOCX inspection produces 8/13 properties through the worker.
- Search matches property names and values, reports the match count, preserves selection, and provides a no-match state. Select-all is disabled while filtering to avoid selecting hidden rows accidentally.
- Identity-only PDF cleaning removes the author and preserves 7 properties. Zero selection disables cleaning. Custom selection and mixed select-all state work.
- Result views are read-only. ArrowRight switches from Review changes to Cleaned file; the removed author is absent from the latter. Change selection returns to the original, invalidates the output and restores editable controls.
- Batch cleaning verifies both documents. A fresh production run downloaded a PDF, ZIP and JSON report successfully.
- Actual downloaded PDF and both ZIP entries were reopened with the document engine: zero supported properties remain; the Word comments warning is preserved. The JSON report contains all 8 original PDF values, zero after-values and a verified result.
- Privacy dialog closes with Escape and restores focus to its trigger.
- Native file chooser rejects TXT with a clear message. A damaged PDF shows an error with an enabled retry action. Removing it preserves the other documents.
- Mobile Documents disclosure opens, selects another file and closes. Document switching resets inspector search state.
- The final fresh production load and download path produced no console errors. Earlier development hot updates and replacing preview assets during an open session produced stale-module errors; these did not recur after a fresh load of the complete build.

Test downloads and old design references live under the intermediate work directory, not the deliverable repository. Screenshots in design/ are intentional user-facing references.

## Direct visual comparison

Both the generated reference and the latest implementation screenshot were opened with view_image. The comparison was made at the concept's 1536 × 1024 size. Final screenshots: design/desktop.jpg, design/desktop-empty.jpg, design/mobile.jpg.

| Dimension | Comparison and final decision |
|---|---|
| Composition | Three stable regions match the reference: 304px document rail, wide property table, separate 334px cleaning region. |
| Surfaces | White inspector, cool gray rail, thin separators and a lightly raised selected file. No nested card grid. |
| Typography | Locally bundled Geist; title/section/value/control scales are explicit. Increased desktop title and value sizes after the first screenshot was too small for the available space. |
| Action hierarchy | Cobalt is reserved for primary action and selection. Presets, summary counts and copy action share one stable region. |
| Controls | Outlined secondary buttons, small corner radii, radio group, custom-styled native checkboxes with larger label hit areas, Radix tooltips. |
| Table | Group labels, thin row rules, aligned values, genuine counts and full-value expansion. Search has a dedicated line. |
| Result state | Separate keyboard-operable review/cleaned tabs, real remaining fields and a verified copy panel extend the reference system. |
| Responsive | Compact file disclosure on phones; cleaning choices adapt above the table; actual warnings remain visible. |

Above-the-fold copy review: primary headings, search, preset labels and action names follow the reference. Runtime file names, sizes, counts, values and status text are data-driven. The implementation adds an actual selected count and Clear session. “Your document content stays the same” was replaced with the more precise “Only the selected metadata is removed.” The report uses a download icon rather than a dropdown icon because it exports JSON. The generated reference incorrectly showed unchecked rows alongside All metadata; the app reflects real selection. The Lucide Files brand glyph extends the document motif. Actual parser order is retained instead of rearranging fields to match illustrative data.

The implementation was visually verified against the chosen reference direction and its documented functional corrections. No material layout or interaction mismatch remains from this comparison. This is not a claim of user or external design-agency sign-off.

## Automated checks

Passed: TypeScript, ESLint, production build, engine fixtures, session fixtures, existing PDF/DOCX smoke tests, git diff whitespace check. Dependency installation reported zero known audit vulnerabilities.

The engine fixtures cover supported PDF/DOCX inspection, namespace aliases, decoded values, selective removal, custom properties, XMP, residual-content warnings, fresh verification, no-op and signature rejection. Session tests cover limits, cancellation/late replies, selection invalidation, retry, failed verification, export naming, report completeness and skipping empty or blocked batch entries.

Primary dependencies: [Geist / Fontsource](https://fontsource.org/fonts/geist/use), [Radix Tooltip](https://www.radix-ui.com/primitives/docs/components/tooltip), existing Radix Dialog and added Radix Tabs. All runtime assets are bundled locally.

## Boundaries

No external usability study or broad Office/PDF compatibility corpus was performed. The tool removes supported metadata; it is not a forensic anonymizer or content-redaction tool. These checks were completed on the local production build before publication to GitHub.
