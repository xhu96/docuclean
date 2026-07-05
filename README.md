# DocuClean 🛡️

Strip metadata from PDF and DOCX files — entirely in your browser. Files never leave your device.

[![Deploy to GitHub Pages](https://github.com/xhu96/docuclean/actions/workflows/deploy.yml/badge.svg)](https://github.com/xhu96/docuclean/actions/workflows/deploy.yml)

**[Open DocuClean →](https://xhu96.github.io/docuclean/)**

## Why

Documents carry more than their content: author names, company names, revision counts, editing time, creation dates — even a rendered preview of page one. DocuClean removes all of it before you share the file.

## Features

- **100% client-side** — no uploads, no server, no analytics. You can go offline before selecting files.
- **Selective removal** — choose exactly which fields to strip
- **Batch processing** — clean multiple files at once
- **Transparent** — shows you every value it removed, per file

## What gets removed

**PDF**

- Info dictionary: Title, Author, Subject, Keywords, Creator, Producer, Creation/Modification dates — keys are deleted outright, not blanked
- XMP metadata stream (where Word, InDesign, etc. duplicate author and tool info)

**DOCX**

- Core properties: title, subject, creator, keywords, description, last modified by, revision, dates, category, content status
- Extended properties: company, manager, application, app version, template, total editing time, security flags
- Custom properties (`docProps/custom.xml`), with package relationships cleaned up so Word never flags the file
- Document thumbnail (an embedded image of page one that survives property cleaning)

## What it does *not* remove

- **DOCX content-level traces**: tracked changes, comments, hidden text, embedded media metadata
- **PDF content**: embedded attachments, digital signatures, text in the pages themselves
- **Password-protected PDFs** are rejected with a clear error instead of producing corrupt output

## Development

```bash
npm install
npm run dev     # start dev server
npm run build   # production build
npm run lint    # eslint
npm run smoke   # end-to-end check that cleaning actually cleans
```

## Tech stack

- React + TypeScript + Vite
- [pdf-lib](https://pdf-lib.js.org/) — PDF manipulation
- [JSZip](https://stuk.github.io/jszip/) — DOCX (OOXML) handling
- Lucide React — icons

## License

Released under the [MIT License](LICENSE).
