# Stage 1: build
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy workspace config and package files first for better caching
COPY package.json bun.lock* ./
COPY packages/contract/package.json packages/contract/
COPY packages/server/package.json packages/server/
COPY packages/ui/package.json packages/ui/
COPY packages/sdk/package.json packages/sdk/
RUN bun install

# Copy source code
COPY packages/contract packages/contract
COPY packages/sdk packages/sdk
COPY packages/server packages/server
COPY packages/ui packages/ui
COPY tsconfig.json ./

# Build UI and server
RUN cd packages/ui && bun run build && \
    cd ../server && bun build src/index.ts --outdir dist --target bun

# Stage 2: runtime
FROM oven/bun:1-slim

WORKDIR /app

# Copy server build output
COPY --from=builder /app/packages/server/dist /app

# Copy UI build output to static/
COPY --from=builder /app/packages/ui/dist /app/static

# Ensure data directory exists
RUN mkdir -p /data

ENV STATIC_DIR=/app/static

EXPOSE 3000

CMD ["bun", "/app/index.js"]
