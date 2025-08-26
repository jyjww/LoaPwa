# 1) deps
FROM node:20 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 2) dev
FROM node:20
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 4000
# start:dev는 compose에서 실행
