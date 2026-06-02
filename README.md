# Moparty 🎬

Совместный просмотр видео. Next.js + Node.js + Socket.io.

---

## Локальный запуск

**1. Бэкенд**
```bash
cd backend
npm install
node server.js        # запустится на :4000
```

**2. Фронтенд** (в другом терминале)
```bash
cd frontend
npm install
npm run dev           # запустится на :3000
```

Открой `http://localhost:3000` — готово.

---

## Деплой на Render (бесплатно)

Два сервиса — бэкенд и фронтенд. Оба на [render.com](https://render.com), free tier.

### Шаг 1 — залей на GitHub
```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/ВАШ_ЮЗЕР/moparty.git
git push -u origin main
```

### Шаг 2 — бэкенд на Render
1. New → **Web Service** → подключи репо
2. Root Directory: `backend`
3. Build: `npm install`
4. Start: `node server.js`
5. После деплоя скопируй URL вида `https://moparty-backend.onrender.com`

### Шаг 3 — фронтенд на Render
1. New → **Web Service** → то же репо
2. Root Directory: `frontend`
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. Environment variable:
   - `NEXT_PUBLIC_BACKEND_URL` = URL бэкенда из шага 2

### Шаг 4 — прописать CORS в бэкенде
В `backend/server.js` найди строку `origin: '*'` — для продакшна можно заменить на конкретный домен фронтенда.

---

## Структура

```
moparty/
├── backend/
│   ├── server.js       # Express + Socket.io
│   └── package.json
└── frontend/
    ├── app/
    │   ├── page.tsx              # главная, создание комнаты
    │   └── room/[roomId]/page.tsx  # комната с плеером и чатом
    ├── components/
    │   └── VideoPlayer.tsx       # Video.js + socket sync
    └── next.config.ts
```

---

## Как работает синхронизация

Каждый `play / pause / seeked` от плеера эмитится через Socket.io. Остальные участники комнаты получают событие и применяют его к своему плееру. Флаг `isSyncing` предотвращает эхо-петлю.

---

## Известные ограничения

- **Локальные файлы** видит только тот, кто их открыл — для совместного просмотра нужна прямая ссылка на `.mp4`/`.m3u8`
- Бесплатный Render засыпает после 15 мин неактивности — первый запрос может идти ~30 сек
- Комнаты хранятся в памяти (не в БД) — перезапуск сервера сбросит все комнаты
