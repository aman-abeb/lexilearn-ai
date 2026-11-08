# Coolify: use the Dockerfile build pack, publish port 3000, and set MONGODB_URI.
# /data is only read once to import an existing materials.json into MongoDB.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Coolify build variables arrive as Docker build args. The Google button reads this while compiling.
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p public && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV LEXILEARN_DATA_DIR=/data
RUN apk add --no-cache su-exec \
  && addgroup -g 1001 -S nodejs \
  && adduser -S -u 1001 -G nodejs nextjs \
  && mkdir -p /data \
  && chown nextjs:nodejs /data
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
