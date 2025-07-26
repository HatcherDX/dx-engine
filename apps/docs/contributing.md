# Contributing to Hatcher

Thank you for your interest in contributing to Hatcher! This guide will help you get started with contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## Getting Started

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-username/dx-engine.git
   cd dx-engine
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Start Development Server**
   ```bash
   pnpm dev
   ```

### Project Structure

```
dx-engine/
├── apps/
│   ├── electron/          # Main Electron process
│   ├── web/              # Renderer process (Vue.js)
│   ├── preload/          # Preload scripts
│   └── docs/             # VitePress documentation
├── universal/
│   ├── vite-plugin/      # Custom Vite plugins
│   └── puppeteer-google-translate/
└── scripts/              # Build and development scripts
```

## Ways to Contribute

### Reporting Bugs

When reporting bugs, please include:

- **Clear Description**: What happened vs. what you expected
- **Steps to Reproduce**: Detailed steps to recreate the issue
- **Environment**: OS, Node.js version, pnpm version
- **Screenshots**: If applicable, include visual evidence

Use our [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) when creating issues.

### Feature Requests

We welcome feature requests! Please include:

- **Use Case**: Why is this feature needed?
- **Proposed Solution**: How should it work?
- **Alternatives**: What other approaches did you consider?

Use our [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).

### Code Contributions

#### Before You Start

1. **Check Existing Issues**: Look for related issues or feature requests
2. **Discuss Major Changes**: Open an issue to discuss significant changes
3. **Start Small**: Begin with small, focused contributions

#### Development Workflow

1. **Create a Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow our coding standards (see below)
   - Write tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**

   ```bash
   pnpm build
   pnpm test
   ```

4. **Commit Your Changes**

   ```bash
   git commit -m "feat: add amazing new feature"
   ```

   We follow [Conventional Commits](https://conventionalcommits.org/) format.

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Coding Standards

Hatcher follows strict coding standards to ensure consistency, maintainability, and high-quality code across the entire project.

**📋 [Complete Coding Standards Guide](./coding-standards.md)**

### Quick Reference

**TypeScript**

- Use TypeScript for all new code with strict mode enabled
- Prefer interfaces over types for object shapes
- Use meaningful, descriptive names for variables and functions
- Include JSDoc comments for all public APIs

**Vue.js**

- Use Composition API with `<script setup>` syntax
- Define props and emits with TypeScript interfaces
- Prefer composables for reusable logic
- Follow single-file component structure: script → template → style

**Styling**

- Use scoped styles for component-specific CSS
- Follow BEM methodology for class naming
- Use CSS custom properties for theming
- Prefer flexbox and CSS Grid for layouts

**Git Conventions**

- Follow [Conventional Commits](https://conventionalcommits.org/) format
- Use descriptive branch names: `feature/`, `fix/`, `docs/`, `refactor/`
- Keep commits atomic and focused on a single change

### Code Quality Tools

We use automated tools to enforce standards:

```bash
# Lint and fix code style issues
pnpm lint:fix

# Type checking
pnpm typecheck

# Run all tests
pnpm test

# Format code
pnpm format
```

### Pre-commit Hooks

Husky runs automatic checks before each commit:

- ESLint for code quality
- TypeScript compilation
- Prettier for formatting
- Unit tests for critical paths

For detailed guidelines, examples, and best practices, see our [Coding Standards](./coding-standards.md) documentation.

## Documentation

### Types of Documentation

- **Code Comments**: Explain complex logic
- **README Files**: Overview and setup instructions
- **API Documentation**: Document public interfaces
- **User Guides**: How-to guides for end users

### Writing Guidelines

- Use clear, concise language
- Include code examples
- Keep documentation up-to-date with code changes
- Test all code examples

## Pull Request Process

### Before Submitting

- [ ] Code follows project standards
- [ ] Tests pass locally
- [ ] Documentation is updated
- [ ] Changes are focused and atomic

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)

Include before/after screenshots for UI changes
```

### Review Process

1. **Automated Checks**: CI/CD must pass
2. **Code Review**: At least one maintainer review
3. **Testing**: Changes are tested in development environment
4. **Documentation**: Verify docs are updated
5. **Merge**: Squash and merge approved PRs

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Workflow

1. **Feature Freeze**: Stop accepting new features
2. **Testing**: Comprehensive testing phase
3. **Documentation**: Update changelog and docs
4. **Release**: Create tagged release
5. **Announcement**: Communicate changes to community

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Discord**: Real-time chat with the community
- **Twitter**: Follow [@HatcherDX](https://twitter.com/HatcherDX) for updates

### Community Guidelines

- **Be Respectful**: Treat everyone with respect
- **Be Constructive**: Focus on solutions, not problems
- **Be Patient**: Remember we're all volunteers
- **Be Helpful**: Share knowledge and help others

## Recognition

We appreciate all contributions! Contributors are recognized in:

- **CONTRIBUTORS.md**: List of all project contributors
- **Release Notes**: Major contributions highlighted
- **Social Media**: Featuring community contributions

## Development Resources

### Useful Links

- [Vue.js Documentation](https://vuejs.org/)
- [Electron Documentation](https://electronjs.org/)
- [TypeScript Handbook](https://typescriptlang.org/)
- [Vite Documentation](https://vitejs.dev/)

### Development Tools

- **VS Code**: Recommended editor with Vue and TypeScript extensions
- **Vue DevTools**: Browser extension for debugging Vue applications
- **Electron DevTools**: Built-in debugging tools

## Questions?

If you have questions about contributing:

1. Check existing [GitHub Discussions](https://github.com/HatcherDX/dx-engine/discussions)
2. Join our [Discord community](https://discord.gg/hatcher)
3. Create a new discussion or issue

Thank you for contributing to Hatcher! Together, we're building the future of AI-assisted development.
