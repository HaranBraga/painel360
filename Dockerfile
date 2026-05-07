FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN mkdir -p public
RUN npx prisma generate
RUN npm run build

# ── Runner ──────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

RUN mkdir -p public
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000

# ATENÇÃO: NÃO use --accept-data-loss aqui. Causou perda de dados em deploy
# anterior porque o painel-360 e o conect-crm compartilham banco; quando o
# schema deste deploy estiver "atrás" do schema do outro app, o flag
# autoriza dropar tabelas inteiras silenciosamente. Sem o flag, o deploy
# FALHA explicitamente — admin investiga antes de qualquer perda.
CMD ["sh", "-c", "npx prisma db execute --file ./prisma/migrate-shared.sql --schema ./prisma/schema.prisma && npx prisma db push && node scripts/startup.js && npx next start -p 3000"]
