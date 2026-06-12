# QR Generator avec Tracking

Générateur de QR Code (URL) avec personnalisation des couleurs, export
SVG/PNG haute résolution (2000x2000), et suivi des scans par QR code
(nombre de scans, URL cible, date de création).

## Structure

```
qrafty/
├── index.html      # Page principale
├── style.css       # Styles
├── script.js       # Logique frontend (génération QR, export, historique)
├── db.php          # Connexion SQLite partagée
├── register.php    # API: enregistre un nouveau QR traçable
├── stats.php       # API: retourne le nombre de scans par id
├── r/
│   ├── index.php   # Endpoint de redirection traçable (/r/{id})
│   └── .htaccess   # Réécriture d'URL pour /r/{id}
└── data/           # Base SQLite (créée automatiquement)
```

## Prérequis serveur

- PHP 7.4+ avec l'extension `pdo_sqlite` activée.
- Apache avec `mod_rewrite` activé (pour `.htaccess` dans `r/`).
  - Sur Nginx, remplacer `.htaccess` par une règle équivalente:
    ```
    location /r/ {
        rewrite ^/r/([a-zA-Z0-9]+)/?$ /r/index.php?id=$1 last;
    }
    ```

## Déploiement

1. Copier tout le dossier `qrafty/` sur votre hébergement PHP.
2. S'assurer que le dossier `data/` est accessible en écriture par PHP
   (`chmod 755 data` généralement suffisant; PHP créera le fichier
   `tracking.sqlite` au premier appel).
3. Idéalement, placer `data/` hors de la racine web publique, ou protéger
   son accès via `.htaccess` (`Deny from all`).

## Fonctionnement du tracking

1. Lorsque "Activer le suivi des scans" est cochée, le frontend:
   - génère un identifiant unique côté client,
   - encode dans le QR code une URL de la forme `https://votre-domaine/r/<id>`,
   - envoie l'URL cible et l'id à `register.php` (stockage dans SQLite).
2. Lorsqu'un utilisateur scanne le QR code, son téléphone ouvre `/r/<id>`,
   qui:
   - incrémente le compteur de scans pour cet id,
   - enregistre un horodatage dans la table `scans`,
   - redirige (HTTP 302) vers l'URL cible réelle.
3. Le frontend interroge périodiquement `stats.php?ids=...` pour rafraîchir
   les compteurs de scans affichés dans l'historique.

## Sécurité

- Toute URL fournie est validée (`FILTER_VALIDATE_URL` + schéma `http`/`https`
  uniquement) pour éviter les redirections ouvertes vers des schémas
  dangereux (`javascript:`, `data:`, etc.).
- Les identifiants de QR sont validés par expression régulière stricte
  (`[a-z0-9]{1,40}`) avant toute requête SQL, en plus de l'utilisation
  systématique de requêtes préparées (PDO).
- Les écritures du compteur de scans sont effectuées dans une transaction
  SQLite pour rester cohérentes même en cas d'accès concurrents.

## Limitations connues

- L'historique est stocké côté client (`localStorage`); il est donc local
  au navigateur. Les compteurs de scans, eux, sont fiables car stockés
  côté serveur (SQLite) et simplement *affichés* via `stats.php`.
- Sans backend PHP fonctionnel (ex: hébergement statique), le QR code se
  génère et s'exporte normalement, mais le lien traçable ne redirigera pas
  tant que `register.php`/`r/index.php` ne sont pas disponibles.
