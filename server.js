const express = require('express');
const { Database } = require('node-sqlite3-wasm');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_PASSWORD = 'wm2026admin';

const db = new Database(path.join(__dirname, 'wm2026.db'));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS matches (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    spieltag    INTEGER,
    round       TEXT    NOT NULL,
    gruppe      TEXT,
    home_team   TEXT    NOT NULL,
    away_team   TEXT    NOT NULL,
    kickoff     TEXT    NOT NULL,
    home_score  INTEGER,
    away_score  INTEGER,
    extra_time  INTEGER DEFAULT 0,
    penalties   INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id    INTEGER NOT NULL,
    player      TEXT    NOT NULL,
    home_score  INTEGER NOT NULL,
    away_score  INTEGER NOT NULL,
    created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id),
    UNIQUE(match_id, player)
  );
`);

// ─── Fixtures ─────────────────────────────────────────────────────────────────
// Zeiten in MESZ (UTC+2). Quelle: wettfreunde.net / toffeeweb.com

const FIXTURES = [
  // ══ SPIELTAG 1 – Gruppen A & B, 1. Spieltag ══
  { spieltag: 1, round: 'gruppe', gruppe: 'A', home_team: 'Mexiko',             away_team: 'Südafrika',          kickoff: '2026-06-11T21:00:00+02:00' },
  { spieltag: 1, round: 'gruppe', gruppe: 'A', home_team: 'Südkorea',           away_team: 'Tschechien',         kickoff: '2026-06-12T04:00:00+02:00' },
  { spieltag: 1, round: 'gruppe', gruppe: 'B', home_team: 'Kanada',             away_team: 'Bosnien-Herzegowina',kickoff: '2026-06-12T21:00:00+02:00' },
  { spieltag: 1, round: 'gruppe', gruppe: 'B', home_team: 'Katar',              away_team: 'Schweiz',            kickoff: '2026-06-13T03:00:00+02:00' },

  // ══ SPIELTAG 2 – Gruppen C & D, 1. Spieltag ══
  { spieltag: 2, round: 'gruppe', gruppe: 'D', home_team: 'USA',                away_team: 'Paraguay',           kickoff: '2026-06-13T03:00:00+02:00' },
  { spieltag: 2, round: 'gruppe', gruppe: 'C', home_team: 'Brasilien',          away_team: 'Marokko',            kickoff: '2026-06-14T00:00:00+02:00' },
  { spieltag: 2, round: 'gruppe', gruppe: 'C', home_team: 'Haiti',              away_team: 'Schottland',         kickoff: '2026-06-14T03:00:00+02:00' },
  { spieltag: 2, round: 'gruppe', gruppe: 'D', home_team: 'Australien',         away_team: 'Türkei',             kickoff: '2026-06-14T06:00:00+02:00' },

  // ══ SPIELTAG 3 – Gruppen E & F, 1. Spieltag ══
  { spieltag: 3, round: 'gruppe', gruppe: 'E', home_team: 'Deutschland',        away_team: 'Curaçao',            kickoff: '2026-06-14T19:00:00+02:00' },
  { spieltag: 3, round: 'gruppe', gruppe: 'F', home_team: 'Niederlande',        away_team: 'Japan',              kickoff: '2026-06-14T22:00:00+02:00' },
  { spieltag: 3, round: 'gruppe', gruppe: 'E', home_team: 'Elfenbeinküste',     away_team: 'Ecuador',            kickoff: '2026-06-15T01:00:00+02:00' },
  { spieltag: 3, round: 'gruppe', gruppe: 'F', home_team: 'Schweden',           away_team: 'Tunesien',           kickoff: '2026-06-15T04:00:00+02:00' },

  // ══ SPIELTAG 4 – Gruppen G & H, 1. Spieltag ══
  { spieltag: 4, round: 'gruppe', gruppe: 'H', home_team: 'Spanien',            away_team: 'Kap Verde',          kickoff: '2026-06-15T18:00:00+02:00' },
  { spieltag: 4, round: 'gruppe', gruppe: 'G', home_team: 'Belgien',            away_team: 'Ägypten',            kickoff: '2026-06-15T21:00:00+02:00' },
  { spieltag: 4, round: 'gruppe', gruppe: 'H', home_team: 'Saudi-Arabien',      away_team: 'Uruguay',            kickoff: '2026-06-16T00:00:00+02:00' },
  { spieltag: 4, round: 'gruppe', gruppe: 'G', home_team: 'Iran',               away_team: 'Neuseeland',         kickoff: '2026-06-16T03:00:00+02:00' },

  // ══ SPIELTAG 5 – Gruppen I & J, 1. Spieltag ══
  { spieltag: 5, round: 'gruppe', gruppe: 'I', home_team: 'Frankreich',         away_team: 'Senegal',            kickoff: '2026-06-16T21:00:00+02:00' },
  { spieltag: 5, round: 'gruppe', gruppe: 'I', home_team: 'Irak',               away_team: 'Norwegen',           kickoff: '2026-06-17T00:00:00+02:00' },
  { spieltag: 5, round: 'gruppe', gruppe: 'J', home_team: 'Argentinien',        away_team: 'Algerien',           kickoff: '2026-06-17T03:00:00+02:00' },
  { spieltag: 5, round: 'gruppe', gruppe: 'J', home_team: 'Österreich',         away_team: 'Jordanien',          kickoff: '2026-06-17T06:00:00+02:00' },

  // ══ SPIELTAG 6 – Gruppen K & L, 1. Spieltag ══
  { spieltag: 6, round: 'gruppe', gruppe: 'K', home_team: 'Portugal',           away_team: 'DR Kongo',           kickoff: '2026-06-17T19:00:00+02:00' },
  { spieltag: 6, round: 'gruppe', gruppe: 'L', home_team: 'England',            away_team: 'Kroatien',           kickoff: '2026-06-17T22:00:00+02:00' },
  { spieltag: 6, round: 'gruppe', gruppe: 'L', home_team: 'Ghana',              away_team: 'Panama',             kickoff: '2026-06-18T01:00:00+02:00' },
  { spieltag: 6, round: 'gruppe', gruppe: 'K', home_team: 'Usbekistan',         away_team: 'Kolumbien',          kickoff: '2026-06-18T04:00:00+02:00' },

  // ══ SPIELTAG 7 – Gruppen A–D, 2. Spieltag ══
  { spieltag: 7, round: 'gruppe', gruppe: 'A', home_team: 'Tschechien',         away_team: 'Südafrika',          kickoff: '2026-06-18T18:00:00+02:00' },
  { spieltag: 7, round: 'gruppe', gruppe: 'B', home_team: 'Schweiz',            away_team: 'Bosnien-Herzegowina',kickoff: '2026-06-18T21:00:00+02:00' },
  { spieltag: 7, round: 'gruppe', gruppe: 'B', home_team: 'Kanada',             away_team: 'Katar',              kickoff: '2026-06-19T00:00:00+02:00' },
  { spieltag: 7, round: 'gruppe', gruppe: 'A', home_team: 'Mexiko',             away_team: 'Südkorea',           kickoff: '2026-06-19T03:00:00+02:00' },
  { spieltag: 7, round: 'gruppe', gruppe: 'D', home_team: 'USA',                away_team: 'Australien',         kickoff: '2026-06-19T21:00:00+02:00' },
  { spieltag: 7, round: 'gruppe', gruppe: 'C', home_team: 'Schottland',         away_team: 'Marokko',            kickoff: '2026-06-20T00:00:00+02:00' },
  { spieltag: 7, round: 'gruppe', gruppe: 'C', home_team: 'Brasilien',          away_team: 'Haiti',              kickoff: '2026-06-20T03:00:00+02:00' },
  { spieltag: 7, round: 'gruppe', gruppe: 'D', home_team: 'Türkei',             away_team: 'Paraguay',           kickoff: '2026-06-20T06:00:00+02:00' },

  // ══ SPIELTAG 8 – Gruppen E–H, 2. Spieltag ══
  { spieltag: 8, round: 'gruppe', gruppe: 'F', home_team: 'Niederlande',        away_team: 'Schweden',           kickoff: '2026-06-20T19:00:00+02:00' },
  { spieltag: 8, round: 'gruppe', gruppe: 'E', home_team: 'Deutschland',        away_team: 'Elfenbeinküste',     kickoff: '2026-06-20T22:00:00+02:00' },
  { spieltag: 8, round: 'gruppe', gruppe: 'E', home_team: 'Ecuador',            away_team: 'Curaçao',            kickoff: '2026-06-21T02:00:00+02:00' },
  { spieltag: 8, round: 'gruppe', gruppe: 'F', home_team: 'Tunesien',           away_team: 'Japan',              kickoff: '2026-06-21T06:00:00+02:00' },
  { spieltag: 8, round: 'gruppe', gruppe: 'H', home_team: 'Spanien',            away_team: 'Saudi-Arabien',      kickoff: '2026-06-21T18:00:00+02:00' },
  { spieltag: 8, round: 'gruppe', gruppe: 'G', home_team: 'Belgien',            away_team: 'Iran',               kickoff: '2026-06-21T21:00:00+02:00' },
  { spieltag: 8, round: 'gruppe', gruppe: 'H', home_team: 'Uruguay',            away_team: 'Kap Verde',          kickoff: '2026-06-22T00:00:00+02:00' },
  { spieltag: 8, round: 'gruppe', gruppe: 'G', home_team: 'Neuseeland',         away_team: 'Ägypten',            kickoff: '2026-06-22T03:00:00+02:00' },

  // ══ SPIELTAG 9 – Gruppen I–L, 2. Spieltag ══
  { spieltag: 9, round: 'gruppe', gruppe: 'J', home_team: 'Argentinien',        away_team: 'Österreich',         kickoff: '2026-06-22T19:00:00+02:00' },
  { spieltag: 9, round: 'gruppe', gruppe: 'I', home_team: 'Frankreich',         away_team: 'Irak',               kickoff: '2026-06-22T23:00:00+02:00' },
  { spieltag: 9, round: 'gruppe', gruppe: 'I', home_team: 'Norwegen',           away_team: 'Senegal',            kickoff: '2026-06-23T02:00:00+02:00' },
  { spieltag: 9, round: 'gruppe', gruppe: 'J', home_team: 'Jordanien',          away_team: 'Algerien',           kickoff: '2026-06-23T05:00:00+02:00' },
  { spieltag: 9, round: 'gruppe', gruppe: 'K', home_team: 'Portugal',           away_team: 'Usbekistan',         kickoff: '2026-06-23T19:00:00+02:00' },
  { spieltag: 9, round: 'gruppe', gruppe: 'L', home_team: 'England',            away_team: 'Ghana',              kickoff: '2026-06-23T22:00:00+02:00' },
  { spieltag: 9, round: 'gruppe', gruppe: 'L', home_team: 'Panama',             away_team: 'Kroatien',           kickoff: '2026-06-24T01:00:00+02:00' },
  { spieltag: 9, round: 'gruppe', gruppe: 'K', home_team: 'Kolumbien',          away_team: 'DR Kongo',           kickoff: '2026-06-24T04:00:00+02:00' },

  // ══ SPIELTAG 10 – Alle Gruppen, 3. Spieltag (simultan je Gruppe) ══
  { spieltag: 10, round: 'gruppe', gruppe: 'B', home_team: 'Bosnien-Herzegowina',away_team: 'Katar',             kickoff: '2026-06-25T00:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'B', home_team: 'Schweiz',           away_team: 'Kanada',             kickoff: '2026-06-25T00:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'C', home_team: 'Schottland',        away_team: 'Brasilien',          kickoff: '2026-06-25T00:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'C', home_team: 'Marokko',           away_team: 'Haiti',              kickoff: '2026-06-25T00:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'A', home_team: 'Tschechien',        away_team: 'Mexiko',             kickoff: '2026-06-25T03:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'A', home_team: 'Südafrika',         away_team: 'Südkorea',           kickoff: '2026-06-25T03:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'E', home_team: 'Curaçao',           away_team: 'Elfenbeinküste',     kickoff: '2026-06-25T22:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'E', home_team: 'Ecuador',           away_team: 'Deutschland',        kickoff: '2026-06-25T22:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'F', home_team: 'Japan',             away_team: 'Schweden',           kickoff: '2026-06-26T01:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'F', home_team: 'Tunesien',          away_team: 'Niederlande',        kickoff: '2026-06-26T01:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'D', home_team: 'Türkei',            away_team: 'USA',                kickoff: '2026-06-26T04:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'D', home_team: 'Paraguay',          away_team: 'Australien',         kickoff: '2026-06-26T04:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'H', home_team: 'Uruguay',           away_team: 'Spanien',            kickoff: '2026-06-26T18:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'I', home_team: 'Norwegen',          away_team: 'Frankreich',         kickoff: '2026-06-26T21:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'I', home_team: 'Senegal',           away_team: 'Irak',               kickoff: '2026-06-26T21:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'H', home_team: 'Kap Verde',         away_team: 'Saudi-Arabien',      kickoff: '2026-06-27T02:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'G', home_team: 'Ägypten',           away_team: 'Iran',               kickoff: '2026-06-27T05:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'G', home_team: 'Neuseeland',        away_team: 'Belgien',            kickoff: '2026-06-27T05:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'L', home_team: 'Panama',            away_team: 'England',            kickoff: '2026-06-27T23:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'L', home_team: 'Kroatien',          away_team: 'Ghana',              kickoff: '2026-06-27T23:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'J', home_team: 'Algerien',          away_team: 'Österreich',         kickoff: '2026-06-28T04:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'J', home_team: 'Jordanien',         away_team: 'Argentinien',        kickoff: '2026-06-28T04:00:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'K', home_team: 'Kolumbien',         away_team: 'Portugal',           kickoff: '2026-06-28T01:30:00+02:00' },
  { spieltag: 10, round: 'gruppe', gruppe: 'K', home_team: 'DR Kongo',          away_team: 'Usbekistan',         kickoff: '2026-06-28T01:30:00+02:00' },

  // ══ RUNDE DER LETZTEN 32 (28. Juni – 3. Juli) ══
  { spieltag: null, round: 'r32', gruppe: null, home_team: '1. Gruppe A',       away_team: 'Bester Dritter 1',   kickoff: '2026-06-29T18:00:00+02:00' },
  { spieltag: null, round: 'r32', gruppe: null, home_team: '2. Gruppe C',       away_team: '2. Gruppe D',        kickoff: '2026-06-29T21:00:00+02:00' },
  { spieltag: null, round: 'r32', gruppe: null, home_team: '1. Gruppe B',       away_team: 'Bester Dritter 2',   kickoff: '2026-06-30T18:00:00+02:00' },
  { spieltag: null, round: 'r32', gruppe: null, home_team: '2. Gruppe A',       away_team: 'Bester Dritter 3',   kickoff: '2026-06-30T21:00:00+02:00' },
  { spieltag: null, round: 'r32', gruppe: null, home_team: '1. Gruppe C',       away_team: 'Bester Dritter 4',   kickoff: '2026-07-01T18:00:00+02:00' },
  { spieltag: null, round: 'r32', gruppe: null, home_team: '1. Gruppe D',       away_team: 'Bester Dritter 5',   kickoff: '2026-07-01T21:00:00+02:00' },
  { spieltag: null, round: 'r32', gruppe: null, home_team: '1. Gruppe E',       away_team: '2. Gruppe F',        kickoff: '2026-07-02T18:00:00+02:00' },
  { spieltag: null, round: 'r32', gruppe: null, home_team: '1. Gruppe F',       away_team: '2. Gruppe E',        kickoff: '2026-07-02T21:00:00+02:00' },
  { spieltag: null, round: 'r32', gruppe: null, home_team: '1. Gruppe G',       away_team: '2. Gruppe H',        kickoff: '2026-07-02T00:00:00+02:00' },
  { spieltag: null, round: 'r32', gruppe: null, home_team: '1. Gruppe H',       away_team: '2. Gruppe G',        kickoff: '2026-07-03T00:00:00+02:00' },
  { spieltag: null, round: 'r32', gruppe: null, home_team: '1. Gruppe I',       away_team: '2. Gruppe J',        kickoff: '2026-07-03T18:00:00+02:00' },
  { spieltag: null, round: 'r32', gruppe: null, home_team: '1. Gruppe J',       away_team: '2. Gruppe I',        kickoff: '2026-07-03T21:00:00+02:00' },
  { spieltag: null, round: 'r32', gruppe: null, home_team: '1. Gruppe K',       away_team: '2. Gruppe L',        kickoff: '2026-07-04T00:00:00+02:00' },
  { spieltag: null, round: 'r32', gruppe: null, home_team: '1. Gruppe L',       away_team: '2. Gruppe K',        kickoff: '2026-07-04T18:00:00+02:00' },
  { spieltag: null, round: 'r32', gruppe: null, home_team: 'Bester Dritter 6',  away_team: 'Bester Dritter 7',   kickoff: '2026-07-04T21:00:00+02:00' },
  { spieltag: null, round: 'r32', gruppe: null, home_team: 'Bester Dritter 8',  away_team: 'Bester Dritter 9',   kickoff: '2026-07-05T00:00:00+02:00' },

  // ══ ACHTELFINALE (4. – 7. Juli) ══
  { spieltag: null, round: 'r16', gruppe: null, home_team: 'Sieger R32 M1',     away_team: 'Sieger R32 M2',      kickoff: '2026-07-05T18:00:00+02:00' },
  { spieltag: null, round: 'r16', gruppe: null, home_team: 'Sieger R32 M3',     away_team: 'Sieger R32 M4',      kickoff: '2026-07-05T21:00:00+02:00' },
  { spieltag: null, round: 'r16', gruppe: null, home_team: 'Sieger R32 M5',     away_team: 'Sieger R32 M6',      kickoff: '2026-07-06T00:00:00+02:00' },
  { spieltag: null, round: 'r16', gruppe: null, home_team: 'Sieger R32 M7',     away_team: 'Sieger R32 M8',      kickoff: '2026-07-06T18:00:00+02:00' },
  { spieltag: null, round: 'r16', gruppe: null, home_team: 'Sieger R32 M9',     away_team: 'Sieger R32 M10',     kickoff: '2026-07-06T21:00:00+02:00' },
  { spieltag: null, round: 'r16', gruppe: null, home_team: 'Sieger R32 M11',    away_team: 'Sieger R32 M12',     kickoff: '2026-07-07T00:00:00+02:00' },
  { spieltag: null, round: 'r16', gruppe: null, home_team: 'Sieger R32 M13',    away_team: 'Sieger R32 M14',     kickoff: '2026-07-07T18:00:00+02:00' },
  { spieltag: null, round: 'r16', gruppe: null, home_team: 'Sieger R32 M15',    away_team: 'Sieger R32 M16',     kickoff: '2026-07-07T21:00:00+02:00' },

  // ══ VIERTELFINALE (9. – 12. Juli) ══
  { spieltag: null, round: 'viertelfinale', gruppe: null, home_team: 'Sieger AF M1', away_team: 'Sieger AF M2',   kickoff: '2026-07-09T21:00:00+02:00' },
  { spieltag: null, round: 'viertelfinale', gruppe: null, home_team: 'Sieger AF M3', away_team: 'Sieger AF M4',   kickoff: '2026-07-10T18:00:00+02:00' },
  { spieltag: null, round: 'viertelfinale', gruppe: null, home_team: 'Sieger AF M5', away_team: 'Sieger AF M6',   kickoff: '2026-07-10T21:00:00+02:00' },
  { spieltag: null, round: 'viertelfinale', gruppe: null, home_team: 'Sieger AF M7', away_team: 'Sieger AF M8',   kickoff: '2026-07-11T21:00:00+02:00' },

  // ══ HALBFINALE (14. – 15. Juli) ══
  { spieltag: null, round: 'halbfinale', gruppe: null, home_team: 'Sieger VF M1', away_team: 'Sieger VF M2',      kickoff: '2026-07-14T21:00:00+02:00' },
  { spieltag: null, round: 'halbfinale', gruppe: null, home_team: 'Sieger VF M3', away_team: 'Sieger VF M4',      kickoff: '2026-07-15T21:00:00+02:00' },

  // ══ SPIEL UM PLATZ 3 (18. Juli) ══
  { spieltag: null, round: 'platz3', gruppe: null, home_team: 'Verlierer HF 1', away_team: 'Verlierer HF 2',     kickoff: '2026-07-18T21:00:00+02:00' },

  // ══ FINALE (19. Juli) ══
  { spieltag: null, round: 'finale', gruppe: null, home_team: 'Sieger HF 1',    away_team: 'Sieger HF 2',        kickoff: '2026-07-19T21:00:00+02:00' },
];

// ─── Admin password (bcrypt) ─────────────────────────────────────────────────

function getPasswordHash() {
  const row = db.get("SELECT value FROM settings WHERE key='admin_password_hash'");
  return row ? row.value : null;
}

function checkPassword(plain) {
  const hash = getPasswordHash();
  if (!hash) return false;
  return bcrypt.compareSync(plain, hash);
}

// Seed default password if not set
if (!getPasswordHash()) {
  const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 12);
  db.run("INSERT INTO settings (key, value) VALUES ('admin_password_hash', ?)", [hash]);
  console.log('Admin-Passwort initialisiert (bcrypt).');
}

const cnt = db.get('SELECT COUNT(*) as n FROM matches');
if (cnt.n === 0) {
  db.run('BEGIN');
  for (const m of FIXTURES) {
    db.run(
      `INSERT INTO matches (spieltag, round, gruppe, home_team, away_team, kickoff)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [m.spieltag, m.round, m.gruppe, m.home_team, m.away_team, m.kickoff]
    );
  }
  db.run('COMMIT');
  console.log(`${FIXTURES.length} Spiele eingefügt.`);
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function calcPoints(pred, match) {
  if (match.home_score === null || match.home_score === undefined) return null;
  if (!pred) return 0;

  const isKO = match.round !== 'gruppe';
  const [rH, rA] = [match.home_score, match.away_score];
  const [pH, pA] = [pred.home_score, pred.away_score];

  if (pH === rH && pA === rA) return 3;

  if (!isKO && (pH - pA) === (rH - rA)) return 2;

  const tend = v => v > 0 ? 'H' : v < 0 ? 'A' : 'D';
  if (tend(pH - pA) === tend(rH - rA)) return 1;

  return 0;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function enrichMatch(m) {
  const davidPred = db.get('SELECT * FROM predictions WHERE match_id = ? AND player = ?', [m.id, 'david']);
  const frankPred = db.get('SELECT * FROM predictions WHERE match_id = ? AND player = ?', [m.id, 'frank']);
  return {
    ...m,
    predictions: {
      david: davidPred ? { home_score: davidPred.home_score, away_score: davidPred.away_score } : null,
      frank: frankPred ? { home_score: frankPred.home_score, away_score: frankPred.away_score } : null,
    },
    points: {
      david: calcPoints(davidPred, m),
      frank: calcPoints(frankPred, m),
    },
  };
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// GET /api/nav – navigation items
app.get('/api/nav', (req, res) => {
  const rows = db.all(`
    SELECT round, spieltag, COUNT(*) as match_count
    FROM matches
    GROUP BY round, spieltag
    ORDER BY
      CASE round
        WHEN 'gruppe'        THEN 1
        WHEN 'r32'           THEN 2
        WHEN 'r16'           THEN 3
        WHEN 'viertelfinale' THEN 4
        WHEN 'halbfinale'    THEN 5
        WHEN 'platz3'        THEN 6
        WHEN 'finale'        THEN 7
      END, spieltag
  `);
  res.json(rows);
});

// GET /api/matches?spieltag=1 | ?round=r32
app.get('/api/matches', (req, res) => {
  const { spieltag, round } = req.query;
  let rows;
  if (spieltag !== undefined) {
    rows = db.all('SELECT * FROM matches WHERE spieltag = ? ORDER BY kickoff, gruppe', [parseInt(spieltag)]);
  } else if (round) {
    rows = db.all('SELECT * FROM matches WHERE round = ? ORDER BY kickoff', [round]);
  } else {
    rows = db.all('SELECT * FROM matches ORDER BY kickoff');
  }
  res.json(rows.map(enrichMatch));
});

// POST /api/predict
app.post('/api/predict', (req, res) => {
  const { match_id, player, home_score, away_score } = req.body;

  if (!['david', 'frank'].includes(player?.toLowerCase())) {
    return res.status(400).json({ error: 'Ungültiger Spieler' });
  }
  if (home_score === undefined || away_score === undefined || home_score < 0 || away_score < 0) {
    return res.status(400).json({ error: 'Ungültige Tore' });
  }

  const match = db.get('SELECT * FROM matches WHERE id = ?', [match_id]);
  if (!match) return res.status(404).json({ error: 'Spiel nicht gefunden' });

  const kickoff = new Date(match.kickoff);
  if (new Date() >= kickoff) {
    return res.status(403).json({ error: 'Tippabgabe nicht mehr möglich – Anpfiff bereits erfolgt!' });
  }

  db.run(
    `INSERT INTO predictions (match_id, player, home_score, away_score)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(match_id, player) DO UPDATE SET
       home_score = excluded.home_score,
       away_score = excluded.away_score,
       created_at = CURRENT_TIMESTAMP`,
    [match_id, player.toLowerCase(), parseInt(home_score), parseInt(away_score)]
  );

  res.json({ success: true });
});

// POST /api/result (Admin)
app.post('/api/result', (req, res) => {
  const { match_id, home_score, away_score, extra_time, penalties, password } = req.body;

  if (!checkPassword(password)) {
    return res.status(401).json({ error: 'Falsches Admin-Passwort' });
  }

  const match = db.get('SELECT id FROM matches WHERE id = ?', [match_id]);
  if (!match) return res.status(404).json({ error: 'Spiel nicht gefunden' });

  db.run(
    `UPDATE matches SET home_score = ?, away_score = ?, extra_time = ?, penalties = ? WHERE id = ?`,
    [parseInt(home_score), parseInt(away_score), extra_time ? 1 : 0, penalties ? 1 : 0, match_id]
  );

  updateBracket();

  res.json({ success: true, match: enrichMatch(db.get('SELECT * FROM matches WHERE id = ?', [match_id])) });
});

// PUT /api/match/:id/teams (Admin – KO-Teamnames aktualisieren)
app.put('/api/match/:id/teams', (req, res) => {
  const { home_team, away_team, kickoff, password } = req.body;
  if (!checkPassword(password)) return res.status(401).json({ error: 'Falsches Admin-Passwort' });

  const fields = [];
  const params = [];
  if (home_team) { fields.push('home_team = ?'); params.push(home_team); }
  if (away_team) { fields.push('away_team = ?'); params.push(away_team); }
  if (kickoff)   { fields.push('kickoff = ?');   params.push(kickoff); }
  if (!fields.length) return res.status(400).json({ error: 'Keine Felder' });

  params.push(req.params.id);
  db.run(`UPDATE matches SET ${fields.join(', ')} WHERE id = ?`, params);
  res.json({ success: true });
});

// DELETE /api/result (Admin – Ergebnis löschen)
app.delete('/api/result/:id', (req, res) => {
  const { password } = req.body;
  if (!checkPassword(password)) return res.status(401).json({ error: 'Falsches Admin-Passwort' });
  db.run('UPDATE matches SET home_score = NULL, away_score = NULL, extra_time = 0, penalties = 0 WHERE id = ?',
    [req.params.id]);
  res.json({ success: true });
});

// GET /api/groups – Gruppenstand
app.get('/api/groups', (req, res) => {
  const matches = db.all(`SELECT * FROM matches WHERE round = 'gruppe' ORDER BY gruppe, kickoff`);
  const table = {};

  const ensure = (gruppe, team) => {
    if (!table[gruppe]) table[gruppe] = {};
    if (!table[gruppe][team]) {
      table[gruppe][team] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
    }
  };

  matches.forEach(m => {
    ensure(m.gruppe, m.home_team);
    ensure(m.gruppe, m.away_team);

    if (m.home_score === null || m.home_score === undefined) return;

    const h = table[m.gruppe][m.home_team];
    const a = table[m.gruppe][m.away_team];
    h.played++; a.played++;
    h.gf += m.home_score; h.ga += m.away_score;
    a.gf += m.away_score; a.ga += m.home_score;

    if (m.home_score > m.away_score)      { h.won++; h.pts += 3; a.lost++; }
    else if (m.home_score < m.away_score) { a.won++; a.pts += 3; h.lost++; }
    else                                  { h.drawn++; h.pts++; a.drawn++; a.pts++; }
  });

  const result = {};
  Object.keys(table).sort().forEach(g => {
    result[g] = Object.entries(table[g])
      .map(([team, s]) => ({ team, ...s, gd: s.gf - s.ga }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
  });

  res.json(result);
});

// GET /api/standings – Gesamtrangliste
app.get('/api/standings', (req, res) => {
  const matches = db.all('SELECT * FROM matches ORDER BY kickoff');
  const totals = { david: 0, frank: 0 };
  const details = [];

  matches.forEach(m => {
    if (m.home_score === null || m.home_score === undefined) return;
    const dp = db.get('SELECT * FROM predictions WHERE match_id = ? AND player = ?', [m.id, 'david']);
    const fp = db.get('SELECT * FROM predictions WHERE match_id = ? AND player = ?', [m.id, 'frank']);
    const davidPts = calcPoints(dp, m) ?? 0;
    const frankPts = calcPoints(fp, m) ?? 0;
    totals.david += davidPts;
    totals.frank += frankPts;
    details.push({
      match_id: m.id,
      round: m.round,
      spieltag: m.spieltag,
      home_team: m.home_team,
      away_team: m.away_team,
      result: `${m.home_score}:${m.away_score}`,
      extra_time: m.extra_time,
      penalties: m.penalties,
      david_pred: dp ? `${dp.home_score}:${dp.away_score}` : null,
      frank_pred: fp ? `${fp.home_score}:${fp.away_score}` : null,
      david_pts: davidPts,
      frank_pts: frankPts,
    });
  });

  res.json({ totals, details });
});

// ─── Bracket Logic ───────────────────────────────────────────────────────────

// Correct R32 bracket: all 12 runners-up get direct slots, only 8 thirds-slots
const CORRECT_R32 = [
  { home: '1. Gruppe A', away: '2. Gruppe B' },
  { home: '1. Gruppe B', away: '2. Gruppe A' },
  { home: '1. Gruppe C', away: '2. Gruppe D' },
  { home: '1. Gruppe D', away: '2. Gruppe C' },
  { home: '1. Gruppe E', away: '2. Gruppe F' },
  { home: '1. Gruppe F', away: '2. Gruppe E' },
  { home: '1. Gruppe G', away: '2. Gruppe H' },
  { home: '1. Gruppe H', away: '2. Gruppe G' },
  { home: '1. Gruppe I', away: '2. Gruppe J' },
  { home: '1. Gruppe J', away: '2. Gruppe I' },
  { home: '1. Gruppe K', away: '2. Gruppe L' },
  { home: '1. Gruppe L', away: '2. Gruppe K' },
  { home: 'Bester Dritter 1', away: 'Bester Dritter 2' },
  { home: 'Bester Dritter 3', away: 'Bester Dritter 4' },
  { home: 'Bester Dritter 5', away: 'Bester Dritter 6' },
  { home: 'Bester Dritter 7', away: 'Bester Dritter 8' },
];

function migrateR32IfNeeded() {
  // Detect old/wrong bracket (had "Bester Dritter 9" and missing Group B runner-up)
  const old = db.get("SELECT id FROM matches WHERE round='r32' AND away_team='Bester Dritter 9'");
  if (!old) return;

  const r32 = db.all("SELECT id FROM matches WHERE round='r32' ORDER BY kickoff, id");
  db.run('BEGIN');
  r32.forEach((m, i) => {
    if (CORRECT_R32[i]) {
      db.run('UPDATE matches SET home_team=?, away_team=? WHERE id=?',
        [CORRECT_R32[i].home, CORRECT_R32[i].away, m.id]);
    }
  });
  db.run('COMMIT');
  console.log('R32-Bracket korrigiert (12 Gruppensieger + 12 Zweite + 8 Dritte).');
}

function isPlaceholder(name) {
  return /^(1\.|2\.) Gruppe |^Bester Dritter |^Sieger |^Verlierer /.test(name || '');
}

function computeGroupTable(gruppe) {
  const matches = db.all(
    "SELECT * FROM matches WHERE round='gruppe' AND gruppe=?", [gruppe]);
  const rows = {};

  matches.forEach(m => {
    [m.home_team, m.away_team].forEach(t => {
      if (!rows[t]) rows[t] = { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
    });
    if (m.home_score === null || m.home_score === undefined) return;
    const h = rows[m.home_team], a = rows[m.away_team];
    h.played++; a.played++;
    h.gf += m.home_score; h.ga += m.away_score;
    a.gf += m.away_score; a.ga += m.home_score;
    if      (m.home_score > m.away_score) { h.won++; h.pts += 3; a.lost++; }
    else if (m.home_score < m.away_score) { a.won++; a.pts += 3; h.lost++; }
    else                                  { h.drawn++; h.pts++; a.drawn++; a.pts++; }
  });

  return Object.values(rows)
    .map(t => ({ ...t, gd: t.gf - t.ga }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || b.won - a.won || a.team.localeCompare(b.team));
}

function isGroupComplete(gruppe) {
  const total = db.get("SELECT COUNT(*) as n FROM matches WHERE round='gruppe' AND gruppe=?", [gruppe]);
  const done  = db.get("SELECT COUNT(*) as n FROM matches WHERE round='gruppe' AND gruppe=? AND home_score IS NOT NULL", [gruppe]);
  return total.n > 0 && total.n === done.n;
}

function fillGroupsIntoR32() {
  const r32 = db.all("SELECT id, home_team, away_team FROM matches WHERE round='r32'");

  'ABCDEFGHIJKL'.split('').forEach(g => {
    if (!isGroupComplete(g)) return;
    const standing = computeGroupTable(g);
    if (standing.length < 2) return;
    const [winner, runnerUp] = [standing[0].team, standing[1].team];

    r32.forEach(m => {
      if (m.home_team === `1. Gruppe ${g}`) db.run('UPDATE matches SET home_team=? WHERE id=?', [winner,   m.id]);
      if (m.away_team === `1. Gruppe ${g}`) db.run('UPDATE matches SET away_team=? WHERE id=?', [winner,   m.id]);
      if (m.home_team === `2. Gruppe ${g}`) db.run('UPDATE matches SET home_team=? WHERE id=?', [runnerUp, m.id]);
      if (m.away_team === `2. Gruppe ${g}`) db.run('UPDATE matches SET away_team=? WHERE id=?', [runnerUp, m.id]);
    });
  });
}

function fillBestThirds() {
  const groups = 'ABCDEFGHIJKL'.split('');
  if (!groups.every(g => isGroupComplete(g))) return;

  const thirds = groups.map(g => {
    const s = computeGroupTable(g);
    return s[2] ? { ...s[2], gruppe: g } : null;
  }).filter(Boolean);

  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || b.won - a.won);

  const best8 = thirds.slice(0, 8);
  const r32 = db.all("SELECT id, home_team, away_team FROM matches WHERE round='r32'");

  r32.forEach(m => {
    const hm = (m.home_team || '').match(/^Bester Dritter (\d+)$/);
    const am = (m.away_team || '').match(/^Bester Dritter (\d+)$/);
    if (hm) {
      const t = best8[parseInt(hm[1]) - 1];
      if (t) db.run('UPDATE matches SET home_team=? WHERE id=?', [t.team, m.id]);
    }
    if (am) {
      const t = best8[parseInt(am[1]) - 1];
      if (t) db.run('UPDATE matches SET away_team=? WHERE id=?', [t.team, m.id]);
    }
  });
}

function propagateKOWinners() {
  const roundPairs = [
    { from: 'r32',           to: 'r16' },
    { from: 'r16',           to: 'viertelfinale' },
    { from: 'viertelfinale', to: 'halbfinale' },
  ];

  roundPairs.forEach(({ from, to }) => {
    const src  = db.all('SELECT * FROM matches WHERE round=? ORDER BY kickoff, id', [from]);
    const dest = db.all('SELECT * FROM matches WHERE round=? ORDER BY kickoff, id', [to]);

    src.forEach((m, idx) => {
      if (m.home_score === null || m.home_score === undefined) return;
      const winner = m.home_score > m.away_score ? m.home_team
                   : m.away_score > m.home_score ? m.away_team
                   : null;
      if (!winner) return;

      const destIdx  = Math.floor(idx / 2);
      const destSide = idx % 2 === 0 ? 'home' : 'away';
      const dm = dest[destIdx];
      if (!dm) return;

      if (destSide === 'home' && isPlaceholder(dm.home_team)) {
        db.run('UPDATE matches SET home_team=? WHERE id=?', [winner, dm.id]);
      } else if (destSide === 'away' && isPlaceholder(dm.away_team)) {
        db.run('UPDATE matches SET away_team=? WHERE id=?', [winner, dm.id]);
      }
    });
  });

  // Halbfinale → Finale (winner) + Platz 3 (loser)
  const hf     = db.all("SELECT * FROM matches WHERE round='halbfinale' ORDER BY kickoff, id");
  const finale = db.all("SELECT * FROM matches WHERE round='finale'     ORDER BY kickoff, id");
  const platz3 = db.all("SELECT * FROM matches WHERE round='platz3'     ORDER BY kickoff, id");

  hf.forEach((m, idx) => {
    if (m.home_score === null || m.home_score === undefined) return;
    const winner = m.home_score > m.away_score ? m.home_team
                 : m.away_score > m.home_score ? m.away_team
                 : null;
    const loser  = m.home_score > m.away_score ? m.away_team
                 : m.away_score > m.home_score ? m.home_team
                 : null;

    const side = idx === 0 ? 'home' : 'away';

    if (winner && finale[0]) {
      if (side === 'home' && isPlaceholder(finale[0].home_team))
        db.run('UPDATE matches SET home_team=? WHERE id=?', [winner, finale[0].id]);
      if (side === 'away' && isPlaceholder(finale[0].away_team))
        db.run('UPDATE matches SET away_team=? WHERE id=?', [winner, finale[0].id]);
    }
    if (loser && platz3[0]) {
      if (side === 'home' && isPlaceholder(platz3[0].home_team))
        db.run('UPDATE matches SET home_team=? WHERE id=?', [loser, platz3[0].id]);
      if (side === 'away' && isPlaceholder(platz3[0].away_team))
        db.run('UPDATE matches SET away_team=? WHERE id=?', [loser, platz3[0].id]);
    }
  });
}

function updateBracket() {
  try {
    fillGroupsIntoR32();
    fillBestThirds();
    propagateKOWinners();
  } catch (e) {
    console.error('Bracket-Update fehlgeschlagen:', e.message);
  }
}

// Run migration + initial bracket fill on startup
migrateR32IfNeeded();
updateBracket();

// POST /api/admin/change-password
app.post('/api/admin/change-password', (req, res) => {
  const { password, new_password } = req.body;
  if (!checkPassword(password)) return res.status(401).json({ error: 'Falsches Admin-Passwort' });
  if (!new_password || new_password.length < 6)
    return res.status(400).json({ error: 'Neues Passwort muss mindestens 6 Zeichen haben' });
  const hash = bcrypt.hashSync(new_password, 12);
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_password_hash', ?)", [hash]);
  res.json({ success: true });
});

// POST /api/admin/update-bracket – manuell Bracket aktualisieren
app.post('/api/admin/update-bracket', (req, res) => {
  if (!checkPassword(req.body.password))
    return res.status(401).json({ error: 'Falsches Admin-Passwort' });
  updateBracket();
  res.json({ success: true, message: 'Bracket aktualisiert' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n⚽  WM 2026 Tippspiel läuft auf http://localhost:${PORT}`);
  console.log("🔑  Admin-Passwort: bcrypt-geschützt\n");
});
