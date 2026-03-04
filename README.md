# WissensNexus GridOS v9 (responsive + Electron/MSIX ready)

Fokus: **voll responsiv** (Smartphone → 4K Desktop) und optional **Windows Desktop/MSIX** via Electron Forge.

## 1) Voraussetzungen

- Node.js LTS (empfohlen 20/22)
- Windows 10/11 für Electron/MSIX

## 2) Setup

```bash
npm install
```

Optional: `.env.local` anlegen (siehe `.env.example`).

## 3) Web (Browser) starten

```bash
npm run dev
```

Vite läuft dann typischerweise auf `http://localhost:5173`.

## 3b) Backend API starten (SQLite + WS)

```bash
npm run dev:api
```

API läuft auf `http://localhost:4000`.

## 3c) Alles zusammen

```bash
npm run dev:all
```

## 4) Web Build

```bash
npm run build
npm run preview
```

## 5) Electron Dev

```bash
npm run dev:electron
```

## 6) Electron Build

```bash
npm run build:electron
```

## 7) MSIX Package (Windows)

```bash
npm run package:msix
```

Das erzeugt ein Paket unter `out/make/...`.

## Tests

```bash
npm test
```

Startet die API, prüft Health + Seed-Daten (>=100 Einträge).

## Projektstruktur

- `src/AppGridOS.tsx`: responsive Haupt-App
- `src/components/*`: UI Komponenten
- `src/main-electron.ts` + `src/preload.ts`: Electron Main/Preload
- `electron.vite.config.ts` + `forge.config.ts`: Electron/Vite/Forge

## Hinweise zu Responsiveness

- Keine riesigen fixen Pixel-Werte
- `clamp()` für Typografie
- Layout: mobile-first, Sidebar als Drawer
- Safe-area + `overflow-x: hidden` gegen horizontales Scrollen

## Daten & Seed

- Beim ersten Start werden automatisch >100 Einträge in SQLite erzeugt (Tasks/Notes/Transactions usw.).
- DB liegt in `server/data.sqlite`.
