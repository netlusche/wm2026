# WM 2026 Tippspiel

> **⚠️ Prototype** — Dieses Projekt ist ein persönlicher Prototyp für den privaten Gebrauch. Es ist nicht für den produktiven Einsatz ausgelegt und bietet keine Garantien hinsichtlich Sicherheit, Skalierbarkeit oder Verfügbarkeit.

Ein webbasiertes Tipp-Spiel für die FIFA Weltmeisterschaft 2026 (USA · Kanada · Mexiko) für zwei Spieler.

## Features

- **104 Spiele** — 72 Gruppenspiele (Spieltage 1–3) + 32 KO-Spiele
- **Tipp-Deadline** — Tipps sind nur bis zum Anpfiff des jeweiligen Spiels möglich
- **Versteckte Tipps** — Der Tipp des anderen Spielers ist vor dem Anpfiff verdeckt
- **Punktesystem** — 3P exakt / 2P Tordifferenz / 1P Tendenz (Gruppe); 3P exaktes Endergebnis / 1P richtiger Sieger (KO, inkl. Verlängerung & Elfmeter)
- **Live-Ergebnisse** — Automatischer Abruf via [OpenLigaDB](https://www.openligadb.de/) alle 60 Sekunden; laufende Spiele zeigen `🔴 LIVE`-Badge mit aktuellem Score
- **Auto-Save** — Abgeschlossene Spiele werden automatisch gespeichert (sobald OpenLigaDB `matchIsFinished` meldet); alternativ kann der Admin das Ergebnis manuell eintragen — danach wird es nicht mehr überschrieben
- **Provisorische Gruppen & Rangliste** — Während laufender Spiele werden Gruppentabellen und Rangliste live hochgerechnet (markiert mit `●` / `*`)
- **Automatisches Bracket** — KO-Teilnehmer werden nach Gruppenabschluss automatisch eingetragen; Sieger werden durch den Baum weiterpropagiert
- **Gruppenübersicht** — Live-Tabellen für alle 12 Gruppen (A–L) mit Qualifikationsmarkierung
- **Rangliste** — Gesamtpunkte mit Aufschlüsselung nach Runde
- **Spielregeln** — Übersichtliche Darstellung aller Regeln in der App
- **Admin-Bereich** — Ergebnisse eintragen und löschen, KO-Teamnamen manuell anpassen
- **PWA** — Installierbar auf iOS & Android, offline-fähige App-Shell
- **Responsive Design** — Frutiger-Aero-Stil mit Glassmorphism und sanften Animationen

## Stack

| Komponente | Technologie |
|---|---|
| Backend | PHP 8+ mit PDO SQLite |
| Datenbank | SQLite (in `data/wm2026.db`, automatisch angelegt) |
| Passwort | PHP `password_hash()` / `password_verify()` (bcrypt) |
| Frontend | Vanilla JS, kein Framework |
| Stil | CSS Custom Properties, `backdrop-filter`, Frutiger Aero |
| PWA | Web App Manifest + Service Worker |
| Hosting | Apache mit `.htaccess` Rewrite |

## Voraussetzungen

- PHP ≥ 8.0 mit `pdo_sqlite`-Extension
- Apache mit `mod_rewrite`

## Deployment (Apache Shared Hosting)

Die Dateien liegen direkt im Web-Root — kein `public/`-Unterverzeichnis nötig.

Folgende Dateien/Verzeichnisse per SFTP hochladen:

```
index.html
app.js
style.css
manifest.json
sw.js
api.php
.htaccess
icons/
data/                ← Verzeichnis anlegen (leer hochladen)
```

Falls die App in einem Unterverzeichnis liegt (z.B. `/wm2026/`), muss `RewriteBase` in `.htaccess` entsprechend angepasst werden:

```apache
RewriteBase /wm2026/
```

> **Wichtig:** Das Verzeichnis `data/` muss für den Webserver schreibbar sein (chmod 755 oder 775).

Die SQLite-Datenbank wird beim ersten Aufruf automatisch unter `data/wm2026.db` angelegt und mit allen 104 Spielen befüllt.

## Lokal testen (PHP Built-in Server)

```bash
cd wm2026
php -S localhost:3000
```

Die App ist dann unter [http://localhost:3000](http://localhost:3000) erreichbar. Das `data/`-Verzeichnis wird automatisch erstellt.

> **Hinweis:** Der PHP Built-in Server kennt kein `.htaccess` — ein `router.php` übernimmt das Routing lokal. Mit `php -S localhost:3000 router.php` starten.

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

## Live-Score Integration

Ergebnisse werden automatisch von [OpenLigaDB](https://www.openligadb.de/) abgerufen (kostenlos, kein API-Key nötig):

- Laufende Spiele: `🔴 LIVE`-Badge mit aktuellem Score, alle 60 Sekunden aktualisiert
- Abgeschlossene Spiele: werden automatisch gespeichert (Gruppenphase sofort, KO-Runden sobald OpenLigaDB die Daten einträgt)
- Elfmeterschießen: der kumulative Endstand (inkl. Elfmeter-Tore) wird gespeichert; der Sieger wird automatisch für die Bracket-Propagierung erkannt
- Ergebnisse werden im `data/`-Verzeichnis gecacht (60 Sekunden TTL)

## Admin-Funktionen

- Ergebnisse manuell eintragen und löschen (Fallback falls OpenLigaDB-Daten fehlen oder verzögert sind)
- KO-Teamnamen manuell anpassen (Fallback falls Auto-Fill nicht greift)
- Bracket manuell neu berechnen via Admin-Button in der App

## Sicherheitshinweise (Prototype)

- Das Admin-Passwort wird als bcrypt-Hash in der SQLite-DB gespeichert
- Die App ist für den **privaten Gebrauch im bekannten Nutzerkreis** ausgelegt
- Kein Rate-Limiting, keine Session-Tokens
- Nicht für den öffentlichen Internet-Einsatz mit unbekannten Nutzern ausgelegt

## Lizenz

Nicht festgelegt.
