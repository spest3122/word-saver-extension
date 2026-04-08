# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Word Saver** — a Chrome Extension (Manifest V3) that lets users select text on any webpage, right-click to save it to a Google Sheet, with automatic translation to Traditional Chinese via Google Apps Script.

## Architecture

The project has two independent components that communicate over HTTP:

### Chrome Extension (`chrome-extension/`)
- **background.js** — Service worker. Creates the `contextMenus` entry ("saveWord"), relays selected text to content script, and POSTs word data to the Google Apps Script Web App URL (stored in `chrome.storage.sync`).
- **content.js** — Injected into all pages. Renders a confirmation overlay using **Shadow DOM** (style isolation) near the selected text. On confirm, sends `confirmSave` message back to background.js. Auto-dismisses after 3 seconds on success/failure.
- **popup.html / popup.js / popup.css** — Extension popup for configuring the Apps Script Web App URL. Validates that URL starts with `https://script.google.com/`.

### Google Apps Script (`google-apps-script/Code.gs`)
- **doPost** — Receives `{word, pageTitle, pageUrl}`, translates using `LanguageApp.translate()`, appends a row to the "Words" sheet (auto-creates with headers if missing).
- **doGet** — Health check endpoint.
- Sheet columns: `Timestamp | Word | Translation | Page Title | URL`

### Data Flow
1. User selects text → right-click → "儲存到 Google Sheet"
2. background.js sends selection data to content.js → overlay appears
3. User confirms → content.js messages background.js → background.js POSTs to Apps Script URL
4. Apps Script translates word → appends row to Sheet → returns `{success, translation}`
5. Overlay shows result with translation, auto-closes after 3s

## Development

No build step or package manager — plain vanilla JS.

**Load extension locally:**
1. Open `chrome://extensions/` with Developer Mode enabled
2. Click "Load unpacked" → select the `chrome-extension/` directory

**Deploy Apps Script:**
1. Create a Google Sheet → Extensions → Apps Script
2. Paste `google-apps-script/Code.gs`
3. Deploy → New deployment → Web App (execute as yourself, anyone can access)
4. Copy the Web App URL into the extension popup

## Key Technical Details

- Chrome Extension uses Manifest V3 (service worker, not background page)
- Content script overlay uses Shadow DOM to avoid CSS conflicts with host pages
- All UI text is in Traditional Chinese (zh-TW)
- The overlay is positioned relative to the text selection using `window.getSelection()` with viewport boundary checks
