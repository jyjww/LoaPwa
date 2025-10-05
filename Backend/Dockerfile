# 1) deps
FROM node:20 AS deps
WORKDIR /app/Backend
COPY Backend/package*.json ./
RUN npm ci

# 2) dev
FROM node:20
WORKDIR /app/Backend
COPY --from=deps /app/Backend/node_modules ./node_modules

EXPOSE 4000
# 코드/공유/tsconfig는 전부 docker-compose의 볼륨으로 제공
