# Zu Hatcher Beitragen

Vielen Dank für Ihr Interesse, zu Hatcher beizutragen! Dieser Leitfaden hilft Ihnen beim Einstieg in die Projektbeiträge.

## Code of Conduct

Durch die Teilnahme an diesem Projekt verpflichten Sie sich, unseren [Code of Conduct](CODE_OF_CONDUCT.md) einzuhalten. Bitte lesen Sie ihn vor dem Beitragen.

## Erste Schritte

### Entwicklungssetup

1. **Fork und Clone**

   ```bash
   git clone https://github.com/your-username/dx-engine.git
   cd dx-engine
   ```

2. **Abhängigkeiten Installieren**

   ```bash
   pnpm install
   ```

3. **Entwicklungsserver Starten**
   ```bash
   pnpm dev
   ```

### Projektstruktur

```
dx-engine/
├── apps/
│   ├── electron/          # Haupt-Electron-Prozess
│   ├── web/              # Renderer-Prozess (Vue.js)
│   ├── preload/          # Preload-Skripte
│   └── docs/             # VitePress-Dokumentation
├── universal/
│   ├── vite-plugin/      # Benutzerdefinierte Vite-Plugins
│   └── puppeteer-google-translate/
└── scripts/              # Build- und Entwicklungsskripte
```

## Arten zu Beitragen

### Bugs Melden

Beim Melden von Bugs bitte folgendes einschließen:

- **Klare Beschreibung**: Was ist passiert vs. was Sie erwartet haben
- **Schritte zur Reproduktion**: Detaillierte Schritte zur Nachstellung des Problems
- **Umgebung**: OS, Node.js-Version, pnpm-Version
- **Screenshots**: Falls zutreffend, visuelle Beweise einschließen

Verwenden Sie unsere [Bug-Report-Vorlage](.github/ISSUE_TEMPLATE/bug_report.md) beim Erstellen von Issues.

### Feature-Anfragen

Wir begrüßen Feature-Anfragen! Bitte einschließen:

- **Anwendungsfall**: Warum wird dieses Feature benötigt?
- **Vorgeschlagene Lösung**: Wie sollte es funktionieren?
- **Alternativen**: Welche anderen Ansätze haben Sie erwogen?

Verwenden Sie unsere [Feature-Request-Vorlage](.github/ISSUE_TEMPLATE/feature_request.md).

### Code-Beiträge

#### Bevor Sie Beginnen

1. **Bestehende Issues Prüfen**: Nach verwandten Issues oder Feature-Anfragen suchen
2. **Größere Änderungen Besprechen**: Ein Issue öffnen, um bedeutende Änderungen zu diskutieren
3. **Klein Anfangen**: Mit kleinen, fokussierten Beiträgen beginnen

#### Entwicklungsworkflow

1. **Branch Erstellen**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Änderungen Vornehmen**
   - Unsere Coding-Standards befolgen (siehe unten)
   - Tests für neue Funktionalität schreiben
   - Dokumentation nach Bedarf aktualisieren

3. **Änderungen Testen**

   ```bash
   pnpm build
   pnpm test
   ```

