# DocuClean

Inspect and remove supported PDF and DOCX metadata in your browser. Files are processed on your device; originals are never overwritten.

## Use

1. Add documents or choose **Use example documents**.
2. Inspect detected properties and content warnings.
3. Select **All metadata**, **Identity only**, or individual properties.
4. Create a cleaned copy. DocuClean reparses it and checks that the selected properties are absent and unselected properties are intact.
5. Download a verified copy, a ZIP of successful results, or a complete JSON metadata report.

Reports include original metadata values and should be treated as sensitive. They are not added automatically to ZIP downloads.

## What's included

- Document workspace with a file queue, searchable metadata table, full values, and a dedicated cleaning panel.
- Separate review and cleaned-file views, with actual removed/remaining counts and an explicit return to selection.
- Locally bundled Geist typography, consistent controls, accessible result tabs, and a compact mobile document switcher.
- Independent configuration for each document.
- Local PDF information dictionary and catalog XMP inspection, including custom Info properties.
- Namespace-aware DOCX core/extended properties, individually selectable custom properties, and embedded document previews.
- Warnings for common comments, revisions, hidden text, attachments, media and signature indicators.
- Actual output verification; failed checks never produce a successful download state.
- Sequential batch processing in a Web Worker, incremental progress, cancellation, retry, per-file removal and session clearing.
- Collision-safe ZIP names, full JSON reports, and synthetic sample documents using the real pipeline.
- Keyboard-accessible input and dialogs, responsive layouts, and reduced-motion support.
- 50 MiB per file, 200 MiB per session, 50 files. Additional expanded ZIP/XML inspection limits protect the parser.

## Scope and limits

This is a metadata tool, not a complete anonymizer or content-redaction tool. Visible text, comments, tracked revisions, images, embedded files, PDF forms, document IDs and some other hidden structures remain. Detection is best effort and is not exhaustive. Review content warnings before sharing.

The Identity only preset selects fields explicitly classed as names or organizations; it does not classify arbitrary text, titles, dates, custom values or XMP contents. Review the full table.

Encrypted PDFs and detected digitally signed documents cannot be cleaned. DOCX ZIP64/split archives, oversized expanded packages, malformed XML, and XML entity declarations are rejected. UTF-8 OOXML is supported. Some unusual documents may require another editor.

Verification checks supported metadata locations with a fresh parse. It does not certify forensic sanitization or prove every content object is unchanged. DOCX body parts are retained; PDF serialization may rewrite the structure.

The app has no upload endpoint, tracking, document persistence, external fonts, or account. Documents and results remain in memory until cleared or the tab closes. Loading the page, worker and assets needs a connection; offline reopening is not provided by a service worker.

## Development

Requires Node.js 20.19+ or 22.12+ (verified with Node 26).

```sh
npm ci
npm run dev
npm run test
npm run smoke
npm run lint
npm run build
```

Vite uses the existing `/docuclean/` base path for GitHub Pages.

## Implementation

React + TypeScript + Vite; React Dropzone for file input; Radix Dialog, Tooltip and Tabs for accessible interactions; Geist Variable for locally hosted typography; Lucide for icons; pdf-lib, JSZip and xmldom for document processing. All libraries are bundled locally.

- `src/lib/documents/` — inspection, removal and verification.
- `src/lib/session.ts` — memory-only queue and selection policy.
- `src/workers/` — cancellable document processing.
- `src/lib/exports.ts` — verified downloads and reports.
- `src/components/workbench/` — product interface.
- `scripts/engine.test.ts`, `scripts/session.test.ts` — functional fixtures and queue/export regression tests.
- `docs/qa.md` — browser checks, design comparison and known boundaries.

MIT License. Based on [xhu96/docuclean](https://github.com/xhu96/docuclean).
