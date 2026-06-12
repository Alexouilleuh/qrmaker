<?php
// register.php
// Appelé côté client (optionnel) pour enregistrer un QR code dans la base
// avant la première redirection, afin que l'URL cible et la date de création
// soient fiables même si aucun scan n'a encore eu lieu.

declare(strict_types=1);

require __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON body']);
    exit;
}

$id = (string) ($payload['id'] ?? '');
$url = (string) ($payload['url'] ?? '');

if (!isValidId($id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid id']);
    exit;
}

if (!isValidHttpUrl($url)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid URL']);
    exit;
}

try {
    $db = getDb();

    $stmt = $db->prepare('
        INSERT INTO qr_codes (id, target_url, created_at, scan_count)
        VALUES (:id, :url, :created_at, 0)
        ON CONFLICT(id) DO NOTHING
    ');

    $stmt->execute([
        ':id' => $id,
        ':url' => $url,
        ':created_at' => (new DateTime('now', new DateTimeZone('UTC')))->format(DateTime::ATOM),
    ]);

    echo json_encode(['ok' => true]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
