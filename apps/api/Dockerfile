FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy monorepo configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/

# Install dependencies and build shared packages + API
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @settleup/settlement-engine run build
RUN pnpm --filter @chukta/shared run build
RUN pnpm --filter @chukta/api run db:generate
RUN pnpm --filter @chukta/api run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm@9

ENV NODE_ENV=production
ENV PORT=4000

# Copy built artifacts and dependencies
COPY --from=builder /app /app

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "dist/index.js"]
