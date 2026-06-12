<?php
// ─── Headers ─────────────────────────────────────────────────────────────────

header('Content-Type: application/json; charset=utf-8');

// ─── DB ──────────────────────────────────────────────────────────────────────

$dbPath = __DIR__ . '/data/wm2026.db';
if (!is_dir(__DIR__ . '/data')) mkdir(__DIR__ . '/data', 0755, true);

$db = new PDO('sqlite:' . $dbPath);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$db->exec('PRAGMA journal_mode=WAL');
$db->exec('PRAGMA foreign_keys=ON');

// ─── Schema ───────────────────────────────────────────────────────────────────

$db->exec("
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
    extra_time       INTEGER DEFAULT 0,
    penalties        INTEGER DEFAULT 0,
    penalty_winner   TEXT
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
");

// ─── Password helpers ─────────────────────────────────────────────────────────

function getPasswordHash(PDO $db): ?string {
    $row = $db->query("SELECT value FROM settings WHERE key='admin_password_hash'")->fetch();
    return $row ? $row['value'] : null;
}

function checkPassword(PDO $db, string $plain): bool {
    $hash = getPasswordHash($db);
    if (!$hash) return false;
    // password_verify handles both $2b$ (bcryptjs) and $2y$ (PHP)
    return password_verify($plain, str_replace('$2b$', '$2y$', $hash));
}

// Seed default password if missing
if (!getPasswordHash($db)) {
    $hash = password_hash('wm2026admin', PASSWORD_BCRYPT, ['cost' => 12]);
    $db->prepare("INSERT INTO settings (key,value) VALUES ('admin_password_hash',?)")->execute([$hash]);
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

$FIXTURES = [
  // ══ SPIELTAG 1 (Runde 1 aller Gruppen) ══
  [1,'gruppe','A','Mexiko','Südafrika','2026-06-11T21:00:00+02:00'],
  [1,'gruppe','A','Südkorea','Tschechien','2026-06-12T04:00:00+02:00'],
  [1,'gruppe','B','Kanada','Bosnien-Herzegowina','2026-06-12T21:00:00+02:00'],
  [1,'gruppe','B','Katar','Schweiz','2026-06-13T03:00:00+02:00'],
  [1,'gruppe','D','USA','Paraguay','2026-06-13T03:00:00+02:00'],
  [1,'gruppe','C','Brasilien','Marokko','2026-06-14T00:00:00+02:00'],
  [1,'gruppe','C','Haiti','Schottland','2026-06-14T03:00:00+02:00'],
  [1,'gruppe','D','Australien','Türkei','2026-06-14T06:00:00+02:00'],
  [1,'gruppe','E','Deutschland','Curaçao','2026-06-14T19:00:00+02:00'],
  [1,'gruppe','F','Niederlande','Japan','2026-06-14T22:00:00+02:00'],
  [1,'gruppe','E','Elfenbeinküste','Ecuador','2026-06-15T01:00:00+02:00'],
  [1,'gruppe','F','Schweden','Tunesien','2026-06-15T04:00:00+02:00'],
  [1,'gruppe','H','Spanien','Kap Verde','2026-06-15T18:00:00+02:00'],
  [1,'gruppe','G','Belgien','Ägypten','2026-06-15T21:00:00+02:00'],
  [1,'gruppe','H','Saudi-Arabien','Uruguay','2026-06-16T00:00:00+02:00'],
  [1,'gruppe','G','Iran','Neuseeland','2026-06-16T03:00:00+02:00'],
  [1,'gruppe','I','Frankreich','Senegal','2026-06-16T21:00:00+02:00'],
  [1,'gruppe','I','Irak','Norwegen','2026-06-17T00:00:00+02:00'],
  [1,'gruppe','J','Argentinien','Algerien','2026-06-17T03:00:00+02:00'],
  [1,'gruppe','J','Österreich','Jordanien','2026-06-17T06:00:00+02:00'],
  [1,'gruppe','K','Portugal','DR Kongo','2026-06-17T19:00:00+02:00'],
  [1,'gruppe','L','England','Kroatien','2026-06-17T22:00:00+02:00'],
  [1,'gruppe','L','Ghana','Panama','2026-06-18T01:00:00+02:00'],
  [1,'gruppe','K','Usbekistan','Kolumbien','2026-06-18T04:00:00+02:00'],
  // ══ SPIELTAG 2 (Runde 2 aller Gruppen) ══
  [2,'gruppe','A','Tschechien','Südafrika','2026-06-18T18:00:00+02:00'],
  [2,'gruppe','B','Schweiz','Bosnien-Herzegowina','2026-06-18T21:00:00+02:00'],
  [2,'gruppe','B','Kanada','Katar','2026-06-19T00:00:00+02:00'],
  [2,'gruppe','A','Mexiko','Südkorea','2026-06-19T03:00:00+02:00'],
  [2,'gruppe','D','USA','Australien','2026-06-19T21:00:00+02:00'],
  [2,'gruppe','C','Schottland','Marokko','2026-06-20T00:00:00+02:00'],
  [2,'gruppe','C','Brasilien','Haiti','2026-06-20T03:00:00+02:00'],
  [2,'gruppe','D','Türkei','Paraguay','2026-06-20T06:00:00+02:00'],
  [2,'gruppe','F','Niederlande','Schweden','2026-06-20T19:00:00+02:00'],
  [2,'gruppe','E','Deutschland','Elfenbeinküste','2026-06-20T22:00:00+02:00'],
  [2,'gruppe','E','Ecuador','Curaçao','2026-06-21T02:00:00+02:00'],
  [2,'gruppe','F','Tunesien','Japan','2026-06-21T06:00:00+02:00'],
  [2,'gruppe','H','Spanien','Saudi-Arabien','2026-06-21T18:00:00+02:00'],
  [2,'gruppe','G','Belgien','Iran','2026-06-21T21:00:00+02:00'],
  [2,'gruppe','H','Uruguay','Kap Verde','2026-06-22T00:00:00+02:00'],
  [2,'gruppe','G','Neuseeland','Ägypten','2026-06-22T03:00:00+02:00'],
  [2,'gruppe','J','Argentinien','Österreich','2026-06-22T19:00:00+02:00'],
  [2,'gruppe','I','Frankreich','Irak','2026-06-22T23:00:00+02:00'],
  [2,'gruppe','I','Norwegen','Senegal','2026-06-23T02:00:00+02:00'],
  [2,'gruppe','J','Jordanien','Algerien','2026-06-23T05:00:00+02:00'],
  [2,'gruppe','K','Portugal','Usbekistan','2026-06-23T19:00:00+02:00'],
  [2,'gruppe','L','England','Ghana','2026-06-23T22:00:00+02:00'],
  [2,'gruppe','L','Panama','Kroatien','2026-06-24T01:00:00+02:00'],
  [2,'gruppe','K','Kolumbien','DR Kongo','2026-06-24T04:00:00+02:00'],
  // ══ SPIELTAG 3 (Runde 3 aller Gruppen) ══
  [3,'gruppe','B','Bosnien-Herzegowina','Katar','2026-06-25T00:00:00+02:00'],
  [3,'gruppe','B','Schweiz','Kanada','2026-06-25T00:00:00+02:00'],
  [3,'gruppe','C','Schottland','Brasilien','2026-06-25T00:00:00+02:00'],
  [3,'gruppe','C','Marokko','Haiti','2026-06-25T00:00:00+02:00'],
  [3,'gruppe','A','Tschechien','Mexiko','2026-06-25T03:00:00+02:00'],
  [3,'gruppe','A','Südafrika','Südkorea','2026-06-25T03:00:00+02:00'],
  [3,'gruppe','E','Curaçao','Elfenbeinküste','2026-06-25T22:00:00+02:00'],
  [3,'gruppe','E','Ecuador','Deutschland','2026-06-25T22:00:00+02:00'],
  [3,'gruppe','F','Japan','Schweden','2026-06-26T01:00:00+02:00'],
  [3,'gruppe','F','Tunesien','Niederlande','2026-06-26T01:00:00+02:00'],
  [3,'gruppe','D','Türkei','USA','2026-06-26T04:00:00+02:00'],
  [3,'gruppe','D','Paraguay','Australien','2026-06-26T04:00:00+02:00'],
  [3,'gruppe','H','Uruguay','Spanien','2026-06-26T18:00:00+02:00'],
  [3,'gruppe','I','Norwegen','Frankreich','2026-06-26T21:00:00+02:00'],
  [3,'gruppe','I','Senegal','Irak','2026-06-26T21:00:00+02:00'],
  [3,'gruppe','H','Kap Verde','Saudi-Arabien','2026-06-27T02:00:00+02:00'],
  [3,'gruppe','G','Ägypten','Iran','2026-06-27T05:00:00+02:00'],
  [3,'gruppe','G','Neuseeland','Belgien','2026-06-27T05:00:00+02:00'],
  [3,'gruppe','L','Panama','England','2026-06-27T23:00:00+02:00'],
  [3,'gruppe','L','Kroatien','Ghana','2026-06-27T23:00:00+02:00'],
  [3,'gruppe','J','Algerien','Österreich','2026-06-28T04:00:00+02:00'],
  [3,'gruppe','J','Jordanien','Argentinien','2026-06-28T04:00:00+02:00'],
  [3,'gruppe','K','Kolumbien','Portugal','2026-06-28T01:30:00+02:00'],
  [3,'gruppe','K','DR Kongo','Usbekistan','2026-06-28T01:30:00+02:00'],
  // ══ RUNDE DER 32 ══
  [null,'r32',null,'1. Gruppe A','2. Gruppe B','2026-06-29T18:00:00+02:00'],
  [null,'r32',null,'1. Gruppe B','2. Gruppe A','2026-06-29T21:00:00+02:00'],
  [null,'r32',null,'1. Gruppe C','2. Gruppe D','2026-06-30T18:00:00+02:00'],
  [null,'r32',null,'1. Gruppe D','2. Gruppe C','2026-06-30T21:00:00+02:00'],
  [null,'r32',null,'1. Gruppe E','2. Gruppe F','2026-07-01T18:00:00+02:00'],
  [null,'r32',null,'1. Gruppe F','2. Gruppe E','2026-07-01T21:00:00+02:00'],
  [null,'r32',null,'1. Gruppe G','2. Gruppe H','2026-07-02T00:00:00+02:00'],
  [null,'r32',null,'1. Gruppe H','2. Gruppe G','2026-07-02T18:00:00+02:00'],
  [null,'r32',null,'1. Gruppe I','2. Gruppe J','2026-07-02T21:00:00+02:00'],
  [null,'r32',null,'1. Gruppe J','2. Gruppe I','2026-07-03T00:00:00+02:00'],
  [null,'r32',null,'1. Gruppe K','2. Gruppe L','2026-07-03T18:00:00+02:00'],
  [null,'r32',null,'1. Gruppe L','2. Gruppe K','2026-07-03T21:00:00+02:00'],
  [null,'r32',null,'Bester Dritter 1','Bester Dritter 2','2026-07-04T00:00:00+02:00'],
  [null,'r32',null,'Bester Dritter 3','Bester Dritter 4','2026-07-04T18:00:00+02:00'],
  [null,'r32',null,'Bester Dritter 5','Bester Dritter 6','2026-07-04T21:00:00+02:00'],
  [null,'r32',null,'Bester Dritter 7','Bester Dritter 8','2026-07-05T00:00:00+02:00'],
  // ══ ACHTELFINALE ══
  [null,'r16',null,'Sieger R32 M1','Sieger R32 M2','2026-07-05T18:00:00+02:00'],
  [null,'r16',null,'Sieger R32 M3','Sieger R32 M4','2026-07-05T21:00:00+02:00'],
  [null,'r16',null,'Sieger R32 M5','Sieger R32 M6','2026-07-06T00:00:00+02:00'],
  [null,'r16',null,'Sieger R32 M7','Sieger R32 M8','2026-07-06T18:00:00+02:00'],
  [null,'r16',null,'Sieger R32 M9','Sieger R32 M10','2026-07-06T21:00:00+02:00'],
  [null,'r16',null,'Sieger R32 M11','Sieger R32 M12','2026-07-07T00:00:00+02:00'],
  [null,'r16',null,'Sieger R32 M13','Sieger R32 M14','2026-07-07T18:00:00+02:00'],
  [null,'r16',null,'Sieger R32 M15','Sieger R32 M16','2026-07-07T21:00:00+02:00'],
  // ══ VIERTELFINALE ══
  [null,'viertelfinale',null,'Sieger AF M1','Sieger AF M2','2026-07-09T21:00:00+02:00'],
  [null,'viertelfinale',null,'Sieger AF M3','Sieger AF M4','2026-07-10T18:00:00+02:00'],
  [null,'viertelfinale',null,'Sieger AF M5','Sieger AF M6','2026-07-10T21:00:00+02:00'],
  [null,'viertelfinale',null,'Sieger AF M7','Sieger AF M8','2026-07-11T21:00:00+02:00'],
  // ══ HALBFINALE ══
  [null,'halbfinale',null,'Sieger VF M1','Sieger VF M2','2026-07-14T21:00:00+02:00'],
  [null,'halbfinale',null,'Sieger VF M3','Sieger VF M4','2026-07-15T21:00:00+02:00'],
  // ══ PLATZ 3 ══
  [null,'platz3',null,'Verlierer HF 1','Verlierer HF 2','2026-07-18T21:00:00+02:00'],
  // ══ FINALE ══
  [null,'finale',null,'Sieger HF 1','Sieger HF 2','2026-07-19T21:00:00+02:00'],
];

// Seed fixtures if empty
$cnt = $db->query("SELECT COUNT(*) FROM matches")->fetchColumn();
if ((int)$cnt === 0) {
    $stmt = $db->prepare("INSERT INTO matches (spieltag,round,gruppe,home_team,away_team,kickoff) VALUES (?,?,?,?,?,?)");
    $db->beginTransaction();
    foreach ($FIXTURES as $f) $stmt->execute($f);
    $db->commit();
}


// ─── HTTP helper ─────────────────────────────────────────────────────────────

function fetchUrl(string $url): ?string {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 5,
            CURLOPT_USERAGENT      => 'WM2026Tippspiel/1.0',
        ]);
        $result = curl_exec($ch);
        return $result ?: null;
    }
    $ctx = stream_context_create(['http' => ['timeout' => 5]]);
    $result = @file_get_contents($url, false, $ctx);
    return $result ?: null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nm(array $m): array {
    $m['id']         = (int)$m['id'];
    $m['spieltag']   = $m['spieltag'] !== null ? (int)$m['spieltag'] : null;
    $m['home_score'] = $m['home_score'] !== null ? (int)$m['home_score'] : null;
    $m['away_score'] = $m['away_score'] !== null ? (int)$m['away_score'] : null;
    $m['extra_time']     = (int)($m['extra_time'] ?? 0);
    $m['penalties']      = (int)($m['penalties']  ?? 0);
    $m['penalty_winner'] = $m['penalty_winner'] ?? null;
    return $m;
}

