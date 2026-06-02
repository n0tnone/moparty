FROM node:20-slim

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && pip3 install yt-dlp --break-system-packages \
    && apt-get clean

WORKDIR /app
COPY . .

RUN npm install --omit=dev

EXPOSE 3000

CMD ["node", "server.js"]