#!/bin/bash

# Script para asegurar que el proyecto use Node.js 22
# Guarda este script como scripts/setup-node.sh

echo "🔧 Configurando entorno Node.js para Hatcher DX Engine..."

# Cargar nvm si está disponible
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Verificar si nvm está disponible
if ! command -v nvm &> /dev/null; then
    echo "❌ nvm no está instalado. Por favor instala nvm primero:"
    echo "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    exit 1
fi

# Usar Node.js 22
echo "📦 Cambiando a Node.js 22..."
nvm use 22

# Verificar la versión
NODE_VERSION=$(node --version)
echo "✅ Usando Node.js $NODE_VERSION"

# Verificar que sea >= 22
if [[ $NODE_VERSION == v22* || $NODE_VERSION > v22 ]]; then
    echo "✅ Versión de Node.js correcta ($NODE_VERSION >= v22.0.0)"
else
    echo "❌ Se requiere Node.js 22 o superior. Versión actual: $NODE_VERSION"
    echo "Instalando Node.js 22..."
    nvm install 22
    nvm use 22
    nvm alias default 22
fi

# Recompilar node-pty si es necesario
echo "🔨 Recompilando node-pty para la versión correcta de Node.js..."
pnpm rebuild node-pty

echo "🎉 Entorno configurado correctamente!"
echo "Ahora puedes ejecutar: pnpm dev"
