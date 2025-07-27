---
title: Contribuindo | Como Contribuir para o Desenvolvimento do Hatcher IDE
description: Aprenda como contribuir para o Hatcher IDE. Diretrizes para contribuições de código, documentação, testes e participação da comunidade no projeto de código aberto.
---

# Contribuindo para o Hatcher

Obrigado pelo interesse em contribuir para o Hatcher! Este guia te ajudará a começar a contribuir para o projeto.

## Código de Conduta

Ao participar deste projeto, você concorda em cumprir nosso [Código de Conduta](CODE_OF_CONDUCT.md). Por favor, leia antes de contribuir.

## Começando

### Configuração de Desenvolvimento

1. **Fork e Clone**

   ```bash
   git clone https://github.com/your-username/dx-engine.git
   cd dx-engine
   ```

2. **Instalar Dependências**

   ```bash
   pnpm install
   ```

3. **Iniciar Servidor de Desenvolvimento**
   ```bash
   pnpm dev
   ```

### Estrutura do Projeto

```
dx-engine/
├── apps/
│   ├── electron/          # Processo principal do Electron
│   ├── web/              # Processo de renderização (Vue.js)
│   ├── preload/          # Scripts de preload
│   └── docs/             # Documentação VitePress
├── universal/
│   ├── vite-plugin/      # Plugins Vite personalizados
│   └── puppeteer-google-translate/
└── scripts/              # Scripts de build e desenvolvimento
```

## Formas de Contribuir

### Reportando Bugs

Ao reportar bugs, por favor inclua:

- **Descrição Clara**: O que aconteceu vs. o que você esperava
- **Passos para Reproduzir**: Passos detalhados para recriar o problema
- **Ambiente**: SO, versão do Node.js, versão do pnpm
- **Screenshots**: Se aplicável, inclua evidência visual

Use nosso [template de relatório de bug](.github/ISSUE_TEMPLATE/bug_report.md) ao criar issues.

### Solicitações de Recursos

Recebemos solicitações de recursos! Por favor inclua:

- **Caso de Uso**: Por que este recurso é necessário?
- **Solução Proposta**: Como deveria funcionar?
- **Alternativas**: Que outras abordagens você considerou?

Use nosso [template de solicitação de recurso](.github/ISSUE_TEMPLATE/feature_request.md).

### Contribuições de Código

#### Antes de Começar

1. **Verificar Issues Existentes**: Procurar por issues relacionadas ou solicitações de recursos
2. **Discutir Mudanças Importantes**: Abrir uma issue para discutir mudanças significativas
3. **Começar Pequeno**: Começar com contribuições pequenas e focadas

#### Fluxo de Trabalho de Desenvolvimento

1. **Criar uma Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Fazer Mudanças**
   - Seguir nossos padrões de código (veja abaixo)
   - Escrever testes para nova funcionalidade
   - Atualizar documentação conforme necessário

3. **Testar Suas Mudanças**

   ```bash
   pnpm build
   pnpm test
   ```