4. **Änderungen Committen**

   ```bash
   git commit -m "feat: add amazing new feature"
   ```

   Wir folgen dem [Conventional Commits](https://conventionalcommits.org/) Format.

5. **Pushen und PR Erstellen**
   ```bash
   git push origin feature/your-feature-name
   ```

## Coding-Standards

Hatcher folgt strengen Coding-Standards, um Konsistenz, Wartbarkeit und hochwertigen Code im gesamten Projekt zu gewährleisten.

**📋 [Vollständiger Coding-Standards-Leitfaden](./coding-standards.md)**

### Schnellreferenz

**TypeScript**

- TypeScript für allen neuen Code mit aktiviertem Strict-Modus verwenden
- Interfaces gegenüber Types für Objektformen bevorzugen
- Bedeutungsvolle, beschreibende Namen für Variablen und Funktionen verwenden
- JSDoc-Kommentare für alle öffentlichen APIs einschließen

**Vue.js**

- Composition API mit `<script setup>` Syntax verwenden
- Props und Emits mit TypeScript-Interfaces definieren
- Composables für wiederverwendbare Logik bevorzugen
- Single-File-Component-Struktur befolgen: script → template → style

**Styling**

- Scoped Styles für komponentenspezifisches CSS verwenden
- BEM-Methodologie für Klassenbenennung befolgen
- CSS Custom Properties für Theming verwenden
- Flexbox und CSS Grid für Layouts bevorzugen

**Git-Konventionen**

- [Conventional Commits](https://conventionalcommits.org/) Format befolgen
- Beschreibende Branch-Namen verwenden: `feature/`, `fix/`, `docs/`, `refactor/`
- Commits atomar und auf eine einzige Änderung fokussiert halten

### Code-Qualitäts-Tools

Wir verwenden automatisierte Tools zur Durchsetzung von Standards:

```bash
# Code-Stil-Probleme linten und beheben
pnpm lint:fix

# Typ-Überprüfung
pnpm typecheck

# Alle Tests ausführen
pnpm test

# Code formatieren
pnpm format
```

### Pre-Commit-Hooks

Husky führt automatische Überprüfungen vor jedem Commit aus:

- ESLint für Code-Qualität
- TypeScript-Kompilierung
- Prettier für Formatierung
- Unit-Tests für kritische Pfade

Für detaillierte Richtlinien, Beispiele und Best Practices siehe unsere [Coding-Standards](./coding-standards.md) Dokumentation.

## Dokumentation

### Arten der Dokumentation

- **Code-Kommentare**: Komplexe Logik erklären
- **README-Dateien**: Übersicht und Setup-Anweisungen
- **API-Dokumentation**: Öffentliche Interfaces dokumentieren
- **Benutzerhandbücher**: Anleitungen für Endbenutzer

### Schreibrichtlinien

- Klare, präzise Sprache verwenden
- Code-Beispiele einschließen
- Dokumentation mit Code-Änderungen aktuell halten
- Alle Code-Beispiele testen

## Pull-Request-Prozess

### Vor der Einreichung

- [ ] Code folgt Projekt-Standards
- [ ] Tests bestehen lokal
- [ ] Dokumentation ist aktualisiert
- [ ] Änderungen sind fokussiert und atomar

### PR-Beschreibungsvorlage

```markdown
## Beschreibung

Kurze Beschreibung der Änderungen

## Art der Änderung

- [ ] Bug-Fix
- [ ] Neue Funktion
- [ ] Breaking Change
- [ ] Dokumentations-Update

## Testen

- [ ] Unit-Tests hinzugefügt/aktualisiert
- [ ] Integrationstests hinzugefügt/aktualisiert
- [ ] Manuelles Testen abgeschlossen

## Screenshots (falls zutreffend)

Vorher/Nachher-Screenshots für UI-Änderungen einschließen
```

### Review-Prozess

1. **Automatisierte Überprüfungen**: CI/CD muss bestehen
2. **Code-Review**: Mindestens ein Maintainer-Review
3. **Testen**: Änderungen werden in Entwicklungsumgebung getestet
4. **Dokumentation**: Überprüfen, dass Docs aktualisiert sind
5. **Merge**: Squash und Merge genehmigte PRs

## Release-Prozess

### Versionierung

Wir folgen [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking Changes
- **MINOR**: Neue Features (rückwärtskompatibel)
- **PATCH**: Bug-Fixes (rückwärtskompatibel)

### Release-Workflow

1. **Feature-Freeze**: Keine neuen Features mehr akzeptieren
2. **Testen**: Umfassende Testphase
3. **Dokumentation**: Changelog und Docs aktualisieren
4. **Release**: Tagged Release erstellen
5. **Ankündigung**: Änderungen an Community kommunizieren

## Community

### Kommunikationskanäle

- **GitHub Issues**: Bug-Reports und Feature-Anfragen
- **GitHub Discussions**: Allgemeine Fragen und Ideen
- **Discord**: Echtzeit-Chat mit der Community
- **Twitter**: Folgen Sie [@HatcherDX](https://twitter.com/HatcherDX) für Updates

### Community-Richtlinien

- **Respektvoll Sein**: Alle mit Respekt behandeln
- **Konstruktiv Sein**: Auf Lösungen fokussieren, nicht auf Probleme
- **Geduldig Sein**: Denken Sie daran, wir sind alle Freiwillige
- **Hilfsbereit Sein**: Wissen teilen und anderen helfen

## Anerkennung

Wir schätzen alle Beiträge! Mitwirkende werden anerkannt in:

- **CONTRIBUTORS.md**: Liste aller Projekt-Mitwirkenden
- **Release Notes**: Große Beiträge hervorgehoben
- **Social Media**: Community-Beiträge vorgestellt

## Entwicklungsressourcen

### Nützliche Links

- [Vue.js Dokumentation](https://vuejs.org/)
- [Electron Dokumentation](https://electronjs.org/)
- [TypeScript Handbuch](https://typescriptlang.org/)
- [Vite Dokumentation](https://vitejs.dev/)

### Entwicklungstools

- **VS Code**: Empfohlener Editor mit Vue- und TypeScript-Erweiterungen
- **Vue DevTools**: Browser-Erweiterung zum Debuggen von Vue-Anwendungen
- **Electron DevTools**: Eingebaute Debugging-Tools

## Fragen?

Wenn Sie Fragen zum Beitragen haben:

1. Bestehende [GitHub Discussions](https://github.com/HatcherDX/dx-engine/discussions) prüfen
2. Unserer [Discord Community](https://discord.gg/hatcher) beitreten
3. Eine neue Discussion oder Issue erstellen

Vielen Dank für Ihren Beitrag zu Hatcher! Gemeinsam bauen wir die Zukunft der KI-unterstützten Entwicklung.
