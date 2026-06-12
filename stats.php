<?php
// stats.php
// Retourne le nombre de scans pour une liste d'identifiants de QR codes.
// Usage: stats.php?ids=abc123,def456

declare(strict_types=1);

require __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$idsParam = (string) ($_GET['ids'] ?? '');
$ids = array_filter(array_map('trim', explode(',', $idsParam)));

$result = [];

if (empty($ids)) {
    echo json_encode($result);
    exit;
}

try {
    $db = getDb();

    foreach ($ids as $id) {
        if (!isValidId($id)) {
            continue;
        }
        $stmt = $db->prepare('SELECT scan_count FROM qr_codes WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $result[$id] = $row ? (int) $row['scan_count'] : 0;
    }

    echo json_encode($result);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
