# Comenzando con Hatcher

Bienvenido a Hatcher, el IDE diseñado para amplificación controlada en la era de la IA. Esta guía te ayudará a ponerte en marcha rápidamente.

## Prerrequisitos

Antes de instalar Hatcher, asegúrate de tener:

- **Node.js** 22.0.0 o superior
- **pnpm** 10.6.0 o superior (gestor de paquetes recomendado)
- **Git** para control de versiones

## Instalación

### Opción 1: Descargar Release (Recomendado)

1. Visita nuestras [GitHub Releases](https://github.com/HatcherDX/dx-engine/releases)
2. Descarga la última versión para tu plataforma:
   - macOS: `Hatcher-v0.1.0-mac.dmg`
   - Windows: `Hatcher-v0.1.0-win.exe`
   - Linux: `Hatcher-v0.1.0-linux.AppImage`

### Opción 2: Construir desde el Código Fuente

```bash
# Clonar el repositorio
git clone https://github.com/HatcherDX/dx-engine.git
cd dx-engine

# Instalar dependencias
pnpm install

# Iniciar modo de desarrollo
pnpm dev

# O construir para producción
pnpm build
pnpm pack:prod
```

## Primeros Pasos

### 1. Lanzar Hatcher

Abre la aplicación Hatcher. Verás la interfaz principal con:

- **Explorador de Proyectos**: Gestiona tus proyectos
- **Canvas Visual**: Ve tu aplicación en vivo
- **Editor de Código**: Edita código fuente con asistencia de IA
- **Panel de Playbooks**: Gestiona contexto y reglas de IA

### 2. Crear tu Primer Proyecto

1. Haz clic en **"Nuevo Proyecto"** o presiona `Cmd+N` (Mac) / `Ctrl+N` (Windows/Linux)
2. Elige una plantilla:
   - **Vue + TypeScript**: Aplicación web moderna
   - **React + TypeScript**: Opción de framework popular
   - **Aplicación Electron**: Aplicación de escritorio
   - **Proyecto Vacío**: Comenzar desde cero

3. Configura los ajustes de tu proyecto:
   - Nombre del proyecto
   - Ubicación
   - Preferencia de motor de IA (Claude Code, Gemini CLI)

### 3. Configurar Integración de IA

Hatcher funciona con varios motores de IA. Configura tu preferido:

#### Claude Code (Recomendado)

```bash
# Instalar Claude CLI
npm install -g @anthropic/claude-cli

# Autenticar con tu clave API
claude auth login
```

#### Gemini CLI

```bash
# Instalar Gemini CLI
npm install -g @google/gemini-cli

# Configurar con tu clave API
gemini config set-key TU_CLAVE_API
```

### 4. Tu Primer Cambio Asistido por IA

1. **Selección Visual**: Haz clic en cualquier elemento en tu vista previa en vivo
2. **Describir Cambio**: Usa lenguaje natural para describir lo que quieres
3. **Revisar Código**: Ve los cambios de código generados en el panel de diferencias
4. **Aplicar o Refinar**: Acepta los cambios o itera con retroalimentación

## Conceptos Clave

### Amplificación Controlada

A diferencia de los asistentes de codificación de IA tradicionales, Hatcher mantiene **control determinístico**:

- Señalas lo que quieres que se cambie (selección visual)
- La IA genera cambios de código precisos
- Revisas y apruebas antes de aplicar
- Las pruebas automatizadas validan los cambios

### Playbooks

Los Playbooks son archivos de contexto dinámicos que ayudan a la IA a entender tu proyecto:

- **Reglas de Equipo**: Estándares y patrones de codificación
- **Guías de Arquitectura**: Cómo está estructurada tu aplicación
- **Biblioteca de Componentes**: Componentes reutilizables y su uso
- **Patrones de API**: Cómo interactuar con tu backend

## Próximos Pasos

- [Entendiendo la Filosofía](/es/philosophy) - Aprende sobre Amplificación Controlada
- [Puente Visual-a-Código](/es/visual-to-code) - Domina la característica principal
- [Configurando Playbooks](/es/playbooks) - Optimiza el rendimiento de la IA
- [Contribuyendo](/es/contributing) - Únete a nuestra comunidad

## ¿Necesitas Ayuda?

- **Documentación**: Navega nuestros documentos completos
- **GitHub Issues**: Reporta errores o solicita características
- **Discord**: Únete a nuestro chat de la comunidad
- **Twitter**: Sigue [@HatcherDX](https://twitter.com/HatcherDX) para actualizaciones

¡Bienvenido al futuro del desarrollo! 🚀
