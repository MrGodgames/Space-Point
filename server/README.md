# Space-Point Server

## Локальный запуск (Postgres уже установлен)

1) Создайте БД:
```
createdb space_point
```

2) Примените схему:
```
psql -d space_point -f db/schema.sql
```

3) Скопируйте переменные окружения:
```
cp .env.example .env
```

4) Установите зависимости и заполните тестовыми данными:
```
npm install
npm run seed
```

5) Запустите сервер:
```
npm run dev
```

## Подключение фронта

В корне проекта задайте переменную `VITE_API_URL` (например, в `.env`):
```
VITE_API_URL=http://localhost:4000
```
