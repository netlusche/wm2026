<?php
// ⚠️ TEMPORARY — delete after use!
$dbPath = __DIR__ . '/data/wm2026.db';
$db = new PDO('sqlite:' . $dbPath);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$pw = $body['password'] ?? $_GET['pw'] ?? '';
$hash = $db->query("SELECT value FROM settings WHERE key='admin_password_hash'")->fetchColumn();
if (!password_verify($pw, $hash)) { http_response_code(401); die(json_encode(['error' => 'Falsches Passwort'])); }

// Correct kickoff times (MESZ = UTC+2) and placeholder names for r16/QF/SF/Platz3/Finale.
// Source: Wikipedia 2026 FIFA World Cup knockout stage (UTC times +2h).
// r16 placeholder format: "Sieger #ID" references the r32 DB match ID.
$updates = [
    // r16
    89 => ['home' => 'Sieger #75', 'away' => 'Sieger #78', 'kickoff' => '2026-07-04T23:00:00+02:00'],
    90 => ['home' => 'Sieger #73', 'away' => 'Sieger #76', 'kickoff' => '2026-07-04T19:00:00+02:00'],
    91 => ['home' => 'Sieger #74', 'away' => 'Sieger #77', 'kickoff' => '2026-07-05T22:00:00+02:00'],
    92 => ['home' => 'Sieger #79', 'away' => 'Sieger #80', 'kickoff' => '2026-07-06T02:00:00+02:00'],
    93 => ['home' => 'Sieger #83', 'away' => 'Sieger #84', 'kickoff' => '2026-07-06T21:00:00+02:00'],
    94 => ['home' => 'Sieger #82', 'away' => 'Sieger #81', 'kickoff' => '2026-07-07T02:00:00+02:00'],
    95 => ['home' => 'Sieger #87', 'away' => 'Sieger #86', 'kickoff' => '2026-07-07T18:00:00+02:00'],
    96 => ['home' => 'Sieger #85', 'away' => 'Sieger #88', 'kickoff' => '2026-07-07T22:00:00+02:00'],
    // QF — only kickoff (placeholders stay "Sieger AF Mx")
    97  => ['kickoff' => '2026-07-09T22:00:00+02:00'],
    98  => ['kickoff' => '2026-07-10T21:00:00+02:00'],
    99  => ['kickoff' => '2026-07-11T23:00:00+02:00'],
    100 => ['kickoff' => '2026-07-12T02:00:00+02:00'],
    // SF
    101 => ['kickoff' => '2026-07-14T20:00:00+02:00'],
    // 102 already correct (2026-07-15T21:00:00+02:00)
    // Platz3
    103 => ['kickoff' => '2026-07-18T23:00:00+02:00'],
    // 104 Finale already correct (2026-07-19T21:00:00+02:00)
];

$db->beginTransaction();
try {
    $updated = 0;
    foreach ($updates as $id => $data) {
        $fields = ['kickoff=?'];
        $params = [$data['kickoff']];
        if (isset($data['home'])) { $fields[] = 'home_team=?'; $params[] = $data['home']; }
        if (isset($data['away'])) { $fields[] = 'away_team=?'; $params[] = $data['away']; }
        $params[] = $id;
        $db->prepare("UPDATE matches SET " . implode(',', $fields) . " WHERE id=? AND home_score IS NULL")->execute($params);
        $updated++;
    }
    $db->commit();
    echo json_encode(['success' => true, 'updated' => $updated, 'note' => 'Bitte diese Datei jetzt löschen!'], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
