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

# Drizzle Kit is required at startup to reconcile the production database schema.
RUN pnpm install --frozen-lockfile

EXPOSE 5000

# Reconcile the exact production schema shipped with this image, then verify
# that the API's auth_users query works against the same DATABASE_URL before
# allowing the server to start. If verification fails, Render will show the
# actual database/schema problem instead of starting a broken API.
CMD ["sh", "-c", "cd /app/lib/db && pnpm exec drizzle-kit push --force --config ./drizzle.config.ts && node ./verify-production-schema.mjs && cd /app && node --enable-source-maps ./dist/index.mjs"]
