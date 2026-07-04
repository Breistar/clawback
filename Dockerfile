# Clawback — single container: Express API + built React UI
# See docs/DOCKER.md for setup and Vultr deploy steps.

FROM node:22-bookworm-slim AS builder

# better-sqlite3 needs a native build when no prebuilt binary matches
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN npm ci

COPY web ./web
COPY server ./server
COPY data ./data
RUN npm run build -w web

# --- runtime image (no compiler toolchain) ---
FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV API_PORT=80

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/web/dist ./web/dist
COPY --from=builder /app/web/package.json ./web/package.json
COPY --from=builder /app/data ./data

COPY docker/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||80)+'/api/report').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
