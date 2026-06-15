FROM node:22-alpine AS base

WORKDIR /app

RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm@11.6.0

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY . .

RUN pnpm run build
RUN pnpm prune --prod

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
RUN chown nodejs:nodejs /usr/local/bin

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER nodejs

EXPOSE 3000

CMD ["node", "dist/main.js"]
