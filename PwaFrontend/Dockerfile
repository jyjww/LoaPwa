# PwaFrontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# 의존성만 먼저 복사/설치 (캐시 활용)
COPY package*.json ./
RUN npm ci

# 앱 소스 복사
COPY . .

EXPOSE 5173
CMD ["npm","run","dev","--","--host","0.0.0.0","--port","5173"]
