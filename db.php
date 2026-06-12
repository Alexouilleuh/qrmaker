<?php
// db.php - Connexion SQLite partagée pour le tracking des QR codes
// Stocke la base dans data/tracking.sqlite (hors du dossier public si possible)

declare(strict_types=1);

function getDb(): PDO {
    $dbPath = __DIR__ . '/data/tracking.sqlite';
    $dataDir = dirname($dbPath);

    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }

    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA journal_mode = WAL;');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS qr_codes (
            id TEXT PRIMARY KEY,
            target_url TEXT NOT NULL,
            created_at TEXT NOT NULL,
            scan_count INTEGER NOT NULL DEFAULT 0
        )
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            qr_id TEXT NOT NULL,
            scanned_at TEXT NOT NULL,
            FOREIGN KEY (qr_id) REFERENCES qr_codes(id)
        )
    ');

    return $pdo;
}

/**
 * Validate that a string is a safe, well-formed http(s) URL.
 * Used to prevent open-redirect abuse and injection of malicious schemes.
 */
function isValidHttpUrl(string $url): bool {
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        return false;
    }
    $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
    return in_array($scheme, ['http', 'https'], true);
}

/**
 * Validate the QR id format: alphanumeric, generated client-side.
 */
function isValidId(string $id): bool {
    return (bool) preg_match('/^[a-z0-9]{1,40}$/i', $id);
}
