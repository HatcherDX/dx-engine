---
title: Playbooks System | Dynamic AI Context Management for Teams
description: Master Hatcher's Playbooks system - the next-generation solution for AI context management. Create dynamic, governable Corporate Constitutions that teach AI your team's coding standards and architecture decisions.
---

# Playbooks System

The Playbooks system is Hatcher's second-generation solution to the context problem in AI development. Where static files like `Claude.md` provide a starting point, Playbooks offer a dynamic, centralized, and governable system that acts as a true Corporate Constitution for your AI agents.

## What Are Playbooks?

Playbooks are structured configuration files that capture your team's:

- **Coding Standards**: Formatting, naming conventions, and style preferences
- **Architecture Decisions**: Component patterns, state management approaches
- **Framework Specifics**: Library-specific best practices and patterns
- **Business Rules**: Domain-specific logic and constraints

## Playbook Structure

A basic Playbook follows this structure:

```json
{
  "name": "Vue 3 Component Standards",
  "version": "1.0.0",
  "framework": "vue",
  "rules": [
    {
      "category": "components",
      "type": "naming",
      "pattern": "PascalCase",
      "description": "All Vue components must use PascalCase naming"
    },
    {
      "category": "composition",
      "type": "api",
      "preference": "composition-api",
      "description": "Prefer Composition API over Options API"
    }
  ],
  "examples": [
    {
      "title": "Standard Component Structure",
      "code": "..."
    }
  ]
}
```

## Built-in Playbooks

Hatcher ships with curated Playbooks for popular frameworks:

### Vue.js Playbooks

- **Vue 3 + TypeScript**: Modern composition patterns
- **Nuxt.js**: SSR and file-based routing conventions
- **Pinia**: State management best practices

### React Playbooks

- **React + TypeScript**: Functional components and hooks
- **Next.js**: App Router and server components
- **Zustand**: Lightweight state management

### Universal Playbooks

- **TypeScript Standards**: Type definitions and generics
- **CSS-in-JS**: Styled-components and emotion patterns
- **Testing**: Jest and Cypress conventions

## Creating Custom Playbooks

### Team-Specific Rules

Create Playbooks that capture your team's unique conventions:

```json
{
  "name": "Acme Corp Standards",
  "extends": ["vue3-typescript"],
  "rules": [
    {
      "category": "api",
      "type": "structure",
      "pattern": "services/api/*.service.ts",
      "description": "All API calls must go through service layer"
    },
    {
      "category": "components",
      "type": "props",
      "requirement": "interfaces",
      "description": "Component props must use TypeScript interfaces"
    }
  ]
}
```

### Project-Specific Context

Add project-specific knowledge:

```json
{
  "name": "E-commerce Dashboard",
  "extends": ["acme-corp-standards"],
  "context": {
    "domain": "e-commerce",
    "entities": ["Product", "Order", "Customer"],
    "apis": [
      {
        "name": "OrdersAPI",
        "baseUrl": "/api/orders",
        "methods": ["GET", "POST", "PUT", "DELETE"]
      }
    ]
  }
}
```

## Playbook Inheritance

Playbooks support inheritance for scalable configuration:

```
Universal TypeScript
    ↓
Vue 3 + TypeScript
    ↓
Acme Corp Standards
    ↓
Project-Specific Rules
```

## AI Integration

Hatcher automatically injects relevant Playbook context into AI prompts:

### Context Selection

- **Automatic**: Based on file types and project structure
- **Manual**: Explicitly specify which Playbooks to use
- **Smart**: Learn from your preferences over time

### Prompt Enhancement

AI engines receive structured context like:

```
CONTEXT: Vue 3 Component Creation
PLAYBOOK: vue3-typescript, acme-corp-standards
RULES:
- Use Composition API with <script setup>
- Props must use TypeScript interfaces
- Components must be PascalCase
- API calls go through service layer
```

## Marketplace & Sharing

### Community Playbooks

Browse and install Playbooks created by the community:

- **Framework-specific**: Optimized patterns for popular libraries
- **Industry-specific**: Domain knowledge for different sectors
- **Team-tested**: Real-world conventions from successful projects

### Publishing Your Playbooks

Share your team's expertise:

```bash
hatcher playbook publish acme-corp-standards
```

### Version Management

- **Semantic Versioning**: Track changes and compatibility
- **Update Notifications**: Stay current with community improvements
- **Rollback Support**: Safely revert problematic updates

## Configuration

### Global Playbooks

Set default Playbooks for all projects:

```json
{
  "globalPlaybooks": ["typescript-standards", "git-conventions"]
}
```

### Project Override

Specify project-specific Playbooks in `hatcher.config.json`:

```json
{
  "playbooks": ["vue3-typescript", "team-standards", "./custom-playbook.json"]
}
```

### Conditional Loading

Load different Playbooks based on context:

```json
{
  "conditional": {
    "**/*.test.ts": ["testing-standards"],
    "src/components/**": ["component-standards"],
    "src/api/**": ["api-standards"]
  }
}
```

## Best Practices

### Start Simple

Begin with framework basics and gradually add team-specific rules:

1. **Install Framework Playbook**: Get 80% coverage instantly
2. **Add Team Rules**: Capture unique conventions
3. **Refine Over Time**: Update based on real usage

### Keep It Current

- **Regular Reviews**: Update Playbooks as patterns evolve
- **Team Feedback**: Involve the whole team in Playbook maintenance
- **Version Control**: Track Playbook changes alongside code

### Measure Impact

- **Consistency Metrics**: Track adherence to defined patterns
- **Speed Improvements**: Measure development velocity gains
- **Quality Indicators**: Monitor reduced code review feedback

## Future Features

### AI-Generated Playbooks

Automatically generate Playbooks by analyzing existing codebases.

### Real-time Validation

Live feedback as you code, ensuring Playbook compliance.

### Team Collaboration

Collaborative editing and approval workflows for Playbook updates.

The Playbooks system transforms AI from a generic code generator into a specialized member of your team who understands your exact requirements and conventions.
