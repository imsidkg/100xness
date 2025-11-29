# Use official Bun image as base
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies into temp directory
# This will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Install production dependencies
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Copy source code and dependencies
FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Build TypeScript
RUN bun run tsc

# Production image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=build /app/dist dist
COPY --from=build /app/package.json .

# Expose ports
EXPOSE 3001
EXPOSE 3002

# Start the application
USER bun
ENTRYPOINT [ "bun", "run", "dist/index.js" ]
