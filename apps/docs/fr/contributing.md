---
title: Contribuer | Comment Contribuer au Développement de Hatcher IDE
description: Apprenez comment contribuer à Hatcher IDE. Directives pour les contributions de code, la documentation, les tests et la participation communautaire dans le projet open source.
---

# Guide de Contribution

Merci de votre intérêt pour contribuer à Hatcher ! Ce guide vous aidera à comprendre notre processus et les meilleures façons de contribuer au projet.

## Façons de Contribuer

### 🐛 Signaler des Bugs

- Utilisez notre [template de rapport de bug](https://github.com/HatcherDX/dx-engine/issues/new?template=bug_report.md)
- Incluez des étapes de reproduction claires
- Fournissez des informations sur votre environnement
- Ajoutez des captures d'écran si applicable

### 💡 Suggérer des Fonctionnalités

- Utilisez notre [template de demande de fonctionnalité](https://github.com/HatcherDX/dx-engine/issues/new?template=feature_request.md)
- Expliquez le problème que vous essayez de résoudre
- Décrivez votre solution proposée
- Considérez les alternatives

### 🔧 Contribution de Code

- Consultez les [issues étiquetées "good first issue"](https://github.com/HatcherDX/dx-engine/labels/good%20first%20issue)
- Forkez le repository
- Créez une branche pour votre fonctionnalité
- Implémentez vos changements
- Ajoutez des tests si applicable
- Soumettez une pull request

### 📚 Améliorer la Documentation

- Corriger les fautes de frappe
- Améliorer la clarté
- Ajouter des exemples
- Traduire dans d'autres langues

## Configuration de Développement

### Prérequis

- Node.js 22.0.0+
- pnpm 10.6.0+
- Git

### Installation

```bash
# Forker et cloner le repository
git clone https://github.com/VOTRE-USERNAME/dx-engine.git
cd dx-engine

# Installer les dépendances
pnpm install

# Démarrer le serveur de développement
pnpm dev
```

### Structure du Projet

```
dx-engine/
├── apps/
│   ├── electron/     # Application Electron principale
│   ├── web/         # Interface Vue.js
│   └── docs/        # Documentation VitePress
├── universal/       # Packages partagés
└── scripts/         # Scripts de build et d'automatisation
```

## Standards de Code

### Style de Code

- TypeScript pour tout nouveau code
- Configuration ESLint et Prettier appliquée
- Suivre les conventions de nommage existantes

### Messages de Commit

Nous utilisons les [Conventional Commits](https://conventionalcommits.org/) :

```bash
feat: ajouter support pour l'intégration GPT-4
fix: résoudre le problème de fuite mémoire dans l'AI service
docs: mettre à jour le guide d'installation
style: formater le code avec prettier
refactor: simplifier la logique de chargement de projet
test: ajouter tests pour le visual-to-code bridge
chore: mettre à jour les dépendances
```

### Tests

- Écrire des tests pour les nouvelles fonctionnalités
- S'assurer que tous les tests passent
- Maintenir ou améliorer la couverture de code

```bash
# Exécuter les tests
pnpm test

# Exécuter avec couverture
pnpm test:coverage

# Tests en mode watch
pnpm test:watch
```

## Processus de Pull Request

### Avant de Soumettre

1. **Synchroniser** avec la branche principale :

   ```bash
   git checkout main
   git pull upstream main
   git checkout votre-branche
   git rebase main
   ```

2. **Tests et Linting** :

   ```bash
   pnpm lint
   pnpm test
   pnpm build
   ```

3. **Documentation** :
   - Mettre à jour la documentation si nécessaire
   - Ajouter des commentaires pour le code complexe
   - Mettre à jour le CHANGELOG.md

### Template PR

```markdown
## Description

Brève description des changements.

## Type de Changement

- [ ] Bug fix (changement non-breaking qui résout un problème)
- [ ] Nouvelle fonctionnalité (changement non-breaking qui ajoute une fonctionnalité)
- [ ] Breaking change (fix ou fonctionnalité qui causerait l'arrêt du fonctionnement de la fonctionnalité existante)
- [ ] Documentation update

## Comment Tester

Étapes pour tester vos changements.

## Checklist

- [ ] Mon code suit le style de ce projet
- [ ] J'ai effectué une auto-révision de mon code
- [ ] J'ai commenté mon code, particulièrement dans les parties difficiles à comprendre
- [ ] J'ai apporté les changements correspondants à la documentation
- [ ] Mes changements ne génèrent aucun nouvel avertissement
- [ ] J'ai ajouté des tests qui prouvent que mon fix est efficace ou que ma fonctionnalité fonctionne
- [ ] Les tests unitaires nouveaux et existants passent localement avec mes changements
```

## Architecture et Patterns

### Principes de Design

- **Controlled Amplification** : Maintenir le contrôle du développeur
- **Modularité** : Code réutilisable et testable
- **Sécurité** : Pratiques sécurisées par défaut
- **Performance** : Optimisé pour les larges bases de code

### Patterns Courants

- **Composition API** pour les composants Vue
- **Dependency Injection** pour les services
- **Event-driven architecture** pour la communication
- **Factory pattern** pour les moteurs IA

## Ressources Communautaires

### Communication

- **GitHub Discussions** : Questions générales et discussions
- **Discord** : Chat en temps réel avec la communauté
- **Twitter** : [@HatcherDX](https://twitter.com/HatcherDX) pour les annonces

### Réunions Communautaires

- **Office Hours** : Tous les mardis 15h UTC
- **Demo Days** : Premier vendredi de chaque mois
- **Contributor Sync** : Réunion mensuelle pour les contributeurs actifs

## Reconnaissance

### Hall of Fame

Nous reconnaissons nos contributeurs dans :

- README du projet
- Site web officiel
- Annonces sur les réseaux sociaux
- Swag spécial pour les contributeurs majeurs

### Types de Reconnaissance

- **First-time Contributor** : Badge et mention spéciale
- **Regular Contributor** : Accès au canal contributeur Discord
- **Core Contributor** : Invitation aux réunions de planification
- **Maintainer** : Droits de commit et de révision

## Code de Conduite

Nous nous engageons à fournir un environnement accueillant et inclusif. Veuillez lire notre [Code de Conduite](CODE_OF_CONDUCT.md) complet.

### Nos Engagements

- Respecter tous les participants
- Accepter les critiques constructives
- Se concentrer sur ce qui est le mieux pour la communauté
- Faire preuve d'empathie envers les autres membres

## Questions ?

- 📖 Consultez notre [documentation](https://hatche.rs)
- 💬 Rejoignez nos [GitHub Discussions](https://github.com/HatcherDX/dx-engine/discussions)
- 🎮 Connectez-vous sur [Discord](https://discord.gg/hatcher)
- 📧 Contactez-nous : contribute@hatche.rs

---

Merci de contribuer à rendre Hatcher meilleur pour tous ! 🚀
