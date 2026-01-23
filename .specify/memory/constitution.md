<!--
  Sync Impact Report
  ==================
  Version change: 0.0.0 → 1.0.0 (initial ratification)

  Modified principles: N/A (initial version)

  Added sections:
  - Core Principles (4 principles: Performance, Fiabilité, Simplicité, Maintenabilité)
  - Contraintes Techniques
  - Hors Scope (Non-objectifs)
  - Governance

  Removed sections: None

  Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ No updates required (generic template)
  - .specify/templates/spec-template.md: ✅ No updates required (generic template)
  - .specify/templates/tasks-template.md: ✅ No updates required (generic template)

  Follow-up TODOs: None
-->

# Tournoi Tennis de Table - HelloAsso Constitution

## Vision

Créer une plateforme web temps réel pour afficher les inscriptions d'un tournoi de
tennis de table, organisées par tableaux de classement, avec enrichissement automatique
des données clubs via les numéros de licence.

## Core Principles

### I. Performance

Le système DOIT garantir une expérience utilisateur fluide et réactive.

- Temps de chargement initial DOIT être inférieur à 2 secondes
- Mise en cache intelligente des données FFTT (clubs, licenciés) pour éviter les
  appels API répétitifs
- Optimisation des requêtes HelloAsso avec pagination et chargement incrémental
- Utilisation des edge functions Cloudflare pour minimiser la latence

**Rationale**: Les organisateurs et visiteurs consultent les inscriptions depuis
des connexions mobiles variées. Une performance dégradée impacte directement
l'expérience utilisateur et la crédibilité du tournoi.

### II. Fiabilité

Le système DOIT fonctionner de manière robuste même en conditions dégradées.

- Gestion exhaustive des erreurs API (HelloAsso, FFTT) avec messages utilisateur
  explicites
- Fallbacks appropriés : affichage des données partielles si l'enrichissement FFTT
  échoue
- Retry automatique avec backoff exponentiel pour les erreurs transitoires
- Mode hors-ligne gracieux : afficher les dernières données cachées si les APIs
  sont indisponibles

**Rationale**: Les APIs tierces peuvent être indisponibles ou lentes. Le système
ne DOIT jamais afficher une page blanche ou un message d'erreur générique.

### III. Simplicité

L'interface DOIT être immédiatement compréhensible sans documentation.

- Navigation intuitive entre les tableaux de classement
- Affichage clair des informations essentielles : nom, club, classement
- Design mobile-first avec adaptation responsive
- Pas de fonctionnalités cachées ou de workflows complexes

**Rationale**: Les visiteurs sont des joueurs, parents, arbitres avec des niveaux
techniques variés. L'interface DOIT servir son objectif sans friction.

### IV. Maintenabilité

Le code DOIT rester facile à comprendre, modifier et déboguer.

- TypeScript strict obligatoire (no `any`, strict null checks)
- Architecture modulaire : séparation claire API / UI / cache
- Documentation des choix d'architecture dans le code
- Tests unitaires pour la logique métier critique (mapping des tableaux, calculs)

**Rationale**: Le projet sera maintenu par des bénévoles avec un turnover potentiel.
Un code propre et documenté garantit la pérennité.

## Contraintes Techniques

Ces contraintes techniques sont NON-NÉGOCIABLES et DOIVENT être respectées par toute
implémentation.

| Contrainte | Exigence | Justification |
|------------|----------|---------------|
| Déploiement | Cloudflare Pages uniquement | Infrastructure club existante, coût nul |
| Rate limits | Respecter les quotas HelloAsso et FFTT | Éviter les blocages de compte |
| Credentials | Variables d'environnement Cloudflare | Sécurité des tokens API |
| Mobile | Compatibilité obligatoire | Majorité des consultations sur smartphone |

## Hors Scope (Non-objectifs)

Les fonctionnalités suivantes sont EXPLICITEMENT exclues du périmètre de ce projet.
Toute proposition d'implémentation de ces éléments DOIT être rejetée.

- **Gestion des paiements** : Entièrement géré par HelloAsso
- **Modification des inscriptions** : L'interface est en lecture seule
- **Authentification utilisateur** : Pas de système de comptes ou de connexion
- **Gestion du déroulement du tournoi** : Pas de poules, matchs, ou résultats

## Governance

Cette constitution définit les règles fondamentales du projet. Elle prévaut sur
toute autre documentation ou pratique.

### Amendements

1. Toute modification de la constitution DOIT être documentée dans un commit dédié
2. Les modifications DOIVENT inclure une justification dans le message de commit
3. Le numéro de version DOIT être incrémenté selon les règles sémantiques :
   - MAJOR : Changement incompatible (suppression/redéfinition de principe)
   - MINOR : Ajout de principe ou section
   - PATCH : Clarifications, corrections de forme

### Conformité

- Tout code DOIT respecter les principes de Performance, Fiabilité, Simplicité,
  Maintenabilité
- Les revues de code DOIVENT vérifier la conformité à la constitution
- Les violations DOIVENT être justifiées et documentées dans le code

**Version**: 1.0.0 | **Ratified**: 2026-01-22 | **Last Amended**: 2026-01-22
