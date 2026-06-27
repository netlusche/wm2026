<?php
// ⚠️ TEMPORARY — delete after use!
// Call with: POST { "password": "..." }  or  ?pw=... via GET (lokal only)

$dbPath = __DIR__ . '/data/wm2026.db';
$db = new PDO('sqlite:' . $dbPath);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$pw = $body['password'] ?? $_GET['pw'] ?? '';

$hash = $db->query("SELECT value FROM settings WHERE key='admin_password_hash'")->fetchColumn();
if (!password_verify($pw, $hash)) {
    http_response_code(401);
    die(json_encode(['error' => 'Falsches Passwort']));
}

// ── Correct r32 bracket ───────────────────────────────────────────────────────
// Match IDs 73–88 are reassigned chronologically to the real WM 2026 bracket.
// All times in MESZ (UTC+2). "Bester Dritter N" slots filled by fillBestThirds().
$matches = [
    73 => ['2. Gruppe A',   '2. Gruppe B',       '2026-06-28T21:00:00+02:00'],
    74 => ['1. Gruppe C',   '2. Gruppe F',        '2026-06-29T19:00:00+02:00'],
    75 => ['1. Gruppe E',   'Bester Dritter 1',   '2026-06-29T22:30:00+02:00'],
    76 => ['1. Gruppe F',   '2. Gruppe C',        '2026-06-30T03:00:00+02:00'],
    77 => ['2. Gruppe E',   '2. Gruppe I',        '2026-06-30T19:00:00+02:00'],
    78 => ['1. Gruppe I',   'Bester Dritter 2',   '2026-06-30T23:00:00+02:00'],
    79 => ['1. Gruppe A',   'Bester Dritter 3',   '2026-07-01T03:00:00+02:00'],
    80 => ['1. Gruppe L',   'Bester Dritter 4',   '2026-07-01T18:00:00+02:00'],
    81 => ['1. Gruppe G',   'Bester Dritter 5',   '2026-07-01T22:00:00+02:00'],
    82 => ['1. Gruppe D',   'Bester Dritter 6',   '2026-07-02T02:00:00+02:00'],
    83 => ['1. Gruppe H',   '2. Gruppe J',        '2026-07-02T21:00:00+02:00'],
    84 => ['2. Gruppe K',   '2. Gruppe L',        '2026-07-03T01:00:00+02:00'],
    85 => ['1. Gruppe B',   'Bester Dritter 7',   '2026-07-03T05:00:00+02:00'],
    86 => ['2. Gruppe D',   '2. Gruppe G',        '2026-07-03T20:00:00+02:00'],
    87 => ['1. Gruppe J',   '2. Gruppe H',        '2026-07-04T00:00:00+02:00'],
    88 => ['1. Gruppe K',   'Bester Dritter 8',   '2026-07-04T03:30:00+02:00'],
];

$db->beginTransaction();
try {
    // Clear any existing r32 predictions (none expected, but safety first)
    $ids = implode(',', array_keys($matches));
    $deleted = $db->exec("DELETE FROM predictions WHERE match_id IN ($ids)");

    $stmt = $db->prepare("UPDATE matches SET home_team=?, away_team=?, kickoff=?, home_score=NULL, away_score=NULL WHERE id=?");
    foreach ($matches as $id => [$home, $away, $kickoff]) {
        $stmt->execute([$home, $away, $kickoff, $id]);
    }

    $db->commit();
    echo json_encode([
        'success'           => true,
        'updated_matches'   => count($matches),
        'deleted_predictions' => $deleted,
        'note'              => 'r32 Bracket zurückgesetzt. Bitte diese Datei jetzt löschen!'
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
