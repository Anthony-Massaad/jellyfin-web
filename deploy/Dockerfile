# Jellyfin server image with this web client (the MD3 redesign) in place of the bundled one.
#
# Build from the repository root:
#   docker build -f deploy/Dockerfile -t <registry>/jellyfin-md3:<tag> .
#
# JELLYFIN_VERSION must match the web client's release branch (release-12.z works with 12.x servers).

ARG JELLYFIN_VERSION=12.2

# Build the web client
FROM node:24 AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build:production

# The official server with the web client replaced
FROM jellyfin/jellyfin:${JELLYFIN_VERSION}

RUN rm -rf /jellyfin/jellyfin-web
COPY --from=build /app/dist /jellyfin/jellyfin-web
