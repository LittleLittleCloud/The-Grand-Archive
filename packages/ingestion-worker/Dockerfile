FROM oven/bun:1 AS builder
WORKDIR /app

# Copy workspace config and package files
COPY package.json bun.lock* ./
COPY packages/contract/package.json packages/contract/
COPY packages/ingestion-worker/package.json packages/ingestion-worker/
RUN bun install

# Copy source code
COPY packages/contract packages/contract
COPY packages/ingestion-worker packages/ingestion-worker
COPY tsconfig.json ./

# Bundle the worker
RUN cd packages/ingestion-worker && bun build src/index.ts --outdir dist --target bun

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=builder /app/packages/ingestion-worker/dist /app

# Copy sources.yaml config from monorepo root
COPY config/sources.yaml /app/config/sources.yaml

ENV CONFIG_DIR=/app

CMD ["bun", "run", "/app/index.js"]
