# 1) deps
FROM node:20 AS deps
WORKDIR /app/Backend
COPY Backend/package*.json ./
RUN npm ci

# 2) dev
FROM node:20
WORKDIR /app/Backend
COPY --from=deps /app/Backend/node_modules ./node_modules

# ✅ 루트의 공유 설정과 shared 폴더 복사
COPY tsconfig.base.json /app/tsconfig.base.json
COPY shared /app/shared
COPY Backend /app/Backend

EXPOSE 4000
# start:dev는 compose에서 실행
