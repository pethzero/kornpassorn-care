# Backend (NestJS) สำหรับรันใน container — ใช้กับ Cloudflare Containers (deploy/cloudflare) หรือ VPS ก็ได้
# ไม่มีไฟล์ .env ใน image: ค่าทั้งหมดส่งเข้ามาเป็น environment variable ตอนรัน (load-env จะข้ามไปเอง)
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build:prod && npm prune --omit=dev

FROM node:22-slim
ENV NODE_ENV=production \
    PORT=3100
WORKDIR /app/backend
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist-prod ./dist-prod
USER node
EXPOSE 3100
CMD ["node", "dist-prod/main.js"]
