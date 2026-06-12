# QR Generator avec Tracking (100% statique - GitHub Pages)

Générateur de QR Code (URL) avec personnalisation des couleurs, export
SVG/PNG haute résolution (2000x2000), et suivi des scans par QR code
(nombre de scans, URL cible, date de création).

Aucun backend requis : tout est en HTML/CSS/JS pur, déployable directement
sur GitHub Pages.

## Structure

```
qrafty/
├── index.html      # Page principale
├── style.css       # Styles
├── script.js       # Logique frontend (génération QR, export, historique)
└── r/
    └── index.html  # Page de redirection traçable
```

## Fonctionnement du tracking

Le comptage des scans est assuré par **CountAPI** (https://countapi.xyz),
un service public gratuit fournissant des compteurs atomiques via une
simple requête HTTP GET, sans authentification ni configuration.

1. Quand "Activer le suivi des scans" est cochée, le frontend génère un
   identifiant unique (`id`) et encode dans le QR code une URL de la forme :
   ```
   https://votre-domaine/r/index.html?id=<id>&to=<url-cible-encodée>
   ```
2. Un compteur CountAPI est initialisé à 0 pour cet `id` (namespace
   `qrgen-tracker-v1`).
3. Quand quelqu'un scanne le QR code, `r/index.html` :
   - incrémente le compteur via `https://api.countapi.xyz/hit/<namespace>/<id>`,
   - redirige immédiatement (JS `location.replace`) vers l'URL cible.
4. Le frontend interroge périodiquement
   `https://api.countapi.xyz/get/<namespace>/<id>` pour rafraîchir le
   nombre de scans affiché dans l'historique.

## Déploiement sur GitHub Pages

1. Pousser le contenu du dossier `qrafty/` à la racine du repo (ou dans
   `/docs`, selon votre configuration Pages).
2. Activer GitHub Pages dans les paramètres du repo.
3. C'est tout — aucune configuration serveur, aucune base de données.

## Sécurité

- La page `r/index.html` valide que le paramètre `to` est une URL
  `http://` ou `https://` avant toute redirection, afin d'empêcher
  l'injection de schémas dangereux (`javascript:`, `data:`, etc.).
- Le comptage est "fire-and-forget" : si CountAPI est indisponible,
  l'utilisateur est redirigé immédiatement, sans blocage.

## Limitations connues

- **Historique local** : la liste des QR codes générés (URL, date de
  création, lien traçable) est stockée dans le `localStorage` du
  navigateur. Elle est donc propre à chaque appareil/navigateur.
- **Compteurs partagés mais publics** : les compteurs CountAPI sont
  identifiés par un id aléatoire difficile à deviner, mais l'API est
  publique — toute personne connaissant l'id pourrait théoriquement lire
  ou incrémenter le compteur. Suffisant pour un usage personnel/démo,
  mais pas pour des statistiques sensibles à grande échelle.
- **Dépendance à un service tiers** : si CountAPI est en panne ou bloqué
  (ex: extensions anti-tracking), le comptage peut être temporairement
  indisponible, mais les redirections continuent de fonctionner.
- Pour un tracking robuste et privé à grande échelle, un backend dédié
  (avec base de données propre) reste recommandé à terme.
