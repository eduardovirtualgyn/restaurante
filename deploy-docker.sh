#!/bin/bash
# ==============================================================
# Script de Deploy com Docker & Docker Compose - Contabo VPS
# ==============================================================

set -e

echo "🚀 Iniciando preparação e subida com Docker na VPS Contabo..."

# 1. Atualizar pacotes do sistema
echo "📦 Atualizando repositórios do Ubuntu..."
sudo apt update && sudo apt upgrade -y

# 2. Instalar Docker oficial caso ainda não esteja instalado
if ! command -v docker &> /dev/null; then
    echo "🐳 Docker não encontrado. Instalando Docker oficial..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    sudo systemctl enable docker
    sudo systemctl start docker
else
    echo "✅ Docker já está instalado."
fi

# 3. Garantir instalação do Docker Compose Plugin
if ! docker compose version &> /dev/null; then
    echo "📦 Instalando docker-compose-plugin..."
    sudo apt install -y docker-compose-plugin
fi

# 4. Configurar regras do Firewall (UFW)
echo "🛡️ Liberando portas 22 (SSH), 80 (HTTP) e 443 (HTTPS)..."
sudo ufw allow 22/tcp || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
sudo ufw --force enable || true

# 5. Construir imagem e rodar contêiner em background
echo "🏗️ Construindo a imagem da aplicação e iniciando o contêiner..."
docker compose down 2>/dev/null || true
docker compose up -d --build

echo ""
echo "=========================================================="
echo "🎉 DEPLOY DOCKER CONCLUÍDO COM SUCESSO!"
echo ""
echo "Status do Contêiner:"
docker compose ps
echo ""
echo "Acesse no navegador pelo IP da sua VPS Contabo:"
echo "👉 http://$(curl -s ifconfig.me)"
echo "👉 http://$(curl -s ifconfig.me)/menu/cantinho-da-rose"
echo "=========================================================="
