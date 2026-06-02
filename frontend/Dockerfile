FROM node:20-alpine AS builder

WORKDIR /app

# Копируем только нужное для установки зависимостей
COPY package*.json package-lock.json ./
RUN npm ci

# Копируем остальной код
COPY . .

ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
RUN npm run build

# Продакшн-образ
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./package*.json
COPY --from=builder /app/package-lock.json ./package-lock.json

RUN npm ci --only=production

EXPOSE 3000

CMD ["npm", "start"]