# SmartClass backend for the on-premise server.
# LibreOffice is included so PPT/PPTX uploads can be converted to PDF for classroom display.
FROM node:20-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      openssl ca-certificates \
      libreoffice-impress \
      fonts-dejavu fonts-liberation fonts-noto-core \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production \
    PORT=4000 \
    UPLOAD_DIR=/data/uploads \
    SOFFICE_PATH=soffice

EXPOSE 4000

# Apply pending migrations, then start the API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
