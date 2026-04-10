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

# Install Litestream
RUN apt-get update && \
    apt-get install -y wget && \
    wget -qO /tmp/litestream.deb https://github.com/benbjohnson/litestream/releases/latest/download/litestream-v0.3.13-linux-amd64.deb && \
    dpkg -i /tmp/litestream.deb && \
    rm /tmp/litestream.deb && \
    apt-get purge -y wget && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server build output
COPY --from=builder /app/packages/server/dist /app

# Copy UI build output to static/
COPY --from=builder /app/packages/ui/dist /app/static

# Copy Litestream config
COPY --from=builder /app/packages/server/litestream.yml /etc/litestream.yml

# Ensure data directory exists
RUN mkdir -p /data

ENV STATIC_DIR=/app/static

EXPOSE 3000

CMD ["litestream", "replicate", "-exec", "bun run /app/index.js"]
