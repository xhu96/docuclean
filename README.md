# DocuClean 🛡️

Remove metadata from PDF and DOCX files **instantly** in your browser.

[![Deploy to GitHub Pages](https://github.com/xhu96/docuclean/actions/workflows/deploy.yml/badge.svg)](https://github.com/xhu96/docuclean/actions/workflows/deploy.yml)

## ✨ Features

- **100% Client-Side** - Files never leave your device
- **No Uploads** - All processing happens locally in WebAssembly/JS
- **Works Offline** - Can be installed as a PWA
- **Selective Removal** - Choose which metadata fields to strip
- **Batch Processing** - Clean multiple files at once

## 🔒 What Gets Removed

### PDF

Title, Author, Subject, Keywords, Creator, Producer, Creation/Modification Dates

### DOCX

Title, Subject, Creator, Keywords, Company, Manager, Last Modified By, Revision, Template, and 10+ more fields

## 🚀 Live Demo

**[Open DocuClean →](https://xhu96.github.io/docuclean/)**

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## 📦 Tech Stack

- React + TypeScript + Vite
- [pdf-lib](https://pdf-lib.js.org/) - PDF manipulation
- [JSZip](https://stuk.github.io/jszip/) - DOCX (OOXML) handling
- Lucide React - Icons

## 📄 License

MIT
