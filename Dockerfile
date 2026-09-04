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

COPY --from=build /app/artifacts/api-server/dist ./dist

EXPOSE 5000
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]