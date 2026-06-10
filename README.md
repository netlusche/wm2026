# WM 2026 Tippspiel

> **⚠️ Prototype** — Dieses Projekt ist ein persönlicher Prototyp für den privaten Gebrauch. Es ist nicht für den produktiven Einsatz ausgelegt und bietet keine Garantien hinsichtlich Sicherheit, Skalierbarkeit oder Verfügbarkeit.

Ein webbasiertes Tipp-Spiel für die FIFA Weltmeisterschaft 2026 (USA · Kanada · Mexiko) für zwei Spieler.

## Features

- **104 Spiele** — 72 Gruppenspiele (Spieltage 1–10) + 32 KO-Spiele
- **Tipp-Deadline** — Tipps sind nur bis zum Anpfiff des jeweiligen Spiels möglich
- **Versteckte Tipps** — Der Tipp des anderen Spielers ist vor dem Anpfiff verdeckt
- **Punktesystem** — 3P exakt / 2P Tordifferenz / 1P Tendenz (Gruppe); 3P exakt / 1P Sieger (KO)
- **Automatisches Bracket** — KO-Teilnehmer werden nach Gruppenabschluss automatisch eingetragen; Sieger werden durch den Baum weiterpropagiert
- **Gruppenübersicht** — Live-Tabellen für alle 12 Gruppen (A–L) mit Qualifikationsmarkierung
- **Rangliste** — Gesamtpunkte mit Aufschlüsselung nach Runde
- **Spielregeln** — Übersichtliche Darstellung aller Regeln in der App
- **Admin-Bereich** — Ergebnisse eintragen, n.V./n.E. markieren, KO-Teamnamen anpassen
- **PWA** — Installierbar auf iOS & Android, offline-fähige App-Shell
- **Responsive Design** — Frutiger-Aero-Stil mit Glassmorphism und sanften Animationen

## Stack

| Komponente | Technologie |
|---|---|
| Backend | Node.js + Express |
| Datenbank | SQLite via `node-sqlite3-wasm` (WebAssembly, kein nativer Compile) |
| Passwort | bcrypt via `bcryptjs` |
| Frontend | Vanilla JS, kein Framework |
| Stil | CSS Custom Properties, `backdrop-filter`, Frutiger Aero |
| PWA | Web App Manifest + Service Worker |

## Voraussetzungen

- Node.js ≥ 18 (getestet auf Node 26, arm64 macOS)
- npm

## Installation

```bash
git clone <repo>
cd wm2026
npm install
npm start
```

Die App läuft auf [http://localhost:3000](http://localhost:3000).

## Als PWA installieren

**iOS (Safari):** Teilen → „Zum Home-Bildschirm" → Hinzufügen

**Android (Chrome):** Menü → „App installieren" oder Banner am unteren Rand

Die App öffnet sich dann ohne Browser-Chrome als eigenständige App. Die App-Shell (HTML, CSS, JS) wird gecacht und steht auch offline zur Verfügung — API-Calls benötigen weiterhin eine Verbindung zum Server.

## Spieler

| Name | Farbe | Zugang |
|---|---|---|
| David | 🟦 Blau | Direkt auswählbar |
| Frank | 🟥 Rot | Direkt auswählbar |
| Admin | 🔑 | Passwort-geschützt |

## Admin-Funktionen

- Ergebnisse eintragen und löschen
- Verlängerung (n.V.) und Elfmeterschießen (n.E.) markieren
- KO-Teamnamen manuell anpassen (Fallback falls Auto-Fill nicht greift)
- Bracket manuell neu berechnen: `POST /api/admin/update-bracket`

## Sicherheitshinweise (Prototype)

- Das Admin-Passwort wird als bcrypt-Hash in der SQLite-DB gespeichert
- Die App ist für den **lokalen Betrieb im Heimnetz** ausgelegt
- Kein HTTPS, keine Rate-Limiting, keine Session-Tokens
- Nicht für den öffentlichen Internet-Einsatz geeignet

## Lizenz

Nicht festgelegt.
