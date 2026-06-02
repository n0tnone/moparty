FROM node:18-alpine

# Устанавливаем yt-dlp
RUN apk add --no-cache python3 py3-pip && \
    pip3 install yt-dlp --break-system-packages

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4000

CMD ["node", "server.js"]