function calcPoints(?array $pred, array $m): ?int {
    if ($m['home_score'] === null) return null;
    if (!$pred) return 0;
    $isKO = $m['round'] !== 'gruppe';
    $rH = (int)$m['home_score']; $rA = (int)$m['away_score'];
    $pH = (int)$pred['home_score']; $pA = (int)$pred['away_score'];
    if ($pH === $rH && $pA === $rA) return 3;
    if (!$isKO && ($pH - $pA) === ($rH - $rA)) return 2;
    $tend = fn($v) => $v > 0 ? 'H' : ($v < 0 ? 'A' : 'D');
    if ($tend($pH - $pA) === $tend($rH - $rA)) return 1;
    return 0;
}

function enrichMatch(PDO $db, array $m): array {
    $m = nm($m);
    $getP = function(string $player) use ($db, $m): ?array {
        $s = $db->prepare("SELECT * FROM predictions WHERE match_id=? AND player=?");
        $s->execute([$m['id'], $player]);
        $r = $s->fetch();
        return $r ? ['home_score' => (int)$r['home_score'], 'away_score' => (int)$r['away_score']] : null;
    };
    $dp = $getP('david'); $fp = $getP('frank');
    $m['predictions'] = ['david' => $dp, 'frank' => $fp];
    $m['points']      = ['david' => calcPoints($dp, $m), 'frank' => calcPoints($fp, $m)];
    return $m;
}

