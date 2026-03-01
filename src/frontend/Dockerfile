# Этап 1: Базовый образ
FROM node:20-alpine AS base

# Этап 2: Установка зависимостей
FROM base AS deps
WORKDIR /app
# Копируем только файлы манифестов для кэширования слоя
COPY package.json package-lock.json* ./
RUN npm ci

# Этап 3: Сборка проекта
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Собираем проект (Next.js сгенерирует папку .next/standalone)
RUN npm run build

# Этап 4: Финальный минималистичный образ (Runner)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Копируем публичные ассеты
COPY --from=builder /app/public ./public

# Копируем standalone сборку (она содержит урезанный node_modules)
COPY --from=builder /app/.next/standalone ./
# Копируем статику (standalone её не включает по умолчанию)
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
# В standalone режиме Next.js генерирует server.js
CMD ["node", "server.js"]