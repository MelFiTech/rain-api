FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY admin-ui/package.json admin-ui/package-lock.json ./admin-ui/

RUN npm ci --include=dev \
  && npm ci --prefix admin-ui --include=dev

COPY . .

RUN npx prisma generate \
  && npm run build \
  && npm prune --omit=dev \
  && npm prune --prefix admin-ui --omit=dev

FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY admin-ui/package.json admin-ui/package-lock.json ./admin-ui/
COPY prisma ./prisma

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/admin-ui/node_modules ./admin-ui/node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

EXPOSE 8080
ENV PORT=8080

CMD ["node", "dist/main"]