function jsonOut($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// ─── Bracket Logic ───────────────────────────────────────────────────────────

function isPlaceholder(?string $name): bool {
    return (bool)preg_match('/^(1\.|2\.) Gruppe |^Bester Dritter |^Sieger |^Verlierer /', $name ?? '');
}

function computeGroupTable(PDO $db, string $gruppe): array {
    $stmt = $db->prepare("SELECT * FROM matches WHERE round='gruppe' AND gruppe=?");
    $stmt->execute([$gruppe]);
    $matches = $stmt->fetchAll();
    $rows = [];
    foreach ($matches as $m) {
        foreach ([$m['home_team'], $m['away_team']] as $t) {
            if (!isset($rows[$t])) $rows[$t] = ['team'=>$t,'played'=>0,'won'=>0,'drawn'=>0,'lost'=>0,'gf'=>0,'ga'=>0,'pts'=>0];
        }
        if ($m['home_score'] === null) continue;
        $hS = (int)$m['home_score']; $aS = (int)$m['away_score'];
        $rows[$m['home_team']]['played']++; $rows[$m['away_team']]['played']++;
        $rows[$m['home_team']]['gf'] += $hS; $rows[$m['home_team']]['ga'] += $aS;
        $rows[$m['away_team']]['gf'] += $aS; $rows[$m['away_team']]['ga'] += $hS;
        if ($hS > $aS)      { $rows[$m['home_team']]['won']++; $rows[$m['home_team']]['pts'] += 3; $rows[$m['away_team']]['lost']++; }
        elseif ($hS < $aS)  { $rows[$m['away_team']]['won']++; $rows[$m['away_team']]['pts'] += 3; $rows[$m['home_team']]['lost']++; }
        else                { $rows[$m['home_team']]['drawn']++; $rows[$m['home_team']]['pts']++; $rows[$m['away_team']]['drawn']++; $rows[$m['away_team']]['pts']++; }
    }
    $result = array_values($rows);
    foreach ($result as &$r) $r['gd'] = $r['gf'] - $r['ga'];
    usort($result, fn($a,$b) =>
        $b['pts']-$a['pts'] ?: $b['gd']-$a['gd'] ?: $b['gf']-$a['gf'] ?: $b['won']-$a['won'] ?: strcmp($a['team'],$b['team'])
    );
    return $result;
}

function isGroupComplete(PDO $db, string $gruppe): bool {
    $s1 = $db->prepare("SELECT COUNT(*) FROM matches WHERE round='gruppe' AND gruppe=?"); $s1->execute([$gruppe]); $total = (int)$s1->fetchColumn();
    $s2 = $db->prepare("SELECT COUNT(*) FROM matches WHERE round='gruppe' AND gruppe=? AND home_score IS NOT NULL"); $s2->execute([$gruppe]); $done = (int)$s2->fetchColumn();
    return $total > 0 && $total === $done;
}

function fillGroupsIntoR32(PDO $db): void {
    $r32 = $db->query("SELECT id,home_team,away_team FROM matches WHERE round='r32'")->fetchAll();
    foreach (str_split('ABCDEFGHIJKL') as $g) {
        if (!isGroupComplete($db, $g)) continue;
        $standing = computeGroupTable($db, $g);
        if (count($standing) < 2) continue;
        $winner = $standing[0]['team']; $runner = $standing[1]['team'];
        foreach ($r32 as $m) {
            if ($m['home_team'] === "1. Gruppe $g") $db->prepare("UPDATE matches SET home_team=? WHERE id=?")->execute([$winner, $m['id']]);
            if ($m['away_team'] === "1. Gruppe $g") $db->prepare("UPDATE matches SET away_team=? WHERE id=?")->execute([$winner, $m['id']]);
            if ($m['home_team'] === "2. Gruppe $g") $db->prepare("UPDATE matches SET home_team=? WHERE id=?")->execute([$runner, $m['id']]);
            if ($m['away_team'] === "2. Gruppe $g") $db->prepare("UPDATE matches SET away_team=? WHERE id=?")->execute([$runner, $m['id']]);
        }
    }
}

function fillBestThirds(PDO $db): void {
    $groups = str_split('ABCDEFGHIJKL');
    foreach ($groups as $g) { if (!isGroupComplete($db, $g)) return; }
    $thirds = [];
    foreach ($groups as $g) {
        $s = computeGroupTable($db, $g);
        if (isset($s[2])) $thirds[] = array_merge($s[2], ['gruppe' => $g]);
    }
    usort($thirds, fn($a,$b) => $b['pts']-$a['pts'] ?: $b['gd']-$a['gd'] ?: $b['gf']-$a['gf'] ?: $b['won']-$a['won']);
    $best8 = array_slice($thirds, 0, 8);
    $r32 = $db->query("SELECT id,home_team,away_team FROM matches WHERE round='r32'")->fetchAll();
    foreach ($r32 as $m) {
        if (preg_match('/^Bester Dritter (\d+)$/', $m['home_team'], $hm)) {
            $idx = (int)$hm[1] - 1;
            if (isset($best8[$idx])) $db->prepare("UPDATE matches SET home_team=? WHERE id=?")->execute([$best8[$idx]['team'], $m['id']]);
        }
        if (preg_match('/^Bester Dritter (\d+)$/', $m['away_team'], $am)) {
            $idx = (int)$am[1] - 1;
            if (isset($best8[$idx])) $db->prepare("UPDATE matches SET away_team=? WHERE id=?")->execute([$best8[$idx]['team'], $m['id']]);
        }
    }
}

function propagateKOWinners(PDO $db): void {
    $pairs = [['r32','r16'],['r16','viertelfinale'],['viertelfinale','halbfinale']];
    foreach ($pairs as [$from, $to]) {
        $src  = $db->query("SELECT * FROM matches WHERE round='$from' ORDER BY kickoff,id")->fetchAll();
        $dest = $db->query("SELECT * FROM matches WHERE round='$to'   ORDER BY kickoff,id")->fetchAll();
        foreach ($src as $idx => $m) {
            if ($m['home_score'] === null) continue;
            $hS = (int)$m['home_score']; $aS = (int)$m['away_score'];
            if ($hS > $aS) $winner = $m['home_team'];
            elseif ($aS > $hS) $winner = $m['away_team'];
            elseif ($m['penalty_winner'] === 'home') $winner = $m['home_team'];
            elseif ($m['penalty_winner'] === 'away') $winner = $m['away_team'];
            else $winner = null;
            if (!$winner) continue;
            $dIdx = (int)floor($idx / 2);
            $side = $idx % 2 === 0 ? 'home' : 'away';
            if (!isset($dest[$dIdx])) continue;
            $dm = $dest[$dIdx];
            if ($side === 'home' && isPlaceholder($dm['home_team']))
                $db->prepare("UPDATE matches SET home_team=? WHERE id=?")->execute([$winner, $dm['id']]);
            if ($side === 'away' && isPlaceholder($dm['away_team']))
                $db->prepare("UPDATE matches SET away_team=? WHERE id=?")->execute([$winner, $dm['id']]);
        }
    }
    // Halbfinale → Finale + Platz 3
    $hf     = $db->query("SELECT * FROM matches WHERE round='halbfinale' ORDER BY kickoff,id")->fetchAll();
    $finale = $db->query("SELECT * FROM matches WHERE round='finale'     ORDER BY kickoff,id")->fetchAll();
    $platz3 = $db->query("SELECT * FROM matches WHERE round='platz3'     ORDER BY kickoff,id")->fetchAll();
    foreach ($hf as $idx => $m) {
        if ($m['home_score'] === null) continue;
        $hS = (int)$m['home_score']; $aS = (int)$m['away_score'];
        if ($hS > $aS)                       { $winner = $m['home_team']; $loser = $m['away_team']; }
        elseif ($aS > $hS)                   { $winner = $m['away_team']; $loser = $m['home_team']; }
        elseif ($m['penalty_winner']==='home'){ $winner = $m['home_team']; $loser = $m['away_team']; }
        elseif ($m['penalty_winner']==='away'){ $winner = $m['away_team']; $loser = $m['home_team']; }
        else { $winner = null; $loser = null; }
        $side   = $idx === 0 ? 'home' : 'away';
        if ($winner && isset($finale[0])) {
            if ($side==='home' && isPlaceholder($finale[0]['home_team'])) $db->prepare("UPDATE matches SET home_team=? WHERE id=?")->execute([$winner,$finale[0]['id']]);
            if ($side==='away' && isPlaceholder($finale[0]['away_team'])) $db->prepare("UPDATE matches SET away_team=? WHERE id=?")->execute([$winner,$finale[0]['id']]);
        }
        if ($loser && isset($platz3[0])) {
            if ($side==='home' && isPlaceholder($platz3[0]['home_team'])) $db->prepare("UPDATE matches SET home_team=? WHERE id=?")->execute([$loser,$platz3[0]['id']]);
            if ($side==='away' && isPlaceholder($platz3[0]['away_team'])) $db->prepare("UPDATE matches SET away_team=? WHERE id=?")->execute([$loser,$platz3[0]['id']]);
        }
    }
}

function updateBracket(PDO $db): void {
    fillGroupsIntoR32($db);
    fillBestThirds($db);
    propagateKOWinners($db);
}

// Run bracket on every request (cheap, ensures consistency)
updateBracket($db);

// ─── Router ───────────────────────────────────────────────────────────────────

$method = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path   = preg_replace('#^.*/api(?:\.php)?#', '', $uri); // strip /api or /api.php prefix
$body   = [];
if (in_array($method, ['POST','PUT','DELETE','PATCH'])) {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
}

// ─── GET /nav ─────────────────────────────────────────────────────────────────

if ($method === 'GET' && $path === '/nav') {
    $rows = $db->query("
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
    ")->fetchAll();
    foreach ($rows as &$r) { $r['match_count'] = (int)$r['match_count']; if ($r['spieltag'] !== null) $r['spieltag'] = (int)$r['spieltag']; }
    jsonOut($rows);
}

// ─── GET /matches ─────────────────────────────────────────────────────────────

if ($method === 'GET' && $path === '/matches') {
    $spieltag = $_GET['spieltag'] ?? null;
    $round    = $_GET['round']    ?? null;
    if ($spieltag !== null) {
        $stmt = $db->prepare("SELECT * FROM matches WHERE spieltag=? ORDER BY kickoff,gruppe");
        $stmt->execute([(int)$spieltag]);
    } elseif ($round) {
        $stmt = $db->prepare("SELECT * FROM matches WHERE round=? ORDER BY kickoff");
        $stmt->execute([$round]);
    } else {
        $stmt = $db->query("SELECT * FROM matches ORDER BY kickoff");
    }
    jsonOut(array_map(fn($m) => enrichMatch($db, $m), $stmt->fetchAll()));
}

// ─── POST /predict ────────────────────────────────────────────────────────────

if ($method === 'POST' && $path === '/predict') {
    $player = strtolower($body['player'] ?? '');
    if (!in_array($player, ['david','frank'])) jsonOut(['error' => 'Ungültiger Spieler'], 400);
    $hS = $body['home_score'] ?? null; $aS = $body['away_score'] ?? null;
    if ($hS === null || $aS === null || (int)$hS < 0 || (int)$aS < 0) jsonOut(['error' => 'Ungültige Tore'], 400);
    $match = $db->prepare("SELECT * FROM matches WHERE id=?"); $match->execute([(int)$body['match_id']]); $match = $match->fetch();
    if (!$match) jsonOut(['error' => 'Spiel nicht gefunden'], 404);
    if (time() >= strtotime($match['kickoff'])) jsonOut(['error' => 'Tippabgabe nicht mehr möglich – Anpfiff bereits erfolgt!'], 403);
    $db->prepare("INSERT INTO predictions (match_id,player,home_score,away_score) VALUES (?,?,?,?)
        ON CONFLICT(match_id,player) DO UPDATE SET home_score=excluded.home_score,away_score=excluded.away_score,created_at=CURRENT_TIMESTAMP")
        ->execute([(int)$body['match_id'], $player, (int)$hS, (int)$aS]);
    jsonOut(['success' => true]);
}

// ─── POST /result ─────────────────────────────────────────────────────────────

if ($method === 'POST' && $path === '/result') {
    if (!checkPassword($db, $body['password'] ?? '')) jsonOut(['error' => 'Falsches Admin-Passwort'], 401);
    $match = $db->prepare("SELECT id FROM matches WHERE id=?"); $match->execute([(int)($body['match_id'] ?? 0)]); $match = $match->fetch();
    if (!$match) jsonOut(['error' => 'Spiel nicht gefunden'], 404);
    $penWinner = null;
    if (!empty($body['penalties'])) {
        $pw = $body['penalty_winner'] ?? null;
        if (in_array($pw, ['home','away'])) $penWinner = $pw;
    }
    $db->prepare("UPDATE matches SET home_score=?,away_score=?,extra_time=?,penalties=?,penalty_winner=? WHERE id=?")
        ->execute([(int)$body['home_score'], (int)$body['away_score'], !empty($body['extra_time']) ? 1 : 0, !empty($body['penalties']) ? 1 : 0, $penWinner, (int)$body['match_id']]);
    updateBracket($db);
    $m = $db->prepare("SELECT * FROM matches WHERE id=?"); $m->execute([(int)$body['match_id']]); $m = $m->fetch();
    jsonOut(['success' => true, 'match' => enrichMatch($db, $m)]);
}

// ─── DELETE /result/:id ───────────────────────────────────────────────────────

if ($method === 'DELETE' && preg_match('#^/result/(\d+)$#', $path, $matches)) {
    if (!checkPassword($db, $body['password'] ?? '')) jsonOut(['error' => 'Falsches Admin-Passwort'], 401);
    $db->prepare("UPDATE matches SET home_score=NULL,away_score=NULL,extra_time=0,penalties=0,penalty_winner=NULL WHERE id=?")->execute([(int)$matches[1]]);
    jsonOut(['success' => true]);
}

// ─── PUT /match/:id/teams ─────────────────────────────────────────────────────

if ($method === 'PUT' && preg_match('#^/match/(\d+)/teams$#', $path, $matches)) {
    if (!checkPassword($db, $body['password'] ?? '')) jsonOut(['error' => 'Falsches Admin-Passwort'], 401);
    $fields = []; $params = [];
    if (isset($body['home_team'])) { $fields[] = 'home_team=?'; $params[] = $body['home_team']; }
    if (isset($body['away_team'])) { $fields[] = 'away_team=?'; $params[] = $body['away_team']; }
    if (isset($body['kickoff']))   { $fields[] = 'kickoff=?';   $params[] = $body['kickoff']; }
    if (!$fields) jsonOut(['error' => 'Keine Felder'], 400);
    $params[] = (int)$matches[1];
    $db->prepare("UPDATE matches SET " . implode(',', $fields) . " WHERE id=?")->execute($params);
    jsonOut(['success' => true]);
}

// ─── GET /groups ──────────────────────────────────────────────────────────────

if ($method === 'GET' && $path === '/groups') {
    $matches = $db->query("SELECT * FROM matches WHERE round='gruppe' ORDER BY gruppe,kickoff")->fetchAll();
    $table = [];
    $ensure = function(string $g, string $t) use (&$table) {
        if (!isset($table[$g][$t])) $table[$g][$t] = ['played'=>0,'won'=>0,'drawn'=>0,'lost'=>0,'gf'=>0,'ga'=>0,'pts'=>0];
    };
    foreach ($matches as $m) {
        $ensure($m['gruppe'], $m['home_team']); $ensure($m['gruppe'], $m['away_team']);
        if ($m['home_score'] === null) continue;
        $hS = (int)$m['home_score']; $aS = (int)$m['away_score'];
        $h = &$table[$m['gruppe']][$m['home_team']]; $a = &$table[$m['gruppe']][$m['away_team']];
        $h['played']++; $a['played']++;
        $h['gf'] += $hS; $h['ga'] += $aS; $a['gf'] += $aS; $a['ga'] += $hS;
        if ($hS > $aS)     { $h['won']++; $h['pts'] += 3; $a['lost']++; }
        elseif ($hS < $aS) { $a['won']++; $a['pts'] += 3; $h['lost']++; }
        else               { $h['drawn']++; $h['pts']++; $a['drawn']++; $a['pts']++; }
    }
    $result = [];
    ksort($table);
    foreach ($table as $g => $teams) {
        $arr = [];
        foreach ($teams as $team => $s) $arr[] = array_merge(['team' => $team], $s, ['gd' => $s['gf'] - $s['ga']]);
        usort($arr, fn($a,$b) => $b['pts']-$a['pts'] ?: $b['gd']-$a['gd'] ?: $b['gf']-$a['gf'] ?: strcmp($a['team'],$b['team']));
        $result[$g] = $arr;
    }
    jsonOut($result);
}

// ─── GET /standings ───────────────────────────────────────────────────────────

if ($method === 'GET' && $path === '/standings') {
    $matches = $db->query("SELECT * FROM matches ORDER BY kickoff")->fetchAll();
    $totals = ['david' => 0, 'frank' => 0];
    $details = [];
    foreach ($matches as $m) {
        $m = nm($m);
        if ($m['home_score'] === null) continue;
        $dp = $db->prepare("SELECT * FROM predictions WHERE match_id=? AND player='david'"); $dp->execute([$m['id']]); $dp = $dp->fetch() ?: null;
        $fp = $db->prepare("SELECT * FROM predictions WHERE match_id=? AND player='frank'"); $fp->execute([$m['id']]); $fp = $fp->fetch() ?: null;
        $dP = calcPoints($dp, $m) ?? 0;
        $fP = calcPoints($fp, $m) ?? 0;
        $totals['david'] += $dP; $totals['frank'] += $fP;
        $details[] = [
            'match_id'   => $m['id'],
            'round'      => $m['round'],
            'spieltag'   => $m['spieltag'],
            'home_team'  => $m['home_team'],
            'away_team'  => $m['away_team'],
            'result'     => $m['home_score'] . ':' . $m['away_score'],
            'extra_time' => $m['extra_time'],
            'penalties'  => $m['penalties'],
            'david_pred' => $dp ? $dp['home_score'] . ':' . $dp['away_score'] : null,
            'frank_pred' => $fp ? $fp['home_score'] . ':' . $fp['away_score'] : null,
            'david_pts'  => $dP,
            'frank_pts'  => $fP,
        ];
    }
    $totalMatches = (int)$db->query("SELECT COUNT(*) FROM matches")->fetchColumn();
    $tipCounts = [];
    foreach (['david', 'frank'] as $pl) {
        $s = $db->prepare("SELECT COUNT(*) FROM predictions WHERE player=?");
        $s->execute([$pl]);
        $tipCounts[$pl] = (int)$s->fetchColumn();
    }
    jsonOut(['totals' => $totals, 'details' => $details, 'tip_counts' => $tipCounts, 'total_matches' => $totalMatches]);
}

// ─── POST /admin/change-password ──────────────────────────────────────────────

if ($method === 'POST' && $path === '/admin/change-password') {
    if (!checkPassword($db, $body['password'] ?? '')) jsonOut(['error' => 'Falsches Admin-Passwort'], 401);
    $new = $body['new_password'] ?? '';
    if (strlen($new) < 6) jsonOut(['error' => 'Neues Passwort muss mindestens 6 Zeichen haben'], 400);
    $hash = password_hash($new, PASSWORD_BCRYPT, ['cost' => 12]);
    $db->prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('admin_password_hash',?)")->execute([$hash]);
    jsonOut(['success' => true]);
}

// ─── POST /admin/update-bracket ───────────────────────────────────────────────

if ($method === 'POST' && $path === '/admin/update-bracket') {
    if (!checkPassword($db, $body['password'] ?? '')) jsonOut(['error' => 'Falsches Admin-Passwort'], 401);
    updateBracket($db);
    jsonOut(['success' => true, 'message' => 'Bracket aktualisiert']);
}

// ─── GET /livescores ──────────────────────────────────────────────────────────

if ($method === 'GET' && $path === '/livescores') {
    $cacheFile = __DIR__ . '/data/livescores_cache.json';
    $cacheTTL  = 60;

    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTTL) {
        $raw = json_decode(file_get_contents($cacheFile), true) ?? [];
    } else {
        $fetched = fetchUrl('https://api.openligadb.de/getmatchdata/wm2026/2026');
        if (!$fetched) jsonOut(['matches' => [], 'auto_saved_matches' => []]);
        file_put_contents($cacheFile, $fetched);
        $raw = json_decode($fetched, true) ?? [];
    }

    // Build lookup: "TeamA|TeamB" => live data
    // Use last goal for true final score (covers ET and penalty shootouts)
    $liveByTeams = [];
    foreach ($raw as $lm) {
        $homeScore = 0; $awayScore = 0; $penWinner = null;
        if (!empty($lm['goals'])) {
            $last = end($lm['goals']);
            $homeScore = (int)$last['scoreTeam1'];
            $awayScore = (int)$last['scoreTeam2'];
            if (!empty($lm['matchIsFinished']) && !empty($last['isPenalty'])) {
                $penWinner = $homeScore > $awayScore ? 'home' : ($awayScore > $homeScore ? 'away' : null);
            }
        } elseif (!empty($lm['matchIsFinished'])) {
            foreach ($lm['matchResults'] as $r) {
                if ((int)$r['resultTypeID'] === 2) {
                    $homeScore = (int)$r['pointsTeam1'];
                    $awayScore = (int)$r['pointsTeam2'];
                }
            }
        }
        $key = $lm['team1']['teamName'] . '|' . $lm['team2']['teamName'];
        $liveByTeams[$key] = [
            'is_finished' => !empty($lm['matchIsFinished']),
            'home_score'  => $homeScore,
            'away_score'  => $awayScore,
            'pen_winner'  => $penWinner,
            'goals'       => array_map(fn($g) => [
                'name'      => $g['goalGetterName'] ?? '',
                'minute'    => isset($g['matchMinute']) ? (int)$g['matchMinute'] : null,
                'isPenalty' => !empty($g['isPenalty']),
                'isOwnGoal' => !empty($g['isOwnGoal']),
                'score1'    => (int)($g['scoreTeam1'] ?? 0),
                'score2'    => (int)($g['scoreTeam2'] ?? 0),
            ], $lm['goals'] ?? []),
        ];
    }

    $ourMatches = $db->query("SELECT id, round, home_team, away_team, home_score, kickoff FROM matches")->fetchAll();
    $liveMatches      = [];
    $autoSavedMatches = [];
    $allGoals         = [];

    foreach ($ourMatches as $m) {
        $key = $m['home_team'] . '|' . $m['away_team'];
        if (!isset($liveByTeams[$key])) continue;
        $live        = $liveByTeams[$key];
        $kickoffPast = time() >= strtotime($m['kickoff']);
        if (!$kickoffPast) continue;

        // Collect goals for all past-kickoff matches
        if (!empty($live['goals'])) {
            $allGoals[(int)$m['id']] = $live['goals'];
        }

        // Auto-save all finished matches (any round)
        if ($live['is_finished'] && $m['home_score'] === null) {
            $db->prepare("UPDATE matches SET home_score=?,away_score=?,extra_time=0,penalties=?,penalty_winner=? WHERE id=?")
               ->execute([$live['home_score'], $live['away_score'], $live['pen_winner'] ? 1 : 0, $live['pen_winner'], (int)$m['id']]);
            updateBracket($db);
            $saved = $db->prepare("SELECT * FROM matches WHERE id=?"); $saved->execute([(int)$m['id']]); $saved = $saved->fetch();
            $autoSavedMatches[] = enrichMatch($db, $saved);
            continue;
        }

        // Running match → LIVE badge (only if no manual result saved yet)
        if (!$live['is_finished'] && $m['home_score'] === null) {
            $liveMatches[] = [
                'match_id'   => (int)$m['id'],
                'home_score' => $live['home_score'],
                'away_score' => $live['away_score'],
                'goals'      => $live['goals'],
            ];
        }
    }

    // Provisional group tables for groups with live matches
    $provisionalGroups = [];
    if (!empty($liveMatches)) {
        $liveById = array_column($liveMatches, null, 'match_id');
        $allGM    = $db->query("SELECT * FROM matches WHERE round='gruppe' ORDER BY gruppe,kickoff")->fetchAll();
        $affected = array_unique(array_column(array_filter($allGM, fn($m) => isset($liveById[(int)$m['id']])), 'gruppe'));
        foreach ($affected as $gruppe) {
            $rows = [];
            foreach ($allGM as $m) {
                if ($m['gruppe'] !== $gruppe) continue;
                foreach ([$m['home_team'], $m['away_team']] as $t) {
                    if (!isset($rows[$t])) $rows[$t] = ['team'=>$t,'played'=>0,'won'=>0,'drawn'=>0,'lost'=>0,'gf'=>0,'ga'=>0,'pts'=>0];
                }
                if (isset($liveById[(int)$m['id']])) {
                    $hS = $liveById[(int)$m['id']]['home_score']; $aS = $liveById[(int)$m['id']]['away_score'];
                } elseif ($m['home_score'] !== null) {
                    $hS = (int)$m['home_score']; $aS = (int)$m['away_score'];
                } else { continue; }
                $rows[$m['home_team']]['played']++; $rows[$m['away_team']]['played']++;
                $rows[$m['home_team']]['gf'] += $hS; $rows[$m['home_team']]['ga'] += $aS;
                $rows[$m['away_team']]['gf'] += $aS; $rows[$m['away_team']]['ga'] += $hS;
                if ($hS > $aS)     { $rows[$m['home_team']]['won']++; $rows[$m['home_team']]['pts'] += 3; $rows[$m['away_team']]['lost']++; }
                elseif ($hS < $aS) { $rows[$m['away_team']]['won']++; $rows[$m['away_team']]['pts'] += 3; $rows[$m['home_team']]['lost']++; }
                else               { $rows[$m['home_team']]['drawn']++; $rows[$m['home_team']]['pts']++; $rows[$m['away_team']]['drawn']++; $rows[$m['away_team']]['pts']++; }
            }
            $arr = array_values($rows);
            foreach ($arr as &$r) $r['gd'] = $r['gf'] - $r['ga'];
            usort($arr, fn($a,$b) => $b['pts']-$a['pts'] ?: $b['gd']-$a['gd'] ?: $b['gf']-$a['gf'] ?: $b['won']-$a['won'] ?: strcmp($a['team'],$b['team']));
            $provisionalGroups[$gruppe] = $arr;
        }
    }

    // Provisional standings: confirmed points + live match predictions
    $totals = ['david' => 0, 'frank' => 0];
    foreach ($db->query("SELECT * FROM matches ORDER BY kickoff")->fetchAll() as $dbm) {
        $dbm = nm($dbm);
        if ($dbm['home_score'] === null) continue;
        foreach (['david', 'frank'] as $pl) {
            $s = $db->prepare("SELECT * FROM predictions WHERE match_id=? AND player=?");
            $s->execute([$dbm['id'], $pl]);
            $totals[$pl] += calcPoints($s->fetch() ?: null, $dbm) ?? 0;
        }
    }
    $provisional = $totals;
    foreach ($liveMatches as $lm) {
        $s = $db->prepare("SELECT * FROM matches WHERE id=?"); $s->execute([$lm['match_id']]); $dbm = nm($s->fetch());
        $dbm['home_score'] = $lm['home_score']; $dbm['away_score'] = $lm['away_score'];
        foreach (['david', 'frank'] as $pl) {
            $s = $db->prepare("SELECT * FROM predictions WHERE match_id=? AND player=?");
            $s->execute([$lm['match_id'], $pl]);
            $provisional[$pl] += calcPoints($s->fetch() ?: null, $dbm) ?? 0;
        }
    }

    jsonOut(['matches' => $liveMatches, 'auto_saved_matches' => $autoSavedMatches, 'provisional_totals' => $provisional, 'provisional_groups' => $provisionalGroups, 'has_live' => count($liveMatches) > 0, 'all_goals' => $allGoals]);
}

// ─── 404 ─────────────────────────────────────────────────────────────────────

jsonOut(['error' => 'Not found'], 404);
