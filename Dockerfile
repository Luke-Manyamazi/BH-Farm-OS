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

# Use the non-interactive force variant, matching CI, so Render reconciles
# every table/column in the production database before starting the API.
CMD ["sh", "-c", "pnpm --filter @workspace/db run push-force && node --enable-source-maps ./dist/index.mjs"]
