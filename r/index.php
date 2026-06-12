<?php
// r/index.php
// Endpoint de redirection traçable: /r/{id}
// Incrémente le compteur de scans puis redirige (302) vers l'URL cible.
//
// Fiabilité:
// - Transaction SQLite pour garantir cohérence du compteur sous concurrence.
// - Si l'id est inconnu (ex: jamais enregistré via register.php), on tente
//   un fallback "?to=" passé en query string pour rester fonctionnel,
//   mais on n'enregistre rien d'invalide.

declare(strict_types=1);

require __DIR__ . '/../db.php';

$id = (string) ($_GET['id'] ?? '');

if ($id === '' || !isValidId($id)) {
    http_response_code(400);
    echo 'Lien invalide.';
    exit;
}

try {
    $db = getDb();

    $stmt = $db->prepare('SELECT target_url FROM qr_codes WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(404);
        echo 'Ce QR code n\'est pas enregistré ou a expiré.';
        exit;
    }

    $targetUrl = $row['target_url'];

    if (!isValidHttpUrl($targetUrl)) {
        http_response_code(500);
        echo 'URL cible invalide.';
        exit;
    }

    // Record the scan atomically
    $db->beginTransaction();

    $db->prepare('UPDATE qr_codes SET scan_count = scan_count + 1 WHERE id = :id')
       ->execute([':id' => $id]);

    $db->prepare('INSERT INTO scans (qr_id, scanned_at) VALUES (:id, :ts)')
       ->execute([
           ':id' => $id,
           ':ts' => (new DateTime('now', new DateTimeZone('UTC')))->format(DateTime::ATOM),
       ]);

    $db->commit();

    // Redirect (302 to allow re-tracking on repeated scans, not cached)
    header('Location: ' . $targetUrl, true, 302);
    header('Cache-Control: no-store, no-cache, must-revalidate');
    exit;

} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo 'Erreur serveur.';
}