4. **Fazer Commit das Mudanças**

   ```bash
   git commit -m "feat: add amazing new feature"
   ```

   Seguimos o formato [Conventional Commits](https://conventionalcommits.org/).

5. **Push e Criar PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Padrões de Código

O Hatcher segue padrões de código rigorosos para garantir consistência, manutenibilidade e código de alta qualidade em todo o projeto.

**📋 [Guia Completo de Padrões de Código](./coding-standards.md)**

### Referência Rápida

**TypeScript**

- Usar TypeScript para todo código novo com modo strict habilitado
- Preferir interfaces sobre types para formas de objetos
- Usar nomes significativos e descritivos para variáveis e funções
- Incluir comentários JSDoc para todas as APIs públicas

**Vue.js**

- Usar Composition API com sintaxe `<script setup>`
- Definir props e emits com interfaces TypeScript
- Preferir composables para lógica reutilizável
- Seguir estrutura de componente de arquivo único: script → template → style

**Estilização**

- Usar estilos com escopo para CSS específico de componentes
- Seguir metodologia BEM para nomenclatura de classes
- Usar propriedades personalizadas CSS para temas
- Preferir flexbox e CSS Grid para layouts

**Convenções Git**

- Seguir formato [Conventional Commits](https://conventionalcommits.org/)
- Usar nomes de branch descritivos: `feature/`, `fix/`, `docs/`, `refactor/`
- Manter commits atômicos e focados em uma única mudança

### Ferramentas de Qualidade de Código

Usamos ferramentas automatizadas para aplicar padrões:

```bash
# Lint e corrigir problemas de estilo de código
pnpm lint:fix

# Verificação de tipos
pnpm typecheck

# Executar todos os testes
pnpm test

# Formatar código
pnpm format
```

### Hooks Pre-commit

Husky executa verificações automáticas antes de cada commit:

- ESLint para qualidade de código
- Compilação TypeScript
- Prettier para formatação
- Testes unitários para caminhos críticos

Para diretrizes detalhadas, exemplos e melhores práticas, veja nossa documentação de [Padrões de Código](./coding-standards.md).

## Documentação

### Tipos de Documentação

- **Comentários de Código**: Explicar lógica complexa
- **Arquivos README**: Visão geral e instruções de configuração
- **Documentação de API**: Documentar interfaces públicas
- **Guias do Usuário**: Guias práticos para usuários finais

### Diretrizes de Escrita

- Usar linguagem clara e concisa
- Incluir exemplos de código
- Manter documentação atualizada com mudanças de código
- Testar todos os exemplos de código

## Processo de Pull Request

### Antes de Submeter

- [ ] Código segue padrões do projeto
- [ ] Testes passam localmente
- [ ] Documentação está atualizada
- [ ] Mudanças são focadas e atômicas

### Template de Descrição de PR

```markdown
## Descrição

Breve descrição das mudanças

## Tipo de Mudança

- [ ] Correção de bug
- [ ] Nova funcionalidade
- [ ] Mudança que quebra compatibilidade
- [ ] Atualização de documentação

## Testes

- [ ] Testes unitários adicionados/atualizados
- [ ] Testes de integração adicionados/atualizados
- [ ] Testes manuais completados

## Screenshots (se aplicável)

Incluir screenshots antes/depois para mudanças de UI
```

### Processo de Revisão

1. **Verificações Automatizadas**: CI/CD deve passar
2. **Revisão de Código**: Pelo menos uma revisão de mantenedor
3. **Testes**: Mudanças são testadas no ambiente de desenvolvimento
4. **Documentação**: Verificar se docs estão atualizadas
5. **Merge**: Squash e merge de PRs aprovadas

## Processo de Release

### Versionamento

Seguimos [Semantic Versioning](https://semver.org/):

- **MAJOR**: Mudanças que quebram compatibilidade
- **MINOR**: Novos recursos (compatível com versões anteriores)
- **PATCH**: Correções de bugs (compatível com versões anteriores)

### Fluxo de Release

1. **Congelamento de Recursos**: Parar de aceitar novos recursos
2. **Testes**: Fase de testes abrangente
3. **Documentação**: Atualizar changelog e docs
4. **Release**: Criar release com tag
5. **Anúncio**: Comunicar mudanças para a comunidade

## Comunidade

### Canais de Comunicação

- **GitHub Issues**: Relatórios de bugs e solicitações de recursos
- **GitHub Discussions**: Perguntas gerais e ideias
- **Discord**: Chat em tempo real com a comunidade
- **Twitter**: Siga [@HatcherDX](https://twitter.com/HatcherDX) para atualizações

### Diretrizes da Comunidade

- **Seja Respeitoso**: Trate todos com respeito
- **Seja Construtivo**: Foque em soluções, não problemas
- **Seja Paciente**: Lembre-se que somos todos voluntários
- **Seja Útil**: Compartilhe conhecimento e ajude outros

## Reconhecimento

Apreciamos todas as contribuições! Contribuidores são reconhecidos em:

- **CONTRIBUTORS.md**: Lista de todos os contribuidores do projeto
- **Notas de Release**: Contribuições importantes destacadas
- **Redes Sociais**: Destacando contribuições da comunidade

## Recursos de Desenvolvimento

### Links Úteis

- [Documentação Vue.js](https://vuejs.org/)
- [Documentação Electron](https://electronjs.org/)
- [Manual TypeScript](https://typescriptlang.org/)
- [Documentação Vite](https://vitejs.dev/)

### Ferramentas de Desenvolvimento

- **VS Code**: Editor recomendado com extensões Vue e TypeScript
- **Vue DevTools**: Extensão do navegador para debug de aplicações Vue
- **Electron DevTools**: Ferramentas de debug integradas

## Dúvidas?

Se você tem dúvidas sobre contribuição:

1. Verifique [GitHub Discussions](https://github.com/HatcherDX/dx-engine/discussions) existentes
2. Junte-se à nossa [comunidade Discord](https://discord.gg/hatcher)
3. Crie uma nova discussion ou issue

Obrigado por contribuir para o Hatcher! Juntos, estamos construindo o futuro do desenvolvimento assistido por IA.
