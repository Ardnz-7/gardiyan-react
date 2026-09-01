# This Dockerfile lives at the project root rather than in a frontend/ subfolder because
# src/ itself is intentionally at the project root in this repo's layout (see README.md's
# "Project structure" section) — there is no separate frontend/ directory to put it in.

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
