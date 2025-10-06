# Backend Dockerfile for AWS (ECS/EC2/Beanstalk) deployment
# Multi-stage build for smaller runtime image

FROM node:20-alpine AS base
WORKDIR /app

# Install openssl for Prisma and bash for scripts
RUN apk add --no-cache openssl bash

# Copy package manifests
COPY package.json package-lock.json* ./

# Install production dependencies first (will re-run dev if lock changes)
RUN npm install --legacy-peer-deps

# Copy Prisma schema to allow generate early (avoids full source invalidation)
COPY prisma ./prisma
RUN npx prisma generate

# Copy rest of source
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

# Build TypeScript
RUN npm run build

# --- Runtime Image ---
FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache bash openssl

ENV NODE_ENV=production \
    PORT=5000

# Copy only needed artifacts
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --legacy-peer-deps

COPY --from=base /app/prisma ./prisma
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/dist ./dist
COPY docker-entrypoint.sh ./

EXPOSE 5000

ENTRYPOINT ["/bin/bash", "docker-entrypoint.sh"]
