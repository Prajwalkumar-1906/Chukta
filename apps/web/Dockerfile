FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy monorepo configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ packages/
COPY apps/web/ apps/web/

# Accept build-time public env
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_NAME=Chukta
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

# Install dependencies and build shared packages + Next.js web app
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @settleup/settlement-engine run build
RUN pnpm --filter @chukta/shared run build
RUN pnpm --filter @chukta/web run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm@9

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app /app

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["npx", "next", "start", "-p", "3000"]
