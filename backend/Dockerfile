# ─── Builder Stage ───
FROM node:22-slim AS builder

# Install OpenSSL for Prisma client generation
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

# Generate Prisma Client
RUN npx prisma generate

RUN npm run build

# ─── Production Stage ───
FROM node:22-slim

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Start: push schema (idempotent, creates tables if missing) then start app
CMD ["/bin/sh", "-c", "npx prisma db push --skip-generate && node dist/main"]
