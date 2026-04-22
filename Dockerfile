FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_SUPABASE_URL=https://zsoqqoyodhxoptxrdnpk.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpzb3Fxb3lvZGh4b3B0eHJkbnBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NTk5MDcsImV4cCI6MjA5MjQzNTkwN30.91kIDWoj4oZ4t42wBO26aY70GMkGF5NBt9oqximsyn4
ENV NEXT_PUBLIC_APP_URL=https://manhaj-ai-web-production.up.railway.app
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_PUBLIC_SUPABASE_URL=https://zsoqqoyodhxoptxrdnpk.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpzb3Fxb3lvZGh4b3B0eHJkbnBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NTk5MDcsImV4cCI6MjA5MjQzNTkwN30.91kIDWoj4oZ4t42wBO26aY70GMkGF5NBt9oqximsyn4
ENV NEXT_PUBLIC_APP_URL=https://manhaj-ai-web-production.up.railway.app
ENV JWT_SECRET=8f314c1c504bff70bca324deeb242c500e14144497c5df96949917e133762b18614dd373f2442a70ef6d97b8696cd3ccbdcbd8b0c5047ca6a4a1f49235ec90ce
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
