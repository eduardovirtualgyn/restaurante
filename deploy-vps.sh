#!/bin/bash
# ==============================================================
# Script de Instalação e Deploy Automático - Contabo VPS (Ubuntu)
# Aplicação: FoodOrder SaaS (Cardápio Digital & Almoço Executivo)
# ==============================================================

set -e

echo "🚀 Iniciando configuração na VPS Contabo..."

# 1. Atualizar pacotes do sistema operacional
echo "📦 Atualizando repositórios e pacotes..."
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependências básicas
echo "🔧 Instalando Git, Curl, UFW e Nginx..."
sudo apt install -y curl git ufw nginx

# 3. Instalar Node.js 20 LTS (caso queira build direto na VPS)
if ! command -v node &> /dev/null; then
    echo "🟢 Instalando Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "✅ Versões instaladas:"
node -v
npm -v
nginx -v

# 4. Configurar Firewall (UFW)
echo "🛡️ Configurando Firewall (Portas 22, 80 e 443)..."
sudo ufw allow 22/tcp || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
sudo ufw --force enable || true

# 5. Configurar diretório da aplicação
APP_DIR="/var/www/foodorder"
echo "📂 Preparando pasta da aplicação em $APP_DIR..."
sudo mkdir -p $APP_DIR

# Se o script estiver sendo rodado dentro da pasta do projeto, copia os arquivos
if [ -f "./package.json" ]; then
    echo "📋 Copiando arquivos do projeto para $APP_DIR..."
    sudo cp -r ./* $APP_DIR/
    sudo chown -R $USER:$USER $APP_DIR
fi

cd $APP_DIR

# 6. Instalar dependências e compilar a aplicação
echo "🏗️ Compilando o projeto React/Vite..."
npm install
npm run build

# 7. Configurar Nginx
echo "⚙️ Configurando Nginx para roteamento SPA..."
sudo rm -f /etc/nginx/sites-enabled/default
sudo cp $APP_DIR/nginx.conf /etc/nginx/sites-available/foodorder
sudo ln -sf /etc/nginx/sites-available/foodorder /etc/nginx/sites-enabled/

sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "=========================================================="
echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
echo "Acesse a aplicação no navegador pelo IP da sua VPS:"
echo "http://$(curl -s ifconfig.me)"
echo "Cardápio do Almoço:"
echo "http://$(curl -s ifconfig.me)/menu/cantinho-da-rose"
echo "=========================================================="
