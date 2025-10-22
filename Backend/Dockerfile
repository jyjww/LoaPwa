# 1) deps
FROM node:20 AS deps
WORKDIR /app/Backend
COPY Backend/package*.json ./
RUN npm ci

# 2) build
FROM node:20 AS build
WORKDIR /app/Backend
COPY --from=deps /app/Backend/node_modules ./node_modules
COPY Backend/ ./
RUN npm run build

# 3) prod
FROM node:20 AS prod
WORKDIR /app/Backend
COPY --from=deps /app/Backend/node_modules ./node_modules
COPY --from=build /app/Backend/dist ./dist

ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/main.js"]
