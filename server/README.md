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

Если база уже создана, добавьте новые поля для личных чатов:
```
psql -d space_point -c "ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_direct BOOLEAN DEFAULT false;"
psql -d space_point -c "ALTER TABLE chats ADD COLUMN IF NOT EXISTS direct_key TEXT UNIQUE;"
```

Для статусов прочтения:
```
psql -d space_point -c "CREATE TABLE IF NOT EXISTS message_reads (message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), PRIMARY KEY (message_id, user_id));"
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
