FROM node:20-slim

# Установка Python + pip + yt-dlp
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && pip3 install "yt-dlp[default]" --break-system-packages \
    && apt-get clean

WORKDIR /app

# Копируем зависимости и ставим их
COPY package*.json ./
RUN npm install --omit=dev   # ← ЗАМЕНИЛ npm ci НА npm install

# Копируем весь код
COPY . .

EXPOSE 3000

# Запуск
CMD ["node", "server.js"]