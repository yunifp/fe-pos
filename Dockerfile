# ==========================================
# STAGE 1: Build Frontend dengan Node.js
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json dan install dependency
COPY package*.json ./
RUN npm install

# Copy seluruh source code
COPY . .

# Tangkap ARG dari docker-compose.yml dan jadikan ENV
ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL

# Lakukan proses build (pastikan perintah ini menghasilkan folder 'dist')
RUN npm run build


# ==========================================
# STAGE 2: Serve dengan Nginx
# ==========================================
FROM nginx:alpine

# Buat konfigurasi Nginx untuk SPA (Single Page Application)
RUN rm /etc/nginx/conf.d/default.conf
RUN echo 'server { \
    listen 80; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files $uri $uri/ /index.html; \
    } \
    }' > /etc/nginx/conf.d/default.conf

# Copy hasil build dari STAGE 1 (builder) ke Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]