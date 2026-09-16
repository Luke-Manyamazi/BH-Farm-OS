FROM node:24-bookworm-slim AS build

WORKDIR /app
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

RUN corepack enable

COPY --from=build /app/artifacts/api-server/dist ./dist
COPY --from=build /app/lib/db ./lib/db
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# The runtime needs pg for the deterministic production schema bootstrap.
RUN pnpm install --frozen-lockfile

EXPOSE 5000

# Do NOT run `drizzle-kit push` here. Drizzle Kit can invoke rename resolvers
# against an existing database, which requires an interactive TTY and makes
# Render startup non-deterministic. The bootstrap creates the application's
# public schema idempotently, then the verifier proves the auth schema exists,
# and only then is the API allowed to start.
CMD ["sh", "-c", "cd /app/lib/db && node ./ensure-production-schema.mjs && node ./verify-production-schema.mjs && cd /app && node --enable-source-maps ./dist/index.mjs"]
