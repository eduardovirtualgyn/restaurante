# Estágio 1: Build da aplicação React Vite
FROM node:20-alpine AS build
WORKDIR /app

# Copia dependências e instala
COPY package*.json ./
RUN npm ci

# Copia código-fonte e compila bundle de produção
COPY . .
RUN npm run build

# Estágio 2: Servidor Web Nginx Alpine de alta performance
FROM nginx:alpine

# Remove configuração padrão e adiciona nossa configuração otimizada para SPA
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos compilados para a pasta pública do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
