# Contribuyendo a Hatcher

¡Gracias por tu interés en contribuir a Hatcher! Esta guía te ayudará a comenzar a contribuir al proyecto.

## Código de Conducta

Al participar en este proyecto, aceptas cumplir con nuestro [Código de Conducta](CODE_OF_CONDUCT.md). Por favor léelo antes de contribuir.

## Comenzando

### Configuración de Desarrollo

1. **Fork y Clonar**

   ```bash
   git clone https://github.com/tu-usuario/dx-engine.git
   cd dx-engine
   ```

2. **Instalar Dependencias**

   ```bash
   pnpm install
   ```

3. **Iniciar Servidor de Desarrollo**
   ```bash
   pnpm dev
   ```

### Estructura del Proyecto

```
dx-engine/
├── apps/
│   ├── electron/          # Proceso principal Electron
│   ├── web/              # Proceso renderer (Vue.js)
│   ├── preload/          # Scripts preload
│   └── docs/             # Documentación VitePress
├── universal/
│   ├── vite-plugin/      # Plugins Vite personalizados
│   └── puppeteer-google-translate/
└── scripts/              # Scripts de construcción y desarrollo
```

## Formas de Contribuir

### Reportar Errores

Al reportar errores, incluye:

- **Descripción Clara**: Qué pasó vs. qué esperabas
- **Pasos para Reproducir**: Pasos detallados para recrear el problema
- **Entorno**: SO, versión de Node.js, versión de pnpm
- **Capturas de Pantalla**: Si aplica, incluye evidencia visual

Usa nuestro [template de reporte de errores](.github/ISSUE_TEMPLATE/bug_report.md) al crear issues.

### Solicitudes de Características

Para sugerir nuevas características:

- Usa nuestro [template de solicitud de características](.github/ISSUE_TEMPLATE/feature_request.md)
- Describe claramente el problema que resolver
- Proporciona una solución sugerida
- Considera implementaciones alternativas

### Contribuciones de Código

#### Antes de Escribir Código

1. Busca issues existentes o [crea uno nuevo](https://github.com/HatcherDX/dx-engine/issues/new/choose)
2. Comenta en el issue para indicar que estás trabajando en él
3. Espera confirmación del equipo antes de comenzar trabajo significativo

#### Proceso de Desarrollo

1. **Crear una Rama**

   ```bash
   git checkout -b feature/nombre-de-la-caracteristica
   ```

2. **Hacer Cambios**
   - Sigue nuestras [normas de codificación](/es/coding-standards)
   - Escribe tests para nueva funcionalidad
   - Actualiza documentación según sea necesario

3. **Probar Localmente**

   ```bash
   pnpm test
   pnpm lint
   pnpm build
   ```

4. **Hacer Commit**

   ```bash
   git add .
   git commit -m "feat: agregar nueva característica X"
   ```

5. **Push y Pull Request**
   ```bash
   git push origin feature/nombre-de-la-caracteristica
   ```

## Estándares de Contribución

### Mensajes de Commit

Usamos [Conventional Commits](https://conventionalcommits.org/):

- `feat:` Nueva característica
- `fix:` Corrección de error
- `docs:` Cambios de documentación
- `style:` Cambios de formato
- `refactor:` Refactorización de código
- `test:` Agregar o corregir tests
- `chore:` Mantenimiento

### Estilo de Código

- Usar TypeScript para todo el código nuevo
- Seguir las reglas ESLint configuradas
- Usar Prettier para formato
- Escribir JSDoc para funciones públicas

### Testing

- Escribir tests para nueva funcionalidad
- Mantener cobertura de tests >80%
- Tests deben pasar antes del merge
- Incluir tests de integración para características principales

## Proceso de Review

### Pull Requests

Tu PR será revisado por:

1. **Automated Checks**: CI ejecuta linting, tests y builds
2. **Code Review**: Un mantenedor revisa el código
3. **Testing**: Se prueba manualmente si es necesario

### Criterios de Aprobación

- Todos los checks de CI pasan
- Al menos una aprobación de un mantenedor
- No conflictos de merge pendientes
- Documentación actualizada si es necesario

## Recursos de Desarrollo

### Herramientas Recomendadas

- **Editor**: VS Code con extensiones TypeScript y Vue
- **Terminal**: Usa pnpm para todas las operaciones de paquetes
- **Debugging**: Chrome DevTools para el proceso renderer

### Scripts Útiles

```bash
# Desarrollo
pnpm dev                    # Iniciar dev server
pnpm dev:watch             # Dev con hot reload

# Testing
pnpm test                  # Ejecutar todos los tests
pnpm test:coverage         # Tests con cobertura

# Build
pnpm build                 # Build de producción
pnpm pack:dev             # Empaqueta para desarrollo
pnpm pack:prod            # Empaqueta para producción

# Linting
pnpm lint                 # Ejecutar ESLint
pnpm lint:fix             # Corregir errores de linting automáticamente
```

## Comunidad

### Donde Obtener Ayuda

- **GitHub Discussions**: Para preguntas generales
- **GitHub Issues**: Para bugs y solicitudes de características
- **Discord**: [Únete a nuestro servidor](https://discord.gg/hatcher)
- **Twitter**: [@HatcherDX](https://twitter.com/HatcherDX)

### Reconocimiento

Todos los contribuyentes son reconocidos en:

- El archivo CONTRIBUTORS
- Las notas de release
- Nuestro sitio web y documentación

## Licencia

Al contribuir a Hatcher, aceptas que tus contribuciones serán licenciadas bajo la misma Licencia MIT que el proyecto.

---

¡Gracias por ayudar a hacer Hatcher mejor! 🚀